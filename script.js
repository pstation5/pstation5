// Game Collection Hub - Community Edition (Fixed)

// ========== CONFIGURATION ==========
const ADMIN_TELEGRAM_ID = "321407568"; // Ваш Telegram ID
const APP_VERSION = '2.0.1';

// ========== TELEGRAM INIT ==========
const tg = (window.Telegram && window.Telegram.WebApp) 
  ? window.Telegram.WebApp
  : {
      initDataUnsafe: {},
      expand() {},
      setHeaderColor() {},
      setBackgroundColor() {},
      CloudStorage: null
    };

// ========== IOS SAFE MODALS ==========
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

// ========== DATA STRUCTURES ==========
let currentUser = {
  id: null,
  name: 'Гость',
  avatar: '',
  isAdmin: false,
  joinDate: new Date().toISOString(),
  settings: {
    notifications: true,
    theme: 'dark',
    language: 'ru'
  }
};

let gamesCatalog = [];
let userCollection = [];
let userComments = [];
let allUsers = [];
let allComments = [];
let notifications = [];

let filteredGames = [];
let currentPage = 1;
const gamesPerPage = 12;
let currentTheme = 'dark';

// ========== ELEMENTS ==========
const elements = {
  gameGrid: document.getElementById('gameGrid'),
  searchInput: document.getElementById('searchInput'),
  platformFilter: document.getElementById('platformFilter'),
  genreFilter: document.getElementById('genreFilter'),
  sortSelect: document.getElementById('sortSelect'),
  adminPanel: document.getElementById('adminPanel'),
  adminToggleBtn: document.getElementById('adminToggleBtn'),
  userGreeting: document.getElementById('userGreeting'),
  userAvatar: document.getElementById('userAvatar'),
  userType: document.getElementById('userType'),
  currentPageEl: document.getElementById('currentPage'),
  totalPagesEl: document.getElementById('totalPages'),
  totalCatalogGames: document.getElementById('totalCatalogGames'),
  activeUsers: document.getElementById('activeUsers'),
  notificationBadge: document.getElementById('notificationBadge')
};

// ========== MODAL MANAGEMENT ==========
let currentModal = null;

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    if (currentModal) {
      closeModal(currentModal);
    }
    
    modal.style.display = 'block';
    currentModal = modalId;
    lockBodyScroll();
    
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
      closeBtn.onclick = () => closeModal(modalId);
    }
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeModal(modalId);
      }
    };
  }
}

function closeModal(modalId) {
  if (typeof modalId === 'string') {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
  } else if (modalId && modalId.style) {
    modalId.style.display = 'none';
  }
  
  currentModal = null;
  unlockBodyScroll();
}

// Функции для удобства
function closeAddGameModal() {
  closeModal('addGameModal');
  document.getElementById('addGameForm').reset();
}

function closeGameDetailModal() {
  closeModal('gameDetailModal');
}

function closeMyCollectionModal() {
  closeModal('myCollectionModal');
}

function closeCommentsModal() {
  closeModal('commentsModal');
  window.currentCommentGameId = null;
  window.currentCommentGameTitle = null;
  if (document.getElementById('newComment')) {
    document.getElementById('newComment').value = '';
  }
  setStarRating(0);
}

function closeProfileModal() {
  closeModal('profileModal');
}

function closeStatsModal() {
  closeModal('statsModal');
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async () => {
  initApp();
});

async function initApp() {
  if (window.Telegram && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    try {
      tg.expand();
      tg.setHeaderColor('#8b0000');
      tg.setBackgroundColor('#121212');
      setupTelegramUser();
    } catch (e) {
      console.warn('Telegram setup error:', e);
      setupMockUser(true);
    }
  } else {
    setupMockUser(true);
  }

  await loadAllData();
  
  setupEventListeners();
  renderGamesCatalog();
  updateFilters();
  updateHeaderStats();
  updateNotificationBadge();
  
  checkAdminStatus();
  applyTheme();
}

// ========== USER MANAGEMENT ==========
function setupTelegramUser() {
  try {
    const user = tg.initDataUnsafe.user;
    if (user) {
      const userId = String(user.id);
      const adminId = String(ADMIN_TELEGRAM_ID);
      
      currentUser.id = userId;
      currentUser.name = `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;
      currentUser.avatar = user.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=8b0000&color=fff`;
      currentUser.isAdmin = userId === adminId;
      
      elements.userGreeting.textContent = `Привет, ${user.first_name}!`;
      elements.userAvatar.src = currentUser.avatar;
      elements.userType.textContent = currentUser.isAdmin ? 'Администратор' : 'Пользователь';
      
      registerUser(currentUser);
    }
  } catch (e) {
    console.warn('Telegram user setup failed:', e);
    setupMockUser(true);
  }
}

function setupMockUser(forceAdmin = false) {
  const mockId = "999999999";
  const isAdmin = forceAdmin || mockId === String(ADMIN_TELEGRAM_ID);
  
  currentUser = {
    id: mockId,
    name: isAdmin ? 'Администратор' : `Игрок${mockId}`,
    avatar: `https://ui-avatars.com/api/?name=${isAdmin ? 'Admin' : 'Player'}&background=8b0000&color=fff`,
    isAdmin: isAdmin,
    joinDate: new Date().toISOString(),
    settings: {
      notifications: true,
      theme: 'dark',
      language: 'ru'
    }
  };
  
  elements.userGreeting.textContent = `Привет, ${currentUser.name}!`;
  elements.userAvatar.src = currentUser.avatar;
  elements.userType.textContent = currentUser.isAdmin ? 'Администратор' : 'Пользователь';
  
  registerUser(currentUser);
}

function registerUser(user) {
  const existingUser = allUsers.find(u => u.id === user.id);
  if (!existingUser) {
    allUsers.push({
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      joinDate: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      stats: {
        gamesAdded: 0,
        commentsPosted: 0,
        ratingsGiven: 0
      }
    });
    saveAllData();
  } else {
    existingUser.lastActive = new Date().toISOString();
  }
}

