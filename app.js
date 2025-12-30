// =======================
// Debug mode
// =======================
const DEBUG = true;

function dlog(...args) {
  if (DEBUG) console.log("[DEBUG]", ...args);
}

function dalert(msg) {
  if (!DEBUG) return;
  try {
    const tg = window.Telegram?.WebApp;
    if (tg && typeof tg.showAlert === "function") {
      tg.showAlert("[DEBUG]\n" + msg);
    } else {
      alert("[DEBUG]\n" + msg);
    }
  } catch (e) {
    console.log("[DEBUG ALERT FAIL]", e, msg);
  }
}

// Ловим любые ошибки в JS
window.onerror = function (message, source, lineno, colno, error) {
  dalert(`JS ERROR: ${message}\n${source}:${lineno}`);
  dlog("Full error:", { message, source, lineno, colno, error });
};

// =======================
// Telegram WebApp init
// =======================

const tg = window.Telegram?.WebApp || null;

if (tg) {
  tg.ready?.();
  tg.expand?.();

  dlog("Telegram WebApp detected:", tg);
  dlog("initData:", tg.initData);

  dalert("Mini App detected Telegram.\ninitData received.");
} else {
  dlog("Telegram WebApp object is NOT available.");
}

// Визуальный индикатор DEBUG MODE
const dbgIndicator = document.getElementById("debugIndicator");
if (DEBUG && dbgIndicator) {
  dbgIndicator.style.display = "block";
}

// Кнопка Test Debug
const dbgBtn = document.getElementById("debugTestBtn");
if (DEBUG && dbgBtn) {
  dbgBtn.style.display = "block";
  dbgBtn.onclick = () => {
    dalert("Debug test click OK!");
    dlog("Debug button clicked");
  };
} else {
  dlog("DEBUG BUTTON NOT FOUND IN DOM");
}

// =======================
// Моковые данные игр
// =======================

const games = [
  {
    id: 1,
    title: "The Last of Us Part II",
    platform: "ps4",
    type: "Disk",
    genre: "Action · Adventure",
    tags: ["Story-rich", "Singleplayer"],
    cover: "https://image.api.playstation.com/vulcan/ap/rnd/202006/0419/QoPg6f7zj0nSMuLyOJ7XdzEJ.png",
    shortDescription: "Мрачная история выживания с сильным сюжетом и кинематографией.",
  },
  {
    id: 2,
    title: "Spider-Man 2",
    platform: "ps5",
    type: "Disk",
    genre: "Action · Open World",
    tags: ["Marvel", "Open World"],
    cover: "https://image.api.playstation.com/vulcan/ap/rnd/202308/0216/f8MkO2izW2iSSotoaXSInXZ7.png",
    shortDescription: "Современный приключенческий боевик про Питера Паркера и Майлза.",
  },
  {
    id: 3,
    title: "Ghost of Tsushima",
    platform: "ps4",
    type: "Disk",
    genre: "Action · Samurai",
    tags: ["Open World", "Samurai"],
    cover: "https://image.api.playstation.com/vulcan/ap/rnd/202006/0319/ctAi3j_6G4J06QUJ93D4gR75.png",
    shortDescription: "Атмосферное путешествие по феодальной Японии с акцентом на дуэли.",
  },
  {
    id: 4,
    title: "Demon's Souls",
    platform: "ps5",
    type: "Disk",
    genre: "RPG · Soulslike",
    tags: ["Hardcore", "Remake"],
    cover: "https://image.api.playstation.com/vulcan/ap/rnd/202009/2517/0p9g6f7Zj0nSMuLy0J7XdzEJ.png",
    shortDescription: "Красивая и безжалостная классика жанра soulslike.",
  },
];

// =======================
// Состояние
// =======================

let favorites = new Set();
let currentPlatformFilter = "all";
let currentSearch = "";
let currentTab = "all";
let currentSheetGameId = null;

// =======================
// DOM-элементы
// =======================

const gamesGrid = document.getElementById("gamesGrid");
const favoritesGrid = document.getElementById("favoritesGrid");
const favoritesEmpty = document.getElementById("favoritesEmpty");
const searchInput = document.getElementById("searchInput");

const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");
const chips = document.querySelectorAll(".chip");

// Sheet
const gameSheet = document.getElementById("gameSheet");
const gameSheetBackdrop = document.getElementById("gameSheetBackdrop");
const sheetCover = document.getElementById("sheetCover");
const sheetTitle = document.getElementById("sheetTitle");
const sheetMeta = document.getElementById("sheetMeta");
const sheetDescription = document.getElementById("sheetDescription");
const sheetTags = document.getElementById("sheetTags");
const sheetFavBtn = document.getElementById("sheetFavBtn");
const addToCollectionBtn = document.getElementById("addToCollectionBtn");
const shareGameBtn = document.getElementById("shareGameBtn");

// =======================
// Вспомогательные функции
// =======================

function matchesFilters(game) {
  const byPlatform =
    currentPlatformFilter === "all" || game.platform === currentPlatformFilter;
  const bySearch =
    currentSearch.trim() === "" ||
    game.title.toLowerCase().includes(currentSearch.toLowerCase());
  return byPlatform && bySearch;
}

function renderGames() {
  if (!gamesGrid) return;
  gamesGrid.innerHTML = "";
  const filtered = games.filter(matchesFilters);

  filtered.forEach((game) => {
    const card = createGameCard(game);
    gamesGrid.appendChild(card);
  });
}

