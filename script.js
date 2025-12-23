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