// ========== ADMIN FUNCTIONS ==========
function checkAdminStatus() {
  if (currentUser.isAdmin) {
    elements.adminPanel.style.display = 'block';
    elements.adminToggleBtn.classList.add('admin-active');
  } else {
    elements.adminPanel.style.display = 'none';
    elements.adminToggleBtn.classList.remove('admin-active');
  }
}

function toggleAdminMode() {
  if (!currentUser.isAdmin) {
    showNotification('Только администратор может использовать этот режим', 'warning');
    return;
  }
  
  if (elements.adminPanel.style.display === 'block') {
    elements.adminPanel.style.display = 'none';
    elements.adminToggleBtn.classList.remove('admin-active');
  } else {
    elements.adminPanel.style.display = 'block';
    elements.adminToggleBtn.classList.add('admin-active');
  }
}

// ========== DATA MANAGEMENT ==========
async function loadAllData() {
  const saved = localStorage.getItem('gameCollectionHub');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      gamesCatalog = data.gamesCatalog || [];
      allUsers = data.allUsers || [];
      allComments = data.allComments || [];
      notifications = data.notifications || [];
      
      const userKey = `user_${currentUser.id}`;
      const userData = localStorage.getItem(userKey);
      if (userData) {
        const user = JSON.parse(userData);
        userCollection = user.collection || [];
        userComments = user.comments || [];
        currentUser.settings = user.settings || currentUser.settings;
      }
    } catch (e) {
      console.error('Data load error:', e);
    }
  }
  
  if (gamesCatalog.length === 0) {
    gamesCatalog = getSampleGames();
  }
  
  filteredGames = [...gamesCatalog];
}

function saveAllData() {
  const publicData = {
    gamesCatalog,
    allUsers,
    allComments,
    notifications,
    lastUpdate: new Date().toISOString()
  };
  localStorage.setItem('gameCollectionHub', JSON.stringify(publicData));
  
  const userKey = `user_${currentUser.id}`;
  const userData = {
    collection: userCollection,
    comments: userComments,
    settings: currentUser.settings
  };
  localStorage.setItem(userKey, JSON.stringify(userData));
}

function getSampleGames() {
  return [
    {
      id: 1,
      title: "The Legend of Zelda: Tears of the Kingdom",
      platform: "switch",
      platformName: "Nintendo Switch",
      genre: "adventure",
      genreName: "Приключение",
      year: 2023,
      coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co6bjj.jpg",
      developer: "Nintendo",
      description: "Новое приключение Линка в королевстве Хайрул.",
      addedBy: ADMIN_TELEGRAM_ID,
      addedDate: new Date().toISOString(),
      rating: 4.8,
      ratingCount: 1250,
      tags: ["open-world", "action", "fantasy"]
    }
  ];
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
  elements.searchInput?.addEventListener('input', applyFilters);
  elements.platformFilter?.addEventListener('change', applyFilters);
  elements.genreFilter?.addEventListener('change', applyFilters);
  elements.sortSelect?.addEventListener('change', applyFilters);
  
  document.getElementById('addGameForm')?.addEventListener('submit', handleAddGame);
  
  elements.searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') applyFilters();
  });
}

// ========== RENDER FUNCTIONS ==========
function updateFilters() {
  const platforms = [...new Set(gamesCatalog.map(g => g.platformName).filter(Boolean))];
  elements.platformFilter.innerHTML = '<option value="">Все платформы</option>';
  platforms.forEach(platform => {
    const option = document.createElement('option');
    option.value = platform;
    option.textContent = platform;
    elements.platformFilter.appendChild(option);
  });
  
  const genres = [...new Set(gamesCatalog.map(g => g.genreName).filter(Boolean))];
  elements.genreFilter.innerHTML = '<option value="">Все жанры</option>';
  genres.forEach(genre => {
    const option = document.createElement('option');
    option.value = genre;
    option.textContent = genre;
    elements.genreFilter.appendChild(option);
  });
}

function applyFilters() {
  const searchTerm = (elements.searchInput?.value || '').toLowerCase().trim();
  const platform = elements.platformFilter?.value || '';
  const genre = elements.genreFilter?.value || '';
  const sortBy = elements.sortSelect?.value || 'rating';
  
  filteredGames = gamesCatalog.filter(game => {
    const matchesSearch = !searchTerm || 
      (game.title || '').toLowerCase().includes(searchTerm) ||
      (game.developer || '').toLowerCase().includes(searchTerm) ||
      (game.description || '').toLowerCase().includes(searchTerm) ||
      (game.tags || []).some(tag => tag.toLowerCase().includes(searchTerm));
    
    const matchesPlatform = !platform || game.platformName === platform;
    const matchesGenre = !genre || game.genreName === genre;
    
    return matchesSearch && matchesPlatform && matchesGenre;
  });
  
  filteredGames.sort((a, b) => {
    switch (sortBy) {
      case 'rating': return (b.rating || 0) - (a.rating || 0);
      case 'popular': return (b.ratingCount || 0) - (a.ratingCount || 0);
      case 'newest': return new Date(b.addedDate) - new Date(a.addedDate);
      case 'year': return b.year - a.year;
      case 'title': return (a.title || '').localeCompare(b.title || '');
      default: return 0;
    }
  });
  
  currentPage = 1;
  renderGamesCatalog();
  updateHeaderStats();
}

