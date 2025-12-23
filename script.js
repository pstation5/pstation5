const tg = window.Telegram.WebApp;

// говорим Telegram, что приложение готово
tg.ready();

// берём пользователя
const user = tg.initDataUnsafe?.user;

console.log("Telegram user:", user);

const statusEl = document.getElementById("status");

if (user) {
  statusEl.textContent = `Привет, ${user.first_name} (id: ${user.id})`;
} else {
  statusEl.textContent = "Пользователь не определён";
}

// Подключаем Worker к Mini App

const API_URL = "https://tg-ps-collections-api.gnomhell1.workers.dev";

async function pingServer() {
  try {
    const res = await fetch(`${API_URL}/ping`);
    const data = await res.json();

    console.log("Ping response:", data);

    const statusEl = document.getElementById("status");
    statusEl.textContent = data.message;
  } catch (e) {
    console.error("Ping error:", e);
  }
}

pingServer();

async function loadMe() {
  const res = await fetch(`${API_URL}/me`, {
    headers: {
      "X-Telegram-Init-Data": tg.initData
    }
  });

  const data = await res.json();
  console.log("Me:", data);

  if (data.is_admin) {
    document.getElementById("admin-panel").style.display = "block";
    document.getElementById("game-admin").style.display = "block";
  } else {
    document.getElementById("status").textContent = "Вы не администратор";
  }
}

loadMe();

// Временно

async function testCreateCollection() {
  const res = await fetch(`${API_URL}/collections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": tg.initData
    },
    body: JSON.stringify({
      title: "Моя первая коллекция PS5",
      description: "Тестовая админ-коллекция"
    })
  });

  const data = await res.json();
  console.log("Create collection:", data);
}

testCreateCollection();

document.getElementById("createBtn").onclick = async () => {
  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();

  if (!title) {
    alert("Введите название");
    return;
  }

  const res = await fetch(`${API_URL}/collections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Telegram-Init-Data": tg.initData
    },
    body: JSON.stringify({ title, description })
  });

  const data = await res.json();
  console.log("Create:", data);

  const msg = document.getElementById("admin-message");

  if (data.ok) {
    msg.textContent = "Коллекция создана ✅";
    document.getElementById("title").value = "";
    document.getElementById("description").value = "";
  } else {
    msg.textContent = "Ошибка: " + data.error;
  }
};

document.addEventListener("DOMContentLoaded", () => {

  document.getElementById("createGameBtn").onclick = async () => {
    const body = {
      title: g("g-title"),
      year: Number(g("g-year")),
      genres: g("g-genres").split(",").map(x => x.trim()),
      developer: g("g-developer"),
      description: g("g-desc"),
      cover_url: g("g-cover"),
      screenshots: g("g-screens").split(",").map(x => x.trim())
    };

    const res = await fetch(`${API_URL}/games`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Init-Data": tg.initData
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    document.getElementById("game-msg").textContent =
      data.ok ? "Игра добавлена 🎮" : "Ошибка";
  };

  function g(id) {
    return document.getElementById(id).value;
  }

});

async function loadGames() {
  const res = await fetch(`${API_URL}/games`);
  const data = await res.json();

  console.log("Games:", data);

  if (!data.ok) {
    console.error("Ошибка загрузки игр");
    return;
  }

  // сохраняем игры глобально для детального экрана
  window._games = data.games;

  const container = document.getElementById("games");
  container.innerHTML = "";

  if (data.games.length === 0) {
    container.textContent = "Игр пока нет";
    return;
  }

  data.games.forEach(game => {
    const card = document.createElement("div");
    card.className = "game-card";
    card.style.cursor = "pointer";

    card.innerHTML = `
      <img src="${game.cover_url}" alt="${game.title}">
      <div class="content">
        <h3>${game.title}</h3>
        <div class="meta">
          ${game.year || ""} · ${(game.genres || []).slice(0, 2).join(", ")}
        </div>
      </div>
    `;

    card.onclick = () => openGame(game.id);

    container.appendChild(card);
  });
}

function openGame(id) {
  const game = window._games.find(g => g.id === id);
  if (!game) return;

window._currentGameId = game.id;

  document.getElementById("games").style.display = "none";

  const view = document.getElementById("game-view");
  view.style.display = "block";

  const screenshotsHtml = (game.screenshots || [])
    .map(s => `<img src="${s}" style="height:140px; border-radius:6px;" />`)
    .join("");

 view.innerHTML = `
  <button onclick="closeGame()">← Назад</button>

  <div style="display:flex; gap:16px;">
    <img src="${game.cover_url}" style="width:160px; border-radius:8px;" />

    <div>
      <h2 style="margin-top:0;">${game.title}</h2>

      <div id="like-block" style="margin:8px 0;">
        <button id="like-btn">🤍</button>
        <span id="like-count">0</span>
      </div>

      <div id="favorite-block" style="margin:8px 0;">
        <button id="fav-btn">☆</button>
      </div>

      <p><b>Год:</b> ${game.year || "-"}</p>
      <p><b>Жанры:</b> ${(game.genres || []).join(", ")}</p>
      <p><b>Разработчик:</b> ${game.developer || "-"}</p>
    </div>
  </div>

  <p style="margin-top:16px;">
    ${game.description || ""}
  </p>

    <h3>Скриншоты</h3>
    <div style="display:flex; gap:8px; overflow-x:auto;">
      ${screenshotsHtml}
    </div>
  `;

  // ❤️ лайки
  loadLikes(game.id);
  document.getElementById("like-btn").onclick = () => {
    toggleLike(game.id);
  };

  // ⭐ избранное
loadFavorite(game.id);

document.getElementById("fav-btn").onclick = () => {
  toggleFavorite(game.id);
};
}, 0);

  
}
async function loadLikes(gameId) {
  const res = await fetch(`${API_URL}/games/${gameId}/likes`, {
    headers: {
      "X-Telegram-Init-Data": tg.initData
    }
  });
  const data = await res.json();

  document.getElementById("like-count").textContent = data.count;
  document.getElementById("like-btn").textContent = data.liked ? "❤️" : "🤍";
}

