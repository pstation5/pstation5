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

// ===== УПРАВЛЕНИЕ КОЛЛЕКЦИЕЙ =====
let collection = {
    games: [],
    lastUpdated: new Date().toISOString(),
    version: '1.0'
};

// ===== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ =====
function initApp() {
    console.log('Инициализация приложения...');
    
    // Настройка Telegram WebApp
    tg.expand();
    tg.setHeaderColor('#6c5ce7');
    tg.setBackgroundColor('#6c5ce7');
    
    // Получаем данные пользователя
    const user = tg.initDataUnsafe?.user;
    if (user) {
        updateUserInfo(user);
    }
    
    // Загружаем коллекцию
    loadCollection();
    
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
    const firstName = user.first_name || 'Коллекционер';
    elements.userGreeting.textContent = `🎮 Коллекция игр ${firstName}`;
    
    if (user.photo_url) {
        elements.userAvatar.innerHTML = `<img src="${user.photo_url}" alt="Аватар" style="width:100%;height:100%;border-radius:50%;">`;
    }
}

// ===== ЗАГРУЗКА КОЛЛЕКЦИИ =====
async function loadCollection() {
    try {
        console.log('Загрузка коллекции...');
        showLoading(true);
        
        // Пробуем загрузить из localStorage
        const loadedFromStorage = loadCollectionFromStorage();
        
        if (loadedFromStorage && collection.games.length > 0) {
            // Используем данные из localStorage
            games = collection.games;
            console.log(`Загружено ${games.length} игр из localStorage`);
        } else {
            // Загружаем из games.json
            const response = await fetch('games.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            games = data.games;
            collection.games = games;
            collection.lastUpdated = new Date().toISOString();
            saveCollectionToStorage();
            console.log(`Загружено ${games.length} игр из games.json`);
        }
        
        // Инициализируем фильтрованные игры
        filteredGames = [...games];
        
        // Обновляем статистику
        updateStats();
        updateCollectionStats();
        
        // Отрисовываем игры
        renderGames();
        
        showLoading(false);
        
    } catch (error) {
        console.error('Ошибка загрузки коллекции:', error);
        showError('Не удалось загрузить коллекцию. Проверьте файл games.json');
    }
}

// ===== СОХРАНЕНИЕ И ЗАГРУЗКА ДАННЫХ =====
function loadCollectionFromStorage() {
    try {
        const saved = localStorage.getItem('gameCollection');
        if (saved) {
            const parsed = JSON.parse(saved);
            collection.games = parsed.games || [];
            collection.lastUpdated = parsed.lastUpdated || new Date().toISOString();
            return true;
        }
    } catch (error) {
        console.error('Ошибка загрузки из localStorage:', error);
    }
    return false;
}

function saveCollectionToStorage() {
    try {
        collection.lastUpdated = new Date().toISOString();
        localStorage.setItem('gameCollection', JSON.stringify(collection));
        return true;
    } catch (error) {
        console.error('Ошибка сохранения в localStorage:', error);
        showNotification('Ошибка сохранения коллекции', 'error');
        return false;
    }
}

// ===== ОБНОВЛЕНИЕ СТАТИСТИКИ =====
function updateStats() {
    if (!games.length) return;
    
    elements.totalGamesEl.textContent = games.length;
    
    const platforms = [...new Set(games.map(game => game.platform))];
    elements.uniquePlatformsEl.textContent = platforms.length;
    
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

function updateCollectionStats() {
    document.getElementById('collectionCount').textContent = collection.games.length;
    
    const lastUpdate = new Date(collection.lastUpdated);
    document.getElementById('lastUpdateTime').textContent = 
        lastUpdate.toLocaleString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: 'short'
        });
    
    const dataSize = JSON.stringify(collection).length;
    document.getElementById('collectionSize').textContent = 
        dataSize < 1024 ? `${dataSize} B` : `${(dataSize / 1024).toFixed(1)} KB`;
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
    elements.platformFilter.addEventListener('change', filterGames);
    elements.sortSelect.addEventListener('change', filterGames);
    elements.searchInput.addEventListener('input', function(e) {
        filterGames();
        const clearBtn = this.nextElementSibling;
        clearBtn.style.display = this.value ? 'block' : 'none';
    });
}

