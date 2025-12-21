// Horror Games Collection App - PS4/PS5 Edition
const ADMIN_USER_ID = 321407568; // Ваш Telegram ID

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
      
      // Detect platform
      if (window.Telegram.WebApp.platform === 'tdesktop') {
        document.documentElement.classList.add('telegram-desktop');
        console.log('Telegram Desktop detected');
      }
    } catch (e) {
      console.error('Telegram WebApp error:', e);
    }
    setupTelegramUser();
  }
  
  // Добавить класс если это Telegram Desktop
  if (navigator.userAgent.includes('TelegramDesktop')) {
    document.documentElement.classList.add('telegram-desktop');
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
    console.log('Начинаю загрузку данных...');
    
    // Сначала проверяем localStorage
    const savedData = localStorage.getItem('psHorrorGamesData');
    
    if (savedData) {
      console.log('Найдены данные в localStorage');
      const data = JSON.parse(savedData);
      games = data.games || [];
      upcomingGames = data.upcomingGames || [];
      comments = data.comments || [];
      userCollections = data.userCollections || {};
      
      console.log('Загружено из localStorage:', games.length, 'игр');
    } else {
      console.log('Данных в localStorage нет, загружаю из games.json');
      // Если localStorage пустой, читаем из файла
      try {
        const response = await fetch('games.json');
        const data = await response.json();
        
        games = data.games || [];
        upcomingGames = data.upcomingGames || [];
        comments = data.comments || [];
        userCollections = data.userCollections || {};
        
        console.log('Загружено из games.json:', games.length, 'игр');
        
        // Сохраняем в localStorage
        await saveData();
      } catch (fetchError) {
        console.error('Ошибка загрузки games.json:', fetchError);
        // Если файла нет или ошибка, начинаем с пустых данных
        games = [];
        upcomingGames = [];
        comments = [];
        userCollections = {};
      }
    }
    
    // Convert old games from 'genre' to 'genres' if needed
    games = games.map(game => {
      if (game.genre && !game.genres) {
        // Convert single genre to array
        game.genres = [game.genre];
        delete game.genre;
      } else if (!game.genres) {
        game.genres = [];
      }
      return game;
    });
    
    // Initialize user collection if not exists
    if (currentUser && !userCollections[currentUser.id]) {
      userCollections[currentUser.id] = {
        games: [],
        status: {}
      };
    }
    
    filteredGames = [...games];
    console.log('Всего игр после обработки:', games.length);
    
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
  try {
    console.log('Сохранение данных...');
    
    const data = {
      games,
      upcomingGames,
      comments,
      userCollections,
      lastUpdate: new Date().toISOString()
    };
    
    console.log('Сохраняю:', {
      totalGames: games.length,
      games: games.map(g => ({ id: g.id, title: g.title }))
    });
    
    // Save to localStorage
    localStorage.setItem('psHorrorGamesData', JSON.stringify(data));
    console.log('Данные успешно сохранены в localStorage');
    
    return true;
  } catch (e) {
    console.error('Ошибка сохранения данных:', e);
    return false;
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
  
  // Enter key in search
  elements.searchInput?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      applyFilters();
    }
  });
  
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
    if (searchTerm) {
      const searchInTitle = game.title.toLowerCase().includes(searchTerm);
      const searchInDeveloper = game.developer && game.developer.toLowerCase().includes(searchTerm);
      const searchInDescription = game.description && game.description.toLowerCase().includes(searchTerm);
      const searchInGenres = game.genres && game.genres.some(genre => 
        genre.toLowerCase().includes(searchTerm)
      );
      
      if (!searchInTitle && !searchInDeveloper && !searchInDescription && !searchInGenres) {
        return false;
      }
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
    
    // Format genres for display
    const genresHTML = game.genres && game.genres.length > 0 ? `
      <div class="genre-tags">
        ${game.genres.slice(0, 3).map(genre => `
          <span class="genre-tag">${formatGenreName(genre)}</span>
        `).join('')}
        ${game.genres.length > 3 ? `<span class="genre-tag">+${game.genres.length - 3}</span>` : ''}
      </div>
    ` : '';
    
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
      
      <img src="${game.coverImage}" alt="${escapeHtml(game.title)}" class="game-cover"
           onerror="this.src='https://via.placeholder.com/300x400/333333/666666?text=No+Image'">
      
      <div class="game-info">
        <div class="game-title">${escapeHtml(game.title)}</div>
        <div class="game-platform platform-${game.platform}">
          ${game.platform.toUpperCase()}
        </div>
        
        ${genresHTML}
        
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
  
  try {
    // Получаем жанры и преобразуем в массив
    const genresInput = document.getElementById('gameGenres').value.trim();
    const genresArray = genresInput
      .split(',')
      .map(genre => genre.trim())
      .filter(genre => genre.length > 0)
      .map(genre => genre.toLowerCase().replace(/\s+/g, '-'));
    
    const newGame = {
      id: Date.now() + Math.floor(Math.random() * 1000), // Уникальный ID
      title: document.getElementById('gameTitle').value.trim(),
      platform: document.getElementById('gamePlatform').value,
      coverImage: document.getElementById('gameCover').value.trim(),
      releaseYear: parseInt(document.getElementById('gameYear').value),
      developer: document.getElementById('gameDeveloper').value.trim(),
      genres: genresArray,
      status: document.getElementById('gameStatus').value,
      isPhysical: document.getElementById('isPhysical').checked,
      description: document.getElementById('gameDescription').value.trim(),
      addedDate: new Date().toISOString(),
      screenshots: []
    };
    
    console.log('Добавляю игру:', newGame);
    
    games.unshift(newGame);
    filteredGames.unshift(newGame);
    
    const saved = await saveData();
    if (saved) {
      console.log('Игра успешно добавлена и сохранена');
      closeAddGameModal();
      e.target.reset();
      renderAll();
      
      // Показать уведомление
      alert(`Игра "${newGame.title}" успешно добавлена!`);
    } else {
      alert('Ошибка при сохранении игры!');
    }
  } catch (error) {
    console.error('Ошибка при добавлении игры:', error);
    alert('Произошла ошибка при добавлении игры. Проверьте консоль для деталей.');
  }
}

