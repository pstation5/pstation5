// Horror Games Collection App - PS4/PS5 Edition
const ADMIN_USER_ID = 123456789; // Замените на ваш Telegram ID

// Telegram WebApp
const tg = window.Telegram?.WebApp || {
  initDataUnsafe: { user: null },
  expand() {},
  setHeaderColor() {},
  setBackgroundColor() {}
};

// App State
const elements = {
  searchInput: document.getElementById('searchInput'),
  searchButton: document.getElementById('searchButton'),
  gameGrid: document.getElementById('gameGrid'),
  sortSelect: document.getElementById('sortSelect'),
  
  // Stats
  totalGames: document.getElementById('totalGames'),
  completedGames: document.getElementById('completedGames'),
  inProgress: document.getElementById('inProgress'),
  totalUsers: document.getElementById('totalUsers'),
  
  // User
  userGreeting: document.getElementById('userGreeting'),
  userAvatar: document.getElementById('userAvatar'),
  userRole: document.getElementById('userRole'),
  adminControls: document.getElementById('adminControls'),
  adminControls2: document.getElementById('adminControls2'),
  
  // Slider
  upcomingGamesSlider: document.getElementById('upcomingGamesSlider')
};

let games = [];
let upcomingGames = [];
let comments = [];
let userCollections = {};
let currentUser = null;
let filteredGames = [];
let currentPage = 1;
const gamesPerPage = 10;
let currentTheme = 'dark';
let currentPlatformFilter = 'all';
let currentSort = 'title';
let swiper = null;
let currentGameId = null;

