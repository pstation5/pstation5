const tg = Telegram.WebApp;
tg.expand();

const ADMIN_ID = 123456789; // <-- ВСТАВЬ СВОЙ ID
const user = tg.initDataUnsafe.user;
const isAdmin = user?.id === ADMIN_ID;

document.querySelectorAll('.admin-only').forEach(el => {
  if (isAdmin) el.style.display = 'block';
});

const cloud = tg.CloudStorage;

const get = key => new Promise(r =>
  cloud.getItem(key, (_, v) => r(v ? JSON.parse(v) : null))
);
const set = (k,v) => cloud.setItem(k, JSON.stringify(v));

let games = [];
let comments = {};
let userData = { collection: [], ratings: {} };
let currentGame = null;

async function init() {
  games = await get('games') || [];
  comments = await get('comments') || {};
  userData = await get(`user_${user.id}`) || userData;
  renderGames(games);
}
init();

function renderGames(list) {
  const box = document.getElementById('games');
  box.innerHTML = '';
  list.forEach(g => {
    const d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = `<img src="${g.cover}"><h4>${g.title}</h4>`;
    d.onclick = () => openGame(g);
    box.appendChild(d);
  });
}

function openGame(game) {
  currentGame = game;
  gameModal.style.display = 'block';
  gameTitle.textContent = game.title;
  gameCover.src = game.cover;
  gameDesc.textContent = game.desc;
  renderComments();
}

function renderComments() {
  const box = document.getElementById('comments');
  box.innerHTML = '';
  (comments[currentGame.id] || []).forEach((c,i) => {
    const d = document.createElement('div');
    d.className = 'comment';
    d.innerHTML = `
      ${c.text}
      <small>${c.author}</small>
      <button onclick="likeComment(${i})">👍 ${c.likes}</button>
      ${isAdmin ? `<button onclick="deleteComment(${i})">✖</button>` : ''}
    `;
    box.appendChild(d);
  });
}

window.likeComment = i => {
  comments[currentGame.id][i].likes++;
  set('comments', comments);
  renderComments();
};

window.deleteComment = i => {
  comments[currentGame.id].splice(i,1);
  set('comments', comments);
  renderComments();
};

sendComment.onclick = () => {
  const t = commentText.value.trim();
  if (!t) return;
  comments[currentGame.id] ||= [];
  comments[currentGame.id].push({
    text: t,
    author: user.first_name,
    likes: 0
  });
  set('comments', comments);
  commentText.value = '';
  renderComments();
};

rateBtn.onclick = () => {
  const r = Number(ratingInput.value);
  if (r >=1 && r <=10) {
    userData.ratings[currentGame.id] = r;
    set(`user_${user.id}`, userData);
  }
};

collectBtn.onclick = () => {
  if (!userData.collection.includes(currentGame.id)) {
    userData.collection.push(currentGame.id);
    set(`user_${user.id}`, userData);
  }
};

myCollectionBtn.onclick = () => {
  const list = games.filter(g => userData.collection.includes(g.id));
  renderGames(list);
};

addGameBtn.onclick = () => {
  currentGame = null;
  addGameModal.style.display = 'block';
};

saveGame.onclick = () => {
  const g = {
    id: currentGame?.id || Date.now(),
    title: titleInput.value,
    cover: coverInput.value,
    desc: descInput.value
  };
  if (currentGame) {
    games = games.map(x => x.id === g.id ? g : x);
  } else {
    games.push(g);
  }
  set('games', games);
  addGameModal.style.display = 'none';
  renderGames(games);
};

deleteGame.onclick = () => {
  if (!currentGame) return;
  games = games.filter(g => g.id !== currentGame.id);
  set('games', games);
  addGameModal.style.display = 'none';
  renderGames(games);
};

document.querySelectorAll('.close').forEach(b =>
  b.onclick = () => document.querySelectorAll('.modal')
    .forEach(m => m.style.display = 'none')
);