function setupQuickFilters() {
    elements.quickFilters.addEventListener('click', function(e) {
        if (e.target.classList.contains('tag')) {
            document.querySelectorAll('.tag').forEach(tag => {
                tag.classList.remove('active');
            });
            e.target.classList.add('active');
            const platform = e.target.dataset.platform;
            elements.platformFilter.value = platform;
            filterGames();
        }
    });
}

// ===== ФИЛЬТРАЦИЯ И СОРТИРОВКА =====
function filterGames() {
    const platform = elements.platformFilter.value;
    const sortBy = elements.sortSelect.value;
    const searchQuery = elements.searchInput.value.toLowerCase();
    
    filteredGames = collection.games.filter(game => {
        const platformMatch = platform === 'all' || game.platform === platform;
        const searchMatch = !searchQuery || 
            game.title.toLowerCase().includes(searchQuery) ||
            (game.description && game.description.toLowerCase().includes(searchQuery)) ||
            (game.details?.genre && game.details.genre.some(genre => 
                genre.toLowerCase().includes(searchQuery)
            ));
        return platformMatch && searchMatch;
    });
    
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
    
    renderGames();
}

// ===== ОТКРЫТИЕ ДЕТАЛЕЙ ИГРЫ =====
function openGameDetails(gameId) {
    const game = collection.games.find(g => g.id === gameId);
    if (!game) {
        showNotification('Игра не найдена в коллекции', 'error');
        return;
    }
    
    elements.modalTitle.textContent = game.title;
    elements.modalBody.innerHTML = createGameDetailsHTML(game);
    elements.gameModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

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

// ===== ДОБАВЛЕНИЕ НОВОЙ ИГРЫ =====
function openAddGameModal() {
    document.getElementById('addGameModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('gamePurchaseDate').value = today;
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
        platformName: document.getElementById('gamePlatform').selectedOptions[0].text,
        releaseYear: parseInt(document.getElementById('gameYear').value) || new Date().getFullYear(),

        purchaseDate: document.getElementById('gamePurchaseDate').value || new Date().toISOString().split('T')[0],
        coverImage: document.getElementById('gameCover').value.trim() || 
                   'https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png',
        description: document.getElementById('gameDescription').value.trim() || 'Описание пока не добавлено.',
        details: {
            genre: [],
            region: 'PAL',
            edition: 'Standard Edition',
            language: ['Русский'],
            discCondition: document.getElementById('gameCondition').value
        },
        media: {
            photos: [],
            videos: []
        },
        personalNotes: document.getElementById('gameNotes').value.trim()
    };
    
    if (newGame.coverImage && newGame.coverImage !== 'https://images.igdb.com/igdb/image/upload/t_cover_big/nocover.png') {
        newGame.media.photos.push(newGame.coverImage);
    }
    
    collection.games.unshift(newGame);
    
    if (saveCollectionToStorage()) {
        games = collection.games;
        filteredGames = [...games];
        updateStats();
        renderGames();
        updateCollectionStats();
        
        showNotification(`Игра "${newGame.title}" добавлена в коллекцию!`, 'success');
        closeAddGameModal();
    }
}

// ===== УПРАВЛЕНИЕ КОЛЛЕКЦИЕЙ =====
function openManageModal() {
    updateCollectionStats();
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
        const exportFileDefaultName = `game-collection-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        showNotification('Коллекция экспортирована!', 'success');
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        showNotification('Ошибка экспорта коллекции', 'error');
    }
}

function importCollection() {
    document.getElementById('importFileInput').click();
}

// Обработчик импорта файлов
document.getElementById('importFileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (!importedData.games || !Array.isArray(importedData.games)) {
                throw new Error('Неверный формат файла');
            }
            
            tg.showPopup({
                title: 'Импорт коллекции',
                message: `Найдено ${importedData.games.length} игр. Заменить текущую коллекцию?`,
                buttons: [
                    {id: 'replace', type: 'destructive', text: 'Заменить'},
                    {id: 'merge', type: 'default', text: 'Объединить'},
                    {id: 'cancel', type: 'cancel'}
                ]
            }, function(buttonId) {
                if (buttonId === 'replace') {
                    collection.games = importedData.games;
                    collection.lastUpdated = new Date().toISOString();
                } else if (buttonId === 'merge') {
                    const existingIds = collection.games.map(g => g.id);
                    const newGames = importedData.games.filter(g => !existingIds.includes(g.id));
                    collection.games = [...collection.games, ...newGames];
                    collection.lastUpdated = new Date().toISOString();
                }
                
                if (buttonId === 'replace' || buttonId === 'merge') {
                    saveCollectionToStorage();
                    games = collection.games;
                    filteredGames = [...games];
                    updateStats();
                    renderGames();
                    updateCollectionStats();
                    
                    showNotification(`Импортировано ${importedData.games.length} игр`, 'success');
                }
            });
            
        } catch (error) {
            console.error('Ошибка импорта:', error);
            showNotification('Ошибка импорта: неверный формат файла', 'error');
        }
        event.target.value = '';
    };
    reader.readAsText(file);
});

function scanBarcode() {
    tg.showPopup({
        title: 'Сканирование штрих-кода',
        message: 'Эта функция требует доступа к камере. В будущей версии будет реализована!',
        buttons: [{id: 'ok', type: 'default'}]
    });
}

function clearCollection() {
    tg.showPopup({
        title: 'Очистка коллекции',
        message: 'Вы уверены, что хотите удалить все игры? Это действие нельзя отменить.',
        buttons: [
            {id: 'clear', type: 'destructive', text: 'Удалить всё'},
            {id: 'cancel', type: 'cancel'}
        ]
    }, function(buttonId) {
        if (buttonId === 'clear') {
            collection.games = [];
            collection.lastUpdated = new Date().toISOString();
            
            saveCollectionToStorage();
            games = [];
            filteredGames = [];
            updateStats();
            renderGames();
            updateCollectionStats();
            
            showNotification('Коллекция очищена', 'success');
            closeManageModal();
        }
    });
}

// ===== УВЕДОМЛЕНИЯ =====
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ===== УТИЛИТЫ =====
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

function clearSearch() {
    elements.searchInput.value = '';
    elements.searchInput.nextElementSibling.style.display = 'none';
    filterGames();
}

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

function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const icon = document.querySelector('.theme-toggle i');
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

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
            <button onclick="loadCollection()" style="margin-top: 20px; padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 10px; cursor: pointer;">
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
    if (event.target === document.getElementById('addGameModal')) {
        closeAddGameModal();
    }
    if (event.target === document.getElementById('manageModal')) {
        closeManageModal();
    }
}

// ===== РЕДАКТИРОВАНИЕ И УДАЛЕНИЕ ИГР (ЭТАП 4) =====

// Открытие модального окна редактирования
function editGame(gameId) {
    const game = collection.games.find(g => g.id === gameId);
    if (!game) {
        showNotification('Игра не найдена', 'error');
        return;
    }
    
    // Заполняем форму данными игры
    document.getElementById('editGameId').value = game.id;
    document.getElementById('editGameTitle').value = game.title;
    document.getElementById('editGamePlatform').value = game.platform;
    document.getElementById('editGameYear').value = game.releaseYear || '';
    document.getElementById('editGameCondition').value = game.condition || 'Новая';
    document.getElementById('editGamePurchaseDate').value = game.purchaseDate || '';
    document.getElementById('editGameCover').value = game.coverImage || '';
    document.getElementById('editGameDescription').value = game.description || '';
    document.getElementById('editGameNotes').value = game.personalNotes || '';
    
    // Показываем модальное окно
    document.getElementById('editGameModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Закрытие модального окна редактирования
function closeEditGameModal() {
    document.getElementById('editGameModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Обновление данных игры
function updateGame(event) {
    event.preventDefault();
    
    const gameId = parseInt(document.getElementById('editGameId').value);
    const gameIndex = collection.games.findIndex(g => g.id === gameId);
    
    if (gameIndex === -1) {
        showNotification('Игра не найдена', 'error');
        return;
    }
    
    // Обновляем данные игры
    collection.games[gameIndex] = {
        ...collection.games[gameIndex],
        title: document.getElementById('editGameTitle').value.trim(),
        platform: document.getElementById('editGamePlatform').value,
        platformName: document.getElementById('editGamePlatform').selectedOptions[0].text,
        releaseYear: parseInt(document.getElementById('editGameYear').value) || collection.games[gameIndex].releaseYear,
        condition: document.getElementById('editGameCondition').value,
        purchaseDate: document.getElementById('editGamePurchaseDate').value || collection.games[gameIndex].purchaseDate,
        coverImage: document.getElementById('editGameCover').value.trim() || collection.games[gameIndex].coverImage,
        description: document.getElementById('editGameDescription').value.trim() || collection.games[gameIndex].description,
        personalNotes: document.getElementById('editGameNotes').value.trim() || collection.games[gameIndex].personalNotes
    };
    
    // Сохраняем изменения
    if (saveCollectionToStorage()) {
        games = collection.games;
        filteredGames = [...games];
        updateStats();
        renderGames();
        updateCollectionStats();
        
        showNotification('Игра успешно обновлена!', 'success');
        closeEditGameModal();
    }
}

// Подтверждение удаления игры
function deleteGameConfirm(gameId) {
    const game = collection.games.find(g => g.id === gameId);
    if (!game) return;
    
    tg.showPopup({
        title: 'Удаление игры',
        message: `Вы уверены, что хотите удалить "${game.title}" из коллекции?`,
        buttons: [
            {id: 'delete', type: 'destructive', text: 'Удалить'},
            {id: 'cancel', type: 'cancel'}
        ]
    }, function(buttonId) {
        if (buttonId === 'delete') {
            deleteGame(gameId);
        }
    });
}

// Удаление игры
function deleteGame(gameId = null) {
    // Если gameId не передан, берем из формы (для удаления из модалки редактирования)
    let idToDelete = gameId;
    if (idToDelete === null) {
        idToDelete = parseInt(document.getElementById('editGameId').value);
    }
    
    const gameIndex = collection.games.findIndex(g => g.id === idToDelete);
    
    if (gameIndex === -1) {
        showNotification('Игра не найдена', 'error');
        return;
    }
    
    const gameTitle = collection.games[gameIndex].title;
    
    // Удаляем игру из коллекции
    collection.games.splice(gameIndex, 1);
    
    // Сохраняем изменения
    if (saveCollectionToStorage()) {
        games = collection.games;
        filteredGames = [...games];
        updateStats();
        renderGames();
        updateCollectionStats();
        
        showNotification(`Игра "${gameTitle}" удалена из коллекции`, 'success');
        
        // Закрываем модальные окна, если они открыты
        if (document.getElementById('editGameModal').style.display === 'block') {
            closeEditGameModal();
        }
        if (document.getElementById('gameModal').style.display === 'block') {
            closeModal();
        }
    }
}

// ===== СТАТИСТИКА И АНАЛИТИКА (ЭТАП 4) =====

// Открытие модального окна статистики
function openStatsModal() {
    updateAdvancedStats();
    document.getElementById('statsModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Закрытие модального окна статистики
function closeStatsModal() {
    document.getElementById('statsModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Обновление расширенной статистики
function updateAdvancedStats() {
    if (!collection.games.length) return;
    
    // Средний год выпуска
    const years = collection.games.map(g => g.releaseYear).filter(y => y);
    if (years.length > 0) {
        const avgYear = Math.round(years.reduce((a, b) => a + b, 0) / years.length);
        document.getElementById('avgYear').textContent = avgYear;
    }
    
    // Самая старая и новая игра
    if (years.length > 0) {
        const oldest = Math.min(...years);
        const newest = Math.max(...years);
        document.getElementById('oldestGame').textContent = oldest;
        document.getElementById('newestGame').textContent = newest;
    }
    
    // Самый частый издатель
    const publishers = {};
    collection.games.forEach(game => {
        if (game.publisher) {
            publishers[game.publisher] = (publishers[game.publisher] || 0) + 1;
        }
    });
    
    if (Object.keys(publishers).length > 0) {
        const topPublisher = Object.keys(publishers).reduce((a, b) => 
            publishers[a] > publishers[b] ? a : b
        );
        document.getElementById('topPublisher').textContent = topPublisher;
    }
    
    // Статистика по ценам (заглушка - можно добавить поле "цена" в будущем)
    document.getElementById('totalSpent').textContent = 'N/A';
    document.getElementById('avgPrice').textContent = 'N/A';
}

// ===== ШАРИНГ КОЛЛЕКЦИИ (ЭТАП 4) =====

// Открытие модального окна шаринга
function openShareModal() {
    document.getElementById('shareModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Закрытие модального окна шаринга
function closeShareModal() {
    document.getElementById('shareModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Функции шаринга
function shareCollection(type) {
    switch(type) {
        case 'link':
            shareByLink();
            break;
        case 'qr':
            generateQRCode();
            break;
        case 'export':
            exportForFriends();
            break;
    }
}

// Шаринг по ссылке
function shareByLink() {
    const shareData = {
        title: 'Моя игровая коллекция',
        text: 'Посмотри мою коллекцию игр на дисках!',
        url: window.location.href
    };
    
    if (navigator.share) {
        navigator.share(shareData)
            .then(() => showNotification('Коллекция успешно отправлена!', 'success'))
            .catch(err => {
                console.error('Ошибка шаринга:', err);
                copyToClipboard(window.location.href);
            });
    } else {
        copyToClipboard(window.location.href);
    }
}

// Генерация QR-кода
function generateQRCode() {
    // В реальном приложении здесь был бы код для генерации QR-кода
    // Например, с использованием библиотеки qrcode.js
    showNotification('QR-код будет сгенерирован в следующей версии!', 'info');
}

// Экспорт для друзей
function exportForFriends() {
    const publicCollection = {
        ...collection,
        games: collection.games.map(game => ({
            title: game.title,
            platform: game.platform,
            platformName: game.platformName,
            coverImage: game.coverImage,
            releaseYear: game.releaseYear,
            description: game.description,
            details: {
                genre: game.details?.genre,
                edition: game.details?.edition
            }
            // Не включаем личные данные: condition, purchaseDate, personalNotes
        }))
    };
    
    const dataStr = JSON.stringify(publicCollection, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileName = `public-game-collection-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileName);
    linkElement.click();
    
    showNotification('Общедоступная версия экспортирована!', 'success');
}

