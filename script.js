// Horror Collection App - Script (Fixed + iOS optimized + Telegram CloudStorage sync)

// Safe Telegram init (doesn't crash in regular browser)
const tg = (window.Telegram && window.Telegram.WebApp)
  ? window.Telegram.WebApp
  : {
      initDataUnsafe: {},
      expand() {},
      setHeaderColor() {},
      setBackgroundColor() {}
    };

// ---------- iOS Safari/VH fix ----------
function setVhUnit() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
window.addEventListener('resize', setVhUnit);
setVhUnit();

// ---------- iOS-safe body scroll lock for modals ----------
let __scrollY = 0;
function lockBodyScroll() {
  __scrollY = window.scrollY || 0;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${__scrollY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
}
function unlockBodyScroll() {
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  window.scrollTo(0, __scrollY);
}

// ---------- Telegram CloudStorage helpers (chunked) ----------
const cloud = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.CloudStorage)
  ? window.Telegram.WebApp.CloudStorage
  : null;

// CloudStorage limits: value up to 4096 chars, up to 1024 keys :contentReference[oaicite:1]{index=1}
const CLOUD_PREFIX = 'hc_v1_';
const CLOUD_KEY_META = `${CLOUD_PREFIX}meta`;
const CLOUD_KEY_DATA_PREFIX = `${CLOUD_PREFIX}data_`;
const CLOUD_CHUNK_SIZE = 3800; // запас под JSON/служебные символы

function cloudAvailable() {
  return !!cloud && typeof cloud.getItem === 'function' && typeof cloud.setItem === 'function';
}

function cloudGetItem(key) {
  return new Promise((resolve, reject) => {
    try {
      cloud.getItem(key, (err, value) => {
        if (err) reject(err);
        else resolve(value ?? null);
      });
    } catch (e) {
      reject(e);
    }
  });
}

function cloudSetItem(key, value) {
  return new Promise((resolve, reject) => {
    try {
      cloud.setItem(key, value, (err, ok) => {
        if (err) reject(err);
        else resolve(!!ok);
      });
    } catch (e) {
      reject(e);
    }
  });
}

