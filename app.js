/*************************************************
 * DEBUG
 *************************************************/
const DEBUG = true;

function dlog(...args) {
  if (DEBUG) console.log("[DEBUG]", ...args);
}

function dalert(msg) {
  if (!DEBUG) return;
  alert("[DEBUG]\n" + msg);
}

// Ловим любые ошибки, чтобы видеть их даже в Телеге
window.onerror = function (message, source, lineno, colno, error) {
  dlog("JS ERROR:", message, source + ":" + lineno, error);
};


/*************************************************
 * Telegram WebApp (без алертов)
 *************************************************/
let tg = null;
try {
  tg = window?.Telegram?.WebApp || null;
  if (tg && typeof tg.ready === "function") {
    tg.ready();
    dlog("Telegram WebApp detected");
  } else {
    dlog("Telegram WebApp not available (browser mode)");
  }
} catch (e) {
  dlog("Telegram init error:", e);
}


/*************************************************
 * DEBUG UI (индикатор + кнопка DEV)
 *************************************************/
const debugIndicator = document.getElementById("debugIndicator");
if (DEBUG && debugIndicator) {
  debugIndicator.style.display = "block";
}

const debugBtn = document.getElementById("debugTestBtn");
if (DEBUG && debugBtn) {
  debugBtn.style.display = "block";
  debugBtn.onclick = () => {
    dalert("Debug button click OK!");
  };
}


/*************************************************
 * DATA
 *************************************************/
const games = [
  {
    id: 1,
    title: "The Last of Us Part II",
    platform: "ps4",
    type: "Disk",
    genre: "Action · Adventure",
    tags: ["Story-rich", "Singleplayer"],
    cover:
      "https://image.api.playstation.com/vulcan/ap/rnd/202006/0419/QoPg6f7zj0nSMuLyOJ7XdzEJ.png",
    shortDescription:
      "Мрачная история выживания с кинематографичным сюжетом и сильными персонажами.",
  },
  {
    id: 2,
    title: "Spider-Man 2",
    platform: "ps5",
    type: "Disk",
    genre: "Action · Open World",
    tags: ["Marvel", "Open World"],
    cover:
      "https://image.api.playstation.com/vulcan/ap/rnd/202308/0216/f8MkO2izW2iSSotoaXSInXZ7.png",
    shortDescription:
      "Новый уровень супергеройского экшена в открытом мире Нью-Йорка.",
  },
  {
    id: 3,
    title: "Ghost of Tsushima",
    platform: "ps4",
    type: "Disk",
    genre: "Action · Samurai",
    tags: ["Open World", "Samurai"],
    cover:
      "https://image.api.playstation.com/vulcan/ap/rnd/202006/0319/ctAi3j_6G4J06QUJ93D4gR75.png",
    shortDescription:
      "Самурайский экшен с акцентом на дуэли, стелс и атмосферу феодальной Японии.",
  },
  {
    id: 4,
    title: "Demon's Souls",
    platform: "ps5",
    type: "Disk",
    genre: "RPG · Soulslike",
    tags: ["Hardcore", "Remake"],
    cover:
      "https://image.api.playstation.com/vulcan/ap/rnd/202009/2517/TozUf0odkWY7SS7CTF4jWbWp.png",
    shortDescription: "Хардкорный ремейк классической soulslike RPG для PS5.",
  },
];


/*************************************************
 * STATE
 *************************************************/
let favorites = new Set();
let currentPlatform = "all";
let currentSearch = "";
let currentTab = "all";
let currentSheetGameId = null;


/*************************************************
 * DOM ELEMENTS
 *************************************************/
// Сетка
const gamesGrid = document.getElementById("gamesGrid");
const favoritesGrid = document.getElementById("favoritesGrid");
const favoritesEmpty = document.getElementById("favoritesEmpty");

// Фильтры / поиск
const searchInput = document.getElementById("searchInput");
const chipButtons = document.querySelectorAll(".chip");

// Табы
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");