async function toggleLike(gameId) {
  const res = await fetch(`${API_URL}/games/${gameId}/like`, {
    method: "POST",
    headers: {
      "X-Telegram-Init-Data": tg.initData
    }
  });
  const data = await res.json();

  await loadLikes(gameId);
}


function closeGame() {
  document.getElementById("game-view").style.display = "none";
  document.getElementById("games").style.display = "grid";
}

loadGames();

async function loadFavorite(gameId) {
  const res = await fetch(`${API_URL}/games/${gameId}/favorite`, {
    headers: {
      "X-Telegram-Init-Data": tg.initData
    }
  });
  const data = await res.json();

  document.getElementById("fav-btn").textContent =
    data.favorited ? "⭐" : "☆";
}

async function toggleFavorite(gameId) {
  const res = await fetch(`${API_URL}/games/${gameId}/favorite`, {
    method: "POST",
    headers: {
      "X-Telegram-Init-Data": tg.initData
    }
  });

  const data = await res.json();

  // ✅ ОБНОВЛЯЕМ UI НАПРЯМУЮ
  document.getElementById("fav-btn").textContent =
    data.favorited ? "⭐" : "☆";
}

document.getElementById("game-view").addEventListener("click", (e) => {
  if (e.target && e.target.id === "fav-btn") {
    toggleFavorite(window._currentGameId);
  }
});

async function loadFavorites() {
  const res = await fetch(`${API_URL}/favorites`, {
    headers: {
      "X-Telegram-Init-Data": tg.initData
    }
  });

  const data = await res.json();

  const container = document.getElementById("games");
  container.innerHTML = "";

  if (!data.ok || data.games.length === 0) {
    container.textContent = "У вас пока нет избранных игр ⭐";
    return;
  }

  window._games = data.games;

  data.games.forEach(game => {
    const card = document.createElement("div");
    card.className = "game-card";
    card.style.cursor = "pointer";

    card.innerHTML = `
      <img src="${game.cover_url}" />
      <div class="content">
        <h3>${game.title}</h3>
        <div class="meta">
          ${game.year || ""} · ${(game.genres || []).slice(0, 2).join(", ")}
        </div>
      </div>
    `;

    card.onclick = () => openGame(game.id);
    container.appendChild(card);
  });
}

document.getElementById("show-favorites").onclick = () => {
  document.getElementById("game-view").style.display = "none";
  document.getElementById("games").style.display = "grid";
  loadFavorites();
};

document.getElementById("show-all").onclick = () => {
  document.getElementById("game-view").style.display = "none";
  document.getElementById("games").style.display = "grid";
  loadGames();
};





