function cloudRemoveItem(key) {
  return new Promise((resolve, reject) => {
    try {
      cloud.removeItem(key, (err, ok) => {
        if (err) reject(err);
        else resolve(!!ok);
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function cloudSetLargeObject(obj) {
  if (!cloudAvailable()) return false;

  const json = JSON.stringify(obj);
  const chunks = [];
  for (let i = 0; i < json.length; i += CLOUD_CHUNK_SIZE) {
    chunks.push(json.slice(i, i + CLOUD_CHUNK_SIZE));
  }

  // узнать старое кол-во чанков, чтобы удалить лишние
  let oldChunkCount = 0;
  try {
    const metaRaw = await cloudGetItem(CLOUD_KEY_META);
    if (metaRaw) {
      const meta = JSON.parse(metaRaw);
      oldChunkCount = Number(meta.chunks || 0);
    }
  } catch (_) {}

  // записываем чанки
  for (let i = 0; i < chunks.length; i++) {
    await cloudSetItem(`${CLOUD_KEY_DATA_PREFIX}${i}`, chunks[i]);
  }

  // удаляем лишние старые чанки
  for (let i = chunks.length; i < oldChunkCount; i++) {
    try { await cloudRemoveItem(`${CLOUD_KEY_DATA_PREFIX}${i}`); } catch (_) {}
  }

  // мета в конце (как "commit")
  const meta = { chunks: chunks.length, updatedAt: new Date().toISOString() };
  await cloudSetItem(CLOUD_KEY_META, JSON.stringify(meta));
  return true;
}

async function cloudGetLargeObject() {
  if (!cloudAvailable()) return null;

  const metaRaw = await cloudGetItem(CLOUD_KEY_META);
  if (!metaRaw) return null;

  let meta;
  try { meta = JSON.parse(metaRaw); } catch { return null; }
  const count = Number(meta.chunks || 0);
  if (!count || count < 1) return null;

  let json = '';
  for (let i = 0; i < count; i++) {
    const part = await cloudGetItem(`${CLOUD_KEY_DATA_PREFIX}${i}`);
    if (part == null) return null; // неполные данные
    json += part;
  }

  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ---------- App state ----------
const elements = {
  gameGrid: document.getElementById('gameGrid'),
  upcomingSlider: document.getElementById('upcomingSlider'),
  searchInput: document.getElementById('searchInput'),
  platformFilter: document.getElementById('platformFilter'),
  statusFilter: document.getElementById('statusFilter'),
  sortSelect: document.getElementById('sortSelect'),

  totalGamesEl: document.getElementById('totalGames'),
  horrorGamesEl: document.getElementById('horrorGames'),
  uniquePlatformsEl: document.getElementById('uniquePlatforms'),
  avgRatingEl: document.getElementById('avgRating'),

  currentPageEl: document.getElementById('currentPage'),
  totalPagesEl: document.getElementById('totalPages'),

  userGreeting: document.getElementById('userGreeting'),
  userAvatar: document.getElementById('userAvatar'),

  collectionCount: document.getElementById('collectionCount'),
  upcomingCount: document.getElementById('upcomingCount'),
  lastUpdateTime: document.getElementById('lastUpdateTime')
};

let games = [];
let upcomingGames = [];
let filteredGames = [];
let currentPage = 1;
const gamesPerPage = 10;
let currentTheme = 'dark';

let collection = {
  games: [],
  upcoming: [],
  lastUpdate: new Date().toISOString()
};

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => { initApp(); });

async function initApp() {
  // Telegram setup
  if (window.Telegram && tg.initDataUnsafe) {
    try {
      tg.expand();
      tg.setHeaderColor('#8b0000');
      tg.setBackgroundColor('#121212');
    } catch (e) {}
    setupTelegramUser();
  }

  // theme first (local fallback)
  restoreTheme();

  // Load: CloudStorage -> localStorage -> games.json
  const loaded = await loadCollectionPreferCloud();

  setupEventListeners();
  renderAll();

  // если ничего не было вообще — подгрузим дефолт и сразу сохраним в Cloud
  if (!loaded) {
    await loadDefaultData();
    await saveCollectionEverywhere();
    renderAll();
  }
}

// ---------- Telegram user ----------
function setupTelegramUser() {
  try {
    const user = tg.initDataUnsafe.user;
    if (user) {
      elements.userGreeting.textContent = `Привет, ${user.first_name}!`;
      elements.userAvatar.src = user.photo_url
        ? user.photo_url
        : 'https://via.placeholder.com/45/8b0000/ffffff?text=👻';
    } else {
      elements.userAvatar.src = 'https://via.placeholder.com/45/8b0000/ffffff?text=👻';
    }
  } catch (e) {
    if (elements.userAvatar) elements.userAvatar.src = 'https://via.placeholder.com/45/8b0000/ffffff?text=👻';
  }
}

// ---------- Storage (Cloud + Local) ----------
async function loadCollectionPreferCloud() {
  // 1) CloudStorage
  if (cloudAvailable()) {
    try {
      const cloudData = await cloudGetLargeObject();
      if (cloudData && typeof cloudData === 'object') {
        collection = cloudData;
        games = collection.games || [];
        upcomingGames = collection.upcoming || [];
        filteredGames = [...games];

        // продублируем в localStorage как кеш
        localStorage.setItem('horrorCollection', JSON.stringify(collection));
        return true;
      }
    } catch (e) {
      console.warn('CloudStorage read failed:', e);
    }
  }

  // 2) localStorage
  const saved = localStorage.getItem('horrorCollection');
  if (saved) {
    try {
      collection = JSON.parse(saved);
      games = collection.games || [];
      upcomingGames = collection.upcoming || [];
      filteredGames = [...games];
      return true;
    } catch (e) {
      console.error('localStorage parse error:', e);
    }
  }

  // 3) nothing
  return false;
}

async function saveCollectionEverywhere() {
  // local first
  collection.games = games;
  collection.upcoming = upcomingGames;
  collection.lastUpdate = new Date().toISOString();
  localStorage.setItem('horrorCollection', JSON.stringify(collection));

  // theme тоже в local (быстро)
  localStorage.setItem('horrorTheme', currentTheme);

  // cloud
  if (cloudAvailable()) {
    try {
      await cloudSetLargeObject(collection);
      // (опционально) тема в облако отдельным ключом
      await cloudSetItem(`${CLOUD_PREFIX}theme`, currentTheme);
    } catch (e) {
      console.warn('CloudStorage save failed:', e);
    }
  }
}

// ---------- Default data ----------
async function loadDefaultData() {
  try {
    const response = await fetch('games.json', { cache: 'no-store' });
    const data = await response.json();
    collection = data;
    games = collection.games || [];
    upcomingGames = collection.upcoming || [];
    filteredGames = [...games];
  } catch (error) {
    console.error('Default data load error:', error);
    collection = { games: [], upcoming: [], lastUpdate: new Date().toISOString() };
    games = [];
    upcomingGames = [];
    filteredGames = [];
  }
}

// ---------- Events ----------
function setupEventListeners() {
  elements.searchInput?.addEventListener('input', applyFilters);
  elements.platformFilter?.addEventListener('change', applyFilters);
  elements.statusFilter?.addEventListener('change', applyFilters);
  elements.sortSelect?.addEventListener('change', applyFilters);

  document.getElementById('addGameForm')?.addEventListener('submit', handleAddGame);
  document.getElementById('addUpcomingForm')?.addEventListener('submit', handleAddUpcoming);

  // Click outside to close modals
  window.addEventListener('click', (event) => {
    const ids = ['addGameModal', 'addUpcomingModal', 'gameDetailModal', 'manageModal', 'statsModal'];
    ids.forEach(id => {
      const modal = document.getElementById(id);
      if (modal && event.target === modal) {
        modal.style.display = 'none';
        unlockBodyScroll();
      }
    });
  });
}

// ---------- Render ----------
function renderAll() {
  populatePlatformFilter();
  renderUpcoming();
  renderGames();
  updateStats();
  updateManageInfo();
}

function populatePlatformFilter() {
  if (!elements.platformFilter) return;

  const platforms = {};
  games.forEach(game => {
    const key = game.platform;
    const name = game.platformName || key;
    if (!platforms[key]) platforms[key] = name;
  });

  elements.platformFilter.innerHTML = `<option value="">Все платформы</option>`;
  Object.entries(platforms).forEach(([key, name]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = name;
    elements.platformFilter.appendChild(opt);
  });
}

function applyFilters() {
  const searchTerm = (elements.searchInput?.value || '').toLowerCase().trim();
  const platform = elements.platformFilter?.value || '';
  const status = elements.statusFilter?.value || '';
  const sortBy = elements.sortSelect?.value || 'title';

  filteredGames = games.filter(game => {
    const matchesSearch = !searchTerm || (game.title || '').toLowerCase().includes(searchTerm);
    const matchesPlatform = !platform || game.platform === platform;
    const matchesStatus = !status || game.status === status;
    return matchesSearch && matchesPlatform && matchesStatus;
  });

  filteredGames.sort((a, b) => {
    switch (sortBy) {
      case 'year': return (b.releaseYear || 0) - (a.releaseYear || 0);
      case 'rating': return (b.rating || 0) - (a.rating || 0);
      case 'status': return (a.status || '').localeCompare(b.status || '');
      case 'title':
      default: return (a.title || '').localeCompare(b.title || '');
    }
  });

  currentPage = 1;
  renderGames();
  updateStats();
}

function updateStats() {
  elements.totalGamesEl.textContent = games.length;
  elements.horrorGamesEl.textContent = games.filter(g => (g.genre || '').toLowerCase().includes('horror')).length;

  const platforms = [...new Set(games.map(g => g.platform).filter(Boolean))];
  elements.uniquePlatformsEl.textContent = platforms.length;

  const ratedGames = games.filter(g => typeof g.rating === 'number');
  const avg = ratedGames.length
    ? ratedGames.reduce((sum, g) => sum + g.rating, 0) / ratedGames.length
    : 0;
  elements.avgRatingEl.textContent = avg.toFixed(1);

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));
  elements.totalPagesEl.textContent = totalPages;
  elements.currentPageEl.textContent = currentPage;
}

function updateManageInfo() {
  elements.collectionCount.textContent = games.length;
  elements.upcomingCount.textContent = upcomingGames.length;

  const d = new Date(collection.lastUpdate || Date.now());
  const formatted = d.toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  elements.lastUpdateTime.textContent = formatted;
}

function renderUpcoming() {
  if (!elements.upcomingSlider) return;

  elements.upcomingSlider.innerHTML = '';
  if (upcomingGames.length === 0) {
    elements.upcomingSlider.innerHTML = `<div class="empty-state">Пока нет ожидаемых игр</div>`;
    return;
  }

  upcomingGames.forEach(game => {
    const card = document.createElement('div');
    card.className = 'upcoming-card';
    card.innerHTML = `
      <img class="upcoming-cover" src="${game.coverImage || 'https://via.placeholder.com/250x150/1a1a1a/ffffff?text=No+Cover'}" alt="${escapeHtml(game.title)}">
      <div class="upcoming-info">
        <div class="upcoming-title">${escapeHtml(game.title)}</div>
        <div class="upcoming-meta">
          <span>${escapeHtml(game.platformName || game.platform || '')}</span>
          <span>${game.releaseYear || '—'}</span>
        </div>
      </div>
      <div class="upcoming-actions">
        <button class="action-btn delete-btn" title="Удалить" onclick="deleteUpcoming(${game.id}); event.stopPropagation();">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    elements.upcomingSlider.appendChild(card);
  });
}

function renderGames() {
  if (!elements.gameGrid) return;

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));
  currentPage = Math.min(currentPage, totalPages);

  const startIndex = (currentPage - 1) * gamesPerPage;
  const pageGames = filteredGames.slice(startIndex, startIndex + gamesPerPage);

  elements.gameGrid.innerHTML = '';

  if (pageGames.length === 0) {
    elements.gameGrid.innerHTML = `<div class="empty-state">Ничего не найдено</div>`;
    return;
  }

  pageGames.forEach(game => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.onclick = () => openGameDetail(game.id);

    const statusClass = game.status ? `status-${game.status}` : 'status-planned';
    const statusText = getStatusText(game.status);

    card.innerHTML = `
      <img class="game-cover" src="${game.coverImage || 'https://via.placeholder.com/280x200/1a1a1a/ffffff?text=No+Cover'}" alt="${escapeHtml(game.title)}">
      <div class="game-actions">
        <button class="action-btn edit-btn" title="Редактировать" onclick="editGame(${game.id}); event.stopPropagation();">
          <i class="fas fa-edit"></i>
        </button>
        <button class="action-btn delete-btn" title="Удалить" onclick="deleteGame(${game.id}); event.stopPropagation();">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <div class="game-info">
        <div class="game-title">${escapeHtml(game.title)}</div>
        <div class="game-meta">
          <span>${escapeHtml(game.platformName || game.platform || '')}</span>
          <span>${game.releaseYear || '—'}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="game-status ${statusClass}">${statusText}</span>
          <span class="game-rating">${typeof game.rating === 'number' ? `<i class="fas fa-star"></i>${game.rating}` : ''}</span>
        </div>
      </div>
    `;
    elements.gameGrid.appendChild(card);
  });

  updateStats();
}

// ---------- Pagination ----------
function nextPage() {
  const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));
  if (currentPage < totalPages) {
    currentPage++;
    renderGames();
  }
}
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderGames();
  }
}

// ---------- Utils ----------
function getStatusText(status) {
  switch (status) {
    case 'completed': return 'Пройдена';
    case 'playing': return 'Играю';
    case 'planned': return 'В планах';
    default: return '—';
  }
}
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// ---------- Modals open/close (iOS-safe) ----------
function openAddGameModal() {
  document.getElementById('addGameModal').style.display = 'block';
  lockBodyScroll();
}
function closeAddGameModal() {
  document.getElementById('addGameModal').style.display = 'none';
  unlockBodyScroll();
}

function openAddUpcomingModal() {
  document.getElementById('addUpcomingModal').style.display = 'block';
  lockBodyScroll();
}
function closeAddUpcomingModal() {
  document.getElementById('addUpcomingModal').style.display = 'none';
  unlockBodyScroll();
}

function openManageModal() {
  updateManageInfo();
  document.getElementById('manageModal').style.display = 'block';
  lockBodyScroll();
}
function closeManageModal() {
  document.getElementById('manageModal').style.display = 'none';
  unlockBodyScroll();
}

function openStatsModal() {
  updateAdvancedStats();
  renderCharts();
  document.getElementById('statsModal').style.display = 'block';
  lockBodyScroll();
}
function closeStatsModal() {
  document.getElementById('statsModal').style.display = 'none';
  unlockBodyScroll();
}

function closeGameDetailModal() {
  document.getElementById('gameDetailModal').style.display = 'none';
  unlockBodyScroll();
}

// ---------- Advanced stats ----------
function updateAdvancedStats() {
  const totalGames = collection.games.length;
  const upcoming = collection.upcoming.length;

  const ratedGames = collection.games.filter(g => typeof g.rating === 'number');
  const avgRating = ratedGames.length
    ? (ratedGames.reduce((sum, g) => sum + g.rating, 0) / ratedGames.length).toFixed(1)
    : '0.0';

  document.getElementById('statsTotalGames').textContent = totalGames;
  document.getElementById('statsUpcoming').textContent = upcoming;
  document.getElementById('statsAvgRating').textContent = avgRating;

  const years = collection.games.map(g => Number(g.releaseYear)).filter(Number.isFinite);
  const oldest = years.length ? Math.min(...years) : '-';
  const newest = years.length ? Math.max(...years) : '-';

  const devCounter = {};
  collection.games.forEach(g => {
    const dev = (g.developer || '').trim();
    if (!dev) return;
    devCounter[dev] = (devCounter[dev] || 0) + 1;
  });
  const topDev = Object.keys(devCounter).length
    ? Object.entries(devCounter).sort((a, b) => b[1] - a[1])[0][0]
    : '-';

  const platformCounter = {};
  collection.games.forEach(g => {
    const p = (g.platformName || g.platform || '').toString().trim();
    if (!p) return;
    platformCounter[p] = (platformCounter[p] || 0) + 1;
  });
  const topPlatform = Object.keys(platformCounter).length
    ? Object.entries(platformCounter).sort((a, b) => b[1] - a[1])[0][0]
    : '-';

  const statusCounter = { completed: 0, playing: 0, planned: 0 };
  collection.games.forEach(g => {
    if (g.status === 'completed') statusCounter.completed++;
    else if (g.status === 'playing') statusCounter.playing++;
    else if (g.status === 'planned') statusCounter.planned++;
  });

  document.getElementById('oldestRelease').textContent = oldest;
  document.getElementById('newestRelease').textContent = newest;
  document.getElementById('topDeveloper').textContent = topDev;
  document.getElementById('topPlatform').textContent = topPlatform;

  document.getElementById('completedCount').textContent = statusCounter.completed;
  document.getElementById('playingCount').textContent = statusCounter.playing;
  document.getElementById('plannedCount').textContent = statusCounter.planned;
  document.getElementById('ratedCount').textContent = ratedGames.length;
}

// ---------- Charts ----------
function renderCharts() {
  renderSimpleCharts();
}

function renderSimpleCharts() {
  const platforms = {};
  collection.games.forEach(game => {
    const platform = game.platformName || game.platform || 'Не указано';
    platforms[platform] = (platforms[platform] || 0) + 1;
  });
  document.getElementById('platformChart').innerHTML = createBarChart(platforms);

  const statuses = {};
  collection.games.forEach(game => {
    const s = getStatusText(game.status);
    statuses[s] = (statuses[s] || 0) + 1;
  });
  document.getElementById('statusChart').innerHTML = createBarChart(statuses);

  const genres = {};
  collection.games.forEach(game => {
    const genre = game.genre || 'Не указан';
    genres[genre] = (genres[genre] || 0) + 1;
  });
  document.getElementById('genreChart').innerHTML = createBarChart(genres);

  const years = {};
  collection.games.forEach(game => {
    const year = game.releaseYear || 'Не указан';
    years[year] = (years[year] || 0) + 1;
  });
  document.getElementById('yearChart').innerHTML = createBarChart(years);

  document.getElementById('pieChart').innerHTML = createPieChart(platforms);
}

function createBarChart(data) {
  const entries = Object.entries(data);
  if (!entries.length) return `<div class="text-chart">Нет данных</div>`;

  const maxValue = Math.max(...Object.values(data));
  const total = Object.values(data).reduce((a, b) => a + b, 0);

  let html = '<div class="text-chart">';
  entries.forEach(([label, value]) => {
    const percentage = total ? ((value / total) * 100).toFixed(1) : '0.0';
    const barWidth = maxValue ? (value / maxValue) * 100 : 0;

    html += `
      <div class="chart-item">
        <span class="chart-label">${escapeHtml(String(label))}</span>
        <div class="chart-bar-container">
          <div class="chart-bar" style="width:${barWidth}%"></div>
        </div>
        <span class="chart-value">${value} (${percentage}%)</span>
      </div>
    `;
  });
  html += '</div>';
  return html;
}

function createPieChart(data) {
  const entries = Object.entries(data);
  if (!entries.length) return `<div class="pie-chart-text">Нет данных</div>`;

  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8', '#f7b76d'];

  let html = '<div class="pie-chart-text">';
  let i = 0;

  entries.forEach(([label, value]) => {
    const percentage = total ? ((value / total) * 100).toFixed(1) : '0.0';
    const color = colors[i % colors.length];
    i++;

    html += `
      <div class="pie-item">
        <span class="pie-color" style="background:${color};"></span>
        <span class="pie-label">${escapeHtml(String(label))}</span>
        <span class="pie-percent">${percentage}%</span>
      </div>
    `;
  });

  html += '</div>';
  return html;
}

// ---------- Theme (also cloud) ----------
function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';

  localStorage.setItem('horrorTheme', currentTheme);

  if (cloudAvailable()) {
    cloudSetItem(`${CLOUD_PREFIX}theme`, currentTheme).catch(() => {});
  }
}

function restoreTheme() {
  const t = localStorage.getItem('horrorTheme');
  if (t) currentTheme = t;
  document.documentElement.setAttribute('data-theme', currentTheme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';

  // попробуем подтянуть тему из облака (не блокирует запуск)
  if (cloudAvailable()) {
    cloudGetItem(`${CLOUD_PREFIX}theme`)
      .then(v => {
        if (v === 'dark' || v === 'light') {
          currentTheme = v;
          document.documentElement.setAttribute('data-theme', currentTheme);
          const ic = document.getElementById('themeIcon');
          if (ic) ic.className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
          localStorage.setItem('horrorTheme', currentTheme);
        }
      })
      .catch(() => {});
  }
}

// ---------- CRUD ----------
async function handleAddGame(e) {
  e.preventDefault();

  const platformSelect = document.getElementById('gamePlatform');
  const newGame = {
    id: Date.now(),
    title: document.getElementById('gameTitle').value.trim(),
    platform: platformSelect.value,
    platformName: platformSelect.selectedOptions[0]?.textContent || '',
    coverImage: document.getElementById('gameCover').value.trim(),
    releaseYear: document.getElementById('gameYear').value ? Number(document.getElementById('gameYear').value) : null,
    status: document.getElementById('gameStatus').value,
    rating: document.getElementById('gameRating').value ? Number(document.getElementById('gameRating').value) : null,
    developer: document.getElementById('gameDeveloper').value.trim(),
    genre: document.getElementById('gameGenre').value.trim(),
    description: document.getElementById('gameDescription').value.trim(),
    notes: document.getElementById('gameNotes').value.trim()
  };

  games.unshift(newGame);
  filteredGames = [...games];

  await saveCollectionEverywhere();

  closeAddGameModal();
  e.target.reset();
  applyFilters();
  renderUpcoming();
  updateManageInfo();
}

async function handleAddUpcoming(e) {
  e.preventDefault();

  const platformSelect = document.getElementById('upcomingPlatform');
  const newUpcoming = {
    id: Date.now(),
    title: document.getElementById('upcomingTitle').value.trim(),
    platform: platformSelect.value,
    platformName: platformSelect.selectedOptions[0]?.textContent || '',
    coverImage: document.getElementById('upcomingCover').value.trim(),
    releaseYear: document.getElementById('upcomingYear').value ? Number(document.getElementById('upcomingYear').value) : null,
    releaseDate: document.getElementById('upcomingDate').value || null,
    developer: document.getElementById('upcomingDeveloper').value.trim(),
    genre: document.getElementById('upcomingGenre').value.trim(),
    description: document.getElementById('upcomingDescription').value.trim()
  };

  upcomingGames.unshift(newUpcoming);

  await saveCollectionEverywhere();

  closeAddUpcomingModal();
  e.target.reset();
  renderUpcoming();
  updateManageInfo();
}

async function deleteGame(id) {
  if (!confirm('Удалить игру из коллекции?')) return;
  games = games.filter(g => g.id !== id);
  filteredGames = filteredGames.filter(g => g.id !== id);

  await saveCollectionEverywhere();
  renderAll();
}

async function deleteUpcoming(id) {
  if (!confirm('Удалить ожидаемую игру?')) return;
  upcomingGames = upcomingGames.filter(g => g.id !== id);

  await saveCollectionEverywhere();
  renderUpcoming();
  updateManageInfo();
}

// ---------- Detail modal ----------
function openGameDetail(id) {
  const game = games.find(g => g.id === id);
  if (!game) return;

  document.getElementById('detailTitle').textContent = game.title;
  document.getElementById('gameDetailContent').innerHTML = `
    <div style="display:flex; gap:16px; flex-wrap:wrap;">
      <img class="detail-cover" src="${game.coverImage || 'https://via.placeholder.com/400x400/1a1a1a/ffffff?text=No+Cover'}"
           alt="${escapeHtml(game.title)}"
           style="width:280px; border-radius:18px; border:1px solid var(--border-color);">
      <div style="flex:1; min-width:240px;">
        <p><b>Платформа:</b> ${escapeHtml(game.platformName || game.platform || '')}</p>
        <p><b>Год:</b> ${game.releaseYear || '—'}</p>
        <p><b>Статус:</b> ${getStatusText(game.status)}</p>
        <p><b>Рейтинг:</b> ${typeof game.rating === 'number' ? game.rating : '—'}</p>
        <p><b>Разработчик:</b> ${escapeHtml(game.developer || '—')}</p>
        <p><b>Жанр:</b> ${escapeHtml(game.genre || '—')}</p>
        <p style="margin-top:10px; color: var(--text-secondary);">${escapeHtml(game.description || '')}</p>
        ${game.notes ? `<p style="margin-top:10px;"><b>Заметки:</b><br>${escapeHtml(game.notes)}</p>` : ''}
      </div>
    </div>
  `;

  document.getElementById('gameDetailModal').style.display = 'block';
  lockBodyScroll();
}

// ---------- Manage actions ----------
function exportCollection() {
  const data = JSON.stringify(collection, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'horror-collection.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importCollection() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';

  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      collection = data;
      games = collection.games || [];
      upcomingGames = collection.upcoming || [];
      filteredGames = [...games];

      await saveCollectionEverywhere();
      renderAll();
      alert('Импорт выполнен!');
    } catch (e) {
      alert('Ошибка импорта JSON');
      console.error(e);
    }
  };

  input.click();
}

async function clearCollection() {
  if (!confirm('Точно удалить ВСЕ данные?')) return;
  collection = { games: [], upcoming: [], lastUpdate: new Date().toISOString() };
  games = [];
  upcomingGames = [];
  filteredGames = [];

  await saveCollectionEverywhere();
  renderAll();
}

async function resetToDefault() {
  if (!confirm('Сбросить к демо-данным?')) return;
  localStorage.removeItem('horrorCollection');

  await loadDefaultData();
  filteredGames = [...games];
  await saveCollectionEverywhere();
  renderAll();
}

// ---------- Stubs ----------
function editGame(id) {
  alert('Редактирование пока не реализовано. Можно добавить, если нужно.');
}