// Initialize App
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  // Telegram setup
  if (window.Telegram && tg.initDataUnsafe) {
    try {
      tg.expand();
      tg.setHeaderColor('#dc143c');
      tg.setBackgroundColor('#0a0a0a');
    } catch (e) {}
    setupTelegramUser();
  }
  
  restoreTheme();
  await loadData();
  setupEventListeners();
  initSwiper();
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
        photoUrl: user.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.first_name)}&background=dc143c&color=fff`
      };
      
      elements.userGreeting.textContent = currentUser.firstName;
      elements.userAvatar.src = currentUser.photoUrl;
      
      // Check if admin
      if (user.id === ADMIN_USER_ID) {
        elements.userRole.textContent = 'Администратор';
        elements.adminControls.style.display = 'flex';
        elements.adminControls2.style.display = 'flex';
      } else {
        elements.userRole.textContent = 'Коллекционер';
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
    upcomingGames = data.upcomingGames || [];
    comments = data.comments || [];
    userCollections = data.userCollections || {};
    
    // Initialize user collection if not exists
    if (currentUser && !userCollections[currentUser.id]) {
      userCollections[currentUser.id] = {
        games: [],
        status: {}
      };
    }
    
    filteredGames = [...games];
  } catch (error) {
    console.error('Error loading data:', error);
    // Fallback to empty data
    games = [];
    upcomingGames = [];
    comments = [];
    userCollections = {};
    filteredGames = [];
  }
}

async function saveData() {
  const data = {
    games,
    upcomingGames,
    comments,
    userCollections,
    lastUpdate: new Date().toISOString()
  };
  
  // For GitHub Pages demo, use localStorage
  try {
    localStorage.setItem('psHorrorGamesData', JSON.stringify(data));
    console.log('Data saved successfully');
  } catch (e) {
    console.error('Error saving data:', e);
  }
}

function setupEventListeners() {
  // Search
  elements.searchInput?.addEventListener('input', applyFilters);
  elements.searchButton?.addEventListener('click', applyFilters);
  
  // Sort
  elements.sortSelect?.addEventListener('change', function() {
    currentSort = this.value;
    applyFilters();
  });
  
  // Form submissions
  document.getElementById('addGameForm')?.addEventListener('submit', handleAddGame);
  document.getElementById('addUpcomingForm')?.addEventListener('submit', handleAddUpcomingGame);
  
  // Close modals on outside click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === this) {
        this.style.display = 'none';
      }
    });
  });
}

// Initialize Swiper for upcoming games
function initSwiper() {
  swiper = new Swiper('.upcoming-swiper', {
    slidesPerView: 1,
    spaceBetween: 20,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },
    breakpoints: {
      640: { slidesPerView: 2 },
      1024: { slidesPerView: 3 }
    }
  });
}

// Render all components
function renderAll() {
  renderUpcomingGames();
  updateStats();
  applyFilters();
}

// Render upcoming games slider
function renderUpcomingGames() {
  if (!elements.upcomingGamesSlider) return;
  
  elements.upcomingGamesSlider.innerHTML = '';
  
  if (upcomingGames.length === 0) {
    elements.upcomingGamesSlider.innerHTML = `
      <div class="swiper-slide">
        <div class="upcoming-card" style="text-align: center; padding: 40px;">
          <i class="fas fa-calendar" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 20px;"></i>
          <p>Нет ожидаемых игр</p>
        </div>
      </div>
    `;
    return;
  }
  
  upcomingGames.forEach(game => {
    const slide = document.createElement('div');
    slide.className = 'swiper-slide';
    slide.onclick = () => openUpcomingDetail(game.id);
    
    slide.innerHTML = `
      <div class="upcoming-card">
        <img src="${game.coverImage}" alt="${escapeHtml(game.title)}" class="upcoming-cover">
        <div class="upcoming-title">${escapeHtml(game.title)}</div>
        <div class="upcoming-date">${formatDate(game.releaseDate)}</div>
        <div class="upcoming-developer">${escapeHtml(game.developer || '')}</div>
      </div>
    `;
    
    elements.upcomingGamesSlider.appendChild(slide);
  });
  
  if (swiper) {
    swiper.update();
  }
}

// Update statistics
function updateStats() {
  elements.totalGames.textContent = games.length;
  
  const completed = games.filter(g => g.status === 'completed').length;
  const inProgressCount = games.filter(g => g.status === 'in-progress').length;
  
  elements.completedGames.textContent = completed;
  elements.inProgress.textContent = inProgressCount;
  
  // Count unique users
  const uniqueUsers = new Set();
  comments.forEach(c => uniqueUsers.add(c.userId));
  Object.keys(userCollections).forEach(id => uniqueUsers.add(parseInt(id)));
  elements.totalUsers.textContent = uniqueUsers.size;
}

// Apply filters and sorting
function applyFilters() {
  const searchTerm = (elements.searchInput?.value || '').toLowerCase().trim();
  
  filteredGames = games.filter(game => {
    // Platform filter
    if (currentPlatformFilter !== 'all' && game.platform !== currentPlatformFilter) {
      return false;
    }
    
    // Search filter
    if (searchTerm && !game.title.toLowerCase().includes(searchTerm) &&
        !(game.developer && game.developer.toLowerCase().includes(searchTerm)) &&
        !(game.description && game.description.toLowerCase().includes(searchTerm))) {
      return false;
    }
    
    return true;
  });
  
  // Apply sorting
  filteredGames.sort((a, b) => {
    switch (currentSort) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'title-desc':
        return b.title.localeCompare(a.title);
      case 'year':
        return b.releaseYear - a.releaseYear;
      case 'year-old':
        return a.releaseYear - b.releaseYear;
      case 'rating':
        const ratingA = getGameAverageRating(a.id);
        const ratingB = getGameAverageRating(b.id);
        return ratingB - ratingA;
      default:
        return a.title.localeCompare(b.title);
    }
  });
  
  currentPage = 1;
  renderGames();
}

// Filter by platform
function filterByPlatform(platform) {
  currentPlatformFilter = platform;
  
  // Update active button
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.includes(platform === 'all' ? 'Все' : platform.toUpperCase())) {
      btn.classList.add('active');
    }
  });
  
  applyFilters();
}

// Show only physical copies
function showPhysicalOnly() {
  filteredGames = games.filter(game => game.isPhysical === true);
  currentPage = 1;
  renderGames();
}

// Render games grid
function renderGames() {
  if (!elements.gameGrid) return;
  
  const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));
  const startIndex = (currentPage - 1) * gamesPerPage;
  const endIndex = startIndex + gamesPerPage;
  const pageGames = filteredGames.slice(startIndex, endIndex);
  
  elements.gameGrid.innerHTML = '';
  
  if (pageGames.length === 0) {
    elements.gameGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
        <i class="fas fa-gamepad" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 20px;"></i>
        <h3 style="color: var(--text-secondary); margin-bottom: 10px;">Игры не найдены</h3>
        <p style="color: var(--text-muted);">Попробуйте изменить фильтры поиска</p>
      </div>
    `;
    renderPagination();
    return;
  }
  
  pageGames.forEach(game => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.onclick = () => openGameDetail(game.id);
    
    const inCollection = currentUser && userCollections[currentUser.id]?.games.includes(game.id);
    const userStatus = currentUser ? userCollections[currentUser.id]?.status[game.id] : null;
    
    card.innerHTML = `
      ${game.isPhysical ? '<div class="physical-badge"><i class="fas fa-compact-disc"></i> Диск</div>' : ''}
      
      <div class="game-actions">
        <button class="action-btn" onclick="toggleCollection(${game.id}); event.stopPropagation()" 
                title="${inCollection ? 'Удалить из коллекции' : 'Добавить в коллекцию'}">
          <i class="fas fa-${inCollection ? 'heart' : 'heart-plus'}"></i>
        </button>
        <button class="action-btn" onclick="shareGame(${game.id}); event.stopPropagation()" title="Поделиться">
          <i class="fas fa-share-alt"></i>
        </button>
        ${currentUser?.id === ADMIN_USER_ID ? `
          <button class="action-btn" onclick="editGame(${game.id}); event.stopPropagation()" title="Редактировать">
            <i class="fas fa-edit"></i>
          </button>
          <button class="action-btn" onclick="deleteGame(${game.id}); event.stopPropagation()" title="Удалить">
            <i class="fas fa-trash"></i>
          </button>
        ` : ''}
      </div>
      
      <img src="${game.coverImage}" alt="${escapeHtml(game.title)}" class="game-cover">
      
      <div class="game-info">
        <div class="game-title">${escapeHtml(game.title)}</div>
        <div class="game-platform platform-${game.platform}">
          ${game.platform.toUpperCase()}
        </div>
        <div class="game-meta">
          <span class="game-year">${game.releaseYear}</span>
          <span class="game-status status-${game.status}">
            ${getStatusText(game.status)}
          </span>
        </div>
        ${currentUser && userStatus ? `
          <div style="margin-top: 10px; font-size: 0.8rem; color: var(--text-muted);">
            Ваш статус: <strong>${getStatusText(userStatus)}</strong>
          </div>
        ` : ''}
      </div>
    `;
    
    elements.gameGrid.appendChild(card);
  });
  
  renderPagination();
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));
  const pageNumbers = document.getElementById('pageNumbers');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  if (!pageNumbers) return;
  
  pageNumbers.innerHTML = '';
  
  // Previous button
  prevBtn.disabled = currentPage === 1;
  
  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      const pageBtn = document.createElement('span');
      pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.onclick = () => {
        currentPage = i;
        renderGames();
      };
      pageNumbers.appendChild(pageBtn);
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'page-number';
      ellipsis.textContent = '...';
      ellipsis.style.cursor = 'default';
      pageNumbers.appendChild(ellipsis);
    }
  }
  
  // Next button
  nextBtn.disabled = currentPage === totalPages;
}

function getStatusText(status) {
  const statusMap = {
    'completed': 'Пройдена',
    'in-progress': 'В процессе',
    'not-started': 'Не начата'
  };
  return statusMap[status] || status;
}

// Game CRUD Operations
async function handleAddGame(e) {
  e.preventDefault();
  
  const newGame = {
    id: Date.now(),
    title: document.getElementById('gameTitle').value.trim(),
    platform: document.getElementById('gamePlatform').value,
    coverImage: document.getElementById('gameCover').value.trim(),
    releaseYear: parseInt(document.getElementById('gameYear').value),
    developer: document.getElementById('gameDeveloper').value.trim(),
    genre: document.getElementById('gameGenre').value,
    status: document.getElementById('gameStatus').value,
    isPhysical: document.getElementById('isPhysical').checked,
    description: document.getElementById('gameDescription').value.trim(),
    addedDate: new Date().toISOString(),
    screenshots: []
  };
  
  games.unshift(newGame);
  filteredGames.unshift(newGame);
  
  await saveData();
  closeAddGameModal();
  e.target.reset();
  renderAll();
}

async function handleAddUpcomingGame(e) {
  e.preventDefault();
  
  const platforms = [];
  if (document.getElementById('platformPs5').checked) platforms.push('ps5');
  if (document.getElementById('platformPs4').checked) platforms.push('ps4');
  
  const newUpcoming = {
    id: Date.now(),
    title: document.getElementById('upcomingTitle').value.trim(),
    coverImage: document.getElementById('upcomingCover').value.trim(),
    releaseDate: document.getElementById('upcomingDate').value,
    developer: document.getElementById('upcomingDeveloper').value.trim(),
    genre: document.getElementById('upcomingGenre').value,
    platforms: platforms,
    addedDate: new Date().toISOString()
  };
  
  upcomingGames.unshift(newUpcoming);
  
  await saveData();
  closeAddUpcomingModal();
  e.target.reset();
  renderUpcomingGames();
}

function editGame(id) {
  const game = games.find(g => g.id === id);
  if (!game) return;
  
  // Populate form
  document.getElementById('gameTitle').value = game.title;
  document.getElementById('gamePlatform').value = game.platform;
  document.getElementById('gameCover').value = game.coverImage;
  document.getElementById('gameYear').value = game.releaseYear;
  document.getElementById('gameDeveloper').value = game.developer || '';
  document.getElementById('gameGenre').value = game.genre || 'survival-horror';
  document.getElementById('gameStatus').value = game.status || 'not-started';
  document.getElementById('isPhysical').checked = game.isPhysical || false;
  document.getElementById('gameDescription').value = game.description || '';
  
  // Change form to edit mode
  const form = document.getElementById('addGameForm');
  const submitBtn = form.querySelector('.btn-primary');
  submitBtn.textContent = 'Сохранить изменения';
  submitBtn.onclick = async (e) => {
    e.preventDefault();
    
    game.title = document.getElementById('gameTitle').value.trim();
    game.platform = document.getElementById('gamePlatform').value;
    game.coverImage = document.getElementById('gameCover').value.trim();
    game.releaseYear = parseInt(document.getElementById('gameYear').value);
    game.developer = document.getElementById('gameDeveloper').value.trim();
    game.genre = document.getElementById('gameGenre').value;
    game.status = document.getElementById('gameStatus').value;
    game.isPhysical = document.getElementById('isPhysical').checked;
    game.description = document.getElementById('gameDescription').value.trim();
    
    await saveData();
    closeAddGameModal();
    renderAll();
  };
  
  openAddGameModal();
}

async function deleteGame(id) {
  if (!confirm('Удалить игру из коллекции?')) return;
  
  games = games.filter(g => g.id !== id);
  filteredGames = filteredGames.filter(g => g.id !== id);
  
  await saveData();
  renderAll();
}

// Open game detail modal
function openGameDetail(id) {
  const game = games.find(g => g.id === id);
  if (!game) return;
  
  currentGameId = id;
  
  document.getElementById('detailTitle').textContent = game.title;
  
  const detailContent = document.getElementById('gameDetailContent');
  detailContent.innerHTML = `
    <img src="${game.coverImage}" alt="${escapeHtml(game.title)}" class="game-detail-cover">
    
    <div class="game-detail-info">
      <div class="info-item">
        <h4>Платформа</h4>
        <p>${game.platform.toUpperCase()}</p>
      </div>
      <div class="info-item">
        <h4>Год выхода</h4>
        <p>${game.releaseYear}</p>
      </div>
      <div class="info-item">
        <h4>Разработчик</h4>
        <p>${escapeHtml(game.developer || 'Не указан')}</p>
      </div>
      <div class="info-item">
        <h4>Жанр</h4>
        <p>${escapeHtml(game.genre || 'Horror')}</p>
      </div>
      <div class="info-item">
        <h4>Статус</h4>
        <p>${getStatusText(game.status)}</p>
      </div>
      <div class="info-item">
        <h4>Физическая копия</h4>
        <p>${game.isPhysical ? 'Да' : 'Нет'}</p>
      </div>
    </div>
    
    ${game.description ? `
      <div class="game-description">
        <h3>Описание</h3>
        <p>${escapeHtml(game.description)}</p>
      </div>
    ` : ''}
    
    ${game.screenshots && game.screenshots.length > 0 ? `
      <div style="margin-top: 30px;">
        <h3>Скриншоты</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-top: 15px;">
          ${game.screenshots.map(url => `
            <img src="${url}" alt="Screenshot" style="width: 100%; border-radius: 8px; cursor: pointer;" 
                 onclick="window.open('${url}', '_blank')">
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeGameDetailModal()">Закрыть</button>
      ${currentUser ? `
        <button class="btn-primary" onclick="toggleCollection(${game.id})">
          <i class="fas fa-heart"></i> 
          ${userCollections[currentUser.id]?.games.includes(game.id) ? 'Удалить из коллекции' : 'В мою коллекцию'}
        </button>
      ` : ''}
    </div>
  `;
  
  document.getElementById('gameDetailModal').style.display = 'block';
}

function closeGameDetailModal() {
  document.getElementById('gameDetailModal').style.display = 'none';
}

function openUpcomingDetail(id) {
  const game = upcomingGames.find(g => g.id === id);
  if (!game) return;
  
  alert(`${game.title}\nДата выхода: ${formatDate(game.releaseDate)}\nРазработчик: ${game.developer || 'Не указан'}`);
}

// Collection management
async function toggleCollection(gameId) {
  if (!currentUser) {
    alert('Войдите через Telegram, чтобы добавлять игры в коллекцию');
    return;
  }
  
  if (!userCollections[currentUser.id]) {
    userCollections[currentUser.id] = {
      games: [],
      status: {}
    };
  }
  
  const userCollection = userCollections[currentUser.id];
  const index = userCollection.games.indexOf(gameId);
  
  if (index === -1) {
    // Add to collection
    userCollection.games.push(gameId);
    userCollection.status[gameId] = 'not-started';
    alert('Игра добавлена в вашу коллекцию!');
  } else {
    // Remove from collection
    userCollection.games.splice(index, 1);
    delete userCollection.status[gameId];
    alert('Игра удалена из вашей коллекции');
  }
  
  await saveData();
  renderGames();
}

// Share game
function shareGame(gameId) {
  const game = games.find(g => g.id === gameId);
  if (!game) return;
  
  currentGameId = gameId;
  
  const shareMessage = `Посмотрите эту игру: ${game.title} (${game.platform.toUpperCase()}, ${game.releaseYear})`;
  document.getElementById('shareMessage').textContent = shareMessage;
  
  document.getElementById('shareModal').style.display = 'block';
}

function shareToTelegram() {
  const game = games.find(g => g.id === currentGameId);
  if (!game) return;
  
  const text = `🎮 *${game.title}*\n\n📀 Платформа: ${game.platform.toUpperCase()}\n🗓️ Год: ${game.releaseYear}\n🏢 Разработчик: ${game.developer || 'Не указан'}\n\n${game.description ? game.description.substring(0, 200) + '...' : 'Отличная хоррор игра для PS4/PS5!'}`;
  
  if (window.Telegram && tg.initDataUnsafe.user) {
    tg.sendData(JSON.stringify({
      action: 'share_game',
      gameId: currentGameId,
      gameTitle: game.title
    }));
  } else {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
  }
  
  closeShareModal();
}

function copyShareLink() {
  const game = games.find(g => g.id === currentGameId);
  if (!game) return;
  
  const shareText = `Посмотрите "${game.title}" в коллекции хоррор игр для PS4/PS5!`;
  
  navigator.clipboard.writeText(shareText).then(() => {
    alert('Ссылка скопирована в буфер обмена!');
    closeShareModal();
  });
}

// Pagination
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderGames();
  }
}

function nextPage() {
  const totalPages = Math.ceil(filteredGames.length / gamesPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderGames();
  }
}

// Theme toggle
function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  }
  localStorage.setItem('psHorrorTheme', currentTheme);
}

function restoreTheme() {
  const savedTheme = localStorage.getItem('psHorrorTheme');
  if (savedTheme) {
    currentTheme = savedTheme;
  }
  document.documentElement.setAttribute('data-theme', currentTheme);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
  }
}

// Modal functions
function openAddGameModal() {
  document.getElementById('addGameModal').style.display = 'block';
  document.getElementById('gameTitle').focus();
}

function closeAddGameModal() {
  document.getElementById('addGameModal').style.display = 'none';
  const form = document.getElementById('addGameForm');
  form.reset();
  const submitBtn = form.querySelector('.btn-primary');
  submitBtn.textContent = 'Добавить игру';
  submitBtn.onclick = handleAddGame;
}

function openAddUpcomingModal() {
  document.getElementById('addUpcomingModal').style.display = 'block';
  document.getElementById('upcomingTitle').focus();
}

function closeAddUpcomingModal() {
  document.getElementById('addUpcomingModal').style.display = 'none';
  document.getElementById('addUpcomingForm').reset();
}

function closeShareModal() {
  document.getElementById('shareModal').style.display = 'none';
}

// Utility functions
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
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function getGameAverageRating(gameId) {
  const gameComments = comments.filter(c => c.gameId === gameId && c.rating > 0);
  if (gameComments.length === 0) return 0;
  const sum = gameComments.reduce((total, c) => total + c.rating, 0);
  return sum / gameComments.length;
}
