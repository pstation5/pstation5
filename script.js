// Инициализация Telegram Mini App
const tg = window.Telegram.WebApp;

// Элементы DOM
const gameGrid = document.getElementById('gameGrid');
const platformFilter = document.getElementById('platformFilter');
const searchInput = document.getElementById('searchInput');
const totalGamesEl = document.getElementById('totalGames');
const uniquePlatformsEl = document.getElementById('uniquePlatforms');
const updateDateEl = document.getElementById('updateDate');

// Данные об играх
let games = [];
let filteredGames = [];

// Инициализация приложения
function initApp() {
    // Раскрываем на весь экран
    tg.expand();
    
    // Устанавливаем цвет шапки
    tg.setHeaderColor('#333333');
    
    // Загружаем данные
    loadGames();
    
    // Настраиваем фильтры
    setupFilters();
    
    // Обновляем дату
    updateDateEl.textContent = new Date().toLocaleDateString('ru-RU');
}

// Загрузка данных об играх
async function loadGames() {
    try {
        // В будущем заменим на fetch('games.json')
        // Пока используем тестовые данные
        const response = await fetch('games.json');
        const data = await response.json();
        
        games = data.games;
        filteredGames = [...games];
        
        // Обновляем статистику
        updateStats();
        
        // Отображаем игры
        renderGames();
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        gameGrid.innerHTML = `
            <div class="loading error">
                ❌ Ошибка загрузки коллекции. Проверьте файл games.json
            </div>
        `;
    }
}

// Обновление статистики
function updateStats() {
    // Общее количество игр
    totalGamesEl.textContent = games.length;
    
    // Уникальные платформы
    const platforms = [...new Set(games.map(game => game.platform))];
    uniquePlatformsEl.textContent = platforms.length;
}

// Отображение игр
function renderGames() {
    if (filteredGames.length === 0) {
        gameGrid.innerHTML = `
            <div class="loading">
                🎮 Игры не найдены. Попробуйте другой фильтр.
            </div>
        `;
        return;
    }
    
    gameGrid.innerHTML = filteredGames.map(game => `
        <div class="game-card" onclick="showGameDetails(${game.id})">
            <img src="${game.coverImage}" alt="${game.title}" class="game-cover" 
                 onerror="this.src='https://via.placeholder.com/300x400?text=Обложка+не+загружена'">
            <div class="game-info">
                <h3 class="game-title">${game.title}</h3>
                <span class="game-platform">${game.platformName || game.platform}</span>
                <div class="game-year">${game.releaseYear}</div>
            </div>
        </div>
    `).join('');
}

// Показ детальной информации об игре (пока заглушка)
function showGameDetails(gameId) {
    const game = games.find(g => g.id === gameId);
    if (game) {
        tg.showPopup({
            title: game.title,
            message: `📀 ${game.platformName}\n🎮 ${game.releaseYear}\n\n${game.description || 'Описание скоро появится'}`,
            buttons: [
                {id: 'close', type: 'close'}
            ]
        });
    }
}

// Настройка фильтров
function setupFilters() {
    // Фильтр по платформе
    platformFilter.addEventListener('change', function() {
        filterGames();
    });
    
    // Поиск по названию
    searchInput.addEventListener('input', function() {
        filterGames();
    });
}

// Фильтрация игр
function filterGames() {
    const platform = platformFilter.value;
    const searchQuery = searchInput.value.toLowerCase();
    
    filteredGames = games.filter(game => {
        // Фильтр по платформе
        const platformMatch = platform === 'all' || game.platform === platform;
        
        // Поиск по названию
        const searchMatch = !searchQuery || 
            game.title.toLowerCase().includes(searchQuery) ||
            (game.description && game.description.toLowerCase().includes(searchQuery));
        
        return platformMatch && searchMatch;
    });
    
    renderGames();
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp);