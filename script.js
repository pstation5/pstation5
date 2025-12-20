// Константы
const PAGE_SIZE = 10;

// Состояние
let allGames = [];
let upcomingGames = [];
let currentPlatformFilter = "all";
let currentSort = "title-asc";
let currentSearch = "";
let currentPage = 1;

// “Авторизация” через Telegram (заглушка)
let currentTelegramUser = null;

// Элементы
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const gamesGrid = document.getElementById("gamesGrid");
const sortSelect = document.getElementById("sortSelect");
const filterButtons = document.querySelectorAll(".filter-btn");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");
const upcomingSlider = document.getElementById("upcomingSlider");
const upcomingPrev = document.getElementById("upcomingPrev");
const upcomingNext = document.getElementById("upcomingNext");
const telegramLoginBtn = document.getElementById("telegram-login-btn");

const gameModal = document.getElementById("gameModal");
const gameModalBody = document.getElementById("gameModalBody");

const editGameModal = document.getElementById("editGameModal");
const editGameForm = document.getElementById("editGameForm");
const editGameTitle = document.getElementById("editGameTitle");

const editUpcomingModal = document.getElementById("editUpcomingModal");
const editUpcomingForm = document.getElementById("editUpcomingForm");
const editUpcomingTitle = document.getElementById("editUpcomingTitle");

// Поля формы игры
const gameIdInput = document.getElementById("gameId");
const gameTitleInput = document.getElementById("gameTitleInput");
const gamePlatformInput = document.getElementById("gamePlatformInput");
const gameReleaseInput = document.getElementById("gameReleaseInput");
const gameDevInput = document.getElementById("gameDevInput");
const gameGenreInput = document.getElementById("gameGenreInput");
const gameCoverInput = document.getElementById("gameCoverInput");
const gameScreensInput = document.getElementById("gameScreensInput");
const gameDescInput = document.getElementById("gameDescInput");
const gameRatingInput = document.getElementById("gameRatingInput");
const gameStatusInput = document.getElementById("gameStatusInput");
const gameInCollectionInput = document.getElementById("gameInCollectionInput");

// Поля формы ожидаемой игры
const upcomingIdInput = document.getElementById("upcomingId");
const upcomingTitleInput = document.getElementById("upcomingTitleInput");
const upcomingReleaseInput = document.getElementById("upcomingReleaseInput");
const upcomingDevInput = document.getElementById("upcomingDevInput");
const upcomingGenreInput = document.getElementById("upcomingGenreInput");
const upcomingPlatformsInput = document.getElementById("upcomingPlatformsInput");
const upcomingCoverInput = document.getElementById("upcomingCoverInput");

// Кнопки добавления
const addGameBtn = document.getElementById("addGameBtn");
const addUpcomingBtn = document.getElementById("addUpcomingBtn");

// Утилиты
const parseYear = (dateStr) => {
  if (!dateStr) return 0;
  const parts = dateStr.split("-");
  return parseInt(parts[0], 10) || 0;
};

const getStatusLabel = (status) => {
  if (status === "completed") return "Пройдена";
  if (status === "in-progress") return "В процессе";
  return "Не играл";
};

const ratingStars = (rating) => {
  const r = Number(rating) || 0;
  const full = Math.round(r);
  let s = "";
  for (let i = 0; i < 10; i++) {
    s += i < full ? "★" : "☆";
  }
  return s;
};

// Фильтрация и сортировка
const getFilteredSortedGames = () => {
  let list = [...allGames];

  if (currentPlatformFilter !== "all") {
    list = list.filter((g) => g.platform === currentPlatformFilter);
  }

  if (currentSearch.trim()) {
    const q = currentSearch.toLowerCase();
    list = list.filter((g) =>
      g.title.toLowerCase().includes(q)
    );
  }

  list.sort((a, b) => {
    const [field, dir] = currentSort.split("-");
    if (field === "title") {
      const res = a.title.localeCompare(b.title);
      return dir === "asc" ? res : -res;
    } else if (field === "year") {
      const ya = parseYear(a.releaseDate);
      const yb = parseYear(b.releaseDate);
      const res = ya - yb;
      return dir === "asc" ? res : -res;
    }
    return 0;
  });

  return list;
};

// Пагинация
const getPagedGames = () => {
  const list = getFilteredSortedGames();
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const slice = list.slice(start, start + PAGE_SIZE);

  return { list: slice, totalPages, totalItems: list.length };
};

