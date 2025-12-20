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
function deleteGame() {
    const gameId = parseInt(document.getElementById('editGameId').value);
    const gameIndex = collection.games.findIndex(g => g.id === gameId);
    
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
        closeEditGameModal();
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

// ===== ДОБАВЛЯЕМ НОВЫЕ КНОПКИ В ШАПКУ =====

// Обновляем initApp для добавления новых кнопок
const originalInitApp = initApp;
window.initApp = function() {
    originalInitApp();
    
    // Добавляем новые кнопки в шапку
    addHeaderButtons();
};

function addHeaderButtons() {
    const header = document.querySelector('.header');
    
    // Кнопка статистики
    const statsBtn = document.createElement('button');
    statsBtn.className = 'manage-btn';
    statsBtn.title = 'Статистика коллекции';
    statsBtn.innerHTML = '<i class="fas fa-chart-bar"></i>';
    statsBtn.onclick = openStatsModal;
    statsBtn.style.right = '130px';
    
    // Кнопка шаринга
    const shareBtn = document.createElement('button');
    shareBtn.className = 'manage-btn';
    shareBtn.title = 'Поделиться коллекцией';
    shareBtn.innerHTML = '<i class="fas fa-share-alt"></i>';
    shareBtn.onclick = openShareModal;
    shareBtn.style.right = '180px';
    
    // Кнопка сканера
    const scannerBtn = document.createElement('button');
    scannerBtn.className = 'manage-btn';
    scannerBtn.title = 'Сканировать штрих-код';
    scannerBtn.innerHTML = '<i class="fas fa-barcode"></i>';
    scannerBtn.onclick = openBarcodeScanner;
    scannerBtn.style.right = '230px';
    
    // Добавляем кнопки в шапку
    header.appendChild(statsBtn);
    header.appendChild(shareBtn);
    header.appendChild(scannerBtn);
}

// ===== ОБНОВЛЯЕМ ФУНКЦИЮ scanBarcode =====

window.scanBarcode = function() {
    openBarcodeScanner();
};