function renderGamesCatalog() {
  if (!elements.gameGrid) return;
  
  const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));
  currentPage = Math.min(currentPage, totalPages);
  
  const startIndex = (currentPage - 1) * gamesPerPage;
  const pageGames = filteredGames.slice(startIndex, startIndex + gamesPerPage);
  
  elements.gameGrid.innerHTML = '';
  
  if (pageGames.length === 0) {
    elements.gameGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
        <i class="fas fa-gamepad" style="font-size: 3rem; margin-bottom: 20px;"></i>
        <h3>Игры не найдены</h3>
        <p>Попробуйте изменить параметры поиска</p>
      </div>
    `;
    return;
  }
  
  pageGames.forEach(game => {
    const isInCollection = userCollection.some(g => g.id === game.id);
    const userComment = userComments.find(c => c.gameId === game.id);
    const userRating = userComment ? userComment.rating : null;
    
    const card = document.createElement('div');
    card.className = 'game-card';
    
    // Проверяем, что все данные существуют перед их использованием
    const gameTitle = game.title || 'Без названия';
    const gameCover = game.coverImage || 'https://via.placeholder.com/280x200/1a1a1a/ffffff?text=No+Cover';
    const platformName = game.platformName || '';
    const gameYear = game.year || '';
    const gameRating = game.rating ? game.rating.toFixed(1) : 'Нет оценок';
    const ratingCount = game.ratingCount || 0;
    const commentsCount = getGameCommentsCount(game.id);
    
    card.innerHTML = `
      <img class="game-cover" src="${escapeHtml(gameCover)}" alt="${escapeHtml(gameTitle)}">
      ${currentUser.isAdmin ? `
        <div class="game-admin-actions">
          <button class="admin-action-btn edit-game-btn" onclick="editGame(${game.id}); event.stopPropagation()">
            <i class="fas fa-edit"></i>
          </button>
          <button class="admin-action-btn delete-game-btn" onclick="deleteGame(${game.id}); event.stopPropagation()">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      ` : ''}
      <div class="game-info">
        <div class="game-title">${escapeHtml(gameTitle)}</div>
        <div class="game-meta">
          <span>${escapeHtml(platformName)}</span>
          <span>${gameYear}</span>
        </div>
        <div class="game-rating">
          <i class="fas fa-star"></i>
          <span>${gameRating}</span>
          <small>(${ratingCount})</small>
          ${userRating ? `<span class="user-rating">Ваша оценка: ${userRating}/5</span>` : ''}
        </div>
        <div class="game-actions">
          <button class="add-to-collection-btn ${isInCollection ? 'in-collection' : ''}" 
                  onclick="toggleGameCollection(${game.id}); event.stopPropagation()">
            <i class="fas fa-heart"></i>
            ${isInCollection ? 'В коллекции' : 'В коллекцию'}
          </button>
          <button class="comments-btn" onclick="openGameComments(${game.id}); event.stopPropagation()">
            <i class="fas fa-comment"></i>
            ${commentsCount}
          </button>
        </div>
      </div>
    `;
    
    card.onclick = () => openGameDetail(game.id);
    elements.gameGrid.appendChild(card);
  });
  
  elements.currentPageEl.textContent = currentPage;
  elements.totalPagesEl.textContent = totalPages;
}

function updateHeaderStats() {
  elements.totalCatalogGames.textContent = `${gamesCatalog.length} игр`;
  elements.activeUsers.textContent = allUsers.length;
}

// ========== GAME COLLECTION FUNCTIONS ==========
function toggleGameCollection(gameId) {
  const game = gamesCatalog.find(g => g.id === gameId);
  if (!game) {
    showNotification('Игра не найдена', 'error');
    return;
  }
  
  const index = userCollection.findIndex(g => g.id === gameId);
  
  if (index === -1) {
    userCollection.push({
      id: game.id,
      title: game.title,
      platform: game.platform,
      platformName: game.platformName,
      coverImage: game.coverImage,
      year: game.year,
      addedDate: new Date().toISOString(),
      status: 'planned',
      userRating: null,
      notes: '',
      playtime: 0,
      completion: 0
    });
    showNotification('Игра добавлена в вашу коллекцию!', 'success');
  } else {
    userCollection.splice(index, 1);
    showNotification('Игра удалена из коллекции', 'info');
  }
  
  saveAllData();
  renderGamesCatalog();
  updateMyCollectionStats();
}

function openMyCollection() {
  updateMyCollectionStats();
  renderMyCollection();
  openModal('myCollectionModal');
}

function renderMyCollection() {
  const container = document.getElementById('myCollectionGrid');
  if (!container) return;
  
  if (userCollection.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">
        <i class="fas fa-heart" style="font-size: 3rem; margin-bottom: 20px;"></i>
        <h3>Коллекция пуста</h3>
        <p>Добавляйте игры, нажимая на сердечко</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  userCollection.forEach(game => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <img class="game-cover" src="${game.coverImage || 'https://via.placeholder.com/280x200/1a1a1a/ffffff?text=No+Cover'}" alt="${escapeHtml(game.title)}">
      <div class="game-info">
        <div class="game-title">${escapeHtml(game.title)}</div>
        <div class="game-meta">
          <span>${escapeHtml(game.platformName || '')}</span>
          <span>${game.year || ''}</span>
        </div>
        ${game.userRating ? `
          <div class="game-rating">
            <i class="fas fa-star"></i>
            <span>${game.userRating}/5</span>
          </div>
        ` : ''}
        ${game.completion ? `
          <div class="completion-bar">
            <div class="completion-fill" style="width: ${game.completion}%"></div>
            <span>${game.completion}% завершено</span>
          </div>
        ` : ''}
        <div class="collection-actions">
          <button class="btn-small" onclick="editCollectionGame(${game.id}); event.stopPropagation()">
            <i class="fas fa-edit"></i> Изменить
          </button>
          <button class="btn-small btn-danger" onclick="removeFromCollection(${game.id}); event.stopPropagation()">
            <i class="fas fa-trash"></i> Удалить
          </button>
        </div>
      </div>
    `;
    card.onclick = () => openGameDetail(game.id);
    container.appendChild(card);
  });
}

