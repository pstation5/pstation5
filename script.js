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
