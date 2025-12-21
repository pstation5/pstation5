// Game Collection Hub - Community Edition

// ========== CONFIGURATION ==========
const ADMIN_TELEGRAM_ID = 123456789; // ЗАМЕНИТЕ на ваш Telegram ID
const APP_VERSION = '1.0.0';

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
  joinDate: new Date().toISOString()
};

let gamesCatalog = [];
let userCollection = [];
let userComments = [];
let allUsers = [];
let allComments = [];

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
  activeUsers: document.getElementById('activeUsers')
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async () => {
  initApp();
});

async function initApp() {
  // Telegram setup
  if (window.Telegram && tg.initDataUnsafe) {
    try {
      tg.expand();
      tg.setHeaderColor('#4361ee');
      tg.setBackgroundColor('#121212');
      setupTelegramUser();
    } catch (e) {}
  } else {
    // Mock user for browser testing
    setupMockUser();
  }

  // Load data
  await loadAllData();
  
  // Setup UI
  setupEventListeners();
  renderGamesCatalog();
  updateFilters();
  updateHeaderStats();
  
  // Check admin status
  checkAdminStatus();
}

// ========== USER MANAGEMENT ==========
function setupTelegramUser() {
  try {
    const user = tg.initDataUnsafe.user;
    if (user) {
      currentUser.id = user.id;
      currentUser.name = `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;
      currentUser.avatar = user.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=4361ee&color=fff`;
      currentUser.isAdmin = user.id === ADMIN_TELEGRAM_ID;
      
      elements.userGreeting.textContent = `Привет, ${user.first_name}!`;
      elements.userAvatar.src = currentUser.avatar;
      elements.userType.textContent = currentUser.isAdmin ? 'Администратор' : 'Пользователь';
      
      // Register user if new
      registerUser(currentUser);
    }
  } catch (e) {
    console.warn('Telegram user setup failed:', e);
    setupMockUser();
  }
}

function setupMockUser() {
  const mockId = Math.floor(Math.random() * 1000000);
  currentUser = {
    id: mockId,
    name: `Игрок${mockId}`,
    avatar: `https://ui-avatars.com/api/?name=Player${mockId}&background=4361ee&color=fff`,
    isAdmin: mockId === ADMIN_TELEGRAM_ID,
    joinDate: new Date().toISOString()
  };
  
  elements.userGreeting.textContent = `Привет, ${currentUser.name}!`;
  elements.userAvatar.src = currentUser.avatar;
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
      lastActive: new Date().toISOString()
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
  }
}

function toggleAdminMode() {
  if (!currentUser.isAdmin) {
    alert('Только администратор может использовать этот режим');
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
  // Try to load from localStorage first
  const saved = localStorage.getItem('gameCollectionHub');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      gamesCatalog = data.gamesCatalog || [];
      allUsers = data.allUsers || [];
      allComments = data.allComments || [];
      
      // Load user-specific data
      const userKey = `user_${currentUser.id}`;
      const userData = localStorage.getItem(userKey);
      if (userData) {
        const user = JSON.parse(userData);
        userCollection = user.collection || [];
        userComments = user.comments || [];
      }
    } catch (e) {
      console.error('Data load error:', e);
    }
  }
  
  // If no games, add some sample games (admin can add more)
  if (gamesCatalog.length === 0) {
    gamesCatalog = getSampleGames();
  }
  
  filteredGames = [...gamesCatalog];
}