async function handleAddUpcomingGame(e) {
  e.preventDefault();
  
  try {
    const platforms = [];
    if (document.getElementById('platformPs5').checked) platforms.push('ps5');
    if (document.getElementById('platformPs4').checked) platforms.push('ps4');
    
    const newUpcoming = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      title: document.getElementById('upcomingTitle').value.trim(),
      coverImage: document.getElementById('upcomingCover').value.trim(),
      releaseDate: document.getElementById('upcomingDate').value,
      developer: document.getElementById('upcomingDeveloper').value.trim(),
      genre: document.getElementById('upcomingGenre').value,
      platforms: platforms,
      addedDate: new Date().toISOString()
    };
    
    upcomingGames.unshift(newUpcoming);
    
    const saved = await saveData();
    if (saved) {
      closeAddUpcomingModal();
      e.target.reset();
      renderUpcomingGames();
      alert(`Ожидаемая игра "${newUpcoming.title}" добавлена!`);
    }
  } catch (error) {
    console.error('Ошибка при добавлении ожидаемой игры:', error);
    alert('Ошибка при добавлении игры!');
  }
}

function editGame(id) {
  const game = games.find(g => g.id === id);
  if (!game) {
    alert('Игра не найдена!');
    return;
  }
  
  // Преобразуем массив жанров в строку через запятую
  const genresString = game.genres ? game.genres.join(', ') : '';
  
  document.getElementById('gameTitle').value = game.title;
  document.getElementById('gamePlatform').value = game.platform;
  document.getElementById('gameCover').value = game.coverImage;
  document.getElementById('gameYear').value = game.releaseYear;
  document.getElementById('gameDeveloper').value = game.developer || '';
  document.getElementById('gameGenres').value = genresString;
  document.getElementById('gameStatus').value = game.status || 'not-started';
  document.getElementById('isPhysical').checked = game.isPhysical || false;
  document.getElementById('gameDescription').value = game.description || '';
  
  // Change form to edit mode
  const form = document.getElementById('addGameForm');
  const submitBtn = form.querySelector('.btn-primary');
  submitBtn.textContent = 'Сохранить изменения';
  
  // Remove existing event listeners
  const newSubmitBtn = submitBtn.cloneNode(true);
  submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
  
  newSubmitBtn.onclick = async (e) => {
    e.preventDefault();
    
    try {
      game.title = document.getElementById('gameTitle').value.trim();
      game.platform = document.getElementById('gamePlatform').value;
      game.coverImage = document.getElementById('gameCover').value.trim();
      game.releaseYear = parseInt(document.getElementById('gameYear').value);
      game.developer = document.getElementById('gameDeveloper').value.trim();
      game.genres = document.getElementById('gameGenres').value
        .split(',')
        .map(genre => genre.trim())
        .filter(genre => genre.length > 0)
        .map(genre => genre.toLowerCase().replace(/\s+/g, '-'));
      game.status = document.getElementById('gameStatus').value;
      game.isPhysical = document.getElementById('isPhysical').checked;
      game.description = document.getElementById('gameDescription').value.trim();
      
      const saved = await saveData();
      if (saved) {
        closeAddGameModal();
        renderAll();
        alert('Изменения сохранены!');
      }
    } catch (error) {
      console.error('Ошибка при сохранении изменений:', error);
      alert('Ошибка при сохранении изменений!');
    }
  };
  
  openAddGameModal();
}

