// Horror Collection App - Multi-user version with admin/user separation

// ---------- Configuration ----------
const ADMIN_USER_ID = 321407568; // ЗАМЕНИТЕ на ваш Telegram ID
const PLATFORMS = {
  ps5: 'PlayStation 5',
  ps4: 'PlayStation 4'
};

// ---------- App state ----------
let currentUser = null;
let isAdmin = false;
let games = [];
let comments = {};
let userRatings = {};
let userCollections = {};
let currentGameId = null;
let currentUserRating = 0;

// ---------- DOM elements ----------
const elements = {
  gameGrid: document.getElementById('gameGrid'),
  adminPanel: document.getElementById('adminPanel'),
  adminBtn: document.getElementById('adminBtn'),
  userRole: document.getElementById('userRole'),
  totalGames: document.getElementById('totalGames'),
  totalComments: document.getElementById('totalComments'),
  activeUsers: document.getElementById('activeUsers'),
  avgRating: document.getElementById('avgRating')
};

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  // Telegram user setup
  await setupTelegramUser();
  
  // Load data
  await loadData();
  
  // Setup UI
  setupEventListeners();
  renderGames();
  updateStats();
}

// ---------- Telegram user setup ----------
async function setupTelegramUser() {
  const tg = window.Telegram?.WebApp;
  
  if (tg?.initDataUnsafe?.user) {
    const user = tg.initDataUnsafe.user;
    currentUser = {
      id: user.id,
      name: user.first_name || 'Пользователь',
      username: user.username,
      photo: user.photo_url
    };
    
    // Check if admin
    isAdmin = user.id === ADMIN_USER_ID;
    
    // Update UI
    document.getElementById('userGreeting').textContent = `Привет, ${user.first_name}!`;
    document.getElementById('userRole').textContent = isAdmin ? 'Администратор' : 'Коллекционер';
    
    if (currentUser.photo) {
      document.getElementById('userAvatar').src = currentUser.photo;
    }
    
    // Show/hide admin features
    elements.adminPanel.style.display = isAdmin ? 'block' : 'none';
    elements.adminBtn.style.display = isAdmin ? 'block' : 'none';
    
    // Initialize Telegram app
    try {
      tg.expand();
      tg.setHeaderColor('#8b0000');
      tg.setBackgroundColor('#121212');
    } catch (e) {}
  } else {
    // Demo mode (no Telegram)
    currentUser = { id: 0, name: 'Гость', username: 'guest' };
    elements.userRole.textContent = 'Гость (демо)';
  }
}

// ---------- Data management ----------
async function loadData() {
  try {
    const saved = localStorage.getItem('horrorCollectionData');
    if (saved) {
      const data = JSON.parse(saved);
      games = data.games || [];
      comments = data.comments || {};
      userRatings = data.ratings || {};
      userCollections = data.collections || {};
    }
  } catch (e) {
    console.error('Load error:', e);
    games = [];
    comments = {};
    userRatings = {};
    userCollections = {};
  }
}