// ===== СКАНЕР ШТРИХ-КОДА (ЭТАП 4) =====

let barcodeScannerActive = false;

// Открытие сканера
function openBarcodeScanner() {
    document.getElementById('barcodeScanner').style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('barcodeResult').style.display = 'none';
}

// Закрытие сканера
function closeBarcodeScanner() {
    stopBarcodeScanner();
    document.getElementById('barcodeScanner').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Запуск сканера
function startBarcodeScanner() {
    if (!('mediaDevices' in navigator)) {
        showNotification('Ваше устройство не поддерживает камеру', 'error');
        return;
    }
    
    const video = document.getElementById('scanner-video');
    const placeholder = document.getElementById('scanner-placeholder');
    const startBtn = document.getElementById('startScannerBtn');
    const stopBtn = document.getElementById('stopScannerBtn');
    
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
        } 
    })
    .then(stream => {
        video.srcObject = stream;
        video.style.display = 'block';
        placeholder.style.display = 'none';
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
        
        video.play();
        barcodeScannerActive = true;
        scanBarcodeFromVideo(video);
    })
    .catch(err => {
        console.error('Ошибка доступа к камере:', err);
        showNotification('Не удалось получить доступ к камере', 'error');
    });
}

// Остановка сканера
function stopBarcodeScanner() {
    const video = document.getElementById('scanner-video');
    const placeholder = document.getElementById('scanner-placeholder');
    const startBtn = document.getElementById('startScannerBtn');
    const stopBtn = document.getElementById('stopScannerBtn');
    
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    
    video.style.display = 'none';
    placeholder.style.display = 'flex';
    startBtn.style.display = 'inline-flex';
    stopBtn.style.display = 'none';
    
    barcodeScannerActive = false;
}