async function deleteGame(id) {
  if (!confirm('Удалить игру из коллекции?')) return;
  
  try {
    const gameIndex = games.findIndex(g => g.id === id);
    if (gameIndex === -1) {
      alert('Игра не найдена!');
      return;
    }
    
    const gameTitle = games[gameIndex].title;
    
    games = games.filter(g => g.id !== id);
    filteredGames = filteredGames.filter(g => g.id !== id);
    
    // Remove from all user collections
    Object.keys(userCollections).forEach(userId => {
      const userGames = userCollections[userId].games;
      const userIndex = userGames.indexOf(id);
      if (userIndex !== -1) {
        userGames.splice(userIndex, 1);
      }
      if (userCollections[userId].status) {
        delete userCollections[userId].status[id];
      }
    });
    
    const saved = await saveData();
    if (saved) {
      renderAll();
      alert(`Игра "${gameTitle}" удалена!`);
    }
  } catch (error) {
    console.error('Ошибка при удалении игры:', error);
    alert('Ошибка при удалении игры!');
  }
}

// Open game detail modal
function openGameDetail(id) {
  console.log('Открываю детали игры ID:', id);
  
  const game = games.find(g => g.id === id);
  if (!game) {
    console.error('Игра не найдена с ID:', id);
    alert('Игра не найдена!');
    return;
  }
  
  currentGameId = id;
  
  document.getElementById('detailTitle').textContent = game.title;
  
  const detailContent = document.getElementById('gameDetailContent');
  
  // Format genres
  const genresHTML = game.genres && game.genres.length > 0 
    ? game.genres.map(genre => `
        <span class="genre-tag">${formatGenreName(genre)}</span>
      `).join('')
    : '<p style="color: var(--text-muted);">Не указаны</p>';
  
  detailContent.innerHTML = `
    <img src="${game.coverImage}" alt="${escapeHtml(game.title)}" class="game-detail-cover"
         onerror="this.src='https://via.placeholder.com/600x400/333333/666666?text=No+Image'">
    
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
        <h4>Жанры</h4>
        <div class="genre-tags">
          ${genresHTML}
        </div>
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
        <p style="white-space: pre-line;">${escapeHtml(game.description)}</p>
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
  
  try {
    if (!userCollections[currentUser.id]) {
      userCollections[currentUser.id] = {
        games: [],
        status: {}
      };
    }
    
    const userCollection = userCollections[currentUser.id];
    const game = games.find(g => g.id === gameId);
    
    if (!game) {
      alert('Игра не найдена!');
      return;
    }
    
    const index = userCollection.games.indexOf(gameId);
    
    if (index === -1) {
      // Add to collection
      userCollection.games.push(gameId);
      userCollection.status[gameId] = 'not-started';
      
      const saved = await saveData();
      if (saved) {
        renderGames();
        alert(`"${game.title}" добавлена в вашу коллекцию!`);
      }
    } else {
      // Remove from collection
      userCollection.games.splice(index, 1);
      delete userCollection.status[gameId];
      
      const saved = await saveData();
      if (saved) {
        renderGames();
        alert(`"${game.title}" удалена из вашей коллекции`);
      }
    }
  } catch (error) {
    console.error('Ошибка при работе с коллекцией:', error);
    alert('Произошла ошибка!');
  }
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
  
  const shareText = `Посмотрите "${game.title}" в коллекции хоррор игр для PS4/PS5! ${window.location.href}`;
  
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
  setTimeout(() => document.getElementById('gameTitle').focus(), 100);
}

function closeAddGameModal() {
  document.getElementById('addGameModal').style.display = 'none';
  const form = document.getElementById('addGameForm');
  form.reset();
  
  // Reset submit button
  const submitBtn = form.querySelector('.btn-primary');
  submitBtn.textContent = 'Добавить игру';
  
  // Remove old event listeners by cloning
  const newSubmitBtn = submitBtn.cloneNode(true);
  submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
  
  newSubmitBtn.onclick = handleAddGame;
}

function openAddUpcomingModal() {
  document.getElementById('addUpcomingModal').style.display = 'block';
  setTimeout(() => document.getElementById('upcomingTitle').focus(), 100);
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
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

function getGameAverageRating(gameId) {
  const gameComments = comments.filter(c => c.gameId === gameId && c.rating > 0);
  if (gameComments.length === 0) return 0;
  const sum = gameComments.reduce((total, c) => total + c.rating, 0);
  return sum / gameComments.length;
}

function formatGenreName(genre) {
  const genreMap = {
    'survival-horror': 'Survival Horror',
    'survival': 'Survival Horror',
    'psychological-horror': 'Psychological Horror',
    'psychological': 'Psychological Horror',
    'action-horror': 'Action Horror',
    'action': 'Action Horror',
    'sci-fi-horror': 'Sci-Fi Horror',
    'sci-fi': 'Sci-Fi Horror',
    'horror': 'Horror',
    'adventure': 'Adventure',
    'puzzle': 'Puzzle',
    'first-person': 'First Person',
    'third-person': 'Third Person'
  };
  
  // Если есть в мапе - возвращаем красивое название
  if (genreMap[genre]) {
    return genreMap[genre];
  }
  
  // Иначе форматируем: "some-genre" -> "Some Genre"
  return genre
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Debug function to check data
function debugData() {
  console.log('=== DEBUG DATA ===');
  console.log('Games in memory:', games.length);
  console.log('Games array:', games);
  console.log('LocalStorage data:', localStorage.getItem('psHorrorGamesData'));
  console.log('Current user:', currentUser);
  console.log('User collections:', userCollections);
  console.log('==================');
}

// Clear all data (for testing)
function clearAllData() {
  if (confirm('Вы уверены? Это удалит ВСЕ данные приложения.')) {
    localStorage.removeItem('psHorrorGamesData');
    localStorage.removeItem('psHorrorTheme');
    games = [];
    upcomingGames = [];
    comments = [];
    userCollections = {};
    filteredGames = [];
    
    setTimeout(() => {
      alert('Все данные очищены!');
      location.reload();
    }, 500);
  }
}