function updateMyCollectionStats() {
  const myGamesCount = document.getElementById('myGamesCount');
  const myAvgRating = document.getElementById('myAvgRating');
  const myCommentsCount = document.getElementById('myCommentsCount');
  const myPlaytime = document.getElementById('myPlaytime');
  
  if (myGamesCount) myGamesCount.textContent = userCollection.length;
  
  const ratedGames = userCollection.filter(g => g.userRating);
  const avgRating = ratedGames.length > 0
    ? (ratedGames.reduce((sum, g) => sum + g.userRating, 0) / ratedGames.length).toFixed(1)
    : '0.0';
  if (myAvgRating) myAvgRating.textContent = avgRating;
  
  if (myCommentsCount) myCommentsCount.textContent = userComments.length;
  
  if (myPlaytime) {
    const totalPlaytime = userCollection.reduce((sum, g) => sum + (g.playtime || 0), 0);
    myPlaytime.textContent = `${Math.floor(totalPlaytime / 60)}ч ${totalPlaytime % 60}м`;
  }
}

function editCollectionGame(gameId) {
  const game = userCollection.find(g => g.id === gameId);
  if (!game) return;
  
  const modalContent = `
    <div class="form-group">
      <label>Статус</label>
      <select id="editGameStatus">
        <option value="planned" ${game.status === 'planned' ? 'selected' : ''}>В планах</option>
        <option value="playing" ${game.status === 'playing' ? 'selected' : ''}>Играю</option>
        <option value="completed" ${game.status === 'completed' ? 'selected' : ''}>Пройдена</option>
        <option value="abandoned" ${game.status === 'abandoned' ? 'selected' : ''}>Заброшена</option>
      </select>
    </div>
    <div class="form-group">
      <label>Ваша оценка (1-10)</label>
      <input type="number" id="editGameRating" min="1" max="10" value="${game.userRating || ''}" step="0.5">
    </div>
    <div class="form-group">
      <label>Время игры (часы)</label>
      <input type="number" id="editGamePlaytime" min="0" value="${Math.floor((game.playtime || 0) / 60)}">
    </div>
    <div class="form-group">
      <label>Процент завершения</label>
      <input type="range" id="editGameCompletion" min="0" max="100" value="${game.completion || 0}">
      <span id="completionValue">${game.completion || 0}%</span>
    </div>
    <div class="form-group">
      <label>Заметки</label>
      <textarea id="editGameNotes" rows="3">${game.notes || ''}</textarea>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal('editCollectionModal')">Отмена</button>
      <button class="btn-primary" onclick="saveCollectionGame(${gameId})">Сохранить</button>
    </div>
  `;
  
  const editContent = document.getElementById('editCollectionContent');
  if (editContent) {
    editContent.innerHTML = modalContent;
    
    const completionInput = document.getElementById('editGameCompletion');
    const completionValue = document.getElementById('completionValue');
    
    if (completionInput && completionValue) {
      completionInput.addEventListener('input', (e) => {
        completionValue.textContent = e.target.value + '%';
      });
    }
  }
  
  openModal('editCollectionModal');
}

function saveCollectionGame(gameId) {
  const gameIndex = userCollection.findIndex(g => g.id === gameId);
  if (gameIndex === -1) return;
  
  const status = document.getElementById('editGameStatus').value;
  const rating = document.getElementById('editGameRating').value;
  const playtime = document.getElementById('editGamePlaytime').value;
  const completion = document.getElementById('editGameCompletion').value;
  const notes = document.getElementById('editGameNotes').value;
  
  userCollection[gameIndex] = {
    ...userCollection[gameIndex],
    status: status,
    userRating: rating ? parseFloat(rating) : null,
    playtime: playtime ? parseInt(playtime) * 60 : 0,
    completion: parseInt(completion),
    notes: notes
  };
  
  saveAllData();
  closeModal('editCollectionModal');
  renderMyCollection();
  updateMyCollectionStats();
  showNotification('Настройки игры обновлены', 'success');
}

function removeFromCollection(gameId) {
  if (!confirm('Удалить игру из коллекции?')) return;
  
  userCollection = userCollection.filter(g => g.id !== gameId);
  saveAllData();
  renderMyCollection();
  updateMyCollectionStats();
  renderGamesCatalog();
  showNotification('Игра удалена из коллекции', 'info');
}

// ========== COMMENTS SYSTEM ==========
function getGameCommentsCount(gameId) {
  return allComments.filter(c => c.gameId === gameId).length;
}

function openGameComments(gameId) {
  const game = gamesCatalog.find(g => g.id === gameId);
  if (!game) return;
  
  window.currentCommentGameId = gameId;
  window.currentCommentGameTitle = game.title;
  
  renderComments(gameId);
  setupStarRating();
  openModal('commentsModal');
}

function renderComments(gameId) {
  const container = document.getElementById('commentsList');
  if (!container) return;
  
  const gameComments = allComments.filter(c => c.gameId === gameId);
  
  if (gameComments.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 20px; color: var(--text-secondary);">
        <i class="fas fa-comment-slash" style="font-size: 2rem; margin-bottom: 10px;"></i>
        <p>Пока нет комментариев. Будьте первым!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  gameComments.forEach(comment => {
    const isOwnComment = comment.userId === currentUser.id;
    const commentElement = document.createElement('div');
    commentElement.className = 'comment-item';
    
    const starsHtml = comment.rating ? `
      <div class="comment-rating">
        ${Array(5).fill(0).map((_, i) => 
          `<i class="fas fa-star ${i < comment.rating ? 'active' : ''}"></i>`
        ).join('')}
      </div>
    ` : '';
    
    const repliesHtml = comment.replies && comment.replies.length > 0 ? `
      <div class="comment-replies">
        ${comment.replies.map(reply => `
          <div class="reply-item">
            <div class="reply-header">
              <strong>${escapeHtml(reply.userName)}</strong>
              <span class="reply-date">${formatDate(reply.date)}</span>
            </div>
            <div class="reply-text">${escapeHtml(reply.text)}</div>
          </div>
        `).join('')}
      </div>
    ` : '';
    
    commentElement.innerHTML = `
      <div class="comment-header">
        <div class="comment-user">
          <img class="comment-avatar" src="${comment.userAvatar || 'https://ui-avatars.com/api/?name=User&background=8b0000&color=fff'}" alt="${escapeHtml(comment.userName)}">
          <div>
            <div class="comment-name">${escapeHtml(comment.userName)}</div>
            <div class="comment-date">${formatDate(comment.date)}</div>
          </div>
        </div>
        <div class="comment-actions">
          ${starsHtml}
          ${isOwnComment ? `
            <button class="comment-delete-btn" onclick="deleteComment(${comment.id}); event.stopPropagation()">
              <i class="fas fa-trash"></i>
            </button>
          ` : ''}
        </div>
      </div>
      <div class="comment-text">${escapeHtml(comment.text)}</div>
      ${repliesHtml}
    `;
    container.appendChild(commentElement);
  });
}

function setupStarRating() {
  const stars = document.querySelectorAll('#starRating i');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const value = parseInt(star.getAttribute('data-value'));
      setStarRating(value);
    });
  });
}