// Bottom sheet
const gameSheet = document.getElementById("gameSheet");
const sheetBackdrop = document.getElementById("gameSheetBackdrop");
const sheetBody = document.querySelector(".game-sheet-body");
const sheetCover = document.getElementById("sheetCover");
const sheetTitle = document.getElementById("sheetTitle");
const sheetMeta = document.getElementById("sheetMeta");
const sheetDescription = document.getElementById("sheetDescription");
const sheetTags = document.getElementById("sheetTags");
const sheetFavBtn = document.getElementById("sheetFavBtn");
const addToCollectionBtn = document.getElementById("addToCollectionBtn");
const shareGameBtn = document.getElementById("shareGameBtn");


/*************************************************
 * HELPERS
 *************************************************/
function matchesFilters(game) {
  const platformOk =
    currentPlatform === "all" || game.platform === currentPlatform;
  const searchOk =
    currentSearch.trim() === "" ||
    game.title.toLowerCase().includes(currentSearch.toLowerCase());
  return platformOk && searchOk;
}

function createGameCard(game) {
  const card = document.createElement("article");
  card.className = "game-card";
  if (favorites.has(game.id)) {
    card.classList.add("favorited");
  }

  card.innerHTML = `
    <div class="game-cover">
      <div class="game-cover-inner" style="background-image:url('${game.cover}')"></div>
      <div class="game-platform-badge">${game.platform.toUpperCase()}</div>
      <button class="game-fav-btn" data-id="${game.id}">
        <span class="icon-heart ${favorites.has(game.id) ? "favorited" : ""}"></span>
      </button>
    </div>

    <div class="game-info">
      <div class="game-title">${game.title}</div>
      <div class="game-meta">${game.genre} · ${game.type}</div>
    </div>
  `;

  // Открытие карточки — только если не нажали на избранное
  card.addEventListener("click", (e) => {
    if (e.target.closest(".game-fav-btn")) return;
    openGameSheet(game.id);
  });

  // Кнопка избранного
  const favBtn = card.querySelector(".game-fav-btn");
  favBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(game.id);
  });

  return card;
}


function renderGames() {
  if (!gamesGrid) return;
  gamesGrid.innerHTML = "";
  games.filter(matchesFilters).forEach((game) => {
    gamesGrid.appendChild(createGameCard(game));
  });
}

function renderFavorites() {
  if (!favoritesGrid || !favoritesEmpty) return;
  favoritesGrid.innerHTML = "";

  const favGames = games.filter((g) => favorites.has(g.id));

  favoritesEmpty.style.display = favGames.length ? "none" : "flex";

  favGames.forEach((game) => {
    favoritesGrid.appendChild(createGameCard(game));
  });
}

