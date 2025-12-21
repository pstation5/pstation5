// Horror Collection App - Script
// Версия: Fixed

// Безопасная инициализация Telegram WebApp (не падает в обычном браузере)
const tg = (window.Telegram && window.Telegram.WebApp)
    ? window.Telegram.WebApp
    : {
        initDataUnsafe: {},
        expand() {},
        setHeaderColor() {},
        setBackgroundColor() {}
    };

// Элементы DOM
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
    lastUpdate: new Date().toISOString()
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    console.log('🚀 Инициализация Horror коллекции...');

    // Настройка Telegram
    if (window.Telegram && tg.initDataUnsafe) {
        tg.expand();
        tg.setHeaderColor('#8b0000');
        tg.setBackgroundColor('#121212');
        setupTelegramUser();
    }

    // Загрузка данных
    loadCollection();

    // Настройка фильтров и событий
    setupEventListeners();

    // Рендер начального состояния
    renderAll();
}

// Настройка пользователя Telegram
function setupTelegramUser() {
    try {
        const user = tg.initDataUnsafe.user;
        if (user) {
            elements.userGreeting.textContent = `Привет, ${user.first_name}!`;
            if (user.photo_url) {
                elements.userAvatar.src = user.photo_url;
            } else {
                elements.userAvatar.src = 'https://via.placeholder.com/45/8b0000/ffffff?text=👻';
            }
        }
    } catch (e) {
        console.warn('Telegram user setup skipped:', e);
    }
}

// Загрузка коллекции
function loadCollection() {
    const saved = localStorage.getItem('horrorCollection');
    if (saved) {
        try {
            collection = JSON.parse(saved);
            games = collection.games || [];
            upcomingGames = collection.upcoming || [];
        } catch (e) {
            console.error('Ошибка чтения коллекции из localStorage:', e);
            loadDefaultData();
        }
    } else {
        loadDefaultData();
    }

    filteredGames = [...games];
}

// Демо-данные
async function loadDefaultData() {
    try {
        const response = await fetch('games.json');
        const data = await response.json();
        collection = data;
        games = collection.games || [];
        upcomingGames = collection.upcoming || [];
        filteredGames = [...games];
        saveCollection();
    } catch (error) {
        console.error('Ошибка загрузки demo данных:', error);
        collection = { games: [], upcoming: [], lastUpdate: new Date().toISOString() };
        games = [];
        upcomingGames = [];
        filteredGames = [];
    }
}

// Сохранение
function saveCollection() {
    collection.games = games;
    collection.upcoming = upcomingGames;
    collection.lastUpdate = new Date().toISOString();
    localStorage.setItem('horrorCollection', JSON.stringify(collection));
}

// Слушатели событий
function setupEventListeners() {
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', applyFilters);
    }
    if (elements.platformFilter) {
        elements.platformFilter.addEventListener('change', applyFilters);
    }
    if (elements.statusFilter) {
        elements.statusFilter.addEventListener('change', applyFilters);
    }
    if (elements.sortSelect) {
        elements.sortSelect.addEventListener('change', applyFilters);
    }

    const addGameForm = document.getElementById('addGameForm');
    if (addGameForm) addGameForm.addEventListener('submit', handleAddGame);

    const addUpcomingForm = document.getElementById('addUpcomingForm');
    if (addUpcomingForm) addUpcomingForm.addEventListener('submit', handleAddUpcoming);

    // Закрытие модалок по клику на фон
    window.addEventListener('click', (event) => {
        const modals = ['addGameModal', 'addUpcomingModal', 'gameDetailModal', 'manageModal', 'statsModal'];
        modals.forEach(id => {
            const modal = document.getElementById(id);
            if (modal && event.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    });
}

// Рендер всего
function renderAll() {
    populatePlatformFilter();
    renderUpcoming();
    renderGames();
    updateStats();
    updateManageInfo();
}

// Платформы для фильтра
function populatePlatformFilter() {
    if (!elements.platformFilter) return;

    const platforms = {};
    games.forEach(game => {
        const key = game.platform;
        const name = game.platformName || key;
        if (!platforms[key]) platforms[key] = name;
    });

    elements.platformFilter.innerHTML = `<option value="">Все платформы</option>`;
    Object.entries(platforms).forEach(([key, name]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = name;
        elements.platformFilter.appendChild(opt);
    });
}

// Фильтрация
function applyFilters() {
    const searchTerm = (elements.searchInput?.value || '').toLowerCase().trim();
    const platform = elements.platformFilter?.value || '';
    const status = elements.statusFilter?.value || '';
    const sortBy = elements.sortSelect?.value || 'title';

    filteredGames = games.filter(game => {
        const matchesSearch = !searchTerm || game.title.toLowerCase().includes(searchTerm);
        const matchesPlatform = !platform || game.platform === platform;
        const matchesStatus = !status || game.status === status;
        return matchesSearch && matchesPlatform && matchesStatus;
    });

    // сортировка
    filteredGames.sort((a, b) => {
        switch (sortBy) {
            case 'year':
                return (b.releaseYear || 0) - (a.releaseYear || 0);
            case 'rating':
                return (b.rating || 0) - (a.rating || 0);
            case 'status':
                return (a.status || '').localeCompare(b.status || '');
            case 'title':
            default:
                return (a.title || '').localeCompare(b.title || '');
        }
    });

    currentPage = 1;
    renderGames();
    updateStats();
}

// Обновление статистики вверху
function updateStats() {
    if (!elements.totalGamesEl) return;

    elements.totalGamesEl.textContent = games.length;
    elements.horrorGamesEl.textContent = games.filter(g => (g.genre || '').includes('horror')).length;

    const platforms = [...new Set(games.map(g => g.platform))];
    elements.uniquePlatformsEl.textContent = platforms.length;

    const ratedGames = games.filter(g => typeof g.rating === 'number');
    const avg = ratedGames.length > 0
        ? ratedGames.reduce((sum, g) => sum + g.rating, 0) / ratedGames.length
        : 0;

    elements.avgRatingEl.textContent = avg.toFixed(1);

    // пагинация
    const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));
    if (elements.totalPagesEl) elements.totalPagesEl.textContent = totalPages;
    if (elements.currentPageEl) elements.currentPageEl.textContent = currentPage;
}

