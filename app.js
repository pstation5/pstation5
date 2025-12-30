/************************************************************
 *  DEBUG MODE — безопасная версия (без Telegram ошибок)
 ************************************************************/

const DEBUG = true;

function dlog(...args) {
  if (DEBUG) console.log("[DEBUG]", ...args);
}

function dalert(msg) {
  if (!DEBUG) return;

  // Безопасный вывод — без showAlert/showPopup
  // Работает в Telegram Desktop 6.0 и браузере
  alert("[DEBUG]\n" + msg);
}

// Ловим ошибки и выводим безопасно
window.onerror = function (message, source, line, col, err) {
  dalert(`JS ERROR: ${message}\n${source}:${line}`);
  dlog("Full error:", err);
};


/************************************************************
 *  Telegram WebApp Init
 ************************************************************/

const tg = window?.Telegram?.WebApp || null;

if (tg) {
  tg.ready();
  dlog("Telegram WebApp detected");
  dlog("initData:", tg.initData);
} else {
  dlog("Telegram not detected (browser mode)");
}



/************************************************************
 *  Debug UI activation
 ************************************************************/

const dbgIndicator = document.getElementById("debugIndicator");
if (DEBUG && dbgIndicator) dbgIndicator.style.display = "block";

const dbgBtn = document.getElementById("debugTestBtn");
if (DEBUG && dbgBtn) {
  dbgBtn.style.display = "block";
  dbgBtn.onclick = () => dalert("Debug button click OK!");
}



/************************************************************
 *  GAME DATA
 ************************************************************/

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
    shortDescription: "Приключения Питера Паркера и Майлза в Нью-Йорке.",
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
    shortDescription: "Самурайский экшен с красивыми дуэлями.",
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
    shortDescription: "Ремейк хардкорной RPG для PS5.",
  },
];



/************************************************************
 *  APP STATE
 ************************************************************/

let favorites = new Set();
let currentPlatform = "all";
let currentSearch = "";
let currentSheetId = null;



/************************************************************
 *  DOM ELEMENTS
 ************************************************************/

const gamesGrid = document.getElementById("gamesGrid");
const favoritesGrid = document.getElementById("favoritesGrid");
const favoritesEmpty = document.getElementById("favoritesEmpty");
const searchInput = document.getElementById("searchInput");
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");
const chips = document.querySelectorAll(".chip");

// Bottom sheet elements
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



/************************************************************
 *  RENDER FUNCTIONS
 ************************************************************/

function matchesFilters(game) {
  const platOK = currentPlatform === "all" || game.platform === currentPlatform;
  const searchOK =
    currentSearch === "" ||
    game.title.toLowerCase().includes(currentSearch.toLowerCase());
  return platOK && searchOK;
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

  const cover = document.createElement("div");
  cover.className = "game-cover";
  cover.innerHTML = `<div class="game-cover-inner" style="background-image:url('${game.cover}')"></div>`;

  const platform = document.createElement("div");
  platform.className = "game-platform-badge";
  platform.textContent = game.platform.toUpperCase();
  cover.appendChild(platform);

  const favBtn = document.createElement("button");
  favBtn.className = "game-fav-btn";
  favBtn.innerHTML = `<span class="icon-heart"></span>`;
  favBtn.onclick = (e) => {
    e.stopPropagation();
    toggleFavorite(game.id);
  };
  cover.appendChild(favBtn);

  const info = document.createElement("div");
  info.className = "game-info";

  const title = document.createElement("div");
  title.className = "game-title";
  title.textContent = game.title;

  const meta = document.createElement("div");
  meta.className = "game-meta";
  meta.textContent = `${game.genre} · ${game.type}`;

  const tagWrap = document.createElement("div");
  tagWrap.className = "game-tags";
  game.tags.forEach((t) => {
    const tag = document.createElement("span");
    tag.className = "game-tag";
    tag.textContent = t;
    tagWrap.appendChild(tag);
  });

  info.appendChild(title);
  info.appendChild(meta);
  info.appendChild(tagWrap);

  card.appendChild(cover);
  card.appendChild(info);

  card.onclick = () => openSheet(game.id);

  return card;
}



/************************************************************
 *  FAVORITES
 ************************************************************/

function toggleFavorite(id) {
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  renderGames();
  renderFavorites();
  updateSheetFavIcon();
}



/************************************************************
 *  BOTTOM SHEET
 ************************************************************/

function openSheet(id) {
  const game = games.find((g) => g.id === id);
  if (!game) return;

  currentSheetId = id;

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

  updateSheetFavIcon();
  gameSheet.classList.add("open");
}

function closeSheet() {
  gameSheet.classList.remove("open");
}

function updateSheetFavIcon() {
  const icon = sheetFavBtn.querySelector(".icon-heart");
  icon.classList.toggle("favorited", favorites.has(currentSheetId));
}



/************************************************************
 *  EVENT LISTENERS
 ************************************************************/

// Tabs
tabButtons.forEach((btn) =>
  btn.addEventListener("click", () => {
    const id = btn.dataset.tab;
    tabPanels.forEach((p) =>
      p.classList.toggle("active", p.id === `tab-${id}`)
    );
    tabButtons.forEach((b) =>
      b.classList.toggle("active", b.dataset.tab === id)
    );
  })
);

// Platform filter
chips.forEach((chip) =>
  chip.addEventListener("click", () => {
    chips.forEach((c) => c.classList.remove("chip-active"));
    chip.classList.add("chip-active");

    currentPlatform = chip.dataset.platform;
    renderGames();
  })
);

// Search
searchInput.addEventListener("input", (e) => {
  currentSearch = e.target.value.toLowerCase().trim();
  renderGames();
});

// Sheet close
gameSheetBackdrop.onclick = closeSheet;
sheetFavBtn.onclick = () => toggleFavorite(currentSheetId);
addToCollectionBtn.onclick = () => dalert("Добавление в коллекции появится позже");
shareGameBtn.onclick = () => dalert("Функция 'Поделиться' будет позже");



/************************************************************
 *  INIT
 ************************************************************/

renderGames();
renderFavorites();
dlog("App initialized");
