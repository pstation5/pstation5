/* ================== CONFIG ================== */

const API_URL = 'https://ps5-api.gnomhell1.workers.dev';
const ADMIN_ID = '321407568';

/* ================== STATE ================== */

let games = [];
let upcomingGames = [];
let comments = [];
let userCollections = {};
let filteredGames = [];

let isLoading = false;
let isSaving = false;
let isSyncing = false;
let lastSyncTime = null;

let currentUser = null;

/* ================== SAFE STORAGE ================== */

const SafeStorage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('Storage unavailable');
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('Storage unavailable');
      return false;
    }
  }
};

/* ================== TELEGRAM ================== */

function initTelegram() {
  if (!window.Telegram || !Telegram.WebApp) return;

  Telegram.WebApp.ready();
  currentUser = Telegram.WebApp.initDataUnsafe?.user || null;

  if (currentUser) {
    document.getElementById('userGreeting')?.textContent =
      `Привет, ${currentUser.first_name}`;
    document.getElementById('userRole')?.textContent =
      isAdminUser() ? 'Администратор' : 'Пользователь';
  }
}

function isAdminUser() {
  return currentUser && String(currentUser.id) === ADMIN_ID;
}

/* ================== ADMIN CONTROLS ================== */

function enableAdminControls() {
  if (!isAdminUser()) return;

  document.getElementById('adminControls')?.style.setProperty('display', 'block');
  document.getElementById('adminControls2')?.style.setProperty('display', 'block');
}

/* ================== LOAD DATA ================== */

function loadData() {
  if (isLoading) return;
  isLoading = true;

  fetch(API_URL + '?action=get_all')
    .then(res => res.json())
    .then(result => {
      if (result.status !== 'success') throw new Error('Bad response');

      const data = result.data || {};

      games = data.games || [];
      upcomingGames = data.upcomingGames || [];
      comments = data.comments || [];
      userCollections = data.userCollections || {};

      filteredGames = [...games];
      lastSyncTime = data.lastUpdate || null;

      SafeStorage.set('psHorrorGamesData', JSON.stringify(data));
      renderAll();
    })
    .catch(() => {
      const cached = SafeStorage.get('psHorrorGamesData');
      if (!cached) return;

      const data = JSON.parse(cached);
      games = data.games || [];
      upcomingGames = data.upcomingGames || [];
      comments = data.comments || [];
      userCollections = data.userCollections || [];
      filteredGames = [...games];

      renderAll();
    })
    .finally(() => {
      isLoading = false;
    });
}

/* ================== SAVE DATA ================== */

function saveData() {
  if (isLoading || isSaving) return;
  isSaving = true;

  fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'save_data',
      games,
      upcomingGames,
      comments,
      userCollections,
      lastUpdate: new Date().toISOString()
    })
  })
    .finally(() => {
      isSaving = false;
    });
}

/* ================== SYNC ================== */

function syncWithServer() {
  if (isSyncing) return;
  isSyncing = true;

  showSyncStatus('Синхронизация…');

  fetch(API_URL + '?action=get_all')
    .then(res => res.json())
    .then(result => {
      if (result.status !== 'success') throw new Error();

      const server = result.data || {};

      const mergeById = (local, remote) =>
        Array.from(new Map([...local, ...remote].map(i => [i.id, i])).values());

      if (server.games) {
        games = mergeById(games, server.games);
      }
      if (server.upcomingGames) {
        upcomingGames = mergeById(upcomingGames, server.upcomingGames);
      }
      if (server.comments) {
        comments = mergeById(comments, server.comments);
      }

      if (server.userCollections) {
        Object.entries(server.userCollections).forEach(([uid, col]) => {
          if (!userCollections[uid]) {
            userCollections[uid] = col;
          } else {
            userCollections[uid] = {
              games: Array.from(new Set([
                ...userCollections[uid].games,
                ...col.games
              ])),
              status: { ...userCollections[uid].status, ...col.status }
            };
          }
        });
      }

      lastSyncTime = server.lastUpdate || new Date().toISOString();

      SafeStorage.set('psHorrorGamesData', JSON.stringify({
        games,
        upcomingGames,
        comments,
        userCollections,
        lastUpdate: lastSyncTime
      }));

      renderAll();
      showSyncStatus('Готово');
    })
    .catch(() => {
      showSyncStatus('Ошибка');
    })
    .finally(() => {
      isSyncing = false;
      hideSyncStatus();
    });
}

/* ================== SYNC MODAL ================== */

function showSyncStatus(text) {
  const el = document.getElementById('syncStatusText');
  if (el) el.textContent = text;
  document.getElementById('syncStatusModal')?.classList.add('open');
}

function hideSyncStatus() {
  setTimeout(() => {
    document.getElementById('syncStatusModal')?.classList.remove('open');
  }, 800);
}

/* ================== RENDER ================== */

function renderAll() {
  enableAdminControls();
  renderGames();
}

function renderGames() {
  const grid = document.getElementById('gameGrid');
  if (!grid) return;

  grid.innerHTML = '';
  filteredGames.forEach(g => {
    const el = document.createElement('div');
    el.className = 'game-card';
    el.innerHTML = `
      <div class="game-title">${g.title}</div>
      ${isAdminUser() ? `<button onclick="editGame('${g.id}')">✏️</button>` : ''}
    `;
    grid.appendChild(el);
  });
}

/* ================== GAME ACTIONS ================== */

function openAddGameModal() {
  const title = prompt('Название игры');
  if (!title) return;

  games.push({ id: Date.now().toString(), title });
  filteredGames = [...games];
  renderAll();
  saveData();
}

function editGame(id) {
  const game = games.find(g => g.id === id);
  if (!game) return;

  const title = prompt('Новое название', game.title);
  if (!title) return;

  game.title = title;
  renderAll();
  saveData();
}

/* ================== INIT ================== */

document.addEventListener('DOMContentLoaded', () => {
  initTelegram();
  loadData();
});