function renderFavorites() {
  if (!favoritesGrid || !favoritesEmpty) return;

  favoritesGrid.innerHTML = "";
  const favGames = games.filter((g) => favorites.has(g.id));

  if (favGames.length === 0) {
    favoritesEmpty.style.display = "flex";
  } else {
    favoritesEmpty.style.display = "none";
  }

  favGames.forEach((game) => {
    const card = createGameCard(game);
    favoritesGrid.appendChild(card);
  });
}

function createGameCard(game) {
  const card = document.createElement("article");
  card.className = "game-card";
  if (favorites.has(game.id)) {
    card.classList.add("favorited");
  }

  const cover = document.createElement("div");
  cover.className = "game-cover";

  const coverInner = document.createElement("div");
  coverInner.className = "game-cover-inner";
  coverInner.style.backgroundImage = `url(${game.cover})`;
  cover.appendChild(coverInner);

  const platformBadge = document.createElement("div");
  platformBadge.className = "game-platform-badge";
  platformBadge.textContent = game.platform.toUpperCase();
  cover.appendChild(platformBadge);

  const favBtn = document.createElement("button");
  favBtn.className = "game-fav-btn";
  favBtn.innerHTML = '<span class="icon-heart"></span>';
  favBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(game.id);
  });
  cover.appendChild(favBtn);

  const info = document.createElement("div");
  info.className = "game-info";

  const title = document.createElement("div");
  title.className = "game-title";
  title.textContent = game.title;
  info.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "game-meta";
  meta.textContent = `${game.genre} · ${game.type}`;
  info.appendChild(meta);

  const tagsRow = document.createElement("div");
  tagsRow.className = "game-tags";
  game.tags.forEach((tag) => {
    const tagEl = document.createElement("span");
    tagEl.className = "game-tag";
    tagEl.textContent = tag;
    tagsRow.appendChild(tagEl);
  });
  info.appendChild(tagsRow);

  card.appendChild(cover);
  card.appendChild(info);

  card.addEventListener("click", () => openGameSheet(game.id));

  return card;
}

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

function switchTab(tabId) {
  currentTab = tabId;
  tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabId}`);
  });
}

function openGameSheet(gameId) {
  const game = games.find((g) => g.id === gameId);
  if (!game || !gameSheet) return;

  currentSheetGameId = gameId;

  sheetCover.innerHTML = "";
  const coverInner = document.createElement("div");
  coverInner.className = "sheet-cover-inner";
  coverInner.style.backgroundImage = `url(${game.cover})`;
  sheetCover.appendChild(coverInner);

  sheetTitle.textContent = game.title;
  sheetMeta.textContent = `${game.platform.toUpperCase()} · ${game.type} · ${game.genre}`;
  sheetDescription.textContent =
    game.shortDescription ||
    "Описание игры появится здесь, когда мы подключим базу данных.";

  sheetTags.innerHTML = "";
  game.tags.forEach((tag) => {
    const span = document.createElement("span");
    span.className = "sheet-tag";
    span.textContent = tag;
    sheetTags.appendChild(span);
  });

  updateSheetFavoriteState();

  gameSheet.classList.add("open");
}

function closeGameSheet() {
  if (!gameSheet) return;
  gameSheet.classList.remove("open");
  currentSheetGameId = null;
}

function updateSheetFavoriteState() {
  if (!currentSheetGameId || !sheetFavBtn) return;
  const isFav = favorites.has(currentSheetGameId);
  const icon = sheetFavBtn.querySelector(".icon-heart");
  if (icon) {
    icon.classList.toggle("favorited", isFav);
  }
}

// =======================
// Слушатели
// =======================

// Табы
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    switchTab(btn.dataset.tab);
  });
});

// Фильтр по платформе
chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    chips.forEach((c) => c.classList.remove("chip-active"));
    chip.classList.add("chip-active");
    currentPlatformFilter = chip.dataset.platform;
    renderGames();
  });
});

// Поиск
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    currentSearch = e.target.value;
    renderGames();
  });
}

// Bottom sheet закрытие
if (gameSheetBackdrop) {
  gameSheetBackdrop.addEventListener("click", closeGameSheet);
}

if (gameSheet) {
  gameSheet.addEventListener("click", (e) => {
    if (e.target === gameSheet) closeGameSheet();
  });
}

if (sheetFavBtn) {
  sheetFavBtn.addEventListener("click", () => {
    if (!currentSheetGameId) return;
    toggleFavorite(currentSheetGameId);
  });
}

// Временно: заглушки на действия
if (addToCollectionBtn) {
  addToCollectionBtn.addEventListener("click", () => {
    dalert("Функция добавления в коллекции появится позже.");
  });
}

if (shareGameBtn) {
  shareGameBtn.addEventListener("click", () => {
    if (!currentSheetGameId) return;
    const game = games.find((g) => g.id === currentSheetGameId);
    if (!game) return;
    const text = `Смотри, какая игра в моей PS коллекции: ${game.title}`;
    if (tg && typeof tg.sendData === "function") {
      tg.sendData(JSON.stringify({ type: "share_game", gameId: game.id, text }));
    } else {
      dalert(text);
    }
  });
}

// =======================
// Старт
// =======================

renderGames();
renderFavorites();
dlog("App initialized");
