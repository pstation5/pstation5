// ===== ТЕЛЕГРАМ ИНИЦИАЛИЗАЦИЯ =====
const tg = window.Telegram.WebApp;

// ===== КОНСТАНТЫ И ПЕРЕМЕННЫЕ =====
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let games = [];
let upcomingGames = [];
let filteredGames = [];
let userCollection = [];
let isAdmin = false;

// ===== СТРУКТУРА ДАННЫХ =====
let appData = {
    games: [],
    upcoming: [],
    users: {},
    settings: {
        theme: 'dark',
        adminId: null // Здесь будет ID администратора Telegram
    },
    lastUpdated: new Date().toISOString()
};

// ===== ЭЛЕМЕНТЫ DOM =====
const elements = {
    gamesGrid: document.getElementById('gamesGrid'),
    gamesCount: document.getElementById('gamesCount'),
    searchInput: document.getElementById('globalSearch'),
    upcomingSwiper: document.getElementById('upcomingSwiper'),
    pagination: document.getElementById('pagination'),
    adminControls: document.getElementById('adminControls')
};

// ===== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ =====
async function initApp() {
    console.log('Инициализация Horror Collection...');
    
    // Настройка Telegram WebApp
    tg.expand();
    tg.setHeaderColor('#8b0000');
    tg.setBackgroundColor('#0a0a0a');
    
    // Проверка администратора
    const user = tg.initDataUnsafe?.user;
    checkAdminStatus(user);
    
    // Загрузка данных
    await loadData();
    
    // Настройка интерфейса
    setupEventListeners();
    updateUserProfile(user);
    renderUpcomingGames();
    filterGames();
    
    console.log('Horror Collection инициализирован');
}

// ===== ПРОВЕРКА АДМИНА =====
function checkAdminStatus(user) {
    if (!user) return;
    
    // Здесь можно проверить ID пользователя
    // Например: if (user.id === 123456789) isAdmin = true;
    isAdmin = true; // Временно всегда true для тестирования
    
    if (isAdmin) {
        elements.adminControls.style.display = 'block';
    }
}

// ===== ЗАГРУЗКА ДАННЫХ =====
async function loadData() {
    try {
        // Загружаем игры
        const gamesResponse = await fetch('games.json');
        if (!gamesResponse.ok) throw new Error('Ошибка загрузки игр');
        const gamesData = await gamesResponse.json();
        appData.games = gamesData.games || [];
        
        // Загружаем пользовательские данные
        loadUserData();
        
        games = appData.games;
        filteredGames = [...games];
        
        // Обновляем счетчик
        updateGamesCount();
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showNotification('Не удалось загрузить коллекцию', 'error');
    }
}

// ===== ЗАГРУЗКА ПОЛЬЗОВАТЕЛЬСКИХ ДАННЫХ =====
function loadUserData() {
    const savedData = localStorage.getItem('horrorCollectionData');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            appData.upcoming = parsed.upcoming || [];
            appData.users = parsed.users || {};
        } catch (e) {
            console.error('Ошибка загрузки пользовательских данных:', e);
        }
    }
    
    upcomingGames = appData.upcoming;
}

// ===== СОХРАНЕНИЕ ДАННЫХ =====
function saveData() {
    appData.lastUpdated = new Date().toISOString();
    try {
        localStorage.setItem('horrorCollectionData', JSON.stringify({
            upcoming: appData.upcoming,
            users: appData.users
        }));
        return true;
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
        return false;
    }
}

// ===== НАСТРОЙКА СОБЫТИЙ =====
function setupEventListeners() {
    // Фильтры по платформе
    document.querySelectorAll('.platform-filter').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.platform-filter').forEach(b => 
                b.classList.remove('active'));
            this.classList.add('active');
            filterGames();
        });
    });
    
    // Закрытие модальных окон по клику вне
    window.addEventListener('click', function(event) {
        const modals = ['gameModal', 'addGameModal', 'addUpcomingModal', 'userModal'];
        modals.forEach(id => {
            const modal = document.getElementById(id);
            if (event.target === modal) {
                closeModal(id);
            }
        });
    });
}