// Сканирование штрих-кода с видео
function scanBarcodeFromVideo(video) {
    // В реальном приложении здесь был бы код для распознавания штрих-кодов
    // Например, с использованием библиотеки QuaggaJS или ZXing
    showNotification('Сканирование штрих-кода будет реализовано в следующей версии!', 'info');
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (ЭТАП 4) =====

// Копирование в буфер обмена
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showNotification('Ссылка скопирована в буфер обмена!', 'success'))
        .catch(err => {
            console.error('Ошибка копирования:', err);
            showNotification('Не удалось скопировать ссылку', 'error');
        });
}

// Шаринг конкретной игры
function shareGame(gameId) {
    const game = collection.games.find(g => g.id === gameId);
    if (!game) return;
    
    const shareText = `Посмотри игру "${game.title}" (${game.platformName}) из моей коллекции!`;
    
    if (navigator.share) {
        navigator.share({
            title: game.title,
            text: shareText,
            url: window.location.href + `?game=${gameId}`
        });
    } else {
        copyToClipboard(shareText);
    }
}

// Контекстное меню для игр
let currentContextGameId = null;

// Показ контекстного меню
function showGameContextMenu(gameId, event) {
    event.preventDefault();
    currentContextGameId = gameId;
    
    const contextMenu = document.getElementById('gameContextMenu');
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.top = `${event.clientY}px`;
    
    // Скрываем меню при клике вне его
    setTimeout(() => {
        document.addEventListener('click', hideContextMenu);
    }, 100);
}

