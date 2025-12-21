// Horror Games Community App

const ADMIN_USER_ID = 321407568; // Замените на ваш Telegram ID

// Telegram WebApp
const tg = window.Telegram?.WebApp || {
  initDataUnsafe: { user: null },
  expand() {},
  setHeaderColor() {},
  setBackgroundColor() {}
};

// App state
const elements = {
  gameGrid: document.getElementById('gameGrid'),
  searchInput: document.getElementById('searchInput'),
  platformFilter: document.getElementById('platformFilter'),
  genreFilter: document.getElementById('genreFilter'),
  sortSelect: document.getElementById('sortSelect'),
  
  totalGamesEl: document.getElementById('totalGames'),
  totalCommentsEl: document.getElementById('totalComments'),
  totalUsersEl: document.getElementById('totalUsers'),
  avgRatingEl: document.getElementById('avgRating'),
  
  currentPageEl: document.getElementById('currentPage'),
  totalPagesEl: document.getElementById('totalPages'),
  
  userGreeting: document.getElementById('userGreeting'),
  userAvatar: document.getElementById('userAvatar'),
  userRole: document.getElementById('userRole'),
  adminControls: document.getElementById('adminControls')
};

let games = [];
let comments = [];
let userCollections = {};
let currentUser = null;
let filteredGames = [];
let currentPage = 1;
const gamesPerPage = 12;
let currentTheme = 'dark';
let currentGameId = null;

// Initialize
document.addEventListener('DOMContentLoaded', initApp);

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
  
  restoreTheme();
  await loadData();
  setupEventListeners();
  renderAll();
}

function setupTelegramUser() {
  try {
    const user = tg.initDataUnsafe.user;
    if (user) {
      currentUser = {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        photoUrl: user.photo_url
      };
      
      elements.userGreeting.textContent = `Привет, ${user.first_name}!`;
      elements.userAvatar.src = user.photo_url || 
        'https://via.placeholder.com/45/8b0000/ffffff?text=👻';
      
      // Check if admin
      if (user.id === ADMIN_USER_ID) {
        elements.userRole.textContent = 'Администратор';
        elements.adminControls.style.display = 'block';
      }
    }
  } catch (e) {
    console.error('Error setting up user:', e);
  }
}

async function loadData() {
  try {
    const response = await fetch('games.json');
    const data = await response.json();
    
    games = data.games || [];
    comments = data.comments || [];
    userCollections = data.userCollections || {};
    
    // Initialize user collection if not exists
    if (currentUser && !userCollections[currentUser.id]) {
      userCollections[currentUser.id] = [];
    }
    
    filteredGames = [...games];
  } catch (error) {
    console.error('Error loading data:', error);
    games = [];
    comments = [];
    userCollections = {};
  }
}

async function saveData() {
  const data = {
    games,
    comments,
    userCollections,
    lastUpdate: new Date().toISOString()
  };
  
  // In production, you would save to a backend API
  console.log('Data would be saved:', data);
  // For GitHub Pages demo, we'll use localStorage
  localStorage.setItem('horrorGamesData', JSON.stringify(data));
}

function setupEventListeners() {
  elements.searchInput?.addEventListener('input', applyFilters);
  elements.platformFilter?.addEventListener('change', applyFilters);
  elements.genreFilter?.addEventListener('change', applyFilters);
  elements.sortSelect?.addEventListener('change', applyFilters);
  
  document.getElementById('addGameForm')?.addEventListener('submit', handleAddGame);
  
  // Star rating
  document.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', function() {
      const value = parseInt(this.dataset.value);
      document.getElementById('selectedRating').value = value;
      
      // Update stars display
      document.querySelectorAll('.star').forEach((s, idx) => {
        if (idx < value) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      });
    });
  });
}

// Render functions
function renderAll() {
  populatePlatformFilter();
  updateStats();
  renderGames();
}

function populatePlatformFilter() {
  if (!elements.platformFilter) return;
  
  const platforms = {};
  games.forEach(game => {
    if (game.platform && !platforms[game.platform]) {
      platforms[game.platform] = getPlatformName(game.platform);
    }
  });
  
  elements.platformFilter.innerHTML = '<option value="">Все платформы</option>';
  Object.entries(platforms).forEach(([key, name]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = name;
    elements.platformFilter.appendChild(opt);
  });
}

function getPlatformName(platform) {
  const names = {
    'ps5': 'PlayStation 5',
    'ps4': 'PlayStation 4',
    'pc': 'PC',
    'xbox': 'Xbox Series X/S',
    'switch': 'Nintendo Switch'
  };
  return names[platform] || platform;
}

function applyFilters() {
  const searchTerm = (elements.searchInput?.value || '').toLowerCase().trim();
  const platform = elements.platformFilter?.value || '';
  const genre = elements.genreFilter?.value || '';
  const sortBy = elements.sortSelect?.value || 'title';
  
  filteredGames = games.filter(game => {
    const matchesSearch = !searchTerm || 
      (game.title || '').toLowerCase().includes(searchTerm) ||
      (game.description || '').toLowerCase().includes(searchTerm);
    
    const matchesPlatform = !platform || game.platform === platform;
    const matchesGenre = !genre || game.genre === genre;
    
    return matchesSearch && matchesPlatform && matchesGenre;
  });
  
  // Sort
  filteredGames.sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        const ratingA = getGameAverageRating(a.id);
        const ratingB = getGameAverageRating(b.id);
        return ratingB - ratingA;
        
      case 'year':
        return (b.releaseYear || 0) - (a.releaseYear || 0);
        
      case 'comments':
        const commentsA = getGameCommentsCount(a.id);
        const commentsB = getGameCommentsCount(b.id);
        return commentsB - commentsA;
        
      case 'title':
      default:
        return (a.title || '').localeCompare(b.title || '');
    }
  });
  
  currentPage = 1;
  renderGames();
}