function saveAllData() {
  // Save public data
  const publicData = {
    gamesCatalog,
    allUsers,
    allComments,
    lastUpdate: new Date().toISOString()
  };
  localStorage.setItem('gameCollectionHub', JSON.stringify(publicData));
  
  // Save user data
  const userKey = `user_${currentUser.id}`;
  const userData = {
    collection: userCollection,
    comments: userComments,
    preferences: { theme: currentTheme }
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
      ratingCount: 1250
    },
    {
      id: 2,
      title: "God of War Ragnarök",
      platform: "ps5",
      platformName: "PlayStation 5",
      genre: "action",
      genreName: "Экшн",
      year: 2022,
      coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co4k7g.jpg",
      developer: "Santa Monica Studio",
      description: "Кратос и Атрей в новом эпическом путешествии.",
      addedBy: ADMIN_TELEGRAM_ID,
      addedDate: new Date().toISOString(),
      rating: 4.7,
      ratingCount: 980
    },
    {
      id: 3,
      title: "Resident Evil 4 Remake",
      platform: "ps5",
      platformName: "PlayStation 5",
      genre: "horror",
      genreName: "Хоррор",
      year: 2023,
      coverImage: "https://images.igdb.com/igdb/image/upload/t_cover_big/co6c3z.jpg",
      developer: "Capcom",
      description: "Ремейк культового хоррора про Леона Кеннеди.",
      addedBy: ADMIN_TELEGRAM_ID,
      addedDate: new Date().toISOString(),
      rating: 4.6,
      ratingCount: 750
    }
  ];
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
  // Search and filter events
  elements.searchInput?.addEventListener('input', applyFilters);
  elements.platformFilter?.addEventListener('change', applyFilters);
  elements.genreFilter?.addEventListener('change', applyFilters);
  elements.sortSelect?.addEventListener('change', applyFilters);
  
  // Form submissions
  document.getElementById('addGameForm')?.addEventListener('submit', handleAddGame);
  
  // Modal close events
  window.addEventListener('click', (event) => {
    const modals = ['addGameModal', 'gameDetailModal', 'myCollectionModal', 'commentsModal', 'profileModal', 'statsModal'];
    modals.forEach(id => {
      const modal = document.getElementById(id);
      if (modal && event.target === modal) {
        closeModal(modal);
      }
    });
  });
}