// Скрытие контекстного меню
function hideContextMenu() {
    document.getElementById('gameContextMenu').style.display = 'none';
    document.removeEventListener('click', hideContextMenu);
}

// Обработчики контекстного меню
function contextEditGame() {
    if (currentContextGameId) {
        editGame(currentContextGameId);
    }
    hideContextMenu();
}

function contextDeleteGame() {
    if (currentContextGameId) {
        deleteGameConfirm(currentContextGameId);
    }
    hideContextMenu();
}

function contextShareGame() {
    if (currentContextGameId) {
        shareGame(currentContextGameId);
    }
    hideContextMenu();
}

function contextAddToWishlist() {
    showNotification('Функция "Избранное" будет добавлена в следующей версии!', 'info');
    hideContextMenu();
}

// ===== КОПИРОВАНИЕ В БУФЕР ОБМЕНА =====
function copyToClipboard(text) {
    // Пытаемся использовать современный Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text)
            .then(() => {
                showNotification('Скопировано в буфер обмена!', 'success');
                return true;
            })
            .catch(err => {
                console.error('Clipboard API не сработал:', err);
                return fallbackCopyText(text);
            });
    } else {
        // Используем старый метод
        return fallbackCopyText(text);
    }
}

// Старый метод копирования (fallback)
function fallbackCopyText(text) {
    try {
        // Создаём временный textarea
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        // Делаем невидимым
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        
        // Выделяем текст
        textArea.select();
        textArea.setSelectionRange(0, 99999); // Для мобильных
        
        // Копируем
        const successful = document.execCommand('copy');
        
        // Удаляем элемент
        document.body.removeChild(textArea);
        
        if (successful) {
            showNotification('Скопировано в буфер обмена!', 'success');
            return true;
        } else {
            showNotification('Не удалось скопировать автоматически', 'error');
            return false;
        }
    } catch (err) {
        console.error('Ошибка при копировании:', err);
        showNotification('Ошибка при копировании', 'error');
        return false;
    }
}

