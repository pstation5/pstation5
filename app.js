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

// Ловим любые ошибки
window.onerror = function (message, source, lineno, colno, error) {
  dalert(`JS ERROR: ${message}\n${source}:${lineno}`);
  dlog("Full error:", { message, source, lineno, colno, error });
};


// =======================
// Telegram init
// =======================

const tg = window.Telegram?.WebApp || null;

if (tg) {
  tg.ready?.();
  tg.expand?.();

  dlog("Telegram WebApp detected:", tg);
  dlog("initData:", tg.initData);

  dalert("Telegram WebApp detected.\ninitData loaded.");
} else {
  dlog("Telegram NOT available.");
}


// =======================
// Debug visual elements
// =======================

const dbgIndicator = document.getElementById("debugIndicator");
if (DEBUG && dbgIndicator) dbgIndicator.style.display = "block";

const dbgBtn = document.getElementById("debugTestBtn");
if (DEBUG && dbgBtn) {
  dbgBtn.style.display = "block";
  dbgBtn.onclick = () => {
    dalert("Debug button click OK!");
    dlog("Debug button clicked");
  };
}


// =======================
// Data
// =======================

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
      "Мрачная история выживания с сильным сюжетом и кинематографией.",
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
      "Приключения Питера Паркера и Майлза в открытом мире Нью-Йорка.",
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
    shortDescription: "Самурайский экшен с красивой природой и дуэлями.",
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
    shortDescription: "Официальный ремейк хардкорной RPG для PS5.",
  },
];


// =======================
// State
// =======================

let favorites = new Set();
let currentPlatformFilter = "all";
let currentSearch = "";
let currentTab = "all";
let currentSheetGameId = null;


// =======================
// DOM
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
// Helpers
// =======================

function matchesFilters(game) {
  const pOK =
    currentPlatformFilter === "all" || game.platform === currentPlatformFilter;
  const sOK =
    currentSearch === "" ||
    game.title.toLowerCase().includes(currentSearch.toLowerCase());
  return pOK && sOK;
}

function renderGames() {
  gamesGrid.innerHTML = "";
  games.filter(matchesFilters).forEach((game) => {
    gamesGrid.appendChild(createGameCard(game));
  });
}

function renderFavorites() {
  favoritesGrid.innerHTML = "";
  const fav = games.filter((g) => favorites.has(g.id));

  favoritesEmpty.style.display = fav.length === 0 ? "flex" : "none";
  fav.forEach((game) => favoritesGrid.appendChild(createGameCard(game)));
}

function createGameCard(game) {
  const card = document.createElement("article");
  card.className = "game-card";
  if (favorites.has(game.id)) card.classList.add("favorited");

  const cover = document.createElement("div");
  cover.className = "game-cover";

  const ci = document.createElement("div");
  ci.className = "game-cover-inner";
  ci.style.backgroundImage = `url(${game.cover})`;
  cover.appendChild(ci);

  const platform = document.createElement("div");
  platform.className = "game-platform-badge";
  platform.textContent = game.platform.toUpperCase();
  cover.appendChild(platform);

  const favBtn = document.createElement("button");
  favBtn.className = "game-fav-btn";
  favBtn.innerHTML = `<span class="icon-heart"></span>`;
  favBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(game.id);
  });
  cover.appendChild(favBtn);

  card.appendChild(cover);

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

  const tags = document.createElement("div");
  tags.className = "game-tags";
  game.tags.forEach((t) => {
    const tag = document.createElement("span");
    tag.className = "game-tag";
    tag.textContent = t;
    tags.appendChild(tag);
  });
  info.appendChild(tags);

  card.appendChild(info);

  card.addEventListener("click", () => openGameSheet(game.id));

  return card;
}


// =======================
// Core logic
// =======================

function toggleFavorite(id) {
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  renderGames();
  renderFavorites();
  updateSheetFavoriteState();
}

function switchTab(tab) {
  currentTab = tab;

  tabButtons.forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === tab)
  );
  tabPanels.forEach((p) =>
    p.classList.toggle("active", p.id === `tab-${tab}`)
  );
}

function openGameSheet(id) {
  const game = games.find((g) => g.id === id);
  if (!game) return;

  currentSheetGameId = id;

  sheetCover.innerHTML = `<div class="sheet-cover-inner" style="background-image:url('${game.cover}')"></div>`;
  sheetTitle.textContent = game.title;
  sheetMeta.textContent = `${game.platform.toUpperCase()} · ${game.type} · ${game.genre}`;
  sheetDescription.textContent = game.shortDescription;

  sheetTags.innerHTML = "";
  game.tags.forEach((t) => {
    const el = document.createElement("span");
    el.className = "sheet-tag";
    el.textContent = t;
    sheetTags.appendChild(el);
  });

  updateSheetFavoriteState();
  gameSheet.classList.add("open");
}

function closeGameSheet() {
  gameSheet.classList.remove("open");
  currentSheetGameId = null;
}

function updateSheetFavoriteState() {
  const icon = sheetFavBtn.querySelector(".icon-heart");
  icon.classList.toggle("favorited", favorites.has(currentSheetGameId));
}


// =======================
// Listeners
// =======================

// Tabs
tabButtons.forEach((b) =>
  b.addEventListener("click", () => switchTab(b.dataset.tab))
);

// Filters
chips.forEach((chip) =>
  chip.addEventListener("click", () => {
    chips.forEach((c) => c.classList.remove("chip-active"));
    chip.classList.add("chip-active");
    currentPlatformFilter = chip.dataset.platform;
    renderGames();
  })
);

// Search
searchInput.addEventListener("input", (e) => {
  currentSearch = e.target.value.trim();
  renderGames();
});

// Sheet closing
gameSheetBackdrop.addEventListener("click", closeGameSheet);
gameSheet.addEventListener("click", (e) => {
  if (e.target === gameSheet) closeGameSheet();
});

sheetFavBtn.addEventListener("click", () => {
  if (currentSheetGameId) toggleFavorite(currentSheetGameId);
});

// Temporary stubs
addToCollectionBtn.addEventListener("click", () =>
  dalert("Добавление в коллекцию будет позже")
);

shareGameBtn.addEventListener("click", () => {
  if (!currentSheetGameId) return;
  const game = games.find((g) => g.id === currentSheetGameId);
  dalert("Поделиться: " + game.title);
});


// =======================
// Init
// =======================

renderGames();
renderFavorites();
dlog("App initialized.");