function renderGames() {
  if (!elements.gameGrid) return;
  
  const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));
  currentPage = Math.min(currentPage, totalPages);
  
  const startIndex = (currentPage - 1) * gamesPerPage;
  const pageGames = filteredGames.slice(startIndex, startIndex + gamesPerPage);
  
  elements.gameGrid.innerHTML = '';
  
  if (pageGames.length === 0) {
    elements.gameGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
        <i class="fas fa-gamepad" style="font-size: 3rem; margin-bottom: 20px;"></i>
        <p>Игры не найдены</p>
      </div>
    `;
    return;
  }
  
  pageGames.forEach(game => {
    const card = document.createElement('div');
    card.className = 'game-card';
    
    const avgRating = getGameAverageRating(game.id);
    const commentsCount = getGameCommentsCount(game.id);
    const inCollection = currentUser && 
      userCollections[currentUser.id]?.includes(game.id);
    
    card.innerHTML = `
      <img class="game-cover" src="${game.coverImage || 'https://via.placeholder.com/280x200/1a1a1a/ffffff?text=No+Cover'}" 
           alt="${escapeHtml(game.title)}">
      <div class="game-actions">
        <button class="action-btn comment-btn" title="Комментировать" 
                onclick="openCommentModal(${game.id}); event.stopPropagation();">
          <i class="fas fa-comment"></i>
        </button>
        <button class="action-btn collection-btn" title="${inCollection ? 'В коллекции' : 'Добавить в коллекцию'}" 
                onclick="toggleCollection(${game.id}); event.stopPropagation();">
          <i class="fas fa-${inCollection ? 'heart' : 'heart-plus'}"></i>
        </button>
        ${currentUser?.id === ADMIN_USER_ID ? `
          <button class="action-btn edit-btn" title="Редактировать" 
                  onclick="editGame(${game.id}); event.stopPropagation();">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn delete-btn" title="Удалить" 
                  onclick="deleteGame(${game.id}); event.stopPropagation();">
            <i class="fas fa-trash"></i>
          </button>
        ` : ''}
      </div>
      <div class="game-info">
        <div class="game-title">${escapeHtml(game.title)}</div>
        <div class="game-meta">
          <span>${escapeHtml(getPlatformName(game.platform) || '')}</span>
          <span>${game.releaseYear || '—'}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 10px;">
          <span class="game-rating">
            ${avgRating > 0 ? `<i class="fas fa-star"></i>${avgRating.toFixed(1)}` : 'Без оценки'}
          </span>
          <span style="color: var(--text-secondary); font-size: 0.9rem;">
            <i class="fas fa-comment"></i> ${commentsCount}
          </span>
        </div>
        ${currentUser ? `
          <div class="collection-status ${inCollection ? 'in-collection' : 'not-in-collection'}">
            ${inCollection ? 'В вашей коллекции' : 'Не в коллекции'}
          </div>
        ` : ''}
      </div>
    `;
    
    card.onclick = () => openGameDetail(game.id);
    elements.gameGrid.appendChild(card);
  });
  
  updatePagination();
}

function updateStats() {
  elements.totalGamesEl.textContent = games.length;
  elements.totalCommentsEl.textContent = comments.length;
  
  // Count unique users
  const uniqueUsers = new Set();
  comments.forEach(c => uniqueUsers.add(c.userId));
  Object.keys(userCollections).forEach(id => uniqueUsers.add(parseInt(id)));
  elements.totalUsersEl.textContent = uniqueUsers.size;
  
  // Calculate average rating
  const ratedComments = comments.filter(c => c.rating > 0);
  const avgRating = ratedComments.length > 0
    ? ratedComments.reduce((sum, c) => sum + c.rating, 0) / ratedComments.length
    : 0;
  elements.avgRatingEl.textContent = avgRating.toFixed(1);
}

function updatePagination() {
  const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));
  elements.totalPagesEl.textContent = totalPages;
  elements.currentPageEl.textContent = currentPage;
}

function getGameAverageRating(gameId) {
  const gameComments = comments.filter(c => c.gameId === gameId && c.rating > 0);
  if (gameComments.length === 0) return 0;
  return gameComments.reduce((sum, c) => sum + c.rating, 0) / gameComments.length;
}

function getGameCommentsCount(gameId) {
  return comments.filter(c => c.gameId === gameId).length;
}

// Game CRUD (Admin only)
async function handleAddGame(e) {
  e.preventDefault();
  
  const newGame = {
    id: Date.now(),
    title: document.getElementById('gameTitle').value.trim(),
    platform: document.getElementById('gamePlatform').value,
    coverImage: document.getElementById('gameCover').value.trim(),
    releaseYear: parseInt(document.getElementById('gameYear').value),
    genre: document.getElementById('gameGenre').value,
    developer: document.getElementById('gameDeveloper').value.trim(),
    publisher: document.getElementById('gamePublisher').value.trim(),
    description: document.getElementById('gameDescription').value.trim(),
    addedBy: currentUser?.id || 'admin',
    addedDate: new Date().toISOString()
  };
  
  games.unshift(newGame);
  filteredGames = [...games];
  
  await saveData();
  closeAddGameModal();
  e.target.reset();
  renderAll();
}

function editGame(id) {
  const game = games.find(g => g.id === id);
  if (!game) return;
  
  // Populate form
  document.getElementById('gameTitle').value = game.title;
  document.getElementById('gamePlatform').value = game.platform;
  document.getElementById('gameCover').value = game.coverImage;
  document.getElementById('gameYear').value = game.releaseYear;
  document.getElementById('gameGenre').value = game.genre;
  document.getElementById('gameDeveloper').value = game.developer || '';
  document.getElementById('gamePublisher').value = game.publisher || '';
  document.getElementById('gameDescription').value = game.description || '';
  
  // Change form to edit mode
  const form = document.getElementById('addGameForm');
  const submitBtn = form.querySelector('.btn-primary');
  submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить изменения';
  submitBtn.onclick = async (e) => {
    e.preventDefault();
    
    game.title = document.getElementById('gameTitle').value.trim();
    game.platform = document.getElementById('gamePlatform').value;
    game.coverImage = document.getElementById('gameCover').value.trim();
    game.releaseYear = parseInt(document.getElementById('gameYear').value);
    game.genre = document.getElementById('gameGenre').value;
    game.developer = document.getElementById('gameDeveloper').value.trim();
    game.publisher = document.getElementById('gamePublisher').value.trim();
    game.description = document.getElementById('gameDescription').value.trim();
    
    await saveData();
    closeAddGameModal();
    renderAll();
  };
  
  openAddGameModal();
}

async function deleteGame(id) {
  if (!confirm('Удалить игру из каталога? Все комментарии также будут удалены.')) return;
  
  // Remove game
  games = games.filter(g => g.id !== id);
  filteredGames = filteredGames.filter(g => g.id !== id);
  
  // Remove comments
  comments = comments.filter(c => c.gameId !== id);
  
  // Remove from all collections
  Object.keys(userCollections).forEach(userId => {
    userCollections[userId] = userCollections[userId].filter(gameId => gameId !== id);
  });
  
  await saveData();
  renderAll();
}

// Comments
function openCommentModal(gameId) {
  if (!currentUser) {
    alert('Войдите через Telegram, чтобы оставлять комментарии');
    return;
  }
  
  currentGameId = gameId;
  
  // Reset stars
  document.querySelectorAll('.star').forEach(star => {
    star.classList.remove('active');
  });
  document.getElementById('selectedRating').value = 0;
  document.getElementById('commentText').value = '';
  
  document.getElementById('commentModal').style.display = 'block';
}

function closeCommentModal() {
  document.getElementById('commentModal').style.display = 'none';
}

async function submitComment() {
  const rating = parseInt(document.getElementById('selectedRating').value);
  const text = document.getElementById('commentText').value.trim();
  
  if (!text) {
    alert('Введите текст комментария');
    return;
  }
  
  const newComment = {
    id: Date.now(),
    gameId: currentGameId,
    userId: currentUser.id,
    userName: currentUser.firstName + (currentUser.lastName ? ' ' + currentUser.lastName : ''),
    userAvatar: currentUser.photoUrl,
    rating: rating,
    text: text,
    date: new Date().toISOString()
  };
  
  comments.unshift(newComment);
  await saveData();
  closeCommentModal();
  renderAll();
}

// User Collections
async function toggleCollection(gameId) {
  if (!currentUser) {
    alert('Войдите через Telegram, чтобы добавлять игры в коллекцию');
    return;
  }
  
  const userCollection = userCollections[currentUser.id] || [];
  const index = userCollection.indexOf(gameId);
  
  if (index === -1) {
    // Add to collection
    userCollection.push(gameId);
  } else {
    // Remove from collection
    userCollection.splice(index, 1);
  }
  
  userCollections[currentUser.id] = userCollection;
  await saveData();
  renderGames(); // Re-render to update button state
}

function openMyCollection() {
  if (!currentUser) {
    alert('Войдите через Telegram, чтобы просмотреть коллекцию');
    return;
  }
  
  const userCollection = userCollections[currentUser.id] || [];
  const collectionGrid = document.getElementById('collectionGrid');
  const emptyCollection = document.getElementById('emptyCollection');
  
  if (userCollection.length === 0) {
    collectionGrid.style.display = 'none';
    emptyCollection.style.display = 'block';
  } else {
    collectionGrid.style.display = 'grid';
    emptyCollection.style.display = 'none';
    
    collectionGrid.innerHTML = '';
    
    userCollection.forEach(gameId => {
      const game = games.find(g => g.id === gameId);
      if (!game) return;
      
      const card = document.createElement('div');
      card.className = 'game-card';
      card.innerHTML = `
        <img class="game-cover" src="${game.coverImage}" alt="${escapeHtml(game.title)}">
        <div class="game-info">
          <div class="game-title">${escapeHtml(game.title)}</div>
          <div class="game-meta">
            <span>${escapeHtml(getPlatformName(game.platform))}</span>
            <span>${game.releaseYear}</span>
          </div>
          <button class="action-btn delete-btn" style="margin-top: 10px; width: 100%;" 
                  onclick="toggleCollection(${game.id})">
            <i class="fas fa-trash"></i> Удалить из коллекции
          </button>
        </div>
      `;
      card.onclick = () => openGameDetail(game.id);
      collectionGrid.appendChild(card);
    });
  }
  
  document.getElementById('collectionModal').style.display = 'block';
}

function closeCollectionModal() {
  document.getElementById('collectionModal').style.display = 'none';
}

// Game Detail Modal
function openGameDetail(id) {
  const game = games.find(g => g.id === id);
  if (!game) return;
  
  const gameComments = comments.filter(c => c.gameId === id);
  const avgRating = getGameAverageRating(id);
  
  let commentsHtml = '';
  if (gameComments.length > 0) {
    gameComments.forEach(comment => {
      commentsHtml += `
        <div class="comment-item">
          <div class="comment-header">
            <div class="comment-user">
              <img class="comment-user-avatar" src="${comment.userAvatar || 'https://via.placeholder.com/32/8b0000/ffffff?text=U'}" 
                   alt="${escapeHtml(comment.userName)}">
              <span class="comment-user-name">${escapeHtml(comment.userName)}</span>
            </div>
            <div class="comment-date">${formatDate(comment.date)}</div>
          </div>
          ${comment.rating > 0 ? `
            <div style="color: #ffd700; margin: 5px 0;">
              ${'★'.repeat(comment.rating)}${'☆'.repeat(10 - comment.rating)}
              <span style="color: var(--text-secondary); margin-left: 5px;">${comment.rating}/10</span>
            </div>
          ` : ''}
          <div class="comment-text">${escapeHtml(comment.text)}</div>
        </div>
      `;
    });
  } else {
    commentsHtml = '<p style="color: var(--text-secondary); text-align: center;">Пока нет комментариев</p>';
  }
  
  document.getElementById('detailTitle').textContent = game.title;
  document.getElementById('gameDetailContent').innerHTML = `
    <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 30px;">
      <img src="${game.coverImage}" alt="${escapeHtml(game.title)}" 
           style="width: 280px; border-radius: 15px; border: 1px solid var(--border-color);">
      <div style="flex: 1; min-width: 250px;">
        <p><b>Платформа:</b> ${escapeHtml(getPlatformName(game.platform))}</p>
        <p><b>Год релиза:</b> ${game.releaseYear}</p>
        <p><b>Жанр:</b> ${escapeHtml(game.genre)}</p>
        ${game.developer ? `<p><b>Разработчик:</b> ${escapeHtml(game.developer)}</p>` : ''}
        ${game.publisher ? `<p><b>Издатель:</b> ${escapeHtml(game.publisher)}</p>` : ''}
        <p><b>Средняя оценка:</b> ${avgRating > 0 ? avgRating.toFixed(1) + '/10' : 'Нет оценок'}</p>
        <p><b>Комментариев:</b> ${gameComments.length}</p>
      </div>
    </div>
    
    ${game.description ? `
      <div style="margin-bottom: 30px;">
        <h3 style="margin-bottom: 10px;">Описание</h3>
        <p>${escapeHtml(game.description)}</p>
      </div>
    ` : ''}
    
    <div class="comments-section">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3>Комментарии (${gameComments.length})</h3>
        <button class="btn-primary" onclick="openCommentModal(${game.id})">
          <i class="fas fa-comment"></i> Добавить комментарий
        </button>
      </div>
      <div class="comments-list">
        ${commentsHtml}
      </div>
    </div>
  `;
  
  document.getElementById('gameDetailModal').style.display = 'block';
}

function closeGameDetailModal() {
  document.getElementById('gameDetailModal').style.display = 'none';
}

// Tab switching
function switchTab(tabName) {
  // Update active tab
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  
  // Apply filters based on tab
  switch (tabName) {
    case 'top-rated':
      filteredGames = [...games].sort((a, b) => {
        const ratingA = getGameAverageRating(a.id);
        const ratingB = getGameAverageRating(b.id);
        return ratingB - ratingA;
      }).filter(g => getGameAverageRating(g.id) > 0);
      break;
      
    case 'recent-comments':
      filteredGames = [...games].filter(g => getGameCommentsCount(g.id) > 0)
        .sort((a, b) => getGameCommentsCount(b.id) - getGameCommentsCount(a.id));
      break;
      
    case 'all-games':
    default:
      filteredGames = [...games];
      break;
  }
  
  currentPage = 1;
  renderGames();
}

// Theme
function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  localStorage.setItem('horrorTheme', currentTheme);
}

function restoreTheme() {
  const t = localStorage.getItem('horrorTheme');
  if (t) currentTheme = t;
  document.documentElement.setAttribute('data-theme', currentTheme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

// Modal functions
function openAddGameModal() {
  document.getElementById('addGameModal').style.display = 'block';
}
function closeAddGameModal() {
  document.getElementById('addGameModal').style.display = 'none';
  // Reset form
  const form = document.getElementById('addGameForm');
  form.reset();
  const submitBtn = form.querySelector('.btn-primary');
  submitBtn.innerHTML = '<i class="fas fa-save"></i> Добавить игру';
  submitBtn.onclick = handleAddGame;
}

// Pagination
function nextPage() {
  const totalPages = Math.ceil(filteredGames.length / gamesPerPage);
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

// Utility functions
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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