// ========== RENDER FUNCTIONS ==========
function updateFilters() {
  // Update platform filter
  const platforms = [...new Set(gamesCatalog.map(g => g.platformName).filter(Boolean))];
  elements.platformFilter.innerHTML = '<option value="">Все платформы</option>';
  platforms.forEach(platform => {
    const option = document.createElement('option');
    option.value = platform;
    option.textContent = platform;
    elements.platformFilter.appendChild(option);
  });
  
  // Update genre filter
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
      (game.developer || '').toLowerCase().includes(searchTerm);
    const matchesPlatform = !platform || game.platformName === platform;
    const matchesGenre = !genre || game.genreName === genre;
    return matchesSearch && matchesPlatform && matchesGenre;
  });
  
  // Sort
  filteredGames.sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'popular':
        return (b.ratingCount || 0) - (a.ratingCount || 0);
      case 'newest':
        return b.year - a.year;
      case 'title':
        return (a.title || '').localeCompare(b.title || '');
      default:
        return 0;
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
        <div class="game-rating">
          <i class="fas fa-star"></i>
          <span>${game.rating?.toFixed(1) || 'Нет оценок'}</span>
          <small>(${game.ratingCount || 0})</small>
        </div>
        <div class="game-actions">
          <button class="add-to-collection-btn ${isInCollection ? 'in-collection' : ''}" 
                  onclick="toggleGameCollection(${game.id}); event.stopPropagation()">
            <i class="fas fa-heart"></i>
            ${isInCollection ? 'В коллекции' : 'В коллекцию'}
          </button>
          <button class="comments-btn" onclick="openGameComments(${game.id}); event.stopPropagation()">
            <i class="fas fa-comment"></i>
            ${getGameCommentsCount(game.id)}
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
  if (!game) return;
  
  const index = userCollection.findIndex(g => g.id === gameId);
  
  if (index === -1) {
    // Add to collection
    userCollection.push({
      id: game.id,
      title: game.title,
      platform: game.platform,
      platformName: game.platformName,
      coverImage: game.coverImage,
      year: game.year,
      addedDate: new Date().toISOString(),
      status: 'owned',
      userRating: null,
      notes: ''
    });
    showNotification('Игра добавлена в вашу коллекцию!', 'success');
  } else {
    // Remove from collection
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
      </div>
    `;
    card.onclick = () => openGameDetail(game.id);
    container.appendChild(card);
  });
}

function updateMyCollectionStats() {
  document.getElementById('myGamesCount').textContent = userCollection.length;
  
  const ratedGames = userCollection.filter(g => g.userRating);
  const avgRating = ratedGames.length > 0
    ? (ratedGames.reduce((sum, g) => sum + g.userRating, 0) / ratedGames.length).toFixed(1)
    : '0.0';
  document.getElementById('myAvgRating').textContent = avgRating;
  
  document.getElementById('myCommentsCount').textContent = userComments.length;
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
    const commentElement = document.createElement('div');
    commentElement.className = 'comment-item';
    commentElement.innerHTML = `
      <div class="comment-header">
        <div class="comment-user">
          <img class="comment-avatar" src="${comment.userAvatar || 'https://ui-avatars.com/api/?name=User&background=4361ee&color=fff'}" alt="${escapeHtml(comment.userName)}">
          <div>
            <div class="comment-name">${escapeHtml(comment.userName)}</div>
            <div class="comment-date">${formatDate(comment.date)}</div>
          </div>
        </div>
        ${comment.rating ? `
          <div class="comment-rating">
            ${Array(5).fill(0).map((_, i) => 
              `<i class="fas fa-star ${i < comment.rating ? 'active' : ''}"></i>`
            ).join('')}
          </div>
        ` : ''}
      </div>
      <div class="comment-text">${escapeHtml(comment.text)}</div>
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
  const text = document.getElementById('newComment').value.trim();
  if (!text) {
    showNotification('Введите текст комментария', 'warning');
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
    rating: rating,
    date: new Date().toISOString()
  };
  
  // Add to global comments
  allComments.push(comment);
  
  // Add to user comments
  userComments.push(comment);
  
  // Update game rating
  updateGameRating(window.currentCommentGameId);
  
  // Clear form
  document.getElementById('newComment').value = '';
  setStarRating(0);
  
  // Save and update
  saveAllData();
  renderComments(window.currentCommentGameId);
  renderGamesCatalog();
  
  showNotification('Комментарий добавлен!', 'success');
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
      </div>
    </div>
    
    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
      <button class="btn-primary" onclick="toggleGameCollection(${game.id})">
        <i class="fas fa-heart"></i> ${inCollection ? 'В коллекции' : 'В коллекцию'}
      </button>
      <button class="btn-secondary" onclick="openGameComments(${game.id})">
        <i class="fas fa-comment"></i> Комментарии (${getGameCommentsCount(game.id)})
      </button>
    </div>
  `;
  
  openModal('gameDetailModal');
}

// ========== ADMIN: ADD GAME ==========
function openAddGameModal() {
  if (!currentUser.isAdmin) {
    showNotification('Только администратор может добавлять игры', 'warning');
    return;
  }
  openModal('addGameModal');
}

function closeAddGameModal() {
  closeModal('addGameModal');
  document.getElementById('addGameForm').reset();
}

function handleAddGame(e) {
  e.preventDefault();
  
  if (!currentUser.isAdmin) {
    showNotification('Доступ запрещен', 'error');
    return;
  }
  
  const title = document.getElementById('gameTitle').value.trim();
  const platform = document.getElementById('gamePlatform').value;
  const year = parseInt(document.getElementById('gameYear').value);
  const genre = document.getElementById('gameGenre').value;
  const coverImage = document.getElementById('gameCover').value.trim();
  const developer = document.getElementById('gameDeveloper').value.trim();
  const description = document.getElementById('gameDescription').value.trim();
  
  if (!title || !platform || !year || !genre || !coverImage) {
    showNotification('Заполните обязательные поля', 'warning');
    return;
  }
  
  const platformNames = {
    ps5: 'PlayStation 5',
    ps4: 'PlayStation 4',
    pc: 'PC',
    xbox: 'Xbox Series X/S',
    switch: 'Nintendo Switch',
    mobile: 'Mobile',
    multi: 'Multiplatform'
  };
  
  const genreNames = {
    action: 'Экшн',
    rpg: 'RPG',
    horror: 'Хоррор',
    adventure: 'Приключение',
    strategy: 'Стратегия',
    sports: 'Спорт',
    racing: 'Гонки',
    simulator: 'Симулятор'
  };
  
  const newGame = {
    id: Date.now(),
    title,
    platform,
    platformName: platformNames[platform] || platform,
    genre,
    genreName: genreNames[genre] || genre,
    year,
    coverImage,
    developer,
    description,
    addedBy: currentUser.id,
    addedDate: new Date().toISOString(),
    rating: null,
    ratingCount: 0
  };
  
  gamesCatalog.unshift(newGame);
  filteredGames = [...gamesCatalog];
  
  saveAllData();
  
  closeAddGameModal();
  applyFilters();
  updateFilters();
  updateHeaderStats();
  
  showNotification('Игра добавлена в каталог!', 'success');
}

function manageGames() {
  if (!currentUser.isAdmin) {
    showNotification('Доступ запрещен', 'error');
    return;
  }
  
  let gamesList = 'Список всех игр в каталоге:\n\n';
  gamesCatalog.forEach((game, index) => {
    gamesList += `${index + 1}. ${game.title} (${game.platformName}, ${game.year})\n`;
  });
  
  alert(gamesList);
}

// ========== PROFILE FUNCTIONS ==========
function openProfileModal() {
  document.getElementById('profileName').textContent = currentUser.name;
  document.getElementById('profileAvatar').src = currentUser.avatar;
  document.getElementById('profileId').textContent = currentUser.id;
  document.getElementById('profileGamesCount').textContent = userCollection.length;
  document.getElementById('profileCommentsCount').textContent = userComments.length;
  document.getElementById('profileRatingsCount').textContent = userComments.filter(c => c.rating).length;
  document.getElementById('profileJoinDate').textContent = formatDate(currentUser.joinDate, true);
  
  openModal('profileModal');
}

function closeProfileModal() {
  closeModal('profileModal');
}

// ========== STATISTICS FUNCTIONS ==========
function openStatsModal() {
  document.getElementById('communityGames').textContent = gamesCatalog.length;
  document.getElementById('communityUsers').textContent = allUsers.length;
  document.getElementById('communityComments').textContent = allComments.length;
  
  const ratedComments = allComments.filter(c => c.rating);
  const avgRating = ratedComments.length > 0
    ? (ratedComments.reduce((sum, c) => sum + c.rating, 0) / ratedComments.length).toFixed(1)
    : '0.0';
  document.getElementById('communityAvgRating').textContent = avgRating;
  
  renderCommunityCharts();
  openModal('statsModal');
}

function closeStatsModal() {
  closeModal('statsModal');
}

function renderCommunityCharts() {
  // Genre distribution chart
  const genreCount = {};
  gamesCatalog.forEach(game => {
    const genre = game.genreName || 'Не указан';
    genreCount[genre] = (genreCount[genre] || 0) + 1;
  });
  
  const chartContainer = document.getElementById('genreChart');
  chartContainer.innerHTML = createBarChart(genreCount);
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
  document.documentElement.setAttribute('data-theme', currentTheme);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  }
  
  localStorage.setItem('gameHubTheme', currentTheme);
  saveAllData();
}

// Load theme on startup
const savedTheme = localStorage.getItem('gameHubTheme');
if (savedTheme) {
  currentTheme = savedTheme;
  document.documentElement.setAttribute('data-theme', currentTheme);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  }
}

// ========== UTILITY FUNCTIONS ==========
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'block';
    lockBodyScroll();
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
  unlockBodyScroll();
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    max-width: 350px;
  `;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
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

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  .notification-content {
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;
document.head.appendChild(style);