async function saveData() {
  const data = {
    games,
    comments,
    ratings: userRatings,
    collections: userCollections,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem('horrorCollectionData', JSON.stringify(data));
}

// ---------- Game management (admin only) ----------
async function addGame(gameData) {
  const newGame = {
    id: Date.now(),
    title: gameData.title,
    platform: gameData.platform,
    platformName: PLATFORMS[gameData.platform] || gameData.platform,
    coverImage: gameData.coverImage || '',
    releaseYear: gameData.releaseYear || null,
    genre: gameData.genre || '',
    developer: gameData.developer || '',
    description: gameData.description || '',
    addedAt: new Date().toISOString(),
    rating: 0,
    ratingCount: 0,
    commentCount: 0
  };
  
  games.unshift(newGame);
  await saveData();
  renderGames();
  updateStats();
  return newGame;
}

async function deleteGame(gameId) {
  if (!isAdmin) return;
  if (!confirm('Удалить игру из каталога?')) return;
  
  games = games.filter(g => g.id !== gameId);
  delete comments[gameId];
  
  // Remove from all user collections
  Object.keys(userCollections).forEach(userId => {
    if (userCollections[userId]) {
      userCollections[userId] = userCollections[userId].filter(g => g.gameId !== gameId);
    }
  });
  
  await saveData();
  renderGames();
  updateStats();
}

// ---------- User interactions ----------
function submitComment() {
  if (!currentUser) {
    alert('Войдите через Telegram, чтобы оставлять комментарии');
    return;
  }
  
  const text = document.getElementById('commentText').value.trim();
  if (!text) {
    alert('Введите текст комментария');
    return;
  }
  
  if (!currentGameId) return;
  
  const game = games.find(g => g.id === currentGameId);
  if (!game) return;
  
  const comment = {
    id: Date.now(),
    gameId: currentGameId,
    userId: currentUser.id,
    userName: currentUser.name,
    userPhoto: currentUser.photo,
    text: text,
    date: new Date().toISOString(),
    likes: 0
  };
  
  if (!comments[currentGameId]) {
    comments[currentGameId] = [];
  }
  
  comments[currentGameId].unshift(comment);
  game.commentCount = (game.commentCount || 0) + 1;
  
  document.getElementById('commentText').value = '';
  renderComments(currentGameId);
  updateStats();
  saveData();
}

function submitUserRating() {
  if (!currentUser) {
    alert('Войдите через Telegram, чтобы ставить оценки');
    return;
  }
  
  if (!currentGameId || currentUserRating === 0) return;
  
  const game = games.find(g => g.id === currentGameId);
  if (!game) return;
  
  const userId = currentUser.id;
  const key = `${userId}_${currentGameId}`;
  
  // Update game rating
  const oldRating = userRatings[key] || 0;
  userRatings[key] = currentUserRating;
  
  // Recalculate game average
  const gameRatings = Object.keys(userRatings)
    .filter(k => k.endsWith(`_${currentGameId}`))
    .map(k => userRatings[k]);
  
  if (gameRatings.length > 0) {
    game.rating = gameRatings.reduce((a, b) => a + b) / gameRatings.length;
    game.ratingCount = gameRatings.length;
  }
  
  renderGameDetail(currentGameId);
  updateStats();
  saveData();
}

function toggleUserCollection() {
  if (!currentUser) {
    alert('Войдите через Telegram, чтобы добавлять игры в коллекцию');
    return;
  }
  
  if (!currentGameId) return;
  
  const userId = currentUser.id;
  const status = document.getElementById('collectionStatus').value;
  
  if (!userCollections[userId]) {
    userCollections[userId] = [];
  }
  
  const existingIndex = userCollections[userId].findIndex(item => item.gameId === currentGameId);
  
  if (existingIndex > -1) {
    // Update status
    userCollections[userId][existingIndex].status = status;
    userCollections[userId][existingIndex].updatedAt = new Date().toISOString();
  } else {
    // Add new
    const game = games.find(g => g.id === currentGameId);
    if (game) {
      userCollections[userId].push({
        gameId: currentGameId,
        gameTitle: game.title,
        gameCover: game.coverImage,
        platform: game.platform,
        status: status,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }
  
  updateCollectionButton();
  saveData();
}

// ---------- Rendering ----------
function renderGames() {
  const grid = elements.gameGrid;
  if (!grid) return;
  
  grid.innerHTML = '';
  
  if (games.length === 0) {
    grid.innerHTML = '<div class="empty-state">Пока нет игр в каталоге</div>';
    return;
  }
  
  games.forEach(game => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.onclick = () => openGameDetail(game.id);
    
    const rating = game.rating ? game.rating.toFixed(1) : '—';
    
    card.innerHTML = `
      <img class="game-cover" src="${game.coverImage || 'https://via.placeholder.com/280x200/1a1a1a/ffffff?text=No+Cover'}" alt="${game.title}">
      <div class="game-info">
        <div class="game-title">${escapeHtml(game.title)}</div>
        <div class="game-meta">
          <span>${escapeHtml(game.platformName)}</span>
          <span>${game.releaseYear || '—'}</span>
        </div>
        <div class="game-stats">
          <span class="game-rating"><i class="fas fa-star"></i> ${rating}</span>
          <span class="game-comments"><i class="fas fa-comment"></i> ${game.commentCount || 0}</span>
        </div>
        <div class="game-genre">${escapeHtml(game.genre.split(',')[0] || '')}</div>
        ${isAdmin ? `
          <div class="game-actions">
            <button class="action-btn delete-btn" onclick="deleteGame(${game.id}); event.stopPropagation();">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        ` : ''}
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderGameDetail(gameId) {
  const game = games.find(g => g.id === gameId);
  if (!game) return;
  
  currentGameId = gameId;
  
  // Update title
  document.getElementById('detailTitle').textContent = game.title;
  
  // Render game info
  document.getElementById('gameDetailInfo').innerHTML = `
    <div class="detail-cover-container">
      <img class="detail-cover" src="${game.coverImage || 'https://via.placeholder.com/400x400/1a1a1a/ffffff?text=No+Cover'}" alt="${game.title}">
    </div>
    <div class="detail-content">
      <h3>${escapeHtml(game.title)}</h3>
      <div class="detail-meta">
        <p><strong>Платформа:</strong> ${escapeHtml(game.platformName)}</p>
        <p><strong>Год релиза:</strong> ${game.releaseYear || '—'}</p>
        <p><strong>Разработчик:</strong> ${escapeHtml(game.developer) || '—'}</p>
        <p><strong>Жанр:</strong> ${escapeHtml(game.genre) || '—'}</p>
        <p><strong>Рейтинг:</strong> ${game.rating ? game.rating.toFixed(1) : '—'} (${game.ratingCount || 0} оценок)</p>
      </div>
      <div class="detail-description">
        <h4>Описание:</h4>
        <p>${escapeHtml(game.description) || 'Описание отсутствует'}</p>
      </div>
    </div>
  `;
  
  // Render rating stars
  renderRatingStars();
  
  // Update collection button
  updateCollectionButton();
  
  // Render comments
  renderComments(gameId);
}

function renderRatingStars() {
  const starsContainer = document.getElementById('userRatingStars');
  starsContainer.innerHTML = '';
  
  currentUserRating = 0;
  if (currentUser && currentGameId) {
    const key = `${currentUser.id}_${currentGameId}`;
    currentUserRating = userRatings[key] || 0;
  }
  
  for (let i = 1; i <= 10; i++) {
    const star = document.createElement('span');
    star.className = `star ${i <= currentUserRating ? 'active' : ''}`;
    star.innerHTML = '<i class="fas fa-star"></i>';
    star.onclick = () => {
      currentUserRating = i;
      renderRatingStars();
    };
    starsContainer.appendChild(star);
  }
}

function renderComments(gameId) {
  const list = document.getElementById('commentsList');
  const count = document.getElementById('commentsCount');
  
  if (!list) return;
  
  const gameComments = comments[gameId] || [];
  count.textContent = gameComments.length;
  
  list.innerHTML = '';
  
  if (gameComments.length === 0) {
    list.innerHTML = '<div class="empty-comments">Пока нет комментариев. Будьте первым!</div>';
    return;
  }
  
  gameComments.forEach(comment => {
    const commentEl = document.createElement('div');
    commentEl.className = 'comment-item';
    commentEl.innerHTML = `
      <div class="comment-header">
        <img src="${comment.userPhoto || 'https://via.placeholder.com/30/8b0000/ffffff'}" class="comment-avatar">
        <div class="comment-user">
          <strong>${escapeHtml(comment.userName)}</strong>
          <span class="comment-date">${formatDate(comment.date)}</span>
        </div>
      </div>
      <div class="comment-text">${escapeHtml(comment.text)}</div>
      <div class="comment-actions">
        <button class="like-btn" onclick="likeComment(${comment.id}, ${gameId})">
          <i class="far fa-heart"></i> ${comment.likes || 0}
        </button>
        ${isAdmin ? `
          <button class="delete-comment-btn" onclick="deleteComment(${comment.id}, ${gameId})">
            <i class="fas fa-trash"></i>
          </button>
        ` : ''}
      </div>
    `;
    list.appendChild(commentEl);
  });
}

// ---------- UI helpers ----------
function updateCollectionButton() {
  if (!currentUser || !currentGameId) return;
  
  const btn = document.getElementById('collectionBtn');
  const select = document.getElementById('collectionStatus');
  
  const userId = currentUser.id;
  const collection = userCollections[userId] || [];
  const item = collection.find(item => item.gameId === currentGameId);
  
  if (item) {
    btn.innerHTML = `<i class="fas fa-heart"></i> В коллекции (${getStatusText(item.status)})`;
    btn.className = 'btn-primary';
    select.value = item.status;
  } else {
    btn.innerHTML = '<i class="far fa-heart"></i> Добавить в коллекцию';
    btn.className = 'btn-secondary';
  }
}

function updateStats() {
  elements.totalGames.textContent = games.length;
  
  const totalComments = Object.values(comments).reduce((sum, arr) => sum + arr.length, 0);
  elements.totalComments.textContent = totalComments;
  
  // Count unique users from collections
  const userCount = Object.keys(userCollections).length;
  elements.activeUsers.textContent = userCount;
  
  // Calculate average rating
  const ratedGames = games.filter(g => g.rating > 0);
  const avg = ratedGames.length > 0 
    ? (ratedGames.reduce((sum, g) => sum + g.rating, 0) / ratedGames.length).toFixed(1)
    : '0.0';
  elements.avgRating.textContent = avg;
}

// ---------- Modal controls ----------
function openAddGameModal() {
  if (!isAdmin) return;
  document.getElementById('addGameModal').style.display = 'block';
  lockBodyScroll();
}

function closeAddGameModal() {
  document.getElementById('addGameModal').style.display = 'none';
  unlockBodyScroll();
}

function openGameDetail(gameId) {
  renderGameDetail(gameId);
  document.getElementById('gameDetailModal').style.display = 'block';
  lockBodyScroll();
}

function closeGameDetailModal() {
  document.getElementById('gameDetailModal').style.display = 'none';
  unlockBodyScroll();
  currentGameId = null;
}

function openManageModal() {
  if (!isAdmin) return;
  updateManageInfo();
  document.getElementById('manageModal').style.display = 'block';
  lockBodyScroll();
}

function closeManageModal() {
  document.getElementById('manageModal').style.display = 'none';
  unlockBodyScroll();
}

function openUserCollectionModal() {
  renderUserCollection();
  document.getElementById('userCollectionModal').style.display = 'block';
  lockBodyScroll();
}

function closeUserCollectionModal() {
  document.getElementById('userCollectionModal').style.display = 'none';
  unlockBodyScroll();
}

function openAllCommentsModal() {
  if (!isAdmin) return;
  renderAllComments();
  document.getElementById('allCommentsModal').style.display = 'block';
  lockBodyScroll();
}

function closeAllCommentsModal() {
  document.getElementById('allCommentsModal').style.display = 'none';
  unlockBodyScroll();
}

// ---------- Utility functions ----------
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getStatusText(status) {
  const statuses = {
    planned: 'В планах',
    playing: 'Играю',
    completed: 'Пройдена',
    abandoned: 'Брошена'
  };
  return statuses[status] || status;
}

// iOS scroll lock/unlock
let scrollY = 0;
function lockBodyScroll() {
  scrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
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
  window.scrollTo(0, scrollY);
}

// ---------- Event listeners ----------
function setupEventListeners() {
  // Add game form
  document.getElementById('addGameForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const gameData = {
      title: document.getElementById('gameTitle').value.trim(),
      platform: document.getElementById('gamePlatform').value,
      coverImage: document.getElementById('gameCover').value.trim(),
      releaseYear: document.getElementById('gameYear').value ? parseInt(document.getElementById('gameYear').value) : null,
      genre: document.getElementById('gameGenre').value.trim(),
      developer: document.getElementById('gameDeveloper').value.trim(),
      description: document.getElementById('gameDescription').value.trim()
    };
    
    await addGame(gameData);
    closeAddGameModal();
    this.reset();
  });
  
  // Search and filters
  const searchInput = document.getElementById('searchInput');
  const platformFilter = document.getElementById('platformFilter');
  const sortSelect = document.getElementById('sortSelect');
  
  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (platformFilter) platformFilter.addEventListener('change', applyFilters);
  if (sortSelect) sortSelect.addEventListener('change', applyFilters);
}

function applyFilters() {
  // Filter logic here (simplified)
  renderGames();
}

// ---------- Admin functions ----------
async function clearComments() {
  if (!isAdmin) return;
  if (!confirm('Удалить все комментарии?')) return;
  
  comments = {};
  games.forEach(g => g.commentCount = 0);
  await saveData();
  updateStats();
  alert('Комментарии очищены');
}

async function exportCollection() {
  const data = {
    games,
    comments,
    ratings: userRatings,
    collections: userCollections
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'horror-collection-data.json';
  a.click();
  URL.revokeObjectURL(url);
}

async function importCollection() {
  if (!isAdmin) return;
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      games = data.games || [];
      comments = data.comments || {};
      userRatings = data.ratings || {};
      userCollections = data.collections || {};
      
      await saveData();
      renderGames();
      updateStats();
      alert('Данные импортированы!');
    } catch (e) {
      alert('Ошибка импорта JSON');
      console.error(e);
    }
  };
  
  input.click();
}

async function resetToDefault() {
  if (!isAdmin) return;
  if (!confirm('Сбросить все данные к начальному состоянию?')) return;
  
  games = [];
  comments = {};
  userRatings = {};
  userCollections = {};
  
  await saveData();
  renderGames();
  updateStats();
}

// ---------- User collection functions ----------
function renderUserCollection() {
  if (!currentUser) return;
  
  const collection = userCollections[currentUser.id] || [];
  const grid = document.getElementById('userCollectionGrid');
  
  if (!grid) return;
  
  grid.innerHTML = '';
  
  if (collection.length === 0) {
    grid.innerHTML = '<div class="empty-state">Ваша коллекция пуста</div>';
    return;
  }
  
  collection.forEach(item => {
    const game = games.find(g => g.id === item.gameId);
    if (!game) return;
    
    const card = document.createElement('div');
    card.className = 'game-card';
    card.onclick = () => openGameDetail(item.gameId);
    
    card.innerHTML = `
      <img class="game-cover" src="${item.gameCover || game.coverImage || 'https://via.placeholder.com/280x200/1a1a1a/ffffff?text=No+Cover'}" alt="${game.title}">
      <div class="game-info">
        <div class="game-title">${escapeHtml(game.title)}</div>
        <div class="game-meta">
          <span>${escapeHtml(game.platformName)}</span>
          <span class="collection-status ${item.status}">${getStatusText(item.status)}</span>
        </div>
        <div class="game-stats">
          <span class="game-rating"><i class="fas fa-star"></i> ${game.rating ? game.rating.toFixed(1) : '—'}</span>
          <span class="game-comments"><i class="fas fa-comment"></i> ${game.commentCount || 0}</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function switchCollectionTab(tab) {
  // Tab switching logic
  renderUserCollection();
}