function switchTab(tabId) {
  currentTab = tabId;
  tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabId}`);
  });
}


/*************************************************
 * FAVORITES
 *************************************************/
function toggleFavorite(gameId) {
  if (favorites.has(gameId)) {
    favorites.delete(gameId);
  } else {
    favorites.add(gameId);
  }
  renderGames();
  renderFavorites();
  updateSheetFavoriteState();
}

function updateSheetFavoriteState() {
  if (!currentSheetGameId || !sheetFavBtn) return;
  const icon = sheetFavBtn.querySelector(".icon-heart");
  if (!icon) return;
  const isFav = favorites.has(currentSheetGameId);
  icon.classList.toggle("favorited", isFav);
}


/*************************************************
 * BOTTOM SHEET (OPEN/CLOSE + SWIPE)
 *************************************************/
function setSheetOffset(percent) {
  if (!sheetBody) return;
  sheetBody.style.setProperty("--sheet-offset", `${percent}%`);
}

function openGameSheet(gameId) {
  const game = games.find((g) => g.id === gameId);
  if (!game || !gameSheet) return;

  currentSheetGameId = gameId;

  // Картинка
  sheetCover.innerHTML = `
    <div class="sheet-cover-inner" style="background-image:url('${game.cover}')"></div>
  `;

  // Заголовки
  sheetTitle.textContent = game.title;
  sheetMeta.textContent = `${game.platform.toUpperCase()} · ${game.type} · ${game.genre}`;
  sheetDescription.textContent = game.shortDescription;

  // Теги
  sheetTags.innerHTML = "";
  game.tags.forEach((tag) => {
    const span = document.createElement("span");
    span.className = "sheet-tag";
    span.textContent = tag;
    sheetTags.appendChild(span);
  });

  updateSheetFavoriteState();

  // Открываем
  gameSheet.classList.add("open");
  setSheetOffset(0);
}

function closeGameSheet(animated = true) {
  if (!gameSheet) return;
  if (!animated) {
    gameSheet.classList.remove("open");
    setSheetOffset(100);
    currentSheetGameId = null;
    return;
  }

  setSheetOffset(100);
  // Ждём конец анимации и скрываем
  setTimeout(() => {
    gameSheet.classList.remove("open");
    currentSheetGameId = null;
  }, 350);
}

// Закрытие по фону
if (sheetBackdrop) {
  sheetBackdrop.addEventListener("click", () => closeGameSheet(true));
}

// Закрытие свайпом вниз
let dragStartY = 0;
let dragStartOffset = 0;
let dragging = false;

if (sheetBody) {
  sheetBody.addEventListener(
    "touchstart",
    (e) => {
      if (!gameSheet.classList.contains("open")) return;
      dragging = true;
      dragStartY = e.touches[0].clientY;
      // текущий offset читаем из стиля
      const current = getComputedStyle(sheetBody)
        .getPropertyValue("--sheet-offset")
        .trim()
        .replace("%", "");
      dragStartOffset = current === "" ? 0 : parseFloat(current);
    },
    { passive: true }
  );

  sheetBody.addEventListener(
    "touchmove",
    (e) => {
      if (!dragging) return;
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - dragStartY; // >0 – тянем вниз
      const vh = window.innerHeight || 1;
      const deltaPercent = (deltaY / vh) * 100;
      let newOffset = dragStartOffset + deltaPercent;
      newOffset = Math.min(100, Math.max(0, newOffset)); // clamp
      setSheetOffset(newOffset);
    },
    { passive: true }
  );

  sheetBody.addEventListener(
    "touchend",
    () => {
      if (!dragging) return;
      dragging = false;
      // читаем финальный offset
      const current = getComputedStyle(sheetBody)
        .getPropertyValue("--sheet-offset")
        .trim()
        .replace("%", "");
      const offset = current === "" ? 0 : parseFloat(current);

      // если сильно потянули вниз – закрываем
      if (offset > 35) {
        closeGameSheet(true);
      } else {
        // возвращаем в открытую позицию
        setSheetOffset(0);
      }
    },
    { passive: true }
  );
}


/*************************************************
 * EVENTS
 *************************************************/
// Табы
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tabId = btn.dataset.tab;
    switchTab(tabId);
  });
});

// Фильтры по платформам
chipButtons.forEach((chip) => {
  chip.addEventListener("click", () => {
    chipButtons.forEach((c) => c.classList.remove("chip-active"));
    chip.classList.add("chip-active");
    currentPlatform = chip.dataset.platform;
    renderGames();
  });
});

// Поиск
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    currentSearch = e.target.value || "";
    renderGames();
  });
}

// Избранное из шита
if (sheetFavBtn) {
  sheetFavBtn.addEventListener("click", () => {
    if (!currentSheetGameId) return;
    toggleFavorite(currentSheetGameId);
  });
}

// Заглушки для "Добавить в коллекцию" и "Поделиться"
if (addToCollectionBtn) {
  addToCollectionBtn.addEventListener("click", () => {
    dalert("Добавление в коллекции будет реализовано позже.");
  });
}

if (shareGameBtn) {
  shareGameBtn.addEventListener("click", () => {
    if (!currentSheetGameId) return;
    const game = games.find((g) => g.id === currentSheetGameId);
    if (!game) return;
    dalert("Поделиться игрой: " + game.title);
  });
}


/*************************************************
 * INIT
 *************************************************/
switchTab("all");
renderGames();
renderFavorites();
dlog("App initialized");
