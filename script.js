// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.MainButton.hide();

// Данные
let games = [];
let filteredGames = [];
let currentPage = 1;
const gamesPerPage = 10;
let isAdmin = false; // Для проверки админских прав

// DOM элементы
const gamesGrid = document.getElementById('gamesGrid');
const upcomingSlider = document.getElementById('upcomingSlider');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const gameModal = document.getElementById('gameModal');
const addModal = document.getElementById('addModal');
const modalContent = document.getElementById('modalContent');
const gameForm = document.getElementById('gameForm');

// Проверка админских прав (по ID пользователя Telegram)
function checkAdminRights() {
    const userId = tg.initDataUnsafe.user?.id;
    // Здесь можно добавить проверку по ID админа
    isAdmin = userId === 123456789; // Замените на ваш ID
    if (isAdmin) {
        document.getElementById('adminBtn').style.display = 'block';
    }
}

// Загрузка данных
async function loadGames() {
    try {
        const response = await fetch('games.json');
        games = await response.json();
        applyFiltersAndSort();
        renderUpcomingSlider();
        renderGames();
        renderPagination();
    } catch (error) {
        console.error('Ошибка загрузки игр:', error);
    }
}

// Рендер слайдера ожидаемых игр
function renderUpcomingSlider() {
    const upcomingGames = games.filter(game => game.upcoming);
    upcomingSlider.innerHTML = '';
    
    upcomingGames.forEach(game => {
        const card = document.createElement('div');
        card.className = 'upcoming-card';
        card.innerHTML = `
            <img src="${game.cover}" alt="${game.title}">
            <h3>${game.title}</h3>
            <div class="release-date">
                <i class="far fa-calendar"></i> ${game.releaseDate || 'TBA'}
            </div>
        `;
        card.onclick = () => openGameModal(game);
        upcomingSlider.appendChild(card);
    });
}

