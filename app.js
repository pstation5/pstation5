// Debug mode switch
const DEBUG = true;

// Helper for debug logging
function dlog(...args) {
  if (DEBUG) console.log("[DEBUG]", ...args);
}

// Helper for debug alerts (safe for Telegram)
function dalert(msg) {
  if (DEBUG) {
    if (window.Telegram?.WebApp?.showAlert) {
      window.Telegram.WebApp.showAlert("[DEBUG]\n" + msg);
    } else {
      alert("[DEBUG]\n" + msg);
    }
  }
}

window.onerror = function (message, source, lineno, colno, error) {
  dalert(`JS ERROR: ${message}\n${source}:${lineno}`);
  dlog("Full error:", { message, source, lineno, colno, error });
};

// Инициализация Telegram Mini App (по сути просто готовность)
const tg = window.Telegram?.WebApp || null;
if (tg) {
  tg.ready();
  tg.expand && tg.expand();
}

const tg = window.Telegram?.WebApp || null;

if (tg) {
  tg.ready?.();
  tg.expand?.();

  if (DEBUG) {
    dlog("Telegram WebApp detected:", tg);
    dlog("initData:", tg.initData);
    dalert("Mini App detected Telegram.\ninitData received.");
  }
} else {
  dalert("WARNING: Telegram WebApp object is NOT available.");
}


// Моковые данные игр (потом заменим данными из Supabase)
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
    cover: "https://image.api.playstation.com/vulcan/ap/rnd/202009/2517/TozUf0odkYW7SS7cTF4jvbWp.png",
    shortDescription: "Красивая и безжалостная классика жанра soulslike.",
  },
];

// Состояние
let favorites = new Set();
let currentPlatformFilter = "all";
let currentSearch = "";
let currentTab = "all";
let currentSheetGameId = null;

// DOM
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

// Вспомогательные функции
function matchesFilters(game) {
  const byPlatform =
    currentPlatformFilter === "all" || game.platform === currentPlatformFilter;
  const bySearch =
    currentSearch.trim() === "" ||
    game.title.toLowerCase().includes(currentSearch.toLowerCase());
  return byPlatform && bySearch;
}

function renderGames() {
  gamesGrid.innerHTML = "";
  const filtered = games.filter(matchesFilters);

  filtered.forEach((game) => {
    const card = createGameCard(game);
    gamesGrid.appendChild(card);
  });
}

function renderFavorites() {
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

  // Открытие детальной карточки
  card.addEventListener("click", () => openGameSheet(game.id));

  return card;
}

function toggleFavorite(gameId) {
  if (favorites.has(gameId)) {
    favorites.delete(gameId);
  } else {
    favorites.add(gameId);
  }
  // Перерисовка
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
  if (!game) return;

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
  gameSheet.classList.remove("open");
  currentSheetGameId = null;
}

function updateSheetFavoriteState() {
  if (!currentSheetGameId) return;
  const isFav = favorites.has(currentSheetGameId);
  const icon = sheetFavBtn.querySelector(".icon-heart");
  if (icon) {
    icon.classList.toggle("favorited", isFav);
  }
}

// Слушатели

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
searchInput.addEventListener("input", (e) => {
  currentSearch = e.target.value;
  renderGames();
});

// Bottom sheet закрытие
gameSheetBackdrop.addEventListener("click", closeGameSheet);
gameSheet.addEventListener("click", (e) => {
  if (e.target === gameSheet) closeGameSheet();
});

sheetFavBtn.addEventListener("click", () => {
  if (!currentSheetGameId) return;
  toggleFavorite(currentSheetGameId);
});

// Временно: заглушки на действия
addToCollectionBtn.addEventListener("click", () => {
  if (tg?.showAlert) {
    tg.showAlert("Функция добавления в коллекции появится позже.");
  } else {
    alert("Функция добавления в коллекции появится позже.");
  }
});

shareGameBtn.addEventListener("click", () => {
  if (!currentSheetGameId) return;
  const game = games.find((g) => g.id === currentSheetGameId);
  const text = `Смотри, какая игра в моей PS коллекции: ${game.title}`;
  if (tg?.shareMessage) {
    tg.shareMessage(text);
  } else if (tg?.sendData) {
    tg.sendData(JSON.stringify({ type: "share_game", gameId: game.id }));
  } else {
    alert(text);
  }
});

// Стартовый рендер
renderGames();
renderFavorites();

if (DEBUG) {
  const dbg = document.getElementById("debugIndicator");
  if (dbg) dbg.style.display = "block";
}

if (DEBUG) {
  const btn = document.getElementById("debugTestBtn");
  btn.style.display = "block";
  btn.onclick = () => {
    dalert("Debug test click OK!");
    dlog("Debug button clicked");
  };
}