// ===== ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ ИГР С КНОПКАМИ =====

// Обновляем функцию renderGames для добавления кнопок действий
const originalRenderGames = renderGames;
window.renderGames = function() {
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
        <div class="game-card" 
             onclick="openGameDetails(${game.id})"
             oncontextmenu="showGameContextMenu(${game.id}, event)">
            <div class="game-actions">
                <button class="action-btn edit-btn" onclick="event.stopPropagation(); editGame(${game.id})" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="event.stopPropagation(); deleteGameConfirm(${game.id})" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="action-btn share-btn" onclick="event.stopPropagation(); shareGame(${game.id})" title="Поделиться">
                    <i class="fas fa-share"></i>
                </button>
            </div>
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

// ===== ОБНОВЛЯЕМ ФУНКЦИЮ ОТКРЫТИЯ ДЕТАЛЕЙ ИГРЫ =====

const originalCreateGameDetailsHTML = createGameDetailsHTML;
window.createGameDetailsHTML = function(game) {
    return originalCreateGameDetailsHTML(game) + `
        <div class="game-actions-detail">
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
    `;
}


// ===== ОБНОВЛЯЕМ ФУНКЦИЮ scanBarcode =====

window.scanBarcode = function() {
    openBarcodeScanner();
};

// ===== ЗАПУСК ПРИЛОЖЕНИЯ =====
document.addEventListener('DOMContentLoaded', initApp);






