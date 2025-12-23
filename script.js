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