function setStarRating(rating) {
  const stars = document.querySelectorAll('#starRating i');
  stars.forEach(star => {
    const value = parseInt(star.getAttribute('data-value'));
    if (value <= rating) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });
}

function submitComment() {
  const textElement = document.getElementById('newComment');
  if (!textElement) {
    showNotification('Ошибка: поле комментария не найдено', 'error');
    return;
  }
  
  const text = textElement.value.trim();
  if (!text) {
    showNotification('Введите текст комментария', 'warning');
    return;
  }
  
  if (!window.currentCommentGameId) {
    showNotification('Ошибка: игра не выбрана', 'error');
    return;
  }
  
  const stars = document.querySelectorAll('#starRating i.active');
  const rating = stars.length;
  
  const comment = {
    id: Date.now(),
    gameId: window.currentCommentGameId,
    userId: currentUser.id,
    userName: currentUser.name,
    userAvatar: currentUser.avatar,
    text: text,
    rating: rating > 0 ? rating : null,
    date: new Date().toISOString(),
    replies: []
  };
  
  allComments.push(comment);
  userComments.push(comment);
  
  updateGameRating(window.currentCommentGameId);
  
  document.getElementById('newComment').value = '';
  setStarRating(0);
  
  saveAllData();
  renderComments(window.currentCommentGameId);
  renderGamesCatalog();
  
  showNotification('Комментарий добавлен!', 'success');
}

function deleteComment(commentId) {
  if (!confirm('Удалить комментарий?')) return;
  
  allComments = allComments.filter(c => c.id !== commentId);
  userComments = userComments.filter(c => c.id !== commentId);
  
  saveAllData();
  if (window.currentCommentGameId) {
    renderComments(window.currentCommentGameId);
  }
  renderGamesCatalog();
  showNotification('Комментарий удален', 'info');
}

function updateGameRating(gameId) {
  const gameComments = allComments.filter(c => c.gameId === gameId && c.rating);
  
  if (gameComments.length > 0) {
    const totalRating = gameComments.reduce((sum, c) => sum + c.rating, 0);
    const avgRating = totalRating / gameComments.length;
    
    const game = gamesCatalog.find(g => g.id === gameId);
    if (game) {
      game.rating = parseFloat(avgRating.toFixed(1));
      game.ratingCount = gameComments.length;
    }
  }
}

