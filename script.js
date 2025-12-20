// ===== ТЕЛЕГРАМ ИНИЦИАЛИЗАЦИЯ =====
const tg = window.Telegram.WebApp;

// ===== ЭЛЕМЕНТЫ DOM =====
const elements = {
    gameGrid: document.getElementById('gameGrid'),
    platformFilter: document.getElementById('platformFilter'),
    sortSelect: document.getElementById('sortSelect'),
    searchInput: document.getElementById('searchInput'),
    totalGamesEl: document.getElementById('totalGames'),
    uniquePlatformsEl: document.getElementById('uniquePlatforms'),
    collectionYearsEl: document.getElementById('collectionYears'),
    updateDateEl: document.getElementById('updateDate'),
    userGreeting: document.getElementById('userGreeting'),
    userAvatar: document.getElementById('userAvatar'),
    gameModal: document.getElementById('gameModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    quickFilters: document.getElementById('quickFilters')
};

// ===== ПЕРЕМЕННЫЕ =====
let games = [];
let filteredGames = [];
let currentTheme = 'light';

// ===== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ =====
function initApp() {
    console.log('Инициализация приложения...');
    
    // Настройка Telegram WebApp
    tg.expand(); // Раскрываем на весь экран
    tg.setHeaderColor('#6c5ce7');
    tg.setBackgroundColor('#6c5ce7');
    
    // Получаем данные пользователя
    const user = tg.initDataUnsafe?.user;
    if (user) {
        updateUserInfo(user);
    }
    
    // Загружаем игры
    loadGames();
    
    // Настраиваем фильтры
    setupFilters();
    
    // Настраиваем быстрые фильтры
    setupQuickFilters();
    
    // Обновляем дату
    updateDate();
    
    // Восстанавливаем тему
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    }
    
    console.log('Приложение инициализировано');
}

// ===== ОБНОВЛЕНИЕ ИНФОРМАЦИИ ПОЛЬЗОВАТЕЛЯ =====
function updateUserInfo(user) {
    // Приветствие
    const firstName = user.first_name || 'Коллекционер';
    elements.userGreeting.textContent = `🎮 Коллекция игр ${firstName}`;
    
    // Аватар
    if (user.photo_url) {
        elements.userAvatar.innerHTML = `<img src="${user.photo_url}" alt="Аватар" style="width:100%;height:100%;border-radius:50%;">`;
    }
}