// Обновление информации в manageModal
function updateManageInfo() {
    if (elements.collectionCount) elements.collectionCount.textContent = games.length;
    if (elements.upcomingCount) elements.upcomingCount.textContent = upcomingGames.length;

    if (elements.lastUpdateTime) {
        const d = new Date(collection.lastUpdate || Date.now());
        const formatted = d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        elements.lastUpdateTime.textContent = formatted;
    }
}

// Рендер upcoming
function renderUpcoming() {
    if (!elements.upcomingSlider) return;

    elements.upcomingSlider.innerHTML = '';
    if (upcomingGames.length === 0) {
        elements.upcomingSlider.innerHTML = `<div class="empty-state">Пока нет ожидаемых игр</div>`;
        return;
    }

    upcomingGames.forEach(game => {
        const card = document.createElement('div');
        card.className = 'upcoming-card';
        card.innerHTML = `
            <img class="upcoming-cover" src="${game.coverImage || 'https://via.placeholder.com/250x150/1a1a1a/ffffff?text=No+Cover'}" alt="${escapeHtml(game.title)}">
            <div class="upcoming-info">
                <div class="upcoming-title">${escapeHtml(game.title)}</div>
                <div class="upcoming-meta">
                    <span>${escapeHtml(game.platformName || game.platform || '')}</span>
                    <span>${game.releaseYear || '—'}</span>
                </div>
            </div>
            <div class="upcoming-actions">
                <button class="action-btn delete-btn" title="Удалить" onclick="deleteUpcoming(${game.id}); event.stopPropagation();">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        elements.upcomingSlider.appendChild(card);
    });
}

// Рендер игр
function renderGames() {
    if (!elements.gameGrid) return;

    const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));
    currentPage = Math.min(currentPage, totalPages);

    const startIndex = (currentPage - 1) * gamesPerPage;
    const pageGames = filteredGames.slice(startIndex, startIndex + gamesPerPage);

    elements.gameGrid.innerHTML = '';

    if (pageGames.length === 0) {
        elements.gameGrid.innerHTML = `<div class="empty-state">Ничего не найдено</div>`;
        return;
    }

    pageGames.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.onclick = () => openGameDetail(game.id);

        const statusClass = game.status ? `status-${game.status}` : 'status-planned';
        const statusText = getStatusText(game.status);

        card.innerHTML = `
            <img class="game-cover" src="${game.coverImage || 'https://via.placeholder.com/280x200/1a1a1a/ffffff?text=No+Cover'}" alt="${escapeHtml(game.title)}">
            <div class="game-actions">
                <button class="action-btn edit-btn" title="Редактировать" onclick="editGame(${game.id}); event.stopPropagation();">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" title="Удалить" onclick="deleteGame(${game.id}); event.stopPropagation();">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="game-info">
                <div class="game-title">${escapeHtml(game.title)}</div>
                <div class="game-meta">
                    <span>${escapeHtml(game.platformName || game.platform || '')}</span>
                    <span>${game.releaseYear || '—'}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="game-status ${statusClass}">${statusText}</span>
                    <span class="game-rating">${typeof game.rating === 'number' ? `<i class="fas fa-star"></i>${game.rating}` : ''}</span>
                </div>
            </div>
        `;
        elements.gameGrid.appendChild(card);
    });

    updateStats();
}

// Pagination
function nextPage() {
    const totalPages = Math.max(1, Math.ceil(filteredGames.length / gamesPerPage));
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

// Utils
function getStatusText(status) {
    switch (status) {
        case 'completed': return 'Пройдена';
        case 'playing': return 'Играю';
        case 'planned': return 'В планах';
        default: return '—';
    }
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

// Modals: Add Game
function openAddGameModal() {
    document.getElementById('addGameModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}
function closeAddGameModal() {
    document.getElementById('addGameModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Modals: Upcoming
function openAddUpcomingModal() {
    document.getElementById('addUpcomingModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}
function closeAddUpcomingModal() {
    document.getElementById('addUpcomingModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Manage modal
function openManageModal() {
    updateManageInfo();
    document.getElementById('manageModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}
function closeManageModal() {
    document.getElementById('manageModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Stats modal (FIXED)
function openStatsModal() {
    updateAdvancedStats();
    renderCharts();
    document.getElementById('statsModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeStatsModal() {
    document.getElementById('statsModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function updateAdvancedStats() {
    // Верхние карточки модалки
    const totalGames = collection.games.length;
    const upcoming = collection.upcoming.length;

    const ratedGames = collection.games.filter(g => typeof g.rating === 'number');
    const avgRating = ratedGames.length > 0
        ? (ratedGames.reduce((sum, g) => sum + g.rating, 0) / ratedGames.length).toFixed(1)
        : '0.0';

    const totalEl = document.getElementById('statsTotalGames');
    const upcomingEl = document.getElementById('statsUpcoming');
    const avgEl = document.getElementById('statsAvgRating');

    if (totalEl) totalEl.textContent = totalGames;
    if (upcomingEl) upcomingEl.textContent = upcoming;
    if (avgEl) avgEl.textContent = avgRating;

    // Детальная информация
    const years = collection.games
        .map(g => Number(g.releaseYear))
        .filter(y => Number.isFinite(y));

    const oldest = years.length ? Math.min(...years) : '-';
    const newest = years.length ? Math.max(...years) : '-';

    // Топ разработчик
    const devCounter = {};
    collection.games.forEach(g => {
        const dev = (g.developer || '').trim();
        if (!dev) return;
        devCounter[dev] = (devCounter[dev] || 0) + 1;
    });
    const topDev = Object.keys(devCounter).length
        ? Object.entries(devCounter).sort((a, b) => b[1] - a[1])[0][0]
        : '-';

    // Топ платформа
    const platformCounter = {};
    collection.games.forEach(g => {
        const p = (g.platformName || g.platform || '').toString().trim();
        if (!p) return;
        platformCounter[p] = (platformCounter[p] || 0) + 1;
    });
    const topPlatform = Object.keys(platformCounter).length
        ? Object.entries(platformCounter).sort((a, b) => b[1] - a[1])[0][0]
        : '-';

    const statusCounter = { completed: 0, playing: 0, planned: 0 };
    collection.games.forEach(g => {
        if (g.status === 'completed') statusCounter.completed++;
        else if (g.status === 'playing') statusCounter.playing++;
        else if (g.status === 'planned') statusCounter.planned++;
    });

    const oldestEl = document.getElementById('oldestRelease');
    const newestEl = document.getElementById('newestRelease');
    const topDevEl = document.getElementById('topDeveloper');
    const topPlatformEl = document.getElementById('topPlatform');
    const completedEl = document.getElementById('completedCount');
    const playingEl = document.getElementById('playingCount');
    const plannedEl = document.getElementById('plannedCount');
    const ratedCountEl = document.getElementById('ratedCount');

    if (oldestEl) oldestEl.textContent = oldest;
    if (newestEl) newestEl.textContent = newest;
    if (topDevEl) topDevEl.textContent = topDev;
    if (topPlatformEl) topPlatformEl.textContent = topPlatform;
    if (completedEl) completedEl.textContent = statusCounter.completed;
    if (playingEl) playingEl.textContent = statusCounter.playing;
    if (plannedEl) plannedEl.textContent = statusCounter.planned;
    if (ratedCountEl) ratedCountEl.textContent = ratedGames.length;
}

// Рендер графиков (используем существующую реализацию)
function renderCharts() {
    renderSimpleCharts();
}

// Простые текстовые диаграммы
function renderSimpleCharts() {
    // Платформы
    const platforms = {};
    collection.games.forEach(game => {
        const platform = game.platformName || game.platform || 'Не указано';
        platforms[platform] = (platforms[platform] || 0) + 1;
    });

    if (Object.keys(platforms).length > 0) {
        const platformChart = document.getElementById('platformChart');
        if (platformChart) platformChart.innerHTML = createBarChart(platforms);
    }

    // Статусы
    const statuses = {};
    collection.games.forEach(game => {
        const status = getStatusText(game.status);
        statuses[status] = (statuses[status] || 0) + 1;
    });

    if (Object.keys(statuses).length > 0) {
        const statusChart = document.getElementById('statusChart');
        if (statusChart) statusChart.innerHTML = createBarChart(statuses);
    }

    // Жанры
    const genres = {};
    collection.games.forEach(game => {
        const genre = game.genre || 'Не указан';
        genres[genre] = (genres[genre] || 0) + 1;
    });

    if (Object.keys(genres).length > 0) {
        const genreChart = document.getElementById('genreChart');
        if (genreChart) genreChart.innerHTML = createBarChart(genres);
    }

    // Годы
    const years = {};
    collection.games.forEach(game => {
        const year = game.releaseYear || 'Не указан';
        years[year] = (years[year] || 0) + 1;
    });

    if (Object.keys(years).length > 0) {
        const yearChart = document.getElementById('yearChart');
        if (yearChart) yearChart.innerHTML = createBarChart(years);
    }

    // Pie (текстовый)
    if (Object.keys(platforms).length > 0) {
        const pieChart = document.getElementById('pieChart');
        if (pieChart) pieChart.innerHTML = createPieChart(platforms);
    }
}

// Создаем текстовую столбчатую диаграмму
function createBarChart(data) {
    const maxValue = Math.max(...Object.values(data));
    const total = Object.values(data).reduce((a, b) => a + b, 0);

    let html = '<div class="text-chart">';

    Object.entries(data).forEach(([label, value]) => {
        const percentage = ((value / total) * 100).toFixed(1);
        const barWidth = (value / maxValue) * 100;

        html += `
            <div class="chart-item">
                <span class="chart-label">${escapeHtml(String(label))}</span>
                <div class="chart-bar-container">
                    <div class="chart-bar" style="width: ${barWidth}%"></div>
                </div>
                <span class="chart-value">${value} (${percentage}%)</span>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

// Создаем "круговую" диаграмму текстом
function createPieChart(data) {
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8', '#f7b76d'];

    let html = '<div class="pie-chart-text">';
    let colorIndex = 0;

    Object.entries(data).forEach(([label, value]) => {
        const percentage = ((value / total) * 100).toFixed(1);
        const color = colors[colorIndex % colors.length];
        colorIndex++;

        html += `
            <div class="pie-item">
                <span class="pie-color" style="background: ${color};"></span>
                <span class="pie-label">${escapeHtml(String(label))}</span>
                <span class="pie-percent">${percentage}%</span>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

// Theme
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    localStorage.setItem('horrorTheme', currentTheme);
}

// CRUD handlers (коротко, чтобы не ломать твой текущий функционал)
function handleAddGame(e) {
    e.preventDefault();

    const newGame = {
        id: Date.now(),
        title: document.getElementById('gameTitle').value.trim(),
        platform: document.getElementById('gamePlatform').value,
        platformName: document.getElementById('gamePlatform').selectedOptions[0]?.textContent || '',
        coverImage: document.getElementById('gameCover').value.trim(),
        releaseYear: Number(document.getElementById('gameYear').value) || null,
        status: document.getElementById('gameStatus').value,
        rating: document.getElementById('gameRating').value ? Number(document.getElementById('gameRating').value) : null,
        developer: document.getElementById('gameDeveloper').value.trim(),
        genre: document.getElementById('gameGenre').value.trim(),
        description: document.getElementById('gameDescription').value.trim(),
        notes: document.getElementById('gameNotes').value.trim()
    };

    games.unshift(newGame);
    saveCollection();
    closeAddGameModal();
    e.target.reset();
    applyFilters();
    renderUpcoming();
    updateManageInfo();
}

function handleAddUpcoming(e) {
    e.preventDefault();

    const newUpcoming = {
        id: Date.now(),
        title: document.getElementById('upcomingTitle').value.trim(),
        platform: document.getElementById('upcomingPlatform').value,
        platformName: document.getElementById('upcomingPlatform').selectedOptions[0]?.textContent || '',
        coverImage: document.getElementById('upcomingCover').value.trim(),
        releaseYear: Number(document.getElementById('upcomingYear').value) || null,
        releaseDate: document.getElementById('upcomingDate').value || null,
        developer: document.getElementById('upcomingDeveloper').value.trim(),
        genre: document.getElementById('upcomingGenre').value.trim(),
        description: document.getElementById('upcomingDescription').value.trim()
    };

    upcomingGames.unshift(newUpcoming);
    saveCollection();
    closeAddUpcomingModal();
    e.target.reset();
    renderUpcoming();
    updateManageInfo();
}

function deleteGame(id) {
    if (!confirm('Удалить игру из коллекции?')) return;
    games = games.filter(g => g.id !== id);
    filteredGames = filteredGames.filter(g => g.id !== id);
    saveCollection();
    renderAll();
}

function deleteUpcoming(id) {
    if (!confirm('Удалить ожидаемую игру?')) return;
    upcomingGames = upcomingGames.filter(g => g.id !== id);
    saveCollection();
    renderUpcoming();
    updateManageInfo();
}

// Детали (если у тебя уже была реализация - можешь заменить этим минимумом)
function openGameDetail(id) {
    const game = games.find(g => g.id === id);
    if (!game) return;

    const modal = document.getElementById('gameDetailModal');
    const titleEl = document.getElementById('detailTitle');
    const contentEl = document.getElementById('gameDetailContent');

    if (titleEl) titleEl.textContent = game.title;

    if (contentEl) {
        contentEl.innerHTML = `
            <div style="display:flex; gap:16px; flex-wrap:wrap;">
                <img class="detail-cover" src="${game.coverImage || 'https://via.placeholder.com/400x400/1a1a1a/ffffff?text=No+Cover'}" alt="${escapeHtml(game.title)}" style="width:280px; border-radius:18px; border:1px solid var(--border-color);">
                <div style="flex:1; min-width:240px;">
                    <p><b>Платформа:</b> ${escapeHtml(game.platformName || game.platform || '')}</p>
                    <p><b>Год:</b> ${game.releaseYear || '—'}</p>
                    <p><b>Статус:</b> ${getStatusText(game.status)}</p>
                    <p><b>Рейтинг:</b> ${typeof game.rating === 'number' ? game.rating : '—'}</p>
                    <p><b>Разработчик:</b> ${escapeHtml(game.developer || '—')}</p>
                    <p><b>Жанр:</b> ${escapeHtml(game.genre || '—')}</p>
                    <p style="margin-top:10px; color: var(--text-secondary);">${escapeHtml(game.description || '')}</p>
                    ${game.notes ? `<p style="margin-top:10px;"><b>Заметки:</b><br>${escapeHtml(game.notes)}</p>` : ''}
                </div>
            </div>
        `;
    }

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeGameDetailModal() {
    document.getElementById('gameDetailModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Управление коллекцией (экспорт/импорт/очистка/сброс)
function exportCollection() {
    const data = JSON.stringify(collection, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'horror-collection.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importCollection() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            collection = data;
            games = collection.games || [];
            upcomingGames = collection.upcoming || [];
            filteredGames = [...games];

            saveCollection();
            renderAll();
            alert('Импорт выполнен!');
        } catch (e) {
            alert('Ошибка импорта JSON');
            console.error(e);
        }
    };

    input.click();
}

function clearCollection() {
    if (!confirm('Точно удалить ВСЕ данные?')) return;
    collection = { games: [], upcoming: [], lastUpdate: new Date().toISOString() };
    games = [];
    upcomingGames = [];
    filteredGames = [];
    saveCollection();
    renderAll();
}

function resetToDefault() {
    if (!confirm('Сбросить к демо-данным?')) return;
    localStorage.removeItem('horrorCollection');
    loadCollection();
    renderAll();
}

// Подгрузка темы из localStorage
(function restoreTheme() {
    const t = localStorage.getItem('horrorTheme');
    if (t) {
        currentTheme = t;
        document.documentElement.setAttribute('data-theme', currentTheme);
        const icon = document.getElementById('themeIcon');
        if (icon) icon.className = currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
})();
