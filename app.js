/* ===========================
   DEBUG SAFE
=========================== */

const DEBUG = true;
const dalert = (m)=>DEBUG && alert("[DEBUG]\n"+m);
const dlog   = (...a)=>DEBUG && console.log("[DEBUG]", ...a);

/* ===========================
   Telegram Init
=========================== */

const tg = window?.Telegram?.WebApp || null;
if (tg) tg.ready?.();

/* ===========================
   Game Data
=========================== */

const games = [
  {
    id:1,
    title:"The Last of Us Part II",
    platform:"ps4",
    type:"Disk",
    genre:"Action · Adventure",
    tags:["Story","Singleplayer"],
    cover:"https://image.api.playstation.com/vulcan/ap/rnd/202006/0419/QoPg6f7zj0nSMuLyOJ7XdzEJ.png",
    shortDescription:"Мрачная история выживания."
  },
  {
    id:2,
    title:"Spider-Man 2",
    platform:"ps5",
    type:"Disk",
    genre:"Action · Open World",
    tags:["Marvel","NYC"],
    cover:"https://image.api.playstation.com/vulcan/ap/rnd/202308/0216/f8MkO2izW2iSSotoaXSInXZ7.png",
    shortDescription:"Питер Паркер + Майлз в открытом мире."
  }
];

/* ===========================
   DOM
=========================== */

const gamesGrid=document.getElementById("gamesGrid");
const favoritesGrid=document.getElementById("favoritesGrid");
const favoritesEmpty=document.getElementById("favoritesEmpty");

const gameSheet=document.getElementById("gameSheet");
const sheetBody=document.querySelector(".game-sheet-body");
const sheetBackdrop=document.querySelector(".game-sheet-backdrop");
const sheetCover=document.getElementById("sheetCover");
const sheetTitle=document.getElementById("sheetTitle");
const sheetMeta=document.getElementById("sheetMeta");
const sheetDescription=document.getElementById("sheetDescription");
const sheetTags=document.getElementById("sheetTags");
const sheetFav=document.getElementById("sheetFavBtn");

let favorites=new Set();
let currentId=null;

/* ===========================
   Rendering
=========================== */

function createGameCard(g){
  const el=document.createElement("div");
  el.className="game-card";
  el.innerHTML=`
    <div class="game-cover">
      <div class="game-cover-inner" style="background-image:url('${g.cover}')"></div>
      <div class="game-platform-badge">${g.platform.toUpperCase()}</div>
    </div>
    <div class="game-info">
      <div class="game-title">${g.title}</div>
      <div class="game-meta">${g.genre} · ${g.type}</div>
    </div>
  `;
  el.onclick=()=>openSheet(g.id);
  return el;
}

function renderGames(){
  gamesGrid.innerHTML="";
  games.forEach(g=>gamesGrid.appendChild(createGameCard(g)));
}

/* ===========================
   Sheet logic
=========================== */

let startY=0;
let currentY=0;
let sheetHeight=0;
let dragging=false;

const SHEET_FULL = 0;     // 0% offset
const SHEET_MID  = 55;    // 55% down
const SHEET_HIDE = 100;   // hidden

let sheetOffset=SHEET_FULL;

function setSheetOffset(v){
  sheetOffset=v;
  sheetBody.style.setProperty("--sheet-offset", `${v}%`);
}

function openSheet(id){
  const g=games.find(x=>x.id===id);
  currentId=id;

  sheetCover.innerHTML=`<div class="sheet-cover-inner" style="background-image:url('${g.cover}')"></div>`;
  sheetTitle.textContent=g.title;
  sheetMeta.textContent=`${g.platform.toUpperCase()} · ${g.type} · ${g.genre}`;
  sheetDescription.textContent=g.shortDescription;

  sheetTags.innerHTML="";
  g.tags.forEach(t=>{
    const span=document.createElement("span");
    span.className="sheet-tag";
    span.textContent=t;
    sheetTags.appendChild(span);
  });

  setSheetOffset(SHEET_FULL);
  gameSheet.classList.add("open");
}

function closeSheet(){
  gameSheet.classList.remove("open");
  setSheetOffset(SHEET_HIDE);
}

sheetBackdrop.onclick=closeSheet;

/* ===========================
   Touch / Swipe
=========================== */

sheetBody.addEventListener("touchstart",e=>{
  dragging=true;
  startY=e.touches[0].clientY;
}, {passive:true});

sheetBody.addEventListener("touchmove",e=>{
  if(!dragging) return;
  currentY=e.touches[0].clientY - startY;

  // offset depends on drag
  let offset = (currentY / window.innerHeight) * 100;
  offset = Math.min(100, Math.max(0, sheetOffset + offset));

  setSheetOffset(offset);
}, {passive:true});

sheetBody.addEventListener("touchend", ()=>{
  dragging=false;

  if(sheetOffset > 75){ closeSheet(); return; }

  if(sheetOffset > 30){ setSheetOffset(SHEET_MID); return; }

  setSheetOffset(SHEET_FULL);
});

/* ===========================
   Init
=========================== */

renderGames();
dlog("App ready");