// ========== GAME DETAILS ==========
function openGameDetail(gameId) {
  const game = gamesCatalog.find(g => g.id === gameId);
  if (!game) return;
  
  const inCollection = userCollection.some(g => g.id === gameId);
  const collectionGame = userCollection.find(g => g.id === gameId);
  
  document.getElementById('detailTitle').textContent = game.title;
  document.getElementById('gameDetailContent').innerHTML = `
    <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 30px;">
      <img src="${game.coverImage || 'https://via.placeholder.com/400x400/1a1a1a/ffffff?text=No+Cover'}" 
           alt="${escapeHtml(game.title)}"
           style="width: 280px; border-radius: 15px; border: 1px solid var(--border-color);">
      <div style="flex: 1; min-width: 300px;">
        <h3 style="margin-bottom: 15px;">${escapeHtml(game.title)}</h3>
        <div style="display: grid; grid-template-columns: auto 1fr; gap: 10px 20px; margin-bottom: 20px;">
          <strong>Платформа:</strong><span>${escapeHtml(game.platformName || '')}</span>
          <strong>Год:</strong><span>${game.year || ''}</span>
          <strong>Жанр:</strong><span>${escapeHtml(game.genreName || '')}</span>
          <strong>Разработчик:</strong><span>${escapeHtml(game.developer || '')}</span>
          <strong>Рейтинг:</strong>
          <span class="game-rating">
            <i class="fas fa-star"></i> ${game.rating?.toFixed(1) || 'Нет'} (${game.ratingCount || 0} оценок)
          </span>
        </div>
        <p style="color: var(--text-secondary); line-height: 1.6;">${escapeHtml(game.description || '')}</p>
        ${game.tags && game.tags.length > 0 ? `
          <div style="margin-top: 15px;">
            <strong>Теги:</strong>
            <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px;">
              ${game.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${collectionGame ? `
          <div style="margin-top: 20px; padding: 15px; background: var(--card-bg); border-radius: 10px;">
            <h4><i class="fas fa-heart"></i> В вашей коллекции</h4>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 10px; margin-top: 10px;">
              ${collectionGame.status ? `<strong>Статус:</strong><span>${getStatusText(collectionGame.status)}</span>` : ''}
              ${collectionGame.userRating ? `<strong>Ваша оценка:</strong><span>${collectionGame.userRating}/10</span>` : ''}
              ${collectionGame.playtime ? `<strong>Время игры:</strong><span>${Math.floor(collectionGame.playtime / 60)}ч ${collectionGame.playtime % 60}м</span>` : ''}
              ${collectionGame.completion ? `<strong>Завершено:</strong><span>${collectionGame.completion}%</span>` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
    
    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
      <button class="btn-primary" onclick="toggleGameCollection(${game.id}); closeModal('gameDetailModal')">
        <i class="fas fa-heart"></i> ${inCollection ? 'В коллекции' : 'В коллекцию'}
      </button>
      <button class="btn-secondary" onclick="closeModal('gameDetailModal'); openGameComments(${game.id})">
        <i class="fas fa-comment"></i> Комментарии (${getGameCommentsCount(game.id)})
      </button>
      ${currentUser.isAdmin ? `
        <button class="btn-warning" onclick="closeModal('gameDetailModal'); editGame(${game.id})">
          <i class="fas fa-edit"></i> Редактировать
        </button>
      ` : ''}
    </div>
  `;
  
  openModal('gameDetailModal');
}

function getStatusText(status) {
  const statuses = {
    'planned': 'В планах',
    'playing': 'Играю',
    'completed': 'Пройдена',
    'abandoned': 'Заброшена'
  };
  return statuses[status] || status;
}

// ========== ADMIN: GAME MANAGEMENT ==========
function openAddGameModal() {
  if (!currentUser.isAdmin) {
    showNotification('Только администратор может добавлять игры', 'warning');
    return;
  }
  openModal('addGameModal');
}

function handleAddGame(e) {
  e.preventDefault();
  
  if (!currentUser.isAdmin) {
    showNotification('Доступ запрещен', 'error');
    return;
  }
  
  const title = document.getElementById('gameTitle').value.trim();
  const platform = document.getElementById('gamePlatform').value;
  const yearInput = document.getElementById('gameYear');
  const year = yearInput ? parseInt(yearInput.value) : new Date().getFullYear();
  const genre = document.getElementById('gameGenre').value;
  const coverImage = document.getElementById('gameCover').value.trim();
  const developer = document.getElementById('gameDeveloper').value.trim();
  const description = document.getElementById('gameDescription').value.trim();
  const tagsInput = document.getElementById('gameTags');
  const tags = tagsInput ? tagsInput.value.trim() : '';
  
  if (!title || !platform || !genre || !coverImage) {
    showNotification('Заполните обязательные поля', 'warning');
    return;
  }
  
  const platformNames = {
    ps5: 'PlayStation 5', ps4: 'PlayStation 4', pc: 'PC',
    xbox: 'Xbox Series X/S', switch: 'Nintendo Switch',
    mobile: 'Mobile', multi: 'Multiplatform'
  };
  
  const genreNames = {
    action: 'Экшн', rpg: 'RPG', horror: 'Хоррор',
    adventure: 'Приключение', strategy: 'Стратегия',
    sports: 'Спорт', racing: 'Гонки', simulator: 'Симулятор'
  };
  
  const newGame = {
    id: Date.now(),
    title,
    platform,
    platformName: platformNames[platform] || platform,
    genre,
    genreName: genreNames[genre] || genre,
    year: year || new Date().getFullYear(),
    coverImage,
    developer,
    description,
    tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
    addedBy: currentUser.id,
    addedDate: new Date().toISOString(),
    rating: null,
    ratingCount: 0
  };
  
  gamesCatalog.unshift(newGame);
  filteredGames = [...gamesCatalog];
  
  saveAllData();
  
  closeModal('addGameModal');
  document.getElementById('addGameForm').reset();
  applyFilters();
  updateFilters();
  updateHeaderStats();
  
  showNotification('Игра добавлена в каталог!', 'success');
}

function editGame(gameId) {
  if (!currentUser.isAdmin) {
    showNotification('Доступ запрещен', 'error');
    return;
  }
  
  const game = gamesCatalog.find(g => g.id === gameId);
  if (!game) return;
  
  const modalContent = `
    <div class="form-group">
      <label>Название игры *</label>
      <input id="editGameTitle" type="text" value="${escapeHtml(game.title)}" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Платформа *</label>
        <select id="editGamePlatform" required>
          <option value="ps5" ${game.platform === 'ps5' ? 'selected' : ''}>PlayStation 5</option>
          <option value="ps4" ${game.platform === 'ps4' ? 'selected' : ''}>PlayStation 4</option>
          <option value="pc" ${game.platform === 'pc' ? 'selected' : ''}>PC</option>
          <option value="xbox" ${game.platform === 'xbox' ? 'selected' : ''}>Xbox Series X/S</option>
          <option value="switch" ${game.platform === 'switch' ? 'selected' : ''}>Nintendo Switch</option>
          <option value="mobile" ${game.platform === 'mobile' ? 'selected' : ''}>Mobile</option>
          <option value="multi" ${game.platform === 'multi' ? 'selected' : ''}>Multiplatform</option>
        </select>
      </div>
      <div class="form-group">
        <label>Год релиза *</label>
        <input id="editGameYear" type="number" value="${game.year || new Date().getFullYear()}" required>
      </div>
    </div>
    <div class="form-group">
      <label>Жанр *</label>
      <select id="editGameGenre" required>
        <option value="action" ${game.genre === 'action' ? 'selected' : ''}>Экшн</option>
        <option value="rpg" ${game.genre === 'rpg' ? 'selected' : ''}>RPG</option>
        <option value="horror" ${game.genre === 'horror' ? 'selected' : ''}>Хоррор</option>
        <option value="adventure" ${game.genre === 'adventure' ? 'selected' : ''}>Приключение</option>
        <option value="strategy" ${game.genre === 'strategy' ? 'selected' : ''}>Стратегия</option>
        <option value="sports" ${game.genre === 'sports' ? 'selected' : ''}>Спорт</option>
        <option value="racing" ${game.genre === 'racing' ? 'selected' : ''}>Гонки</option>
        <option value="simulator" ${game.genre === 'simulator' ? 'selected' : ''}>Симулятор</option>
      </select>
    </div>
    <div class="form-group">
      <label>Обложка (URL) *</label>
      <input id="editGameCover" type="url" value="${game.coverImage}" required>
    </div>
    <div class="form-group">
      <label>Разработчик</label>
      <input id="editGameDeveloper" type="text" value="${game.developer || ''}">
    </div>
    <div class="form-group">
      <label>Описание</label>
      <textarea id="editGameDescription" rows="3">${game.description || ''}</textarea>
    </div>
    <div class="form-group">
      <label>Теги (через запятую)</label>
      <input id="editGameTags" type="text" value="${game.tags ? game.tags.join(', ') : ''}">
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeModal('editGameModal')">Отмена</button>
      <button class="btn-primary" onclick="saveGameEdit(${gameId})">Сохранить</button>
    </div>
  `;
  
  document.getElementById('editGameContent').innerHTML = modalContent;
  openModal('editGameModal');
}

function saveGameEdit(gameId) {
  const gameIndex = gamesCatalog.findIndex(g => g.id === gameId);
  if (gameIndex === -1) return;
  
  const title = document.getElementById('editGameTitle').value.trim();
  const platform = document.getElementById('editGamePlatform').value;
  const year = parseInt(document.getElementById('editGameYear').value);
  const genre = document.getElementById('editGameGenre').value;
  const coverImage = document.getElementById('editGameCover').value.trim();
  const developer = document.getElementById('editGameDeveloper').value.trim();
  const description = document.getElementById('editGameDescription').value.trim();
  const tagsInput = document.getElementById('editGameTags');
  const tags = tagsInput ? tagsInput.value.trim() : '';
  
  const platformNames = {
    ps5: 'PlayStation 5', ps4: 'PlayStation 4', pc: 'PC',
    xbox: 'Xbox Series X/S', switch: 'Nintendo Switch',
    mobile: 'Mobile', multi: 'Multiplatform'
  };
  
  const genreNames = {
    action: 'Экшн', rpg: 'RPG', horror: 'Хоррор',
    adventure: 'Приключение', strategy: 'Стратегия',
    sports: 'Спорт', racing: 'Гонки', simulator: 'Симулятор'
  };
  
  gamesCatalog[gameIndex] = {
    ...gamesCatalog[gameIndex],
    title,
    platform,
    platformName: platformNames[platform] || platform,
    year,
    genre,
    genreName: genreNames[genre] || genre,
    coverImage,
    developer,
    description,
    tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : []
  };
  
  saveAllData();
  closeModal('editGameModal');
  applyFilters();
  showNotification('Игра обновлена', 'success');
}

function deleteGame(gameId) {
  if (!currentUser.isAdmin) {
    showNotification('Доступ запрещен', 'error');
    return;
  }
  
  if (!confirm('Удалить игру из каталога?\nВсе комментарии и рейтинги также будут удалены.')) return;
  
  gamesCatalog = gamesCatalog.filter(g => g.id !== gameId);
  allComments = allComments.filter(c => c.gameId !== gameId);
  userCollection = userCollection.filter(g => g.id !== gameId);
  userComments = userComments.filter(c => c.gameId !== gameId);
  
  filteredGames = filteredGames.filter(g => g.id !== gameId);
  
  saveAllData();
  renderGamesCatalog();
  updateHeaderStats();
  showNotification('Игра удалена', 'info');
}

function manageGames() {
  if (!currentUser.isAdmin) {
    showNotification('Доступ запрещен', 'error');
    return;
  }
  
  openModal('manageGamesModal');
  renderGamesManagement();
}

function renderGamesManagement() {
  const container = document.getElementById('gamesManagementList');
  if (!container) return;
  
  if (gamesCatalog.length === 0) {
    container.innerHTML = '<div class="empty-state">Каталог игр пуст</div>';
    return;
  }
  
  container.innerHTML = '';
  gamesCatalog.forEach(game => {
    const gameElement = document.createElement('div');
    gameElement.className = 'manage-game-item';
    gameElement.innerHTML = `
      <div class="manage-game-info">
        <img src="${game.coverImage || 'https://via.placeholder.com/60x60/1a1a1a/ffffff?text=No+Cover'}" alt="${escapeHtml(game.title)}">
        <div>
          <strong>${escapeHtml(game.title)}</strong>
          <small>${escapeHtml(game.platformName)} • ${game.year} • ${game.genreName}</small>
        </div>
      </div>
      <div class="manage-game-stats">
        <span><i class="fas fa-star"></i> ${game.rating?.toFixed(1) || '—'}</span>
        <span><i class="fas fa-comment"></i> ${allComments.filter(c => c.gameId === game.id).length}</span>
        <span><i class="fas fa-heart"></i> ${userCollection.filter(g => g.id === game.id).length}</span>
      </div>
      <div class="manage-game-actions">
        <button class="btn-small" onclick="editGame(${game.id})"><i class="fas fa-edit"></i></button>
        <button class="btn-small btn-danger" onclick="deleteGame(${game.id})"><i class="fas fa-trash"></i></button>
      </div>
    `;
    container.appendChild(gameElement);
  });
}

// ========== NOTIFICATIONS ==========
function openNotifications() {
  openModal('notificationsModal');
  renderNotifications();
}

function renderNotifications() {
  const container = document.getElementById('notificationsList');
  if (!container) return;
  
  const userNotifications = notifications.filter(n => n.userId === currentUser.id).reverse();
  
  if (userNotifications.length === 0) {
    container.innerHTML = '<div class="empty-state">Нет уведомлений</div>';
    return;
  }
  
  container.innerHTML = '';
  userNotifications.forEach(notification => {
    const notificationElement = document.createElement('div');
    notificationElement.className = `notification-item ${notification.read ? '' : 'unread'}`;
    notificationElement.innerHTML = `
      <div class="notification-icon">
        <i class="fas fa-${getNotificationIcon(notification.type)}"></i>
      </div>
      <div class="notification-content">
        <p>${notification.message}</p>
        <small>${formatDate(notification.date, true)}</small>
      </div>
      ${!notification.read ? `
        <button class="notification-mark-read" onclick="markNotificationRead(${notification.id})">
          <i class="fas fa-check"></i>
        </button>
      ` : ''}
    `;
    
    if (notification.gameId) {
      notificationElement.onclick = () => {
        closeModal('notificationsModal');
        openGameDetail(notification.gameId);
      };
      notificationElement.style.cursor = 'pointer';
    }
    
    container.appendChild(notificationElement);
  });
}

function markNotificationRead(notificationId) {
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    saveAllData();
    renderNotifications();
    updateNotificationBadge();
  }
}

function getNotificationIcon(type) {
  const icons = {
    'comment': 'comment',
    'rating': 'star',
    'reply': 'reply',
    'game': 'gamepad',
    'system': 'info-circle'
  };
  return icons[type] || 'bell';
}

function updateNotificationBadge() {
  const unreadCount = notifications.filter(n => !n.read && n.userId === currentUser.id).length;
  
  if (elements.notificationBadge) {
    if (unreadCount > 0) {
      elements.notificationBadge.textContent = unreadCount;
      elements.notificationBadge.style.display = 'flex';
    } else {
      elements.notificationBadge.style.display = 'none';
    }
  }
}

// ========== EXPORT/IMPORT ==========
function exportData() {
  if (!currentUser.isAdmin) {
    showNotification('Доступ запрещен', 'error');
    return;
  }
  
  const data = {
    gamesCatalog,
    allUsers,
    allComments,
    exportDate: new Date().toISOString(),
    exportBy: currentUser.id
  };
  
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `game-collection-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showNotification('Данные экспортированы', 'success');
}

function importData() {
  if (!currentUser.isAdmin) {
    showNotification('Доступ запрещен', 'error');
    return;
  }
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        if (confirm(`Импортировать данные?\nИгр: ${data.gamesCatalog?.length || 0}\nПользователей: ${data.allUsers?.length || 0}\nКомментариев: ${data.allComments?.length || 0}`)) {
          gamesCatalog = data.gamesCatalog || gamesCatalog;
          allUsers = data.allUsers || allUsers;
          allComments = data.allComments || allComments;
          
          saveAllData();
          applyFilters();
          updateHeaderStats();
          showNotification('Данные импортированы', 'success');
        }
      } catch (err) {
        showNotification('Ошибка импорта файла', 'error');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };
  
  input.click();
}

// ========== STATISTICS ==========
function openStatsModal() {
  updateStats();
  renderCharts();
  openModal('statsModal');
}

function updateStats() {
  document.getElementById('communityGames').textContent = gamesCatalog.length;
  document.getElementById('communityUsers').textContent = allUsers.length;
  document.getElementById('communityComments').textContent = allComments.length;
  
  const ratedComments = allComments.filter(c => c.rating);
  const avgRating = ratedComments.length > 0
    ? (ratedComments.reduce((sum, c) => sum + c.rating, 0) / ratedComments.length).toFixed(1)
    : '0.0';
  document.getElementById('communityAvgRating').textContent = avgRating;
}

function renderCharts() {
  const platformData = {};
  gamesCatalog.forEach(game => {
    const platform = game.platformName || 'Другое';
    platformData[platform] = (platformData[platform] || 0) + 1;
  });
  
  const platformChart = document.getElementById('platformChart');
  if (platformChart) platformChart.innerHTML = createBarChart(platformData);
  
  const genreData = {};
  gamesCatalog.forEach(game => {
    const genre = game.genreName || 'Другое';
    genreData[genre] = (genreData[genre] || 0) + 1;
  });
  
  const genreChart = document.getElementById('genreChart');
  if (genreChart) genreChart.innerHTML = createBarChart(genreData);
}

// ========== SETTINGS ==========
function openSettingsModal() {
  const notificationsToggle = document.getElementById('notificationsToggle');
  const themeSelect = document.getElementById('themeSelect');
  
  if (notificationsToggle) notificationsToggle.checked = currentUser.settings.notifications;
  if (themeSelect) themeSelect.value = currentTheme;
  
  openModal('settingsModal');
}

function saveSettings() {
  const notificationsToggle = document.getElementById('notificationsToggle');
  const themeSelect = document.getElementById('themeSelect');
  
  if (notificationsToggle) currentUser.settings.notifications = notificationsToggle.checked;
  if (themeSelect) currentUser.settings.theme = themeSelect.value;
  
  if (currentTheme !== currentUser.settings.theme) {
    currentTheme = currentUser.settings.theme;
    applyTheme();
  }
  
  saveAllData();
  closeModal('settingsModal');
  showNotification('Настройки сохранены', 'success');
}

// ========== PAGINATION ==========
function nextPage() {
  const totalPages = Math.ceil(filteredGames.length / gamesPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderGamesCatalog();
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderGamesCatalog();
  }
}

// ========== THEME FUNCTIONS ==========
function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  currentUser.settings.theme = currentTheme;
  applyTheme();
  saveAllData();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  }
}

// ========== UTILITY FUNCTIONS ==========
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
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

function formatDate(dateString, short = false) {
  try {
    const date = new Date(dateString);
    if (short) {
      return date.toLocaleDateString('ru-RU');
    }
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
}

function createBarChart(data) {
  const entries = Object.entries(data);
  if (!entries.length) return '<div class="text-chart">Нет данных</div>';
  
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

// ========== DEBUG ==========
function debugUserStatus() {
  console.log('=== DEBUG ===');
  console.log('User:', currentUser);
  console.log('Games:', gamesCatalog.length);
  console.log('Collection:', userCollection.length);
  console.log('Comments:', userComments.length);
  console.log('All Comments:', allComments.length);
  console.log('=== END ===');
}

window.debugUserStatus = debugUserStatus;