// ===== ФИЛЬТРАЦИЯ И СОРТИРОВКА =====
function filterGames() {
    const platform = document.querySelector('.platform-filter.active')?.dataset.platform || 'all';
    const sortBy = document.getElementById('sortFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const searchQuery = elements.searchInput.value.toLowerCase();
    
    filteredGames = games.filter(game => {
        const platformMatch = platform === 'all' || game.platform === platform;
        const searchMatch = !searchQuery || 
            game.title.toLowerCase().includes(searchQuery) ||
            (game.developer && game.developer.toLowerCase().includes(searchQuery)) ||
            (game.description && game.description.toLowerCase().includes(searchQuery));
        
        // Проверка статуса из пользовательской коллекции
        const userGame = userCollection.find(ug => ug.gameId === game.id);
        const statusMatch = statusFilter === 'all' || 
                          (userGame && userGame.status === statusFilter);
        
        return platformMatch && searchMatch && statusMatch;
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
    
    updateGamesCount();
    renderGames();
    renderPagination();
}

// ===== ОБНОВЛЕНИЕ СЧЕТЧИКА =====
function updateGamesCount() {
    elements.gamesCount.textContent = filteredGames.length;
}

// ===== ОТРИСОВКА ИГР =====
function renderGames() {
    if (!filteredGames.length) {
        elements.gamesGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-ghost" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 20px;"></i>
                <h3>Ужасы не найдены</h3>
                <p>Попробуйте изменить фильтры или поисковый запрос</p>
            </div>
        `;
        return;
    }
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const gamesToShow = filteredGames.slice(startIndex, endIndex);
    
    elements.gamesGrid.innerHTML = gamesToShow.map(game => {
        const userGame = userCollection.find(ug => ug.gameId === game.id);
        const status = userGame?.status || 'planned';
        const rating = userGame?.rating || game.rating || 0;
        
        return `
            <div class="game-card" onclick="openGameDetails(${game.id})">
                <img src="${game.coverImage}" 
                     alt="${game.title}" 
                     class="game-cover"
                     onerror="this.onerror=null; this.src='https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png'">
                <div class="game-info">
                    <h3 class="game-title">${game.title}</h3>
                    <div class="game-meta">
                        <span class="game-platform">
                            <i class="fab fa-playstation"></i> ${game.platformName || game.platform}
                        </span>
                        <span class="game-year">${game.releaseYear}</span>
                    </div>
                    <div class="game-status status-${status}">
                        ${getStatusText(status)}
                    </div>
                    ${rating ? `
                    <div class="game-rating">
                        ${getRatingStars(rating)}
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ===== ОТРИСОВКА ОЖИДАЕМЫХ ИГР =====
function renderUpcomingGames() {
    if (!upcomingGames.length) {
        elements.upcomingSwiper.innerHTML = `
            <div class="swiper-slide">
                <div class="upcoming-card" style="height: 100%; display: flex; align-items: center; justify-content: center;">
                    <p style="color: var(--text-secondary); text-align: center;">
                        <i class="fas fa-calendar-plus"></i><br>
                        Добавьте ожидаемые игры
                    </p>
                </div>
            </div>
        `;
        return;
    }
    
    elements.upcomingSwiper.innerHTML = upcomingGames.map(game => `
        <div class="swiper-slide">
            <div class="upcoming-card" onclick="openUpcomingDetails(${game.id})">
                <img src="${game.coverImage}" 
                     alt="${game.title}" 
                     class="upcoming-cover"
                     onerror="this.onerror=null; this.src='https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png'">
                <div class="upcoming-info">
                    <h3 class="upcoming-title">${game.title}</h3>
                    <div class="upcoming-date">
                        <i class="fas fa-calendar"></i> ${formatDate(game.releaseDate)}
                    </div>
                    <div class="upcoming-platform">
                        ${game.platformName || game.platform}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== ПАГИНАЦИЯ =====
function renderPagination() {
    const totalPages = Math.ceil(filteredGames.length / ITEMS_PER_PAGE);
    
    if (totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Кнопка "Назад"
    if (currentPage > 1) {
        paginationHTML += `
            <button class="page-btn" onclick="changePage(${currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
    }
    
    // Номера страниц
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" 
                    onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }
    
    // Кнопка "Вперед"
    if (currentPage < totalPages) {
        paginationHTML += `
            <button class="page-btn" onclick="changePage(${currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
    }
    
    elements.pagination.innerHTML = paginationHTML;
}

function changePage(page) {
    currentPage = page;
    renderGames();
    renderPagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== ОТКРЫТИЕ ДЕТАЛЕЙ ИГРЫ =====
function openGameDetails(gameId) {
    const game = games.find(g => g.id === gameId);
    if (!game) {
        showNotification('Игра не найдена', 'error');
        return;
    }
    
    const userGame = userCollection.find(ug => ug.gameId === gameId);
    
    document.getElementById('modalTitle').textContent = game.title;
    document.getElementById('modalBody').innerHTML = createGameDetailsHTML(game, userGame);
    document.getElementById('gameModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function createGameDetailsHTML(game, userGame) {
    const status = userGame?.status || 'planned';
    const rating = userGame?.rating || game.rating || 0;
    const userNotes = userGame?.notes || '';
    
    return `
        <div class="game-details">
            <div class="detail-row">
                <div class="detail-cover">
                    <img src="${game.coverImage}" alt="${game.title}" 
                         onerror="this.onerror=null; this.src='https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png'">
                </div>
                <div class="detail-info">
                    <div class="detail-meta">
                        <span class="detail-platform">
                            <i class="fab fa-playstation"></i> ${game.platformName || game.platform}
                        </span>
                        <span class="detail-year">${game.releaseYear}</span>
                    </div>
                    
                    <div class="user-controls">
                        <div class="status-control">
                            <label>Статус:</label>
                            <select class="horror-select" id="detailStatus" onchange="updateGameStatus(${game.id}, this.value)">
                                <option value="planned" ${status === 'planned' ? 'selected' : ''}>Запланировано</option>
                                <option value="playing" ${status === 'playing' ? 'selected' : ''}>В процессе</option>
                                <option value="completed" ${status === 'completed' ? 'selected' : ''}>Пройдено</option>
                            </select>
                        </div>
                        
                        <div class="rating-control">
                            <label>Рейтинг:</label>
                            <div class="star-rating" id="detailRating">
                                ${[1,2,3,4,5].map(i => `
                                    <i class="fas fa-star ${i <= rating ? 'active' : ''}" 
                                       onclick="rateGame(${game.id}, ${i})"></i>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-info-circle"></i> Информация</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Разработчик:</span>
                        <span class="detail-value">${game.developer || 'Не указан'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Издатель:</span>
                        <span class="detail-value">${game.publisher || 'Не указан'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Жанр:</span>
                        <span class="detail-value">${Array.isArray(game.details?.genre) ? game.details.genre.join(', ') : 'Хоррор'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Время прохождения:</span>
                        <span class="detail-value">${game.details?.playtime || 'Не указано'}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-align-left"></i> Описание</h3>
                <p class="detail-description">${game.description || 'Описание пока не добавлено.'}</p>
            </div>
            
            ${game.media?.photos?.length ? `
            <div class="detail-section">
                <h3><i class="fas fa-images"></i> Скриншоты</h3>
                <div class="screenshots-grid">
                    ${game.media.photos.map(photo => `
                        <div class="screenshot-item">
                            <img src="${photo}" alt="Скриншот" 
                                 onclick="openImage('${photo}')">
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
            
            <div class="detail-section">
                <h3><i class="fas fa-sticky-note"></i> Мои заметки</h3>
                <textarea class="form-input" rows="3" 
                          placeholder="Ваши заметки об игре..."
                          id="detailNotes" 
                          onchange="updateGameNotes(${game.id}, this.value)">${userNotes}</textarea>
            </div>
            
            ${isAdmin ? `
            <div class="detail-actions">
                <button class="btn-secondary" onclick="editGame(${game.id})">
                    <i class="fas fa-edit"></i> Редактировать
                </button>
                <button class="btn-danger" onclick="deleteGameConfirm(${game.id})">
                    <i class="fas fa-trash"></i> Удалить
                </button>
                <button class="btn-primary" onclick="shareGame(${game.id})">
                    <i class="fas fa-share"></i> Поделиться
                </button>
            </div>
            ` : ''}
        </div>
    `;
}

// ===== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЬСКОЙ КОЛЛЕКЦИЕЙ =====
function updateGameStatus(gameId, status) {
    const user = tg.initDataUnsafe?.user;
    if (!user) return;
    
    const userId = user.id.toString();
    if (!appData.users[userId]) {
        appData.users[userId] = { collection: [] };
    }
    
    const existingIndex = appData.users[userId].collection.findIndex(item => item.gameId === gameId);
    
    if (existingIndex >= 0) {
        appData.users[userId].collection[existingIndex].status = status;
    } else {
        appData.users[userId].collection.push({
            gameId,
            status,
            rating: 0,
            notes: ''
        });
    }
    
    saveData();
    loadUserData(); // Перезагружаем данные пользователя
    filterGames(); // Обновляем фильтрацию
    showNotification('Статус обновлен', 'success');
}

function rateGame(gameId, rating) {
    const user = tg.initDataUnsafe?.user;
    if (!user) return;
    
    const userId = user.id.toString();
    if (!appData.users[userId]) {
        appData.users[userId] = { collection: [] };
    }
    
    const existingIndex = appData.users[userId].collection.findIndex(item => item.gameId === gameId);
    
    if (existingIndex >= 0) {
        appData.users[userId].collection[existingIndex].rating = rating;
    } else {
        appData.users[userId].collection.push({
            gameId,
            status: 'planned',
            rating,
            notes: ''
        });
    }
    
    saveData();
    
    // Обновляем отображение звезд
    document.querySelectorAll('#detailRating .fa-star').forEach((star, index) => {
        star.classList.toggle('active', index < rating);
    });
    
    showNotification(`Оценка ${rating}/5 сохранена`, 'success');
}

function updateGameNotes(gameId, notes) {
    const user = tg.initDataUnsafe?.user;
    if (!user) return;
    
    const userId = user.id.toString();
    if (!appData.users[userId]) {
        appData.users[userId] = { collection: [] };
    }
    
    const existingIndex = appData.users[userId].collection.findIndex(item => item.gameId === gameId);
    
    if (existingIndex >= 0) {
        appData.users[userId].collection[existingIndex].notes = notes;
    } else {
        appData.users[userId].collection.push({
            gameId,
            status: 'planned',
            rating: 0,
            notes
        });
    }
    
    saveData();
    showNotification('Заметки сохранены', 'success');
}

// ===== ДОБАВЛЕНИЕ НОВОЙ ИГРЫ (АДМИН) =====
function openAddGameModal() {
    if (!isAdmin) {
        showNotification('Только администратор может добавлять игры', 'error');
        return;
    }
    
    const form = document.getElementById('addGameForm');
    form.innerHTML = `
        <div class="form-group">
            <label for="newGameTitle"><i class="fas fa-gamepad"></i> Название игры *</label>
            <input type="text" id="newGameTitle" required class="form-input" 
                   placeholder="Например: Resident Evil Village">
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label for="newGamePlatform"><i class="fab fa-playstation"></i> Платформа *</label>
                <select id="newGamePlatform" required class="form-input">
                    <option value="ps4">PlayStation 4</option>
                    <option value="ps5">PlayStation 5</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="newGameYear"><i class="fas fa-calendar-alt"></i> Год выпуска</label>
                <input type="number" id="newGameYear" class="form-input" 
                       placeholder="2023" min="2013" max="2024">
            </div>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label for="newGameDeveloper"><i class="fas fa-code"></i> Разработчик</label>
                <input type="text" id="newGameDeveloper" class="form-input" 
                       placeholder="Capcom">
            </div>
            
            <div class="form-group">
                <label for="newGamePublisher"><i class="fas fa-building"></i> Издатель</label>
                <input type="text" id="newGamePublisher" class="form-input" 
                       placeholder="Capcom">
            </div>
        </div>
        
        <div class="form-group">
            <label for="newGameCover"><i class="fas fa-image"></i> Ссылка на обложку *</label>
            <input type="url" id="newGameCover" required class="form-input" 
                   placeholder="https://example.com/cover.jpg">
        </div>
        
        <div class="form-group">
            <label for="newGameDescription"><i class="fas fa-align-left"></i> Описание</label>
            <textarea id="newGameDescription" class="form-input" rows="4" 
                      placeholder="Описание игры..."></textarea>
        </div>
        
        <div class="form-group">
            <label for="newGameScreenshots"><i class="fas fa-images"></i> Скриншоты (по одному в строке)</label>
            <textarea id="newGameScreenshots" class="form-input" rows="3" 
                      placeholder="https://example.com/screenshot1.jpg"></textarea>
        </div>
        
        <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="closeAddGameModal()">
                Отмена
            </button>
            <button type="submit" class="btn-primary">
                <i class="fas fa-plus-circle"></i> Добавить игру
            </button>
        </div>
    `;
    
    document.getElementById('addGameModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function addNewGame(event) {
    event.preventDefault();
    
    if (!isAdmin) return;
    
    const screenshots = document.getElementById('newGameScreenshots').value
        .split('\n')
        .map(url => url.trim())
        .filter(url => url);
    
    const newGame = {
        id: Date.now(),
        title: document.getElementById('newGameTitle').value.trim(),
        platform: document.getElementById('newGamePlatform').value,
        platformName: document.getElementById('newGamePlatform').selectedOptions[0].text,
        releaseYear: parseInt(document.getElementById('newGameYear').value) || 2024,
        developer: document.getElementById('newGameDeveloper').value.trim(),
        publisher: document.getElementById('newGamePublisher').value.trim(),
        coverImage: document.getElementById('newGameCover').value.trim(),
        description: document.getElementById('newGameDescription').value.trim(),
        details: {
            genre: ['Хоррор'],
            playtime: '8-12 часов'
        },
        media: {
            photos: screenshots
        },
        rating: 0
    };
    
    // Добавляем в локальный массив
    games.push(newGame);
    appData.games.push(newGame);
    
    // Обновляем отображение
    filteredGames = [...games];
    updateGamesCount();
    renderGames();
    renderPagination();
    
    showNotification(`Игра "${newGame.title}" добавлена!`, 'success');
    closeAddGameModal();
}

function closeAddGameModal() {
    document.getElementById('addGameModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ===== ДОБАВЛЕНИЕ ОЖИДАЕМОЙ ИГРЫ =====
function openAddUpcoming() {
    const form = document.getElementById('addUpcomingForm');
    form.innerHTML = `
        <div class="form-group">
            <label for="upcomingTitle"><i class="fas fa-gamepad"></i> Название игры *</label>
            <input type="text" id="upcomingTitle" required class="form-input" 
                   placeholder="Например: Silent Hill 2 Remake">
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label for="upcomingPlatform"><i class="fab fa-playstation"></i> Платформа</label>
                <select id="upcomingPlatform" class="form-input">
                    <option value="ps5">PlayStation 5</option>
                    <option value="ps4">PlayStation 4</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="upcomingDate"><i class="fas fa-calendar-days"></i> Дата выхода *</label>
                <input type="date" id="upcomingDate" required class="form-input">
            </div>
        </div>
        
        <div class="form-group">
            <label for="upcomingCover"><i class="fas fa-image"></i> Ссылка на обложку</label>
            <input type="url" id="upcomingCover" class="form-input" 
                   placeholder="https://example.com/cover.jpg">
        </div>
        
        <div class="form-group">
            <label for="upcomingDeveloper"><i class="fas fa-code"></i> Разработчик</label>
            <input type="text" id="upcomingDeveloper" class="form-input" 
                   placeholder="Bloober Team">
        </div>
        
        <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="closeAddUpcomingModal()">
                Отмена
            </button>
            <button type="submit" class="btn-primary">
                <i class="fas fa-calendar-plus"></i> Добавить в ожидаемые
            </button>
        </div>
    `;
    
    // Устанавливаем ближайшую дату
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('upcomingDate').valueAsDate = tomorrow;
    
    document.getElementById('addUpcomingModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function addUpcomingGame(event) {
    event.preventDefault();
    
    const newUpcoming = {
        id: Date.now(),
        title: document.getElementById('upcomingTitle').value.trim(),
        platform: document.getElementById('upcomingPlatform').value,
        platformName: document.getElementById('upcomingPlatform').selectedOptions[0].text,
        releaseDate: document.getElementById('upcomingDate').value,
        coverImage: document.getElementById('upcomingCover').value.trim() || 
                   'https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png',
        developer: document.getElementById('upcomingDeveloper').value.trim()
    };
    
    upcomingGames.push(newUpcoming);
    appData.upcoming = upcomingGames;
    saveData();
    
    renderUpcomingGames();
    showNotification(`"${newUpcoming.title}" добавлена в ожидаемые!`, 'success');
    closeAddUpcomingModal();
}

function closeAddUpcomingModal() {
    document.getElementById('addUpcomingModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ===== УПРАВЛЕНИЕ ПРОФИЛЕМ =====
function openUserMenu() {
    const user = tg.initDataUnsafe?.user;
    updateUserProfile(user);
    document.getElementById('userModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function updateUserProfile(user) {
    if (!user) return;
    
    const userName = user.first_name || 'Охотник за ужасами';
    document.getElementById('userName').textContent = userName;
    
    // Статистика пользователя
    const userGames = userCollection.length;
    const completed = userCollection.filter(g => g.status === 'completed').length;
    const playing = userCollection.filter(g => g.status === 'playing').length;
    
    document.getElementById('userTotalGames').textContent = userGames;
    document.getElementById('userCompleted').textContent = completed;
    document.getElementById('userPlaying').textContent = playing;
    
    document.getElementById('userStats').textContent = 
        `Собирает ужасы с ${new Date().getFullYear()}`;
}

// ===== УТИЛИТЫ =====
function getStatusText(status) {
    const statuses = {
        'planned': 'Запланировано',
        'playing': 'В процессе',
        'completed': 'Пройдено'
    };
    return statuses[status] || status;
}

function getRatingStars(rating) {
    return Array(5).fill().map((_, i) => 
        `<i class="fas fa-star ${i < rating ? 'active' : ''}"></i>`
    ).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function clearSearch() {
    elements.searchInput.value = '';
    filterGames();
}

function openSearch() {
    elements.searchInput.focus();
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification horror-notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const icon = document.querySelector('.theme-toggle i');
    icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    
    showNotification(`Тема изменена на ${newTheme === 'dark' ? 'темную' : 'светлую'}`, 'success');
}

// Закрытие модальных окон
function closeModal(modalId = 'gameModal') {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);
