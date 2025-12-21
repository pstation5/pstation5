const ADMIN_ID = 321407568;
const STORAGE = 'ps-horror-collection';

const tg = window.Telegram?.WebApp;

const state = {
  games: [],
  upcomingGames: [],
  userCollections: {},
  page: 1,
  perPage: 8,
  platform: 'all',
  physicalOnly: false,
  search: '',
  theme: 'dark',
  user: null
};

let swiper;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  initTelegram();
  restoreTheme();
  await loadData();
  bindEvents();
  render();
}

/* ---------- Telegram ---------- */

function initTelegram() {
  if (!tg || !tg.initDataUnsafe?.user) return;

  const u = tg.initDataUnsafe.user;
  state.user = u;

  document.getElementById('userGreeting').textContent = u.first_name;
  document.getElementById('userRole').textContent =
    u.id === ADMIN_ID ? 'Администратор' : 'Коллекционер';

  document.getElementById('userAvatar').src =
    u.photo_url || `https://ui-avatars.com/api/?name=${u.first_name}`;

  tg.expand();
}

/* ---------- Data ---------- */

async function loadData() {
  const saved = localStorage.getItem(STORAGE);
  if (saved) {
    Object.assign(state, JSON.parse(saved));
    return;
  }

  const res = await fetch('games.json');
  const data = await res.json();
  Object.assign(state, data);
}

function saveData() {
  localStorage.setItem(STORAGE, JSON.stringify(state));
}

/* ---------- Events ---------- */

function bindEvents() {
  document.getElementById('themeToggle').onclick = toggleTheme;

  document.getElementById('searchInput').oninput = e => {
    state.search = e.target.value.toLowerCase();
    state.page = 1;
    render();
  };

  document.querySelectorAll('.filter-btn[data-platform]').forEach(btn => {
    btn.onclick = () => {
      state.platform = btn.dataset.platform;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.page = 1;
      render();
    };
  });

  document.getElementById('physicalBtn').onclick = () => {
    state.physicalOnly = !state.physicalOnly;
    document.getElementById('physicalBtn').classList.toggle('active');
    render();
  };

  document.getElementById('prevBtn').onclick = () => {
    if (state.page > 1) state.page--;
    render();
  };

  document.getElementById('nextBtn').onclick = () => {
    state.page++;
    render();
  };
}

/* ---------- Render ---------- */

function render() {
  renderUpcoming();
  renderGames();
}

function renderGames() {
  const grid = document.getElementById('gameGrid');
  grid.innerHTML = '';

  let games = state.games.filter(g => {
    if (state.platform !== 'all' && g.platform !== state.platform) return false;
    if (state.physicalOnly && !g.isPhysical) return false;
    if (state.search && !g.title.toLowerCase().includes(state.search)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(games.length / state.perPage));
  state.page = Math.min(state.page, totalPages);

  const slice = games.slice(
    (state.page - 1) * state.perPage,
    state.page * state.perPage
  );

  slice.forEach(g => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <img src="${g.coverImage}">
      <div class="info">
        <h3>${g.title}</h3>
        <small>${g.platform.toUpperCase()} • ${g.releaseYear}</small>
        ${g.isPhysical ? '<span class="badge">DISC</span>' : ''}
      </div>
    `;
    grid.appendChild(card);
  });

  document.getElementById('pageInfo').textContent =
    `${state.page} / ${totalPages}`;
}

function renderUpcoming() {
  const wrap = document.getElementById('upcomingGamesSlider');
  wrap.innerHTML = '';

  state.upcomingGames.forEach(g => {
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    slide.innerHTML = `
      <img src="${g.coverImage}">
      <p>${g.title}</p>
    `;
    wrap.appendChild(slide);
  });

  if (swiper) swiper.destroy(true, true);
  swiper = new Swiper('.upcoming-swiper', {
    slidesPerView: 3,
    spaceBetween: 20,
    pagination: { el: '.swiper-pagination' }
  });
}

/* ---------- Theme ---------- */

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveData();
}

function restoreTheme() {
  applyTheme();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  document.getElementById('themeIcon').className =
    state.theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}