// Рендер карточек игр
const renderGames = () => {
  const { list, totalPages, totalItems } = getPagedGames();
  gamesGrid.innerHTML = "";

  if (totalItems === 0) {
    gamesGrid.innerHTML =
      '<p style="color:#9b9bb0;font-size:14px;">Ничего не найдено. Попробуй изменить фильтры или запрос.</p>';
  } else {
    list.forEach((game) => {
      const card = document.createElement("article");
      card.className = "game-card";
      card.dataset.id = game.id;

      const coverDiv = document.createElement("div");
      coverDiv.className = "game-card-cover";
      coverDiv.style.backgroundImage = `url('${game.cover || ""}')`;

      const platformBadge = document.createElement("span");
      platformBadge.className = "game-card-platform-badge";
      platformBadge.textContent = game.platform.toUpperCase();

      coverDiv.appendChild(platformBadge);

      const bodyDiv = document.createElement("div");
      bodyDiv.className = "game-card-body";

      const titleEl = document.createElement("h3");
      titleEl.className = "game-card-title";
      titleEl.textContent = game.title;

      const metaEl = document.createElement("div");
      metaEl.className = "game-card-meta";
      const year = parseYear(game.releaseDate);
      metaEl.textContent = `${year || "Дата неизвестна"} • ${game.genre || "Жанр не указан"}`;

      const statusEl = document.createElement("div");
      statusEl.className = `game-card-status ${game.status || "planned"}`;
      statusEl.textContent = getStatusLabel(game.status);

      const footer = document.createElement("div");
      footer.className = "game-card-footer";

      const ratingEl = document.createElement("div");
      ratingEl.className = "rating-stars";
      ratingEl.textContent = ratingStars(game.rating);

      const collectionEl = document.createElement("div");
      collectionEl.className = "collection-tag";
      collectionEl.textContent = game.inCollection ? "В коллекции" : "";

      footer.appendChild(ratingEl);
      footer.appendChild(collectionEl);

      bodyDiv.appendChild(titleEl);
      bodyDiv.appendChild(metaEl);
      bodyDiv.appendChild(statusEl);
      bodyDiv.appendChild(footer);

      card.appendChild(coverDiv);
      card.appendChild(bodyDiv);

      card.addEventListener("click", () => openGameModal(game.id));

      gamesGrid.appendChild(card);
    });
  }

  pageInfo.textContent = `Страница ${currentPage} / ${totalPages}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages;
};

// Рендер ожидаемых игр (слайдер)
const renderUpcoming = () => {
  upcomingSlider.innerHTML = "";
  if (!upcomingGames.length) {
    upcomingSlider.innerHTML =
      '<p style="color:#9b9bb0;font-size:14px;">Нет ожидаемых игр. Добавь первую с помощью кнопки выше.</p>';
    return;
  }

  upcomingGames.forEach((g) => {
    const card = document.createElement("article");
    card.className = "slider-card";
    card.dataset.id = g.id;

    const cover = document.createElement("div");
    cover.className = "slider-card-cover";
    cover.style.backgroundImage = `url('${g.cover || ""}')`;

    const body = document.createElement("div");
    body.className = "slider-card-body";

    const title = document.createElement("h3");
    title.className = "slider-card-title";
    title.textContent = g.title;

    const meta = document.createElement("div");
    meta.className = "slider-card-meta";
    const date = g.releaseDate || "Дата неизвестна";
    const dev = g.developer || "Разработчик неизвестен";
    meta.innerHTML = `<span class="slider-card-date">${date}</span> • ${dev}`;

    body.appendChild(title);
    body.appendChild(meta);

    card.appendChild(cover);
    card.appendChild(body);

    card.addEventListener("click", () => openUpcomingAsGameModal(g.id));
    upcomingSlider.appendChild(card);
  });
};

// Открытие модалки с игрой
const openGameModal = (id) => {
  const game = allGames.find((g) => g.id === id);
  if (!game) return;

  gameModalBody.innerHTML = "";

  const header = document.createElement("div");
  header.className = "game-modal-header";

  const cover = document.createElement("div");
  cover.className = "game-modal-cover";
  cover.style.backgroundImage = `url('${game.cover || ""}')`;

  const info = document.createElement("div");
  info.className = "game-modal-info";

  const title = document.createElement("h3");
  title.textContent = game.title;

  const meta = document.createElement("div");
  meta.className = "game-modal-meta";
  const year = parseYear(game.releaseDate);
  const dev = game.developer || "Разработчик неизвестен";
  const genre = game.genre || "Жанр не указан";
  meta.innerHTML = `
    <div>${game.platform.toUpperCase()} • ${year || "Дата неизвестна"}</div>
    <div>${dev}</div>
    <div>${genre}</div>
    <div>Статус: ${getStatusLabel(game.status)}</div>
    <div>Рейтинг: ${game.rating || 0} / 10</div>
  `;

  const actions = document.createElement("div");
  actions.className = "game-modal-actions";

  const toggleCollectionBtn = document.createElement("button");
  toggleCollectionBtn.className = "btn btn-ghost";
  toggleCollectionBtn.textContent = game.inCollection
    ? "Убрать из коллекции"
    : "Добавить в коллекцию";
  toggleCollectionBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    game.inCollection = !game.inCollection;
    saveToLocalStorage();
    renderGames();
    openGameModal(game.id);
  });

  const statusBtn = document.createElement("button");
  statusBtn.className = "btn btn-ghost";
  statusBtn.textContent = "Сменить статус";
  statusBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const next =
      game.status === "planned"
        ? "in-progress"
        : game.status === "in-progress"
        ? "completed"
        : "planned";
    game.status = next;
    saveToLocalStorage();
    renderGames();
    openGameModal(game.id);
  });

  const editBtn = document.createElement("button");
  editBtn.className = "btn btn-blood";
  editBtn.textContent = "Редактировать";
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openEditGameModal(game);
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-ghost";
  deleteBtn.textContent = "Удалить";
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (confirm("Удалить игру из списка?")) {
      allGames = allGames.filter((g) => g.id !== game.id);
      saveToLocalStorage();
      renderGames();
      closeModal("gameModal");
    }
  });

  const shareBtn = document.createElement("button");
  shareBtn.className = "btn btn-ghost";
  shareBtn.textContent = "Поделиться";
  shareBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const text = `Смотри игру: ${game.title} (${game.platform.toUpperCase()})`;
    const url = window.location.href;
    if (navigator.share) {
      navigator
        .share({ title: game.title, text, url })
        .catch(() => {});
    } else {
      prompt("Скопируй ссылку:", url);
    }
  });

  actions.appendChild(toggleCollectionBtn);
  actions.appendChild(statusBtn);
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  actions.appendChild(shareBtn);

  info.appendChild(title);
  info.appendChild(meta);
  info.appendChild(actions);

  header.appendChild(cover);
  header.appendChild(info);

  const desc = document.createElement("div");
  desc.className = "game-modal-description";
  desc.textContent =
    game.description || "Описание игры пока не добавлено.";

  const screenshotsWrapper = document.createElement("div");
  screenshotsWrapper.className = "game-modal-screenshots";

  (game.screenshots || []).forEach((src) => {
    const s = document.createElement("div");
    s.className = "game-modal-screenshot";
    s.style.backgroundImage = `url('${src}')`;
    screenshotsWrapper.appendChild(s);
  });

  gameModalBody.appendChild(header);
  gameModalBody.appendChild(desc);
  if ((game.screenshots || []).length > 0) {
    gameModalBody.appendChild(screenshotsWrapper);
  }

  openModal("gameModal");
};

// Открытие ожидаемой игры как модалки
const openUpcomingAsGameModal = (id) => {
  const g = upcomingGames.find((x) => x.id === id);
  if (!g) return;

  // Создаём временный объект в формате обычной игры
  const tmpGame = {
    id: g.id,
    title: g.title,
    platform: (g.platforms && g.platforms[0]) || "ps4",
    releaseDate: g.releaseDate,
    developer: g.developer,
    genre: g.genre,
    cover: g.cover,
    screenshots: g.screenshots || [],
    description: `Ожидаемая игра. Дата выхода: ${g.releaseDate || "неизвестна"}.`,
    rating: g.rating || 0,
    status: g.status || "planned",
    inCollection: false
  };

  openGameModalForTemp(tmpGame);
};

const openGameModalForTemp = (game) => {
  // Почти как openGameModal, но без CRUD
  gameModalBody.innerHTML = "";

  const header = document.createElement("div");
  header.className = "game-modal-header";

  const cover = document.createElement("div");
  cover.className = "game-modal-cover";
  cover.style.backgroundImage = `url('${game.cover || ""}')`;

  const info = document.createElement("div");
  info.className = "game-modal-info";

  const title = document.createElement("h3");
  title.textContent = game.title;

  const meta = document.createElement("div");
  meta.className = "game-modal-meta";
  const year = parseYear(game.releaseDate);
  const dev = game.developer || "Разработчик неизвестен";
  const genre = game.genre || "Жанр не указан";
  meta.innerHTML = `
    <div>${game.platform.toUpperCase()} • ${year || "Дата неизвестна"}</div>
    <div>${dev}</div>
    <div>${genre}</div>
    <div>Статус: ${getStatusLabel(game.status)}</div>
    <div>Рейтинг: ${game.rating || 0} / 10</div>
  `;

  const actions = document.createElement("div");
  actions.className = "game-modal-actions";

  const shareBtn = document.createElement("button");
  shareBtn.className = "btn btn-ghost";
  shareBtn.textContent = "Поделиться";
  shareBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const text = `Скоро выходит: ${game.title}`;
    const url = window.location.href;
    if (navigator.share) {
      navigator
        .share({ title: game.title, text, url })
        .catch(() => {});
    } else {
      prompt("Скопируй ссылку:", url);
    }
  });

  actions.appendChild(shareBtn);

  info.appendChild(title);
  info.appendChild(meta);
  info.appendChild(actions);

  header.appendChild(cover);
  header.appendChild(info);

  gameModalBody.appendChild(header);

  openModal("gameModal");
};

// Открытие/закрытие модалок
const openModal = (id) => {
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
};

const closeModal = (id) => {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
};

document.querySelectorAll(".modal-close").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const id = e.currentTarget.dataset.close;
    closeModal(id);
  });
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal("gameModal");
    closeModal("editGameModal");
    closeModal("editUpcomingModal");
  }
});

// Клик по фону модалки
document.querySelectorAll(".modal").forEach((m) => {
  m.addEventListener("click", (e) => {
    if (e.target === m) {
      m.classList.add("hidden");
    }
  });
});

// Открытие формы добавления/редактирования игры
const openEditGameModal = (game = null) => {
  if (game) {
    editGameTitle.textContent = "Редактировать игру";
    gameIdInput.value = game.id;
    gameTitleInput.value = game.title || "";
    gamePlatformInput.value = game.platform || "ps4";
    gameReleaseInput.value = game.releaseDate || "";
    gameDevInput.value = game.developer || "";
    gameGenreInput.value = game.genre || "";
    gameCoverInput.value = game.cover || "";
    gameScreensInput.value = (game.screenshots || []).join(", ");
    gameDescInput.value = game.description || "";
    gameRatingInput.value = game.rating || "";
    gameStatusInput.value = game.status || "planned";
    gameInCollectionInput.checked = !!game.inCollection;
  } else {
    editGameTitle.textContent = "Добавить игру";
    editGameForm.reset();
    gameIdInput.value = "";
  }

  openModal("editGameModal");
};

// Открытие формы ожидаемой игры
const openEditUpcomingModal = (game = null) => {
  if (game) {
    editUpcomingTitle.textContent = "Редактировать ожидаемую игру";
    upcomingIdInput.value = game.id;
    upcomingTitleInput.value = game.title || "";
    upcomingReleaseInput.value = game.releaseDate || "";
    upcomingDevInput.value = game.developer || "";
    upcomingGenreInput.value = game.genre || "";
    upcomingPlatformsInput.value = (game.platforms || []).join(",");
    upcomingCoverInput.value = game.cover || "";
  } else {
    editUpcomingTitle.textContent = "Добавить ожидаемую игру";
    editUpcomingForm.reset();
    upcomingIdInput.value = "";
  }

  openModal("editUpcomingModal");
};

// Сохранение / изменение игры
editGameForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const id = gameIdInput.value || `g-${Date.now()}`;
  const screenshots = gameScreensInput.value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const newGame = {
    id,
    title: gameTitleInput.value.trim(),
    platform: gamePlatformInput.value,
    releaseDate: gameReleaseInput.value || "",
    developer: gameDevInput.value.trim(),
    genre: gameGenreInput.value.trim(),
    cover: gameCoverInput.value.trim(),
    screenshots,
    description: gameDescInput.value.trim(),
    rating: Number(gameRatingInput.value) || 0,
    status: gameStatusInput.value,
    inCollection: gameInCollectionInput.checked
  };

  const idx = allGames.findIndex((g) => g.id === id);
  if (idx >= 0) {
    allGames[idx] = newGame;
  } else {
    allGames.push(newGame);
  }

  saveToLocalStorage();
  renderGames();
  closeModal("editGameModal");
});

// Сохранение / изменение ожидаемой игры
editUpcomingForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const id = upcomingIdInput.value || `upc-${Date.now()}`;
  const platforms = upcomingPlatformsInput.value
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  const newUpcoming = {
    id,
    title: upcomingTitleInput.value.trim(),
    releaseDate: upcomingReleaseInput.value,
    developer: upcomingDevInput.value.trim(),
    genre: upcomingGenreInput.value.trim(),
    platforms: platforms.length ? platforms : ["ps5"],
    cover: upcomingCoverInput.value.trim(),
    screenshots: [],
    rating: 0,
    status: "planned"
  };

  const idx = upcomingGames.findIndex((g) => g.id === id);
  if (idx >= 0) {
    upcomingGames[idx] = newUpcoming;
  } else {
    upcomingGames.push(newUpcoming);
  }

  saveToLocalStorage();
  renderUpcoming();
  closeModal("editUpcomingModal");
});

// Локальное сохранение (как “админ-панель”)
const STORAGE_KEY = "horror_ps_collection";

const saveToLocalStorage = () => {
  const data = {
    games: allGames,
    upcoming: upcomingGames
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const loadFromLocalStorage = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    if (data.games) allGames = data.games;
    if (data.upcoming) upcomingGames = data.upcoming;
    return true;
  } catch {
    return false;
  }
};

// Telegram интеграция (заглушка)
telegramLoginBtn.addEventListener("click", () => {
  // Здесь можно подключить Telegram Login Widget или Mini Apps API.
  // Сейчас просто имитация входа.
  if (!currentTelegramUser) {
    currentTelegramUser = {
      id: "demo-user",
      username: "horror_fan"
    };
    telegramLoginBtn.textContent = "Подключено: @horror_fan";
    alert("Телеграм-профиль (демо) подключён. Реальную интеграцию нужно сделать через Telegram Login Widget.");
  } else {
    alert("Telegram уже подключён (демо).");
  }
});

// Поиск
searchInput.addEventListener("input", (e) => {
  currentSearch = e.target.value;
  currentPage = 1;
  renderGames();
});

clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  currentSearch = "";
  currentPage = 1;
  renderGames();
});

// Фильтр по платформе
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentPlatformFilter = btn.dataset.platform;
    currentPage = 1;
    renderGames();
  });
});

// Сортировка
sortSelect.addEventListener("change", (e) => {
  currentSort = e.target.value;
  currentPage = 1;
  renderGames();
});

// Пагинация
prevPageBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderGames();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

nextPageBtn.addEventListener("click", () => {
  const { totalPages } = getPagedGames();
  if (currentPage < totalPages) {
    currentPage++;
    renderGames();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// Слайдер стрелки
upcomingPrev.addEventListener("click", () => {
  upcomingSlider.scrollBy({ left: -220, behavior: "smooth" });
});
upcomingNext.addEventListener("click", () => {
  upcomingSlider.scrollBy({ left: 220, behavior: "smooth" });
});

// Кнопки добавления
addGameBtn.addEventListener("click", () => openEditGameModal(null));
addUpcomingBtn.addEventListener("click", () => openEditUpcomingModal(null));

// Загрузка данных
const loadData = async () => {
  // Сначала пытаемся взять локальный state (если уже редактировал)
  const hasLocal = loadFromLocalStorage();
  if (hasLocal) {
    renderUpcoming();
    renderGames();
    return;
  }

  try {
    const res = await fetch("games.json");
    const data = await res.json();
    allGames = data.games || [];
    upcomingGames = data.upcoming || [];
  } catch (e) {
    console.error("Ошибка загрузки games.json", e);
    allGames = [];
    upcomingGames = [];
  }

  renderUpcoming();
  renderGames();
};

document.addEventListener("DOMContentLoaded", loadData);