// Рендер сетки игр
function renderGames() {
    gamesGrid.innerHTML = '';
    
    const start = (currentPage - 1) * gamesPerPage;
    const end = start + gamesPerPage;
    const gamesToShow = filteredGames.slice(start, end);
    
    gamesToShow.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <img src="${game.cover}" alt="${game.title}">
            <div class="game-card-content">
                <h3 class="game-title">${game.title}</h3>
                <div>
                    ${game.platform.map(p => `<span class="game-platform">${p}</span>`).join('')}
                </div>
                <div class="game-year">${game.year}</div>
                ${game.status === 'completed' ? 
                    '<div class="status-badge"><i class="fas fa-check-circle"></i> Пройдено</div>' : 
                    ''}
                ${isAdmin ? `
                    <div class="game-actions">
                        <button class="action-btn edit-btn" onclick="editGame(${game.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteGame(${game.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="action-btn share-btn" onclick="shareGame(${game.id})">
                            <i class="fas fa-share"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        card.onclick = () => openGameModal(game);
        gamesGrid.appendChild(card);
    });
}

// Модальное окно игры
function openGameModal(game) {
    modalContent.innerHTML = `
        <div class="game-modal">
            <div class="game-modal-header">
                <img src="${game.cover}" alt="${game.title}" class="modal-cover">
                <div class="game-info">
                    <h2>${game.title}</h2>
                    <div class="platforms">
                        ${game.platform.map(p => `<span class="platform-tag">${p}</span>`).join('')}
                    </div>
                    <div class="meta-info">
                        <span><i class="fas fa-calendar"></i> ${game.year}</span>
                        <span><i class="fas fa-user-tie"></i> ${game.developer}</span>
                        <span><i class="fas fa-star"></i> ${game.rating}/5</span>
                    </div>
                </div>
            </div>
            
            <div class="game-description">
                <h3><i class="fas fa-book-open"></i> Описание</h3>
                <p>${game.description}</p>
            </div>
            
            <div class="game-screenshots">
                <h3><i class="fas fa-images"></i> Скриншоты</h3>
                <div class="screenshots-grid">
                    ${game.screenshots && game.screenshots.length > 0 ? 
                        game.screenshots.map(img => `<img src="${img}" alt="Screenshot">`).join('') :
                        '<p>Скриншотов пока нет</p>'}
                </div>
            </div>
            
            <div class="user-actions">
                <button class="action-btn" onclick="toggleStatus(${game.id})">
                    ${game.status === 'completed' ? 'Отметить как непройденную' : 'Отметить как пройденную'}
                </button>
                <button class="action-btn" onclick="rateGame(${game.id})">
                    <i class="fas fa-star"></i> Оценить
                </button>
                <button class="action-btn" onclick="tg.shareGame(${game.title})">
                    <i class="fas fa-share"></i> Поделиться
                </button>
            </div>
        </div>
    `;
    gameModal.style.display = 'block';
}

// Фильтрация и сортировка
function applyFiltersAndSort() {
    const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
    const searchTerm = searchInput.value.toLowerCase();
    
    filteredGames = games.filter(game => {
        const matchesSearch = game.title.toLowerCase().includes(searchTerm) ||
                            game.developer?.toLowerCase().includes(searchTerm);
        const matchesFilter = activeFilter === 'all' ||
                            (activeFilter === 'ps4' && game.platform.includes('PS4')) ||
                            (activeFilter === 'ps5' && game.platform.includes('PS5')) ||
                            (activeFilter === 'completed' && game.status === 'completed') ||
                            (activeFilter === 'upcoming' && game.upcoming);
        
        return matchesSearch && matchesFilter;
    });
    
    // Сортировка
    switch(sortSelect.value) {
        case 'newest':
            filteredGames.sort((a, b) => b.year - a.year);
            break;
        case 'oldest':
            filteredGames.sort((a, b) => a.year - b.year);
            break;
        case 'az':
            filteredGames.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'za':
            filteredGames.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case 'rating':
            filteredGames.sort((a, b) => b.rating - a.rating);
            break;
    }
    
    currentPage = 1;
}

// Пагинация
function renderPagination() {
    const totalPages = Math.ceil(filteredGames.length / gamesPerPage);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    for(let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => {
            currentPage = i;
            renderGames();
        };
        pagination.appendChild(btn);
    }
}

// Добавление игры (админ)
function openAddModal() {
    if (!isAdmin) return;
    addModal.style.display = 'block';
}

// Редактирование игры
function editGame(gameId) {
    if (!isAdmin) return;
    const game = games.find(g => g.id === gameId);
    // Заполнение формы и открытие модалки
    alert('Редактирование игры: ' + game.title);
}

// Удаление игры
function deleteGame(gameId) {
    if (!isAdmin) return;
    if (confirm('Удалить игру?')) {
        games = games.filter(g => g.id !== gameId);
        applyFiltersAndSort();
        renderGames();
        renderPagination();
    }
}

// Поделиться игрой
function shareGame(gameId) {
    const game = games.find(g => g.id === gameId);
    const shareText = `🎮 ${game.title} (${game.platform.join('/')})\n\n${game.description?.substring(0, 100)}...`;
    tg.shareGame(shareText);
}

// Изменение статуса игры
function toggleStatus(gameId) {
    const game = games.find(g => g.id === gameId);
    game.status = game.status === 'completed' ? 'playing' : 'completed';
    renderGames();
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    checkAdminRights();
    loadGames();
    
    // Обработчики событий
    searchInput.addEventListener('input', () => {
        applyFiltersAndSort();
        renderGames();
        renderPagination();
    });
    
    sortSelect.addEventListener('change', () => {
        applyFiltersAndSort();
        renderGames();
    });
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            applyFiltersAndSort();
            renderGames();
            renderPagination();
        });
    });
    
    // Кнопки админа
    document.getElementById('addGameBtn').onclick = openAddModal;
    document.getElementById('addUpcomingBtn').onclick = openAddModal;
    document.getElementById('adminBtn').onclick = () => {
        if (isAdmin) {
            tg.showAlert('Режим администратора активирован');
        }
    };
    
    // Закрытие модалок
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.onclick = () => {
            gameModal.style.display = 'none';
            addModal.style.display = 'none';
        };
    });
    
    window.onclick = (event) => {
        if (event.target === gameModal) gameModal.style.display = 'none';
        if (event.target === addModal) addModal.style.display = 'none';
    };
    
    // Интеграция с Telegram
    tg.ready();
    tg.setHeaderColor('#5c0000');
    tg.setBackgroundColor('#0a0a0a');
});