// ===== ЗАГРУЗКА ИГР =====
async function loadGames() {
    try {
        console.log('Загрузка игр...');
        showLoading(true);
        
        // Загружаем данные из games.json
        const response = await fetch('games.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        games = data.games;
        
        console.log(`Загружено ${games.length} игр`);
        
        // Инициализируем фильтрованные игры
        filteredGames = [...games];
        
        // Обновляем статистику
        updateStats();
        
        // Отрисовываем игры
        renderGames();
        
        showLoading(false);
        
    } catch (error) {
        console.error('Ошибка загрузки игр:', error);
        showError('Не удалось загрузить коллекцию. Проверьте файл games.json');
    }
}

// ===== ОБНОВЛЕНИЕ СТАТИСТИКИ =====
function updateStats() {
    if (!games.length) return;
    
    // Общее количество игр
    elements.totalGamesEl.textContent = games.length;
    
    // Уникальные платформы
    const platforms = [...new Set(games.map(game => game.platform))];
    elements.uniquePlatformsEl.textContent = platforms.length;
    
    // Годы коллекции (разница между самой старой и новой игрой)
    const years = games.map(game => game.releaseYear).filter(year => year);
    if (years.length >= 2) {
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        const yearSpan = maxYear - minYear + 1;
        elements.collectionYearsEl.textContent = yearSpan;
    } else {
        elements.collectionYearsEl.textContent = '1';
    }
}

// ===== ОТРИСОВКА ИГР =====
function renderGames() {
    if (!filteredGames.length) {
        elements.gameGrid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 20px;"></i>
                <h3>Игры не найдены</h3>
                <p>Попробуйте изменить фильтры или поисковый запрос</p>
            </div>
        `;
        return;
    }
    
    elements.gameGrid.innerHTML = filteredGames.map(game => `
        <div class="game-card" onclick="openGameDetails(${game.id})">
            <img src="${game.coverImage}" 
                 alt="${game.title}" 
                 class="game-cover"
                 onerror="this.onerror=null; this.src='https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png'">
            <div class="game-info">
                <h3 class="game-title">${game.title}</h3>
                <div class="game-meta">
                    <span class="game-platform">${getPlatformIcon(game.platform)} ${game.platformName || game.platform}</span>
                    <span class="game-year">${game.releaseYear}</span>
                </div>
                <div class="game-condition">
                    <i class="fas fa-box"></i> ${game.condition || 'Состояние не указано'}
                </div>
            </div>
        </div>
    `).join('');
}

// ===== ИКОНКИ ПЛАТФОРМ =====
function getPlatformIcon(platform) {
    const icons = {
        'ps4': 'fab fa-playstation',
        'ps5': 'fab fa-playstation',
        'xbox': 'fab fa-xbox',
        'switch': 'fas fa-gamepad',
        'pc': 'fab fa-windows'
    };
    return `<i class="${icons[platform] || 'fas fa-gamepad'}"></i>`;
}

// ===== НАСТРОЙКА ФИЛЬТРОВ =====
function setupFilters() {
    // Фильтр по платформе
    elements.platformFilter.addEventListener('change', filterGames);
    
    // Сортировка
    elements.sortSelect.addEventListener('change', filterGames);
    
    // Поиск
    elements.searchInput.addEventListener('input', function(e) {
        filterGames();
        // Показываем/скрываем кнопку очистки
        const clearBtn = this.nextElementSibling;
        clearBtn.style.display = this.value ? 'block' : 'none';
    });
}

// ===== БЫСТРЫЕ ФИЛЬТРЫ =====
function setupQuickFilters() {
    elements.quickFilters.addEventListener('click', function(e) {
        if (e.target.classList.contains('tag')) {
            // Убираем активный класс у всех тегов
            document.querySelectorAll('.tag').forEach(tag => {
                tag.classList.remove('active');
            });
            
            // Добавляем активный класс выбранному тегу
            e.target.classList.add('active');
            
            // Устанавливаем значение в селект
            const platform = e.target.dataset.platform;
            elements.platformFilter.value = platform;
            
            // Применяем фильтрацию
            filterGames();
        }
    });
}

// ===== ФИЛЬТРАЦИЯ И СОРТИРОВКА =====
function filterGames() {
    const platform = elements.platformFilter.value;
    const sortBy = elements.sortSelect.value;
    const searchQuery = elements.searchInput.value.toLowerCase();
    
    // Фильтрация
    filteredGames = games.filter(game => {
        // Фильтр по платформе
        const platformMatch = platform === 'all' || game.platform === platform;
        
        // Поиск
        const searchMatch = !searchQuery || 
            game.title.toLowerCase().includes(searchQuery) ||
            (game.description && game.description.toLowerCase().includes(searchQuery)) ||
            (game.details?.genre && game.details.genre.some(genre => 
                genre.toLowerCase().includes(searchQuery)
            ));
        
        return platformMatch && searchMatch;
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
            case 'titleDesc':
                return b.title.localeCompare(a.title, 'ru');
            default:
                return 0;
        }
    });
    
    // Отрисовываем отфильтрованные игры
    renderGames();
}

// ===== ОТКРЫТИЕ ДЕТАЛЕЙ ИГРЫ =====
function openGameDetails(gameId) {
    const game = games.find(g => g.id === gameId);
    if (!game) return;
    
    // Заполняем заголовок
    elements.modalTitle.textContent = game.title;
    
    // Заполняем тело модального окна
    elements.modalBody.innerHTML = createGameDetailsHTML(game);
    
    // Показываем модальное окно
    elements.gameModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// ===== СОЗДАНИЕ HTML ДЛЯ ДЕТАЛЕЙ ИГРЫ =====
function createGameDetailsHTML(game) {
    return `
        <div class="game-details">
            <div class="detail-section">
                <h3><i class="fas fa-info-circle"></i> Основная информация</h3>
                <div class="detail-row">
                    <span class="detail-label">Платформа:</span>
                    <span class="detail-value">${getPlatformIcon(game.platform)} ${game.platformName || game.platform}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Год выхода:</span>
                    <span class="detail-value">${game.releaseYear || 'Не указан'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Разработчик:</span>
                    <span class="detail-value">${game.developer || 'Не указан'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Издатель:</span>
                    <span class="detail-value">${game.publisher || 'Не указан'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Состояние:</span>
                    <span class="detail-value">${game.condition || 'Не указано'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Дата покупки:</span>
                    <span class="detail-value">${game.purchaseDate || 'Не указана'}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h3><i class="fas fa-cog"></i> Детали</h3>
                <div class="detail-row">
                    <span class="detail-label">Жанр:</span>
                    <span class="detail-value">${game.details?.genre?.join(', ') || 'Не указан'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Регион:</span>
                    <span class="detail-value">${game.details?.region || 'Не указан'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Издание:</span>
                    <span class="detail-value">${game.details?.edition || 'Standard'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Язык:</span>
                    <span class="detail-value">${game.details?.language?.join(', ') || 'Не указан'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Состояние диска:</span>
                    <span class="detail-value">${game.details?.discCondition || 'Не указано'}</span>
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3><i class="fas fa-align-left"></i> Описание</h3>
            <p style="line-height: 1.6;">${game.description || 'Описание пока не добавлено.'}</p>
        </div>
        
        ${game.media?.photos?.length ? `
        <div class="detail-section">
            <h3><i class="fas fa-images"></i> Фотографии</h3>
            <div class="media-gallery">
                ${game.media.photos.map(photo => `
                    <div class="media-item">
                        <img src="${photo}" alt="Фото игры" 
                             onclick="openImage('${photo}')"
                             style="cursor: pointer;">
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        ${game.media?.videos?.length ? `
        <div class="detail-section">
            <h3><i class="fas fa-video"></i> Видео</h3>
            ${game.media.videos.map(video => `
                <div class="video-container">
                    <iframe src="${video}" 
                            title="Видео обзор" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                    </iframe>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        ${game.personalNotes ? `
        <div class="notes">
            <h3><i class="fas fa-sticky-note"></i> Личные заметки</h3>
            <p>${game.personalNotes}</p>
        </div>
        ` : ''}
    `;
}

// ===== ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА =====
function closeModal() {
    elements.gameModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ===== ОТКРЫТИЕ ИЗОБРАЖЕНИЯ =====
function openImage(url) {
    tg.showPopup({
        title: 'Фото',
        message: 'Открыть изображение в полном размере?',
        buttons: [
            {
                id: 'open',
                type: 'default',
                text: 'Открыть'
            },
            {
                id: 'close',
                type: 'cancel'
            }
        ]
    }, function(buttonId) {
        if (buttonId === 'open') {
            window.open(url, '_blank');
        }
    });
}

// ===== ОЧИСТКА ПОИСКА =====
function clearSearch() {
    elements.searchInput.value = '';
    elements.searchInput.nextElementSibling.style.display = 'none';
    filterGames();
}

// ===== ОБНОВЛЕНИЕ ДАТЫ =====
function updateDate() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    elements.updateDateEl.textContent = now.toLocaleDateString('ru-RU', options);
}

// ===== УПРАВЛЕНИЕ ТЕМОЙ =====
function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Обновляем иконку
    const icon = document.querySelector('.theme-toggle i');
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// ===== ПОКАЗАТЬ ФОРМУ ДОБАВЛЕНИЯ ИГРЫ =====
function showAddGameForm() {
    tg.showAlert('Функция добавления игры скоро появится! Вы можете добавить игру вручную в файл games.json');
}

// ===== УТИЛИТЫ =====
function showLoading(show) {
    if (show) {
        elements.gameGrid.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Загрузка коллекции...</p>
            </div>
        `;
    }
}

function showError(message) {
    elements.gameGrid.innerHTML = `
        <div class="no-results">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff4757; margin-bottom: 20px;"></i>
            <h3>Ошибка</h3>
            <p>${message}</p>
            <button onclick="loadGames()" style="margin-top: 20px; padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 10px; cursor: pointer;">
                <i class="fas fa-redo"></i> Попробовать снова
            </button>
        </div>
    `;
}

// ===== ЗАКРЫТИЕ МОДАЛЬКИ ПО КЛИКУ ВНЕ =====
window.onclick = function(event) {
    if (event.target === elements.gameModal) {
        closeModal();
    }
}

// ===== ЗАПУСК ПРИЛОЖЕНИЯ =====
document.addEventListener('DOMContentLoaded', initApp);
