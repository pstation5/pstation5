// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;

// DOM элементы
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

// Переменные приложения
let games = [];
let upcomingGames = [];
let filteredGames = [];
let currentPage = 1;
const gamesPerPage = 10;
let currentTheme = 'dark';

// Коллекция данных
let collection = {
    games: [],
    upcoming: [],
    settings: {
        collectionName: 'Horror | PS4 | PS5',
        adminMode: false
    },
    version: '1.0',
    lastUpdated: new Date().toISOString()
};

// Инициализация приложения
function initApp() {
    console.log('🚀 Инициализация Horror коллекции...');
    
    // Настройка Telegram
    if (tg.initDataUnsafe) {
        tg.expand();
        tg.setHeaderColor('#8b0000');
        tg.setBackgroundColor('#121212');
        setupTelegramUser();
    }
    
    // Загрузка данных
    loadCollection();
    
    // Настройка фильтров и поиска
    setupEventListeners();
    
    // Настройка темы
    const savedTheme = localStorage.getItem('horrorTheme');
    if (savedTheme) setTheme(savedTheme);
    
    // Обновление даты
    updateDate();
    
    console.log('✅ Приложение готово!');
}

// Настройка пользователя Telegram
function setupTelegramUser() {
    const user = tg.initDataUnsafe?.user;
    if (!user) return;
    
    const firstName = user.first_name || 'Коллекционер';
    elements.userGreeting.textContent = `👻 ${collection.settings.collectionName}`;
    
    if (user.photo_url) {
        elements.userAvatar.innerHTML = `<img src="${user.photo_url}" alt="Аватар">`;
    }
}

// Загрузка коллекции
async function loadCollection() {
    try {
        // Пробуем загрузить из localStorage
        const saved = localStorage.getItem('horrorCollection');
        if (saved) {
            const data = JSON.parse(saved);
            collection.games = data.games || [];
            collection.upcoming = data.upcoming || [];
            collection.settings = data.settings || collection.settings;
            console.log(`📂 Загружено ${collection.games.length} игр из localStorage`);
        } else {
            // Загружаем из games.json
            const response = await fetch('games.json');
            if (!response.ok) throw new Error('Файл games.json не найден');
            
            const data = await response.json();
            collection.games = data.games || [];
            collection.upcoming = data.upcoming || [];
            saveCollection();
            console.log(`📂 Загружено ${collection.games.length} игр из games.json`);
        }
        
        games = collection.games;
        upcomingGames = collection.upcoming;
        filteredGames = [...games];
        
        updateStats();
        renderUpcomingGames();
        renderGames();
        updateCollectionInfo();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        showError('Не удалось загрузить коллекцию');
    }
}

// Сохранение коллекции
function saveCollection() {
    try {
        collection.lastUpdated = new Date().toISOString();
        localStorage.setItem('horrorCollection', JSON.stringify(collection));
        return true;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showNotification('Ошибка сохранения', 'error');
        return false;
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Поиск
    elements.searchInput.addEventListener('input', function() {
        filterGames();
        const clearBtn = document.querySelector('.clear-search');
        if (clearBtn) clearBtn.style.display = this.value ? 'block' : 'none';
    });
    
    // Фильтры
    elements.platformFilter.addEventListener('change', filterGames);
    elements.statusFilter.addEventListener('change', filterGames);
    elements.sortSelect.addEventListener('change', filterGames);
    
    // Быстрые фильтры
    document.getElementById('quickFilters').addEventListener('click', function(e) {
        if (e.target.classList.contains('tag')) {
            document.querySelectorAll('.tag').forEach(tag => {
                tag.classList.remove('active');
            });
            e.target.classList.add('active');
            
            const filter = e.target.dataset.platform;
            if (filter === 'survival') {
                elements.searchInput.value = 'survival horror';
            } else if (filter === 'psychological') {
                elements.searchInput.value = 'психологический';
            } else if (filter !== 'all') {
                elements.platformFilter.value = filter;
            } else {
                elements.platformFilter.value = 'all';
                elements.searchInput.value = '';
            }
            filterGames();
        }
    });
}

// Рендер ожидаемых игр
function renderUpcomingGames() {
    if (!upcomingGames.length) {
        elements.upcomingSlider.innerHTML = `
            <div class="no-upcoming">
                <i class="fas fa-calendar-alt"></i>
                <p>Нет ожидаемых игр</p>
            </div>
        `;
        return;
    }
    
    elements.upcomingSlider.innerHTML = upcomingGames.map(game => `
        <div class="upcoming-card" onclick="openUpcomingDetails(${game.id})">
            <img src="${game.cover || 'https://via.placeholder.com/300x400/222/666?text=No+Cover'}" 
                 alt="${game.title}" 
                 class="upcoming-cover">
            <div class="upcoming-info">
                <h3>${game.title}</h3>
                <div class="upcoming-details">
                    <span class="upcoming-date">
                        <i class="fas fa-calendar-day"></i> ${formatDate(game.releaseDate)}
                    </span>
                    <span class="upcoming-platform">
                        <i class="fas fa-tv"></i> ${getPlatformName(game.platform)}
                    </span>
                </div>
                <p class="upcoming-developer">${game.developer || 'Не указан'}</p>
                <button class="btn-small" onclick="event.stopPropagation(); addUpcomingToCollection(${game.id})">
                    <i class="fas fa-plus"></i> В коллекцию
                </button>
            </div>
        </div>
    `).join('');
}

// Рендер игр
function renderGames() {
    const startIndex = (currentPage - 1) * gamesPerPage;
    const endIndex = startIndex + gamesPerPage;
    const pageGames = filteredGames.slice(startIndex, endIndex);
    
    if (!pageGames.length) {
        elements.gameGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-ghost"></i>
                <h3>Игры не найдены</h3>
                <p>Попробуйте изменить фильтры</p>
            </div>
        `;
        updatePagination();
        return;
    }
    
    elements.gameGrid.innerHTML = pageGames.map(game => `
        <div class="game-card" onclick="openGameDetails(${game.id})">
            <div class="game-badge ${game.status}">
                ${getStatusIcon(game.status)}
            </div>
            <div class="game-actions">
                <button class="action-btn edit-btn" onclick="event.stopPropagation(); editGame(${game.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="event.stopPropagation(); deleteGameConfirm(${game.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <img src="${game.coverImage}" 
                 alt="${game.title}" 
                 class="game-cover"
                 onerror="this.src='https://via.placeholder.com/300x400/222/666?text=Horror+Game'">
            <div class="game-info">
                <h3 class="game-title">${game.title}</h3>
                <div class="game-meta">
                    <span class="game-platform ${game.platform}">
                        ${getPlatformIcon(game.platform)} ${game.platformName}
                    </span>
                    <span class="game-rating">
                        ${renderStars(game.rating || 0)}
                    </span>
                </div>
                <div class="game-details">
                    <span class="game-year">${game.releaseYear || 'N/A'}</span>
                    <span class="game-genre">${game.genre || 'Horror'}</span>
                </div>
            </div>
        </div>
    `).join('');
    
    updatePagination();
}

// Фильтрация и сортировка
function filterGames() {
    const platform = elements.platformFilter.value;
    const status = elements.statusFilter.value;
    const sortBy = elements.sortSelect.value;
    const searchQuery = elements.searchInput.value.toLowerCase();
    
    filteredGames = collection.games.filter(game => {
        const platformMatch = platform === 'all' || 
            game.platform === platform || 
            (platform === 'ps4-ps5' && game.platform.includes('ps'));
        
        const statusMatch = status === 'all' || game.status === status;
        const searchMatch = !searchQuery || 
            game.title.toLowerCase().includes(searchQuery) ||
            (game.description && game.description.toLowerCase().includes(searchQuery)) ||
            (game.developer && game.developer.toLowerCase().includes(searchQuery)) ||
            (game.genre && game.genre.toLowerCase().includes(searchQuery));
        
        return platformMatch && statusMatch && searchMatch;
    });
    
    // Сортировка
    filteredGames.sort((a, b) => {
        switch (sortBy) {
            case 'newest':
                return (b.releaseYear || 0) - (a.releaseYear || 0);
            case 'oldest':
                return (a.releaseYear || 0) - (b.releaseYear || 0);
            case 'title':
                return a.title.localeCompare(b.title, 'ru');
            case 'rating':
                return (b.rating || 0) - (a.rating || 0);
            default:
                return 0;
        }
    });
    
    currentPage = 1;
    renderGames();
    updateStats();
}

// Обновление статистики
function updateStats() {
    elements.totalGamesEl.textContent = collection.games.length;
    elements.horrorGamesEl.textContent = collection.games.filter(g => g.genre?.includes('horror')).length;
    
    const platforms = [...new Set(collection.games.map(g => g.platform))];
    elements.uniquePlatformsEl.textContent = platforms.length;
    
    const ratings = collection.games.map(g => g.rating).filter(r => r);
    const avgRating = ratings.length ? 
        (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0;
    elements.avgRatingEl.textContent = avgRating;
}

// Обновление информации о коллекции
function updateCollectionInfo() {
    elements.collectionCount.textContent = collection.games.length;
    elements.upcomingCount.textContent = collection.upcoming.length;
    elements.lastUpdateTime.textContent = formatDate(collection.lastUpdated);
}

// Пагинация
function updatePagination() {
    const totalPages = Math.ceil(filteredGames.length / gamesPerPage);
    elements.currentPageEl.textContent = currentPage;
    elements.totalPagesEl.textContent = totalPages;
    
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.style.display = 'inline-flex';
    });
}

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

// Открытие деталей игры
function openGameDetails(gameId) {
    const game = collection.games.find(g => g.id === gameId);
    if (!game) {
        showNotification('Игра не найдена', 'error');
        return;
    }
    
    document.getElementById('modalTitle').textContent = game.title;
    document.getElementById('modalBody').innerHTML = createGameDetailsHTML(game);
    document.getElementById('gameModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function createGameDetailsHTML(game) {
    return `
        <div class="game-detail-view">
            <div class="detail-header">
                <img src="${game.coverImage}" alt="${game.title}" class="detail-cover">
                <div class="detail-meta">
                    <div class="detail-rating">${renderStars(game.rating || 0)}</div>
                    <div class="detail-status ${game.status}">
                        ${getStatusIcon(game.status)} ${getStatusText(game.status)}
                    </div>
                    <div class="detail-platform">
                        ${getPlatformIcon(game.platform)} ${game.platformName}
                    </div>
                    <div class="detail-year">
                        <i class="fas fa-calendar-alt"></i> ${game.releaseYear || 'N/A'}
                    </div>
                    <div class="detail-developer">
                        <i class="fas fa-code"></i> ${game.developer || 'Не указан'}
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-align-left"></i> Описание</h3>
                <p>${game.description || 'Описание отсутствует.'}</p>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-tags"></i> Информация</h3>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Жанр:</span>
                        <span class="info-value">${game.genre || 'Horror'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Издатель:</span>
                        <span class="info-value">${game.publisher || 'Не указан'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Дата покупки:</span>
                        <span class="info-value">${game.purchaseDate || 'Не указана'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Состояние диска:</span>
                        <span class="info-value">${game.discCondition || 'Хорошее'}</span>
                    </div>
                </div>
            </div>
            
            ${game.screenshots?.length ? `
            <div class="detail-section">
                <h3><i class="fas fa-images"></i> Скриншоты</h3>
                <div class="screenshots-grid">
                    ${game.screenshots.map(url => `
                        <img src="${url}" alt="Скриншот" class="screenshot" onclick="openImage('${url}')">
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            ${game.notes ? `
            <div class="detail-section notes-section">
                <h3><i class="fas fa-sticky-note"></i> Заметки</h3>
                <p>${game.notes}</p>
            </div>
            ` : ''}
            
            <div class="detail-actions">
                <button class="btn-secondary" onclick="shareGame(${game.id})">
                    <i class="fas fa-share"></i> Поделиться
                </button>
                <button class="btn-primary" onclick="editGame(${game.id})">
                    <i class="fas fa-edit"></i> Редактировать
                </button>
            </div>
        </div>
    `;
}

// Добавление новой игры
function openAddGameModal() {
    document.getElementById('addGameModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('addGameForm').reset();
}

function closeAddGameModal() {
    document.getElementById('addGameModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function addNewGame(event) {
    event.preventDefault();
    
    const newGame = {
        id: Date.now(),
        title: document.getElementById('gameTitle').value.trim(),
        platform: document.getElementById('gamePlatform').value,
        platformName: getPlatformName(document.getElementById('gamePlatform').value),
        releaseYear: parseInt(document.getElementById('gameYear').value) || new Date().getFullYear(),
        status: document.getElementById('gameStatus').value,
        rating: parseInt(document.getElementById('gameRating').value) || null,
        developer: document.getElementById('gameDeveloper').value.trim(),
        genre: document.getElementById('gameGenre').value,
        coverImage: document.getElementById('gameCover').value.trim() || 
                   'https://via.placeholder.com/300x400/222/666?text=Horror+Game',
        description: document.getElementById('gameDescription').value.trim(),
        purchaseDate: new Date().toISOString().split('T')[0],
        discCondition: 'Новая',
        publisher: '',
        screenshots: [],
        notes: '',
        createdAt: new Date().toISOString()
    };
    
    collection.games.unshift(newGame);
    
    if (saveCollection()) {
        games = collection.games;
        filteredGames = [...games];
        updateStats();
        renderGames();
        updateCollectionInfo();
        
        showNotification(`"${newGame.title}" добавлена!`, 'success');
        closeAddGameModal();
    }
}

// Ожидаемые игры
function openAddUpcomingModal() {
    document.getElementById('addUpcomingModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('addUpcomingForm').reset();
    document.getElementById('upcomingReleaseDate').value = new Date().toISOString().split('T')[0];
}

function closeAddUpcomingModal() {
    document.getElementById('addUpcomingModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function addUpcomingGame(event) {
    event.preventDefault();
    
    const newUpcoming = {
        id: Date.now(),
        title: document.getElementById('upcomingTitle').value.trim(),
        cover: document.getElementById('upcomingCover').value.trim() ||
               'https://via.placeholder.com/300x400/222/666?text=Coming+Soon',
        developer: document.getElementById('upcomingDeveloper').value.trim(),
        releaseDate: document.getElementById('upcomingReleaseDate').value,
        genre: document.getElementById('upcomingGenre').value.trim(),
        platform: document.getElementById('upcomingPlatform').value,
        createdAt: new Date().toISOString()
    };
    
    collection.upcoming.unshift(newUpcoming);
    
    if (saveCollection()) {
        upcomingGames = collection.upcoming;
        renderUpcomingGames();
        updateCollectionInfo();
        
        showNotification(`"${newUpcoming.title}" добавлена в ожидаемые!`, 'success');
        closeAddUpcomingModal();
    }
}

function addUpcomingToCollection(upcomingId) {
    const upcoming = collection.upcoming.find(u => u.id === upcomingId);
    if (!upcoming) return;
    
    const newGame = {
        id: Date.now(),
        title: upcoming.title,
        platform: upcoming.platform,
        platformName: getPlatformName(upcoming.platform),
        releaseYear: new Date(upcoming.releaseDate).getFullYear(),
        status: 'planned',
        rating: null,
        developer: upcoming.developer,
        genre: upcoming.genre || 'Horror',
        coverImage: upcoming.cover,
        description: `Ожидаемая игра. Выход: ${formatDate(upcoming.releaseDate)}`,
        purchaseDate: '',
        discCondition: 'Не куплена',
        publisher: '',
        screenshots: [],
        notes: 'Добавлено из ожидаемых игр',
        createdAt: new Date().toISOString()
    };
    
    collection.games.push(newGame);
    
    if (saveCollection()) {
        games = collection.games;
        filteredGames = [...games];
        updateStats();
        renderGames();
        updateCollectionInfo();
        
        showNotification(`"${newGame.title}" перенесена в коллекцию!`, 'success');
    }
}

// Управление коллекцией
function openManageModal() {
    updateCollectionInfo();
    document.getElementById('manageModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeManageModal() {
    document.getElementById('manageModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function exportCollection() {
    try {
        const dataStr = JSON.stringify(collection, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const fileName = `horror-collection-${new Date().toISOString().split('T')[0]}.json`;
        
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', fileName);
        link.click();
        
        showNotification('Коллекция экспортирована!', 'success');
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        showNotification('Ошибка экспорта', 'error');
    }
}

function importCollection() {
    document.getElementById('importFileInput').click();
}

document.getElementById('importFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            
            if (!imported.games) {
                throw new Error('Неверный формат файла');
            }
            
            if (confirm(`Импортировать ${imported.games.length} игр?`)) {
                collection = imported;
                saveCollection();
                loadCollection();
                showNotification('Коллекция импортирована!', 'success');
            }
        } catch (error) {
            console.error('Ошибка импорта:', error);
            showNotification('Ошибка импорта файла', 'error');
        }
        e.target.value = '';
    };
    reader.readAsText(file);
});

function clearCollection() {
    if (confirm('УДАЛИТЬ ВСЮ КОЛЛЕКЦИЮ? Это действие нельзя отменить!')) {
        collection.games = [];
        collection.upcoming = [];
        saveCollection();
        loadCollection();
        showNotification('Коллекция очищена', 'success');
    }
}

// Редактирование игры
function editGame(gameId) {
    const game = collection.games.find(g => g.id === gameId);
    if (!game) {
        showNotification('Игра не найдена', 'error');
        return;
    }
    
    // Открыть модальное окно редактирования
    // (здесь можно создать отдельную форму или использовать существующую)
    openAddGameModal();
    
    // Заполнить форму данными игры
    document.getElementById('gameTitle').value = game.title;
    document.getElementById('gamePlatform').value = game.platform;
    document.getElementById('gameYear').value = game.releaseYear || '';
    document.getElementById('gameStatus').value = game.status || 'planned';
    document.getElementById('gameRating').value = game.rating || '';
    document.getElementById('gameDeveloper').value = game.developer || '';
    document.getElementById('gameGenre').value = game.genre || 'survival-horror';
    document.getElementById('gameCover').value = game.coverImage || '';
    document.getElementById('gameDescription').value = game.description || '';
    
    // Изменить обработчик формы
    const form = document.getElementById('addGameForm');
    form.onsubmit = function(e) {
        e.preventDefault();
        updateGame(gameId);
    };
    
    showNotification('Режим редактирования', 'info');
}

function updateGame(gameId) {
    const gameIndex = collection.games.findIndex(g => g.id === gameId);
    if (gameIndex === -1) return;
    
    collection.games[gameIndex] = {
        ...collection.games[gameIndex],
        title: document.getElementById('gameTitle').value.trim(),
        platform: document.getElementById('gamePlatform').value,
        platformName: getPlatformName(document.getElementById('gamePlatform').value),
        releaseYear: parseInt(document.getElementById('gameYear').value) || collection.games[gameIndex].releaseYear,
        status: document.getElementById('gameStatus').value,
        rating: parseInt(document.getElementById('gameRating').value) || null,
        developer: document.getElementById('gameDeveloper').value.trim(),
        genre: document.getElementById('gameGenre').value,
        coverImage: document.getElementById('gameCover').value.trim() || collection.games[gameIndex].coverImage,
        description: document.getElementById('gameDescription').value.trim(),
        updatedAt: new Date().toISOString()
    };
    
    if (saveCollection()) {
        games = collection.games;
        filteredGames = [...games];
        updateStats();
        renderGames();
        updateCollectionInfo();
        
        showNotification('Игра обновлена!', 'success');
        closeAddGameModal();
    }
}

function deleteGameConfirm(gameId) {
    const game = collection.games.find(g => g.id === gameId);
    if (!game) return;
    
    if (confirm(`Удалить "${game.title}" из коллекции?`)) {
        deleteGame(gameId);
    }
}

function deleteGame(gameId) {
    const gameIndex = collection.games.findIndex(g => g.id === gameId);
    if (gameIndex === -1) return;
    
    const gameTitle = collection.games[gameIndex].title;
    collection.games.splice(gameIndex, 1);
    
    if (saveCollection()) {
        games = collection.games;
        filteredGames = [...games];
        updateStats();
        renderGames();
        updateCollectionInfo();
        
        showNotification(`"${gameTitle}" удалена`, 'success');
        closeModal();
    }
}

// Поделиться игрой
function shareGame(gameId) {
    const game = collection.games.find(g => g.id === gameId);
    if (!game) return;
    
    const shareText = `🎮 ${game.title} (${game.platformName})\n`;
    
    if (navigator.share) {
        navigator.share({
            title: game.title,
            text: shareText,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(shareText);
        showNotification('Скопировано в буфер!', 'success');
    }
}

// Утилиты
function getPlatformIcon(platform) {
    const icons = {
        'ps4': '<i class="fab fa-playstation"></i>',
        'ps5': '<i class="fab fa-playstation"></i>',
        'ps4-ps5': '<i class="fab fa-playstation"></i>'
    };
    return icons[platform] || '<i class="fas fa-gamepad"></i>';
}

function getPlatformName(platform) {
    const names = {
        'ps4': 'PlayStation 4',
        'ps5': 'PlayStation 5',
        'ps4-ps5': 'PS4 + PS5'
    };
    return names[platform] || platform;
}

function getStatusIcon(status) {
    const icons = {
        'completed': '<i class="fas fa-check-circle"></i>',
        'playing': '<i class="fas fa-play-circle"></i>',
        'planned': '<i class="fas fa-clock"></i>'
    };
    return icons[status] || '<i class="fas fa-question-circle"></i>';
}

function getStatusText(status) {
    const texts = {
        'completed': 'Пройдена',
        'playing': 'В процессе',
        'planned': 'В планах'
    };
    return texts[status] || 'Неизвестно';
}

function renderStars(rating) {
    if (!rating) return 'Без рейтинга';
    const fullStars = Math.floor(rating / 2);
    const halfStar = rating % 2 >= 1;
    let stars = '★'.repeat(fullStars);
    if (halfStar) stars += '½';
    stars += '☆'.repeat(5 - fullStars - (halfStar ? 1 : 0));
    return stars;
}

function formatDate(dateString) {
    if (!dateString) return 'Не указано';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

function clearSearch() {
    elements.searchInput.value = '';
    document.querySelector('.clear-search').style.display = 'none';
    filterGames();
}

function updateDate() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    // Можно добавить элемент для отображения даты
}

function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('horrorTheme', theme);
    
    const icon = document.querySelector('.theme-toggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function showError(message) {
    elements.gameGrid.innerHTML = `
        <div class="no-results error">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Ошибка</h3>
            <p>${message}</p>
            <button onclick="loadCollection()" class="btn-primary">
                <i class="fas fa-redo"></i> Попробовать снова
            </button>
        </div>
    `;
}

function closeModal() {
    document.getElementById('gameModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Закрытие модалок по клику вне
window.onclick = function(event) {
    const modals = ['gameModal', 'addGameModal', 'addUpcomingModal', 'manageModal'];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            switch(modalId) {
                case 'gameModal': closeModal(); break;
                case 'addGameModal': closeAddGameModal(); break;
                case 'addUpcomingModal': closeAddUpcomingModal(); break;
                case 'manageModal': closeManageModal(); break;
            }
        }
    });
};

// Удаление ожидаемой игры
function deleteUpcomingGame(upcomingId) {
    const upcomingIndex = collection.upcoming.findIndex(u => u.id === upcomingId);
    if (upcomingIndex === -1) return;
    
    const gameTitle = collection.upcoming[upcomingIndex].title;
    collection.upcoming.splice(upcomingIndex, 1);
    
    if (saveCollection()) {
        upcomingGames = collection.upcoming;
        renderUpcomingGames();
        updateCollectionInfo();
        showNotification(`"${gameTitle}" удалена из ожидаемых`, 'success');
    }
}

// Подтверждение удаления ожидаемой игры
function deleteUpcomingConfirm(upcomingId, event) {
    if (event) event.stopPropagation();
    
    const upcoming = collection.upcoming.find(u => u.id === upcomingId);
    if (!upcoming) return;
    
    if (confirm(`Удалить "${upcoming.title}" из ожидаемых игр?`)) {
        deleteUpcomingGame(upcomingId);
    }
}

// Обновляем renderUpcomingGames для добавления кнопки удаления
function renderUpcomingGames() {
    if (!upcomingGames.length) {
        elements.upcomingSlider.innerHTML = `
            <div class="no-upcoming">
                <i class="fas fa-calendar-alt"></i>
                <p>Нет ожидаемых игр</p>
            </div>
        `;
        return;
    }
    
    elements.upcomingSlider.innerHTML = upcomingGames.map(game => `
        <div class="upcoming-card" onclick="openUpcomingDetails(${game.id})">
            <div class="upcoming-actions">
                <button class="upcoming-action-btn delete-btn" 
                        onclick="deleteUpcomingConfirm(${game.id}, event)"
                        title="Удалить из ожидаемых">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="upcoming-action-btn edit-btn" 
                        onclick="editUpcomingGame(${game.id}, event)"
                        title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
            <img src="${game.cover || 'https://via.placeholder.com/300x400/222/666?text=Coming+Soon'}" 
                 alt="${game.title}" 
                 class="upcoming-cover">
            <div class="upcoming-info">
                <h3>${game.title}</h3>
                <div class="upcoming-details">
                    <span class="upcoming-date">
                        <i class="fas fa-calendar-day"></i> ${formatDate(game.releaseDate)}
                    </span>
                    <span class="upcoming-platform">
                        <i class="fas fa-tv"></i> ${getPlatformName(game.platform)}
                    </span>
                </div>
                <p class="upcoming-developer">${game.developer || 'Не указан'}</p>
                <div class="upcoming-buttons">
                    <button class="btn-small" onclick="addUpcomingToCollection(${game.id})">
                        <i class="fas fa-plus"></i> В коллекцию
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Редактирование ожидаемой игры
function editUpcomingGame(upcomingId, event) {
    if (event) event.stopPropagation();
    
    const upcoming = collection.upcoming.find(u => u.id === upcomingId);
    if (!upcoming) {
        showNotification('Игра не найдена', 'error');
        return;
    }
    
    openAddUpcomingModal();
    
    // Заполняем форму данными
    document.getElementById('upcomingTitle').value = upcoming.title;
    document.getElementById('upcomingCover').value = upcoming.cover || '';
    document.getElementById('upcomingDeveloper').value = upcoming.developer || '';
    document.getElementById('upcomingReleaseDate').value = upcoming.releaseDate || '';
    document.getElementById('upcomingGenre').value = upcoming.genre || '';
    document.getElementById('upcomingPlatform').value = upcoming.platform || 'ps5';
    
    // Изменяем обработчик формы
    const form = document.getElementById('addUpcomingForm');
    form.onsubmit = function(e) {
        e.preventDefault();
        updateUpcomingGame(upcomingId);
    };
    
    showNotification('Редактирование ожидаемой игры', 'info');
}

function updateUpcomingGame(upcomingId) {
    const upcomingIndex = collection.upcoming.findIndex(u => u.id === upcomingId);
    if (upcomingIndex === -1) return;
    
    collection.upcoming[upcomingIndex] = {
        ...collection.upcoming[upcomingIndex],
        title: document.getElementById('upcomingTitle').value.trim(),
        cover: document.getElementById('upcomingCover').value.trim() || 
               'https://via.placeholder.com/300x400/222/666?text=Coming+Soon',
        developer: document.getElementById('upcomingDeveloper').value.trim(),
        releaseDate: document.getElementById('upcomingReleaseDate').value,
        genre: document.getElementById('upcomingGenre').value.trim(),
        platform: document.getElementById('upcomingPlatform').value,
        updatedAt: new Date().toISOString()
    };
    
    if (saveCollection()) {
        upcomingGames = collection.upcoming;
        renderUpcomingGames();
        updateCollectionInfo();
        
        showNotification('Ожидаемая игра обновлена!', 'success');
        closeAddUpcomingModal();
    }
}

// Открытие деталей ожидаемой игры
function openUpcomingDetails(upcomingId) {
    const upcoming = collection.upcoming.find(u => u.id === upcomingId);
    if (!upcoming) {
        showNotification('Игра не найдена', 'error');
        return;
    }
    
    document.getElementById('modalTitle').textContent = upcoming.title;
    document.getElementById('modalBody').innerHTML = createUpcomingDetailsHTML(upcoming);
    document.getElementById('gameModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function createUpcomingDetailsHTML(upcoming) {
    return `
        <div class="upcoming-detail-view">
            <div class="detail-header">
                <img src="${upcoming.cover || 'https://via.placeholder.com/400x500/222/666?text=Coming+Soon'}" 
                     alt="${upcoming.title}" 
                     class="detail-cover">
                <div class="detail-meta">
                    <h3>${upcoming.title}</h3>
                    <div class="detail-info">
                        <div class="info-item">
                            <span class="info-label">Разработчик:</span>
                            <span class="info-value">${upcoming.developer || 'Не указан'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Дата выхода:</span>
                            <span class="info-value">${formatDate(upcoming.releaseDate)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Платформа:</span>
                            <span class="info-value">${getPlatformName(upcoming.platform)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Жанр:</span>
                            <span class="info-value">${upcoming.genre || 'Horror'}</span>
                        </div>
                    </div>
                    <div class="detail-actions">
                        <button class="btn-primary" onclick="addUpcomingToCollection(${upcoming.id}); closeModal()">
                            <i class="fas fa-plus"></i> Добавить в коллекцию
                        </button>
                        <button class="btn-secondary" onclick="editUpcomingGame(${upcoming.id})">
                            <i class="fas fa-edit"></i> Редактировать
                        </button>
                    </div>
                </div>
            </div>
            
            ${upcoming.description ? `
            <div class="detail-section">
                <h4><i class="fas fa-align-left"></i> Описание</h4>
                <p>${upcoming.description}</p>
            </div>
            ` : ''}
            
            <div class="detail-section danger-section">
                <h4><i class="fas fa-exclamation-triangle"></i> Опасная зона</h4>
                <button class="btn-danger" onclick="deleteUpcomingConfirm(${upcoming.id})">
                    <i class="fas fa-trash"></i> Удалить из ожидаемых
                </button>
                <p class="danger-note">Это действие нельзя отменить. Игра будет удалена из списка ожидаемых.</p>
            </div>
        </div>
    `;
}
// Очистка всех ожидаемых игр
function clearUpcomingGames() {
    if (!collection.upcoming.length) {
        showNotification('Нет ожидаемых игр для удаления', 'info');
        return;
    }
    
    if (confirm(`Удалить все ${collection.upcoming.length} ожидаемых игр? Это действие нельзя отменить!`)) {
        collection.upcoming = [];
        
        if (saveCollection()) {
            upcomingGames = [];
            renderUpcomingGames();
            updateCollectionInfo();
            
            showNotification('Все ожидаемые игры удалены!', 'success');
            closeManageModal();
        }
    }
}
// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);


