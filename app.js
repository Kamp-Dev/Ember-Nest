const COLS = 5, ROWS = 5, MAX_ENERGY = 5;
const SAVE = "ember-nest-save";
const REGEN_MS = 8000;
const PERCH_MS = 20000;
const OPEN_START = 20; // Leaves 5 tiles locked by default on a 25-tile grid
const STAGE_GOAL = 3;
const ASH_GRACE = 0;
const ASH_PER_MERGE = 1;
const ASH_FAIL = 10;   // Lowered slightly to match the smaller board capacity
const ASH_GOAL = 5;    // Lowered from 6 to keep the Ash Trail balanced
const TRAIL_GATHERS = 6;
const DAILY_PAYS = [1200, 800, 400];
const DAILY_CLEARS = 3;
const RENAME_COST = 2000;

const TRAIL_BAG = [2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];

const CHAIN = [
  { id: "egg",   name: "Egg",       color: "#6b4a32" },
  { id: "hatch", name: "Hatchling", color: "#8a5a30" },
  { id: "wyrm",  name: "Wyrmling",  color: "#a35a28" },
  { id: "young", name: "Young",     color: "#c45c24" },
  { id: "adult", name: "Hearth",    color: "#e37a3a" },
  { id: "elder", name: "Elder",     color: "#f0a050" },
];

const LORE = [
  "Warm to the touch. Glowing veins pulse under the shell.",
  "Eats sparks. Sleeps in teacups if allowed.",
  "Learns the shape of the cave by gliding along the thermals.",
  "Armored scales harden. First real ember breath.",
  "Guards the hearth kettle. Radiates warmth across the caverns.",
  "The nest remembers this one. So does the ancient mountain.",
];

const ROOMS = [
  { id: "hatchery", name: "Hatchery", need: null, art: "🛖" },
  { id: "alcove", name: "Moss alcove", need: "moss", art: "🌿" },
  { id: "walk", name: "Lamp walk", need: "lamp", art: "🏮" },
  { id: "gallery", name: "Spring hall", need: "pool", art: "♨️" },
  { id: "vault", name: "Tea vault", need: "hoard", art: "🫖" },
];

const DECOR = [
  { id: "moss",  name: "Moss bed",   art: "🌿", cost: 800,   bonus: 1 },
  { id: "lamp",  name: "Ember lamp", art: "🏮", cost: 2500,  bonus: 2 },
  { id: "pool",  name: "Hot spring", art: "♨️", cost: 8000,  bonus: 3 },
  { id: "hoard", name: "Tea hoard",  art: "🫖", cost: 22000, bonus: 5 },
  { id: "roost", name: "Star roost", art: "✨", cost: 50000, bonus: 6 },
];

const QUESTS = [
  { want: 0, text: "A cold stone wants an egg to warm it.", reward: 180 },
  { want: 1, text: "A sleepy hatchling wants a sibling to pile with.", reward: 320 },
  { want: 2, text: "The spring is lonely. Bring a wyrmling.", reward: 520 },
  { want: 3, text: "A young ember wants a perch-mate.", reward: 860 },
  { want: 1, text: "Tuck a hatchling into the moss.", reward: 300 },
];

let audioCtx = null;
function beep(freq, dur, type, vol) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.05, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (dur || 0.12));
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + (dur || 0.12));
  } catch (e) {}
}

function sfx(kind) {
  if (state.muted) return;
  if (kind === "merge") { beep(320, 0.07, "triangle", 0.05); setTimeout(() => beep(480, 0.1, "triangle", 0.06), 50); }
  else if (kind === "ash") beep(140, 0.16, "sawtooth", 0.03);
  else if (kind === "win") { beep(440, 0.12, "sine", 0.06); setTimeout(() => beep(660, 0.18, "sine", 0.06), 90); }
  else if (kind === "fail") beep(110, 0.28, "square", 0.04);
  else if (kind === "gather") beep(260, 0.06, "sine", 0.04);
  else if (kind === "buy") { beep(500, 0.08, "sine", 0.05); setTimeout(() => beep(700, 0.12, "sine", 0.05), 70); }
  else if (kind === "room") { beep(360, 0.1, "triangle", 0.05); setTimeout(() => beep(540, 0.16, "triangle", 0.05), 80); }
  else if (kind === "shiny") { beep(600, 0.1, "sine", 0.08); setTimeout(() => beep(900, 0.2, "triangle", 0.1), 80); }
}

function spawnParticles(x, y, count = 8, color = '#ffcf40') {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = 4 + Math.random() * 6;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.background = color;
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 50;
    p.style.setProperty('--dx', (Math.cos(angle) * dist) + 'px');
    p.style.setProperty('--dy', (-20 - Math.sin(angle) * dist) + 'px');
    
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

function xpNeed(lv) { return 30 + lv * 20; }
const levelQueue = [];
let levelShowing = false;
let currentBookTab = 0; // 0 = Main, 1 = Rare

function addXp(n) {
  if (!n) return;
  state.xp = (state.xp || 0) + n;
  state.level = state.level || 1;
  while (state.xp >= xpNeed(state.level)) {
    state.xp -= xpNeed(state.level);
    state.level += 1;
    const u = applyLevelUnlock(state.level);
    levelQueue.push({
      level: state.level,
      unlock: u,
      chest: state.level % 5 === 0,
    });
  }
  if (!levelShowing) showLevelEvent();
}

function showLevelEvent() {
  const ev = levelQueue.shift();
  if (!ev) { levelShowing = false; return; }
  levelShowing = true;
  const t = document.getElementById("chestTitle");
  const s = document.getElementById("chestSub");
  const box = document.getElementById("chestBox");
  const loot = document.getElementById("chestLoot");
  const ok = document.getElementById("chestOk");
  if (t) t.textContent = "Level " + ev.level;
  if (s) s.textContent = ev.unlock || "You climbed the mountain.";
  if (loot) { loot.style.display = "none"; loot.innerHTML = ""; }
  if (box) {
    box.style.display = ev.chest ? "block" : "none";
    box.textContent = "🎁";
    box.dataset.level = ev.chest ? String(ev.level) : "";
    box.disabled = false;
  }
  if (ok) ok.textContent = "Continue";
  document.getElementById("chest").classList.add("open");
  sfx("room");
}

function revealChest() {
  const box = document.getElementById("chestBox");
  const lv = box && box.dataset.level ? +box.dataset.level : 0;
  if (!lv) return;
  const tier = Math.max(1, Math.floor(lv / 5));
  const coins = 3000 * tier;
  const eggs = Math.min(8, 2 + tier * 2);
  state.coins += coins;
  const lines = ["🪙 " + coins + " ember coins", eggs + " eggs ➔ nest"];
  for (let i = 0; i < eggs; i++) spawn(0, 1);
  if (tier >= 2) { spawn(1, 1); spawn(1, 1); lines.push("2 hatchlings ➔ nest"); }
  if (tier >= 3) { spawn(2, 1); lines.push("1 wyrmling ➔ nest"); }
  if (tier >= 5) { spawn(3, 1); lines.push("1 Young ➔ nest"); }
  const loot = document.getElementById("chestLoot");
  if (loot) {
    loot.style.display = "block";
    loot.innerHTML = lines.map(x => "<div style='padding:5px 0'>" + x + "</div>").join("");
  }
  if (box) { box.textContent = "✨"; box.disabled = true; }
  const ok = document.getElementById("chestOk");
  if (ok) ok.textContent = "Take";
  sfx("win");
  save(); render();
}

function applyLevelUnlock(lv) {
  if (lv === 2) { state.pouchBonus = (state.pouchBonus || 0) + 3; return "trail pouch +3"; }
  if (lv === 3) return "Hearth wish unlocked";
  if (lv === 4) { openFogFree(3); return "3 land opened"; }
  if (lv === 6) { state.maxEnergy = Math.max(state.maxEnergy || 5, 6); return "max energy 6"; }
  if (lv === 8) { state.pouchBonus = (state.pouchBonus || 0) + 3; return "trail pouch +3"; }
  return "climbed the mountain";
}

function completeHearthGoal() {
  if (state.hearthDone) return;
  state.hearthDone = true;
  state.maxEnergy = Math.max(state.maxEnergy || 5, 6);
  state.coins += 5000;
  sfx("win");
  toast("Hearth hatched! The mountain warms • +5000 🪙 • max energy 6");
}

function roomsOpen() {
  return ROOMS.filter(r => !r.need || state.decor[r.need]).length;
}

function perchOpen(i) {
  if (i === 0) return true;
  if (i === 1) return roomsOpen() >= 2;
  if (i === 2) return !!(state.hearthDone || roomsOpen() >= 5);
  return false;
}

function applyTheme(id) {
  state.theme = id || "hatchery";
  const app = document.getElementById("app");
  if (app) app.setAttribute("data-theme", state.theme === "hatchery" ? "" : state.theme);
}

let perchArmed = -1;
function perchIncome() {
  const curve = [5, 15, 30, 60, 120, 240];
  return (state.perch || []).reduce((s, p) => {
    if (!p) return s;
    const base = curve[p.level];
    const mult = p.shiny ? 2.5 : 1;
    return s + Math.floor(base * mult);
  }, 0);
}

function tributeCost() {
  return 25000 + ((state.tributes || 0) * 25000);
}

function showGuide() {
  document.getElementById("guide").classList.add("open");
}

function seatPerch(slot, boardI) {
  if (!perchOpen(slot) || state.mode === "stage") return;
  const cells = board();
  const draggedItem = cells[boardI];
  if (!draggedItem) return;
  
  const existingPerch = state.perch[slot];
  
  if (draggedItem.count > 1) {
    if (existingPerch) {
      toast("Perch must be empty to split stack.");
      return;
    } else {
      state.perch[slot] = { level: draggedItem.level, count: 1, shiny: draggedItem.shiny };
      draggedItem.count -= 1;
    }
  } else {
    state.perch[slot] = { level: draggedItem.level, count: 1, shiny: draggedItem.shiny };
    cells[boardI] = existingPerch ? { level: existingPerch.level, count: 1, shiny: existingPerch.shiny } : null;
  }

  perchArmed = -1;
  sfx("buy");
  save(); render();
}

function emptyPerch(slot) {
  const p = state.perch[slot];
  if (!p) return;
  if (!spawn(p.level, p.count, null, p.shiny)) { toast("Board full"); return; }
  state.perch[slot] = null;
  perchArmed = -1;
  save(); render();
}

function openFogFree(n) {
  let left = n;
  for (let i = 0; i < state.locked.length && left > 0; i++) {
    if (state.locked[i]) { state.locked[i] = false; left--; }
  }
}

function oneSprite(level, hi, lo) {
  if (level === 0) {
    // Ceramic Lotus Egg using custom image asset (works perfectly with stackLayout)
    return `
      <g style="animation: breathe 2s infinite ease-in-out; transform-origin: 16px 16px;">
        <image href="egg-art.png" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="-webkit-user-drag: none; user-select: none; pointer-events: none;" />
      </g>
    `;
  }
  // Levels 1-4 are handled natively in dragonSvg with multi-stage image arrays, so this is just the fallback for Elder (Tier 5)
  return `
    <g style="animation: float 4s infinite ease-in-out; transform-origin: 16px 16px;">
      <g style="animation: pulse 3s infinite ease-in-out; transform-origin: 16px 16px;">
        <circle cx="16" cy="16" r="15" fill="none" stroke="#ffe08a44" stroke-width="2" stroke-dasharray="3 3"/>
      </g>
      <g style="animation: flap-l-slow 2s infinite alternate ease-in-out; transform-origin: 15px 15px;">
        <path d="M1 23 C-5 4 13 2 15 15 L6 25 Z" fill="${lo}" stroke="#1a0f08" stroke-width="1.7"/>
      </g>
      <g style="animation: flap-r-slow 2s infinite alternate ease-in-out; transform-origin: 17px 15px;">
        <path d="M31 23 C37 4 19 2 17 15 L26 25 Z" fill="${lo}" stroke="#1a0f08" stroke-width="1.7"/>
      </g>
      <g style="animation: breathe 2.5s infinite ease-in-out; transform-origin: 16px 21px;">
        <ellipse cx="16" cy="21" rx="8.5" ry="8" fill="${hi}" stroke="#1a0f08" stroke-width="1.8"/>
        <path d="M12 17 Q16 21 20 17 Q16 28 12 17" fill="#ffe08a" stroke="#1a0f08" stroke-width="1.2"/>
        <circle cx="16" cy="11" r="8" fill="${hi}" stroke="#1a0f08" stroke-width="1.8"/>
        <ellipse cx="12.2" cy="11" rx="2.5" ry="2.7" fill="#1a0f08"/>
        <ellipse cx="19.8" cy="11" rx="2.5" ry="2.7" fill="#1a0f08"/>
        <circle cx="12.2" cy="11" r="1.4" fill="#ff4d00"/>
        <circle cx="19.8" cy="11" r="1.4" fill="#ff4d00"/>
      </g>
    </g>
  `;
}

function stackLayout(n) {
  if (n <= 1) return [[16, 16, 1]];
  if (n === 2) return [[10, 16, 0.72], [22, 16, 0.72]];
  if (n === 3) return [[16, 10, 0.62], [9, 20, 0.62], [23, 20, 0.62]];
  return [[10, 10, 0.55], [22, 10, 0.55], [10, 22, 0.55], [22, 22, 0.55]];
}

function dragonSvg(level, size = 42, count = 1, shiny = false) {
  const pal = [
    ["#d99b66", "#8a4f28"],
    ["#ffb554", "#d45817"],
    ["#ff8a36", "#a82e05"],
    ["#ff6a20", "#b32000"],
    ["#ff8a47", "#d9381e"],
    ["#ffc83b", "#e04e1b"],
  ][level] || ["#ffb554", "#d45817"];
  
  const hi = shiny ? "#ffea75" : pal[0];
  const lo = shiny ? "#e5a100" : pal[1];
  
  const n = Math.max(1, Math.min(4, count || 1));

  if (level === 1) {
    const imgs = ["hatchling-1.png", "hatchling-2.png", "hatchling-3.png", "hatchling-4.png"];
    const currentImg = imgs[n - 1] || imgs[0];
    return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" ${shiny ? 'style="filter: drop-shadow(0 0 4px #ffcf40);"' : ''}>
      <g style="animation: breathe 1.4s infinite ease-in-out; transform-origin: 16px 16px;">
        <image href="${currentImg}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="-webkit-user-drag: none; user-select: none; pointer-events: none;" />
      </g>
    </svg>`;
  }

  if (level === 2) {
    const imgs = ["wyrmling-1.png", "wyrmling-2.png", "wyrmling-3.png", "wyrmling-4.png"];
    const currentImg = imgs[n - 1] || imgs[0];
    return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" ${shiny ? 'style="filter: drop-shadow(0 0 4px #ffcf40);"' : ''}>
      <g style="animation: breathe 1.5s infinite ease-in-out; transform-origin: 16px 16px;">
        <image href="${currentImg}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="-webkit-user-drag: none; user-select: none; pointer-events: none;" />
      </g>
    </svg>`;
  }

  if (level === 3) {
    const imgs = ["young-1.png", "young-2.png", "young-3.png", "young-4.png"];
    const currentImg = imgs[n - 1] || imgs[0];
    return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" ${shiny ? 'style="filter: drop-shadow(0 0 4px #ffcf40);"' : ''}>
      <g style="animation: breathe 1.6s infinite ease-in-out; transform-origin: 16px 16px;">
        <image href="${currentImg}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="-webkit-user-drag: none; user-select: none; pointer-events: none;" />
      </g>
    </svg>`;
  }

  if (level === 4) {
    const imgs = ["hearth-1.png", "hearth-2.png", "hearth-3.png", "hearth-4.png"];
    const currentImg = imgs[n - 1] || imgs[0];
    return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" ${shiny ? 'style="filter: drop-shadow(0 0 4px #ffcf40);"' : ''}>
      <g style="animation: breathe 2s infinite ease-in-out; transform-origin: 16px 16px;">
        <image href="${currentImg}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="-webkit-user-drag: none; user-select: none; pointer-events: none;" />
      </g>
    </svg>`;
  }

  // Special handling for Level 5 Elder 
  if (level === 5) {
    // We only really need elder-1 since they don't merge, but this keeps the logic safe!
    const elderImages = ["elder-1.png", "elder-1.png", "elder-1.png", "elder-1.png"]; 
    const currentImg = elderImages[n - 1] || elderImages[0];
    return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" ${shiny ? 'style="filter: drop-shadow(0 0 4px #ffcf40);"' : ''}>
      <g style="animation: float 4s infinite ease-in-out; transform-origin: 16px 16px;">
        <image href="${currentImg}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="-webkit-user-drag: none; user-select: none; pointer-events: none;" />
      </g>
    </svg>`;
  }

  // Fallback for Egg (Tier 0) using stackLayout, and Elder (Tier 5)
  const body = oneSprite(level, hi, lo);
  const bits = stackLayout(n).map(([x, y, s]) =>
    `<g transform="translate(${x},${y}) scale(${s}) translate(-16,-16)">${body}</g>`
  ).join("");
  
  return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" ${shiny ? 'style="filter: drop-shadow(0 0 4px #ffcf40);"' : ''}>${bits}</svg>`;
}

function ashSvg() {
  return `<svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M4 6 L9 14 L6 18 L12 22 L8 28" fill="none" stroke="#6a3520" stroke-width="1.8"/>
    <path d="M16 3 L14 10 L18 16 L15 24 L20 30" fill="none" stroke="#994726" stroke-width="1.5"/>
    <path d="M26 5 L22 12 L28 17 L24 26" fill="none" stroke="#7a341d" stroke-width="1.8"/>
    <path d="M2 20 L10 18 L16 21 L30 16" fill="none" stroke="#ff4d00" stroke-width="1.2" opacity="0.6"/>
    <circle cx="12" cy="11" r="1.5" fill="#ff6a20"/>
    <circle cx="19" cy="22" r="1" fill="#ff9900"/>
  </svg>`;
}

const defaultState = () => ({
  coins: 20,
  energy: 5,
  cells: Array(COLS * ROWS).fill(null),
  locked: Array.from({ length: COLS * ROWS }, (_, i) => i >= OPEN_START),
  decor: {},
  quest: 0,
  questDone: false,
  nextEnergyAt: Date.now() + REGEN_MS,
  mode: "home",
  stageCells: Array(COLS * ROWS).fill(null),
  ash: Array(COLS * ROWS).fill(false),
  stageMerges: 0,
  trailGathers: 6,
  ashCleared: false,
  ashWins: 0,
  lastAshWinAt: 0,
  ashDayKey: "",
  ashDayWins: 0,
  book: { 0: true },
  rareBook: {},
  gives: 0,
  maxEnergy: 5,
  hearthDone: false,
  eggsBought: 0,
  xp: 0,
  level: 1,
  pouchBonus: 0,
  perch: [null, null, null],
  perchBank: 0,
  theme: "hatchery",
  perchAt: 0,
  seenGuide: false,
  muted: false,
  playerName: "Keeper",
  nameChanges: 0,
  sleepyDone: false,
  sleepyStreak: 0,
  questTab: 0,
  tributes: 0
});

let state = defaultState();

function load() {
  try {
    let raw = localStorage.getItem(SAVE);
    if (!raw) {
      for (let v = 10; v >= 1; v--) {
        raw = localStorage.getItem("ember-nest-v" + v);
        if (raw) break;
      }
    }
    if (!raw) return;
    const s = JSON.parse(raw);
    state = { ...defaultState(), ...s };
    
    if (Array.isArray(state.cells) && state.cells.length !== COLS * ROWS) {
      state.cells = state.cells.length > COLS * ROWS ? state.cells.slice(0, COLS * ROWS) : defaultState().cells;
    }
    if (Array.isArray(state.locked) && state.locked.length !== COLS * ROWS) {
      state.locked = state.locked.length > COLS * ROWS ? state.locked.slice(0, COLS * ROWS) : defaultState().locked;
    }
    if (Array.isArray(state.stageCells) && state.stageCells.length !== COLS * ROWS) {
      state.stageCells = state.stageCells.length > COLS * ROWS ? state.stageCells.slice(0, COLS * ROWS) : defaultState().stageCells;
    }
    if (Array.isArray(state.ash) && state.ash.length !== COLS * ROWS) {
      state.ash = state.ash.length > COLS * ROWS ? state.ash.slice(0, COLS * ROWS) : defaultState().ash;
    }
    
    state.mode = "home";
    state.ash = Array(COLS * ROWS).fill(false);
    state.stageMerges = 0;
  } catch (e) {}
}

function save() {
  localStorage.setItem(SAVE, JSON.stringify(state));
}

const boardEl = document.getElementById("board");
const nestEl = document.getElementById("nest");
const toastEl = document.getElementById("toast");
const gatherBtn = document.getElementById("gather");

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 2500);
}

function bonus() {
  return 1 + (state.tributes || 0) + Object.keys(state.decor).reduce((s, id) => {
    const d = DECOR.find(x => x.id === id);
    return s + (d ? d.bonus : 0);
  }, 0);
}

function board() {
  return state.mode === "stage" ? state.stageCells : state.cells;
}

function isLocked(i) {
  return state.mode !== "stage" && !!state.locked[i];
}

function isAsh(i) {
  return state.mode === "stage" && !!(state.ash && state.ash[i]);
}

function ashCount() {
  return (state.ash || []).filter(Boolean).length;
}

function emptyOpen() {
  const cells = board();
  return cells.map((v, i) => (!v && !isLocked(i) && !isAsh(i) ? i : -1)).filter(i => i >= 0);
}

function dismissPay(level, shiny = false) {
  return (15 + level * 30) * (shiny ? 3 : 1);
}

function freePerchSlot() {
  for (let i = 0; i < 3; i++) {
    if (perchOpen(i) && !(state.perch || [])[i]) return i;
  }
  return -1;
}

function showOverflow() {
  if (state.mode === "stage") return;
  const el = document.getElementById("overflow");
  const p = document.getElementById("overWhy");
  const slot = freePerchSlot();
  if (p) p.textContent = slot >= 0
    ? "Seat one on a perch, or dismiss one for a few coins (no bonus)."
    : "No free perch. Dismiss one dragon for a few coins (no bonus).";
  document.getElementById("overPerch").disabled = slot < 0;
  if (el) el.classList.add("open");
}

let overflowArm = null;

function spawn(level, count = 1, at, forceShiny = false) {
  const cells = board();
  const free = emptyOpen();
  if (!free.length) {
    if (state.mode !== "stage") showOverflow();
    else toast("Board full • merge what you have");
    return false;
  }
  const i = at != null && !cells[at] && !isLocked(at) ? at : free[Math.floor(Math.random() * free.length)];
  
  const shiny = forceShiny || (Math.random() < 0.05);
  if (shiny) discoverRare(level);

  cells[i] = { level, count, shiny };
  return true;
}

function findLevel(level) {
  return state.cells.findIndex(c => c && c.level === level);
}

function consumeOne(level) {
  const i = findLevel(level);
  if (i < 0) return false;
  const it = state.cells[i];
  if (it.count > 1) it.count -= 1;
  else state.cells[i] = null;
  return true;
}

function mergeInto(fromI, toI) {
  const cells = board();
  const a = cells[fromI];
  const b = cells[toI];
  if (!a || !b || fromI === toI) return false;
  if (a.level !== b.level) return false;
  if (a.level >= CHAIN.length - 1) { toast("Elders keep watch • no further merge"); return false; }
  
  const isShiny = a.shiny || b.shiny || (Math.random() < 0.08);

  let total = a.count + b.count;
  cells[fromI] = null;
  let produced = 0;
  while (total >= 5) {
    total -= 5;
    produced += 1;
  }
  if (produced) {
    const next = a.level + 1;
    const payout = state.mode === "stage" ? 0 : (80 + next * 45) * bonus() * (isShiny ? 2 : 1);
    if (payout) state.coins += payout;
    if (state.mode !== "stage" && next === 4) completeHearthGoal();
    if (state.mode !== "stage") addXp(15 + next * 10);
    sfx(isShiny ? "shiny" : "merge");
    
    const cellEl = boardEl.children[toI];
    if (cellEl) {
      const rect = cellEl.getBoundingClientRect();
      spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, isShiny ? 20 : 12, isShiny ? '#ffea75' : '#ffcf40');
    }

    if (isShiny) discoverRare(next);

    toast(payout
      ? `${isShiny ? '✨ Shiny ' : ''}${CHAIN[next].name} hatched! +${payout} 🪙`
      : `${CHAIN[next].name} hatched!`);
    discover(next);
    let landed = toI;
    if (total > 0) {
      cells[toI] = { level: a.level, count: total, shiny: a.shiny };
      const free = emptyOpen();
      if (free.length) {
        landed = free[0];
        cells[landed] = { level: next, count: produced, shiny: isShiny };
      } else {
        cells[toI] = { level: next, count: produced, shiny: isShiny };
      }
    } else {
      cells[toI] = { level: next, count: produced, shiny: isShiny };
    }
    if (state.mode === "stage") {
      applyWarmth(landed, next);
      if (state._flash && state._flash.length) sfx("ash");
      state.stageMerges = (state.stageMerges || 0) + 1;
      if ((state.ashBurned || 0) >= ASH_GOAL) {
        state.trailWon = true;
        setTimeout(winStage, 400);
        return true;
      }
      if (state.stageMerges > ASH_GRACE) {
        const ok = spawnAsh(ASH_PER_MERGE);
        if (!ok || ashCount() >= ASH_FAIL) {
          setTimeout(failStage, 250);
        }
      }
    }
  } else {
    cells[toI] = { level: a.level, count: total, shiny: a.shiny };
  }
  return true;
}

function clearAshAt(i) {
  if (!state.ash || !state.ash[i]) return false;
  state.ash[i] = false;
  state.ashBurned = (state.ashBurned || 0) + 1;
  return true;
}

function applyWarmth(landed, nextLevel) {
  if (nextLevel < 1) return;
  const flashes = [];
  const col = landed % COLS;
  const row = Math.floor(landed / COLS);

  const burnNear = () => {
    neighbors(landed).forEach(i => {
      if (clearAshAt(i)) flashes.push(i);
    });
  };

  const burnFourDirections = () => {
    const targets = [];
    if (row > 0) targets.push((row - 1) * COLS + col);
    if (row < ROWS - 1) targets.push((row + 1) * COLS + col);
    if (col > 0) targets.push(row * COLS + (col - 1));
    if (col < COLS - 1) targets.push(row * COLS + (col + 1));
    
    targets.forEach(i => {
      if (clearAshAt(i)) flashes.push(i);
    });
  };

  const burnRow = () => {
    for (let c = 0; c < COLS; c++) {
      const i = row * COLS + c;
      if (clearAshAt(i)) flashes.push(i);
    }
  };

  const burnCol = () => {
    for (let r = 0; r < ROWS; r++) {
      const i = r * COLS + col;
      if (clearAshAt(i)) flashes.push(i);
    }
  };

  if (nextLevel >= 5) { burnRow(); burnCol(); }
  else if (nextLevel >= 3) burnRow();
  else if (nextLevel === 2) burnFourDirections();
  else burnNear();

  state._flash = flashes;
}

function neighbors(i) {
  const c = i % COLS, r = Math.floor(i / COLS);
  const out = [];
  if (c > 0) out.push(i - 1);
  if (c < COLS - 1) out.push(i + 1);
  if (r > 0) out.push(i - COLS);
  if (r < ROWS - 1) out.push(i + COLS);
  return out;
}

function generateTrail() {
  state.stageCells = Array(COLS * ROWS).fill(null);
  state.ash = Array(COLS * ROWS).fill(false);
  state.stageMerges = 0;
  state.trailGathers = TRAIL_GATHERS + (state.pouchBonus || 0);
  state.ashBurned = 0;
  state.trailWon = false;
  state._flash = [];

  let bagIndex = 0;
  for (let i = 0; i < COLS * ROWS && bagIndex < TRAIL_BAG.length; i++) {
    if (i % 7 !== 0) { 
      const isShiny = Math.random() < 0.05;
      state.stageCells[i] = { level: TRAIL_BAG[bagIndex], count: 1, shiny: isShiny };
      if (isShiny) discoverRare(TRAIL_BAG[bagIndex]);
      bagIndex++;
    }
  }

  for (let i = 0; i < COLS * ROWS && bagIndex < TRAIL_BAG.length; i++) {
    if (!state.stageCells[i]) {
      const isShiny = Math.random() < 0.05;
      state.stageCells[i] = { level: TRAIL_BAG[bagIndex], count: 1, shiny: isShiny };
      if (isShiny) discoverRare(TRAIL_BAG[bagIndex]);
      bagIndex++;
    }
  }

  let ashPlaced = 0;
  while (ashPlaced < ASH_GOAL) {
    const randIdx = Math.floor(Math.random() * (COLS * ROWS));
    if (!state.stageCells[randIdx] && !state.ash[randIdx]) {
      state.ash[randIdx] = true;
      ashPlaced++;
    }
  }
}

function spawnAsh(n) {
  const free = board().map((v, i) => (!v && !state.ash[i] ? i : -1)).filter(i => i >= 0);
  for (let k = 0; k < n; k++) {
    if (!free.length) return false;
    const pickIdx = Math.floor(Math.random() * free.length);
    const spot = free.splice(pickIdx, 1)[0];
    state.ash[spot] = true;
  }
  return true;
}

function resetTrail() {
  state.stageCells = Array(COLS * ROWS).fill(null);
  state.ash = Array(COLS * ROWS).fill(false);
  state.stageMerges = 0;
  state.trailGathers = TRAIL_GATHERS + (state.pouchBonus || 0);
  state.ashBurned = 0;
  state.trailWon = false;
  state._flash = [];
}

function bookKnown() {
  state.book = state.book || { 0: true };
  return Object.keys(state.book).filter(k => state.book[k]).length;
}

function rareBookKnown() {
  state.rareBook = state.rareBook || {};
  return Object.keys(state.rareBook).filter(k => state.rareBook[k]).length;
}

function discover(level) {
  state.book = state.book || { 0: true };
  if (state.book[level]) return;
  state.book[level] = true;
  const pay = 120 + level * 80;
  state.coins += pay;
  toast(`Book unlocked: ${CHAIN[level].name} • +${pay} 🪙`);
}

function discoverRare(level) {
  state.rareBook = state.rareBook || {};
  if (state.rareBook[level]) return;
  state.rareBook[level] = true;
  const pay = 300 + level * 150;
  state.coins += pay;
  sfx("shiny");
  toast(`✨ Rare Shiny Unlocked: ${CHAIN[level].name}! +${pay} 🪙`);
}

function scanBook() {
  [state.cells, state.stageCells].forEach(arr => {
    (arr || []).forEach(it => { 
      if (it) {
        discover(it.level);
        if (it.shiny) discoverRare(it.level);
      } 
    });
  });
}

window.switchBookTab = (tabIndex) => {
  currentBookTab = tabIndex;
  document.getElementById("tabMain").classList.toggle("active", tabIndex === 0);
  document.getElementById("tabRare").classList.toggle("active", tabIndex === 1);
  renderBook();
};

function renderBook() {
  const grid = document.getElementById("bookGrid");
  if (!grid) return;
  
  if (currentBookTab === 0) {
    state.book = state.book || { 0: true };
    grid.innerHTML = CHAIN.map((spec, i) => {
      const known = !!state.book[i];
      return `<div class="card ${known ? "" : "locked"}">
        <div>${known ? dragonSvg(i, 32) : "❓"}</div>
        <div class="nm">${known ? spec.name : "Unknown"}</div>
        <div class="bl">${known ? LORE[i] : "Not yet hatched."}</div>
      </div>`;
    }).join("");
  } else {
    state.rareBook = state.rareBook || {};
    grid.innerHTML = CHAIN.map((spec, i) => {
      const known = !!state.rareBook[i];
      return `<div class="card shiny ${known ? "" : "locked"}">
        <div>${known ? dragonSvg(i, 32, 1, true) : "✨ ❓"}</div>
        <div class="nm" style="color:var(--gold);">${known ? "Shiny " + spec.name : "Unknown Shiny"}</div>
        <div class="bl">${known ? "Perch bonus 2.5x income. " + LORE[i] : "Find a shiny variant."}</div>
      </div>`;
    }).join("");
  }

  const n = document.getElementById("bookCount");
  if (n) n.textContent = currentBookTab === 0 ? bookKnown() : rareBookKnown();
}

function canFiveMerge() {
  const tally = {};
  board().forEach(it => {
    if (!it) return;
    tally[it.level] = (tally[it.level] || 0) + it.count;
  });
  return Object.values(tally).some(n => n >= 5);
}

function showTrailFail(why) {
  const el = document.getElementById("trailFail");
  const p = document.getElementById("failWhy");
  if (p) p.textContent = why;
  if (el) el.classList.add("open");
}

function hideTrailFail() {
  const el = document.getElementById("trailFail");
  if (el) el.classList.remove("open");
}

function checkTrailStuck() {
  if (state.mode !== "stage") return;
  if (state.trailWon || (state.ashBurned || 0) >= ASH_GOAL) return;
  if ((state.trailGathers || 0) > 0) return;
  if (canFiveMerge()) return;
  sfx("fail");
  showTrailFail("The pouch is empty and nothing can 5-merge. The nest is still safe.");
}

function restartTrail() {
  hideTrailFail();
  state.mode = "stage";
  resetTrail();
  generateTrail();
  toast("Ash Trail • burn " + ASH_GOAL + " ash to finish");
  save(); render();
}

function failStage() {
  if (state.mode !== "stage") return;
  if (state.trailWon || (state.ashBurned || 0) >= ASH_GOAL) return;
  sfx("fail");
  showTrailFail("Ash covered the path. The nest is still safe.");
}

function dayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

function rollDaily() {
  const k = dayKey();
  if (state.ashDayKey !== k) {
    state.ashDayKey = k;
    state.ashDayWins = 0;
    state.sleepyDone = false;
  }
}

function msToMidnight() {
  const n = new Date();
  const next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
  return next.getTime() - n.getTime();
}

function midnightLabel() {
  const ms = msToMidnight();
  const h = Math.floor(ms / 3600000);
  const m = Math.ceil((ms % 3600000) / 60000);
  if (h <= 0) return m + "m";
  return h + "h " + (m === 60 ? 0 : m) + "m";
}

function dailyLeft() {
  rollDaily();
  return Math.max(0, DAILY_CLEARS - (state.ashDayWins || 0));
}

function nextPay() {
  rollDaily();
  const i = state.ashDayWins || 0;
  return i < DAILY_PAYS.length ? DAILY_PAYS[i] : 0;
}

function trailWaitLabel() {
  const left = dailyLeft();
  if (left > 0) return "Ash Trail (" + (DAILY_CLEARS - left + 1) + "/" + DAILY_CLEARS + ")";
  return "Trail: " + midnightLabel();
}

function enterStage() {
  if (state.mode === "stage") {
    state.mode = "home";
    resetTrail();
    toast("Returned to the nest");
  } else {
    state.mode = "stage";
    generateTrail();
    toast("Ash Trail • burn " + ASH_GOAL + " ash to finish");
    if (!state.seenGuide) showGuide();
  }
  save(); 
  render();
}

function highestOwned() {
  let high = 0;
  Object.keys(state.book || {}).forEach(k => {
    if (state.book[k]) high = Math.max(high, +k);
  });
  (state.cells || []).forEach(it => {
    if (it) high = Math.max(high, it.level);
  });
  return high;
}

function trailGiftLevel() {
  const high = highestOwned();
  return Math.min(2, Math.max(0, high - 1));
}

function eggPrice() {
  return 250 + (state.eggsBought || 0) * 40;
}

function buyEgg() {
  if (state.mode === "stage") {
    toast("Buy eggs at the nest");
    return;
  }
  const cost = eggPrice();
  if (state.coins < cost) { toast("Need " + cost + " 🪙 for an egg"); return; }
  if (!spawn(0, 1)) return;
  state.coins -= cost;
  state.eggsBought = (state.eggsBought || 0) + 1;
  sfx("buy");
  toast("Egg bought for " + cost + " 🪙");
  save(); render();
}

function hideTrailWin() {
  const el = document.getElementById("trailWin");
  if (el) el.classList.remove("open");
}

function showTrailWin(lines, sub) {
  const box = document.getElementById("winLoot");
  const s = document.getElementById("winSub");
  if (s) s.textContent = sub;
  if (box) box.innerHTML = lines.map(t => `<div>${t}</div>`).join("");
  const el = document.getElementById("trailWin");
  if (el) el.classList.add("open");
}

function winStage() {
  if (state.mode !== "stage") return;
  rollDaily();
  const first = !state.ashCleared;
  const paid = dailyLeft() > 0;
  const pay = nextPay();
  const gift = paid ? trailGiftLevel() : -1;
  state.ashCleared = true;
  state.ashWins = (state.ashWins || 0) + 1;
  if (paid) state.ashDayWins = (state.ashDayWins || 0) + 1;
  state.lastAshWinAt = 0;
  state.mode = "home";
  resetTrail();
  const lines = [];
  if (paid) {
    state.coins += pay;
    spawn(gift, 1);
    if (first) spawn(0, 1);
    lines.push(dragonSvg(gift, 24) + " " + CHAIN[gift].name + " ➔ nest");
    lines.push("🪙 " + pay + " ember coins");
    if (first) lines.push("🥚 Egg ➔ nest (first clear bonus)");
  } else {
    lines.push("No nest gift: daily rewards spent");
    lines.push("Resets at midnight: " + midnightLabel());
  }
  const left = dailyLeft();
  lines.push("Daily clears left: " + left + "/" + DAILY_CLEARS);
  lines.push("Ash burned • trail complete");
  const sub = paid
    ? (left ? "Reward " + (DAILY_CLEARS - left) + " of " + DAILY_CLEARS + " today." : "That was the last paid clear today.")
    : "Come back after midnight for nest gifts.";
  hideTrailFail();
  addXp(40);
  sfx("win");
  showTrailWin(lines, sub);
  save(); render();
}

function buyDecor(id) {
  const d = DECOR.find(x => x.id === id);
  if (!d || state.decor[id]) return;
  if (state.coins < d.cost) { toast("Need more ember coins"); return; }
  state.coins -= d.cost;
  state.decor[id] = true;
  toast(`${d.name} placed • bonus +${d.bonus}`);
  sfx("buy");
  const room = ROOMS.find(r => r.need === id);
  if (room) {
    openFogFree(2);
    sfx("room");
    toast(room.name + " opened on the mountain");
  }
  save(); render();
}

function unlockCost() {
  const lockedCount = state.locked.filter(Boolean).length;
  
  // Calculate how many of the 5 fog tiles have already been opened
  const opened = 5 - lockedCount; 
  
  // Custom prices for the 1st, 2nd, 3rd, 4th, and 5th tile unlocks:
  const costs = [1500, 4500, 12000, 25000, 50000]; 
  
  return costs[opened] || 999999;
}

function unlock(i) {
  if (!state.locked[i]) return;
  const cost = unlockCost();
  if (state.coins < cost) { toast(`Land costs ${cost} 🪙`); return; }
  state.coins -= cost;
  state.locked[i] = false;
  toast("Land opened");
  save(); render();
}

function gather() {
  if (state.mode === "stage") {
    if ((state.trailGathers || 0) <= 0) {
      toast("Trail pouch is empty • merge what you have");
      return;
    }
    if (!spawn(0, 1)) return;
    state.trailGathers -= 1;
    sfx("gather");
    save(); render();
    return;
  }
  if (state.energy <= 0) { toast("Energy empty • wait a moment"); return; }
  if (!spawn(0, 1)) return;
  state.energy -= 1;
  
  const gBtn = document.getElementById("gather");
  if (gBtn) {
    const rect = gBtn.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top, 8, '#ff8033');
  }

  sfx("gather");
  save(); render();
}

function wishList() {
  const list = QUESTS.slice();
  if ((state.level || 1) >= 3) {
    list.push({ want: 4, text: "The hearth wants another Hearth to share the perch.", reward: 1400 });
  }
  return list;
}

function fulfillSleepy() {
  if (state.sleepyDone) return;
  if (!consumeOne(3)) { toast("Need a Young dragon on the board"); return; }
  
  state.sleepyDone = true;
  state.sleepyStreak = (state.sleepyStreak || 0) + 1;
  state.coins += 3000;
  state.trailGathers = (state.trailGathers || 0) + 5;
  const cap = state.maxEnergy || MAX_ENERGY;
  state.energy += 10; 

  let extra = "Dream Hoard! +3000 🪙 • +10 Energy • +5 Pouch";
  if (state.sleepyStreak % 7 === 0) {
    state.maxEnergy = cap + 1;
    extra += " • Max Energy +1!";
  }

  sfx("win");
  toast(extra);
  
  state.questTab = 0;
  save(); render();
}

function fulfillQuest() {
  if (state.questDone) return;
  const list = wishList();
  const q = list[state.quest % list.length];
  if (!consumeOne(q.want)) { toast(`Need a ${CHAIN[q.want].name} on the board`); return; }
  const pay = q.reward * bonus();
  state.coins += pay;
  state.gives = (state.gives || 0) + 1;
  const cap = state.maxEnergy || MAX_ENERGY;
  state.energy = Math.min(cap, state.energy + 1);
  state.questDone = true;
  let extra = "";
  if (state.gives % 5 === 0) {
    const pack = 1500 * bonus();
    state.coins += pack;
    state.energy = Math.min(cap, state.energy + 2);
    const nth = state.gives / 5;
    extra = ` • 5 gifts! +${pack} 🪙`;
    sfx("room");
    spawn(0, 1); spawn(0, 1); spawn(0, 1);
    extra += " +3 eggs";
    if (nth % 2 === 0) {
      spawn(2, 1);
      extra += " +wyrmling";
    } else {
      spawn(1, 1);
      extra += " +hatchling";
    }
  }
  addXp(20);
  toast(`Nest is pleased • +${pay} 🪙` + extra);
  setTimeout(() => {
    state.quest = (state.quest + 1) % wishList().length;
    state.questDone = false;
    save(); render();
  }, 900);
  save(); render();
}

window.toggleQuestTab = () => {
  state.questTab = state.questTab === 0 ? 1 : 0;
  render();
};

function tickEnergy() {
  const regenEl = document.getElementById("regen");
  const cap = state.maxEnergy || MAX_ENERGY;
  if (state.energy >= cap) {
    state.nextEnergyAt = Date.now() + REGEN_MS;
    if (regenEl) regenEl.textContent = "";
  } else {
    if (!state.nextEnergyAt) state.nextEnergyAt = Date.now() + REGEN_MS;
    const left = state.nextEnergyAt - Date.now();
    if (left <= 0) {
      state.energy = Math.min(cap, state.energy + 1);
      state.nextEnergyAt = Date.now() + REGEN_MS;
      save();
      render();
    } else {
      if (regenEl) regenEl.textContent = "⏱ " + Math.ceil(left / 1000) + "s";
    }
  }
  
  if (state.mode === "home" && (state.perch || []).some(Boolean)) {
    if (!state.perchAt) state.perchAt = Date.now();
    if (Date.now() >= state.perchAt + PERCH_MS) {
      const ticks = Math.floor((Date.now() - state.perchAt) / PERCH_MS);
      if (ticks > 0) {
        const inc = perchIncome() * ticks;
        const maxBank = perchIncome() * 1440;
        state.perchBank = Math.min(maxBank, (state.perchBank || 0) + inc);
        state.perchAt += ticks * PERCH_MS;
        save();
      }
    }
  }

  const pAmt = document.getElementById("perchBankAmt");
  const pBtn = document.getElementById("collectPerchBtn");
  if (pAmt && pBtn) {
    if ((state.perchBank || 0) > 0) {
      pBtn.style.display = "block";
      pAmt.textContent = state.perchBank;
    } else {
      pBtn.style.display = "none";
    }
  }

  const pl = document.getElementById("perchLabel");
  const inc = perchIncome();
  if (pl) {
    if (!inc) {
      pl.textContent = "Perch: park a dragon";
    } else {
      const wait = Math.max(0, state.perchAt + PERCH_MS - Date.now());
      pl.textContent = "Perch: " + Math.ceil(wait / 1000) + "s • +" + inc;
    }
  }
}
setInterval(tickEnergy, 250);

document.getElementById("collectPerchBtn")?.addEventListener("click", () => {
  if ((state.perchBank || 0) > 0) {
    const amt = state.perchBank;
    state.coins += amt;
    state.perchBank = 0;
    
    const btn = document.getElementById("collectPerchBtn");
    const rect = btn.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top, 16, '#ffcf40');

    toast(`Collected ${amt} 🪙 from the Perch!`);
    sfx("win");
    save(); render();
  }
});

document.getElementById("tributeBtn").addEventListener("click", () => {
  const cost = tributeCost();
  if (state.coins < cost) { toast(`Need ${cost} 🪙 for the Mountain Tribute`); return; }
  state.coins -= cost;
  state.tributes = (state.tributes || 0) + 1;
  sfx("win");
  toast(`Tribute accepted! Bonus multiplier increased.`);
  save(); render();
});

let drag = null, ghost = null;

function itemHtml(item) {
  const spec = CHAIN[item.level];
  return `<div class="item pop">
    ${dragonSvg(item.level, 42, item.count, item.shiny)}
    <div class="lvl" style="color:#fff; text-shadow:0 2px 2px #000, 0 0 4px #000;">${item.shiny ? '✨ ' : ''}${spec.name}${item.count > 1 ? " • " + item.count : ""}</div>
  </div>`;
}

function renderQuest() {
  const box = document.getElementById("questBox");
  
  if (state.mode === "stage") {
    const have = board().some(c => c && c.level >= STAGE_GOAL);
    box.className = "quest";
    box.innerHTML = `
      <div class="art">${dragonSvg(STAGE_GOAL, 42)}</div>
      <p>Burn <b>${ASH_GOAL} ash</b> • ${state.ashBurned || 0}/${ASH_GOAL} cleared<br>
      <span style="font-size:0.7rem; color:#deb781;">Live ash limits: ${ashCount()}/${ASH_FAIL}</span></p>
      <button id="giveBtn" disabled>${have ? "Done" : "Goal"}</button>
    `;
    return;
  }

  const hasSleepy = !state.sleepyDone && state.level >= 3;
  if (!hasSleepy) state.questTab = 0;

  const leftArrow = hasSleepy ? `<button class="quest-arrow" onclick="toggleQuestTab()">❮</button>` : ``;
  const rightArrow = hasSleepy ? `<button class="quest-arrow" onclick="toggleQuestTab()">❯</button>` : ``;
  const dots = hasSleepy ? `<div class="quest-dots"><span class="${state.questTab===0?'active':''}"></span><span class="${state.questTab===1?'active':''}"></span></div>` : ``;

  if (hasSleepy && state.questTab === 0) {
    const haveSleepy = findLevel(3) >= 0; 
    box.className = "quest sleepy";
    box.innerHTML = `
      ${leftArrow}
      <div style="display:flex; align-items:center; gap:8px; flex:1;">
        <div class="art">
          ${dragonSvg(3, 40)}
          <div class="zzz">Zzz</div>
        </div>
        <div style="flex:1;">
          <p id="wishText" style="color:#a9d6e5;">Sleepy Dragon needs a <b>Young</b> dragon.<br><span style="font-size:0.7rem;">Streak: ${state.sleepyStreak || 0}/7</span></p>
          ${dots}
        </div>
        <div style="display:flex; flex-direction:column; gap:4px;">
          <button id="giveBtn" ${haveSleepy ? "" : "disabled"}>Wake</button>
          <button id="sleepyInfoBtn" style="padding:4px; font-size:0.7rem; background:#415a77; border-color:#e0e1dd; box-shadow:0 2px 0 #1b263b;">Info</button>
        </div>
      </div>
      ${rightArrow}
    `;
    const btn = document.getElementById("giveBtn");
    if (btn) btn.onclick = fulfillSleepy;
    const sInfo = document.getElementById("sleepyInfoBtn");
    if (sInfo) sInfo.onclick = () => document.getElementById("sleepyGuide").classList.add("open");
    
  } else {
    box.className = "quest";
    const list = wishList();
    const q = list[state.quest % list.length];
    const have = findLevel(q.want) >= 0;
    box.innerHTML = `
      ${leftArrow}
      <div style="display:flex; align-items:center; gap:8px; flex:1;">
        <div class="art">${dragonSvg(q.want, 40)}</div>
        <div style="flex:1;">
          <p id="wishText">${state.questDone ? "The nest settles..." : q.text}<br><span style="font-size:0.7rem;">Gifts: ${(state.gives || 0) % 5}/5</span></p>
          ${dots}
        </div>
        <button id="giveBtn" ${have && !state.questDone ? "" : "disabled"}>${state.questDone ? "✨" : "Give"}</button>
      </div>
      ${rightArrow}
    `;
    const btn = document.getElementById("giveBtn");
    if (btn) btn.onclick = fulfillQuest;
    const wish = document.getElementById("wishText");
    if (wish && !state.questDone) {
      wish.style.cursor = "pointer";
      wish.onclick = () => {
        const pay = q.reward * bonus();
        toast(CHAIN[q.want].name + " • " + q.reward + " × " + bonus() + " = " + pay + " 🪙");
      };
    }
  }
}

function render() {
  rollDaily();
  document.getElementById("app").classList.toggle("stage", state.mode === "stage");
  document.getElementById("title").innerHTML = state.mode === "stage" ? "Ash <span>Trail</span>" : "Ember <span>Nest</span>";
  document.getElementById("hint").textContent = state.mode === "stage"
    ? "Leave trail"
    : trailWaitLabel();
  const mb = document.getElementById("muteBtn");
  if (mb) mb.textContent = state.muted ? "🔇" : "🔊";
  const lc = document.getElementById("lvlChip");
  if (lc) lc.textContent = "Lv " + (state.level || 1) + " • " + (state.xp || 0) + "/" + xpNeed(state.level || 1);
  document.getElementById("coins").textContent = state.coins;
  document.getElementById("energy").textContent = state.energy;
  const em = document.getElementById("energyMax");
  if (em) em.textContent = state.maxEnergy || MAX_ENERGY;
  
  const nl = document.getElementById("nameLine");
  if (nl) {
    const n = state.playerName || "Keeper";
    nl.textContent = n + (state.nameChanges ? "" : " • tap to name");
  }
  const bonusEl = document.getElementById("bonus");
  if (bonusEl) bonusEl.textContent = bonus();
  
  gatherBtn.disabled = state.mode === "stage"
    ? (state.trailGathers || 0) <= 0
    : state.energy <= 0;

  const help = document.getElementById("helpText");
  if (help) {
    help.textContent = state.mode === "stage"
      ? "Merge next to ash to clear it • Wyrmlings clear 4 directions"
      : "5-merge to grow • tap fogged tiles to open land • quests use one dragon";
  }

  renderBook();
  gatherBtn.textContent = state.mode === "stage"
    ? "Gather egg • " + (state.trailGathers || 0) + " left"
    : "Gather egg 🥚";
  const buy = document.getElementById("buyEgg");
  if (buy) {
    buy.textContent = "Buy egg • " + eggPrice() + " 🪙";
    buy.disabled = state.mode === "stage";
    buy.style.opacity = state.mode === "stage" ? ".45" : "1";
  }
  renderQuest();
  
  const tb = document.getElementById("tributeBtn");
  if (tb) {
    tb.textContent = `Mountain Tribute: ${tributeCost()} 🪙 (+1 Bonus)`;
  }

  nestEl.innerHTML = DECOR.map(d => {
    const owned = !!state.decor[d.id];
    return `<div class="decor ${owned ? "owned" : ""}" data-decor="${d.id}">
      <div class="ico">${d.art}</div>
      <div>${d.name}</div>
      <div>${owned ? "placed" : d.cost + " 🪙"}</div>
    </div>`;
  }).join("");
  const mt = document.getElementById("mountain");
  const rc = document.getElementById("roomCount");
  if (rc) rc.textContent = roomsOpen();
  if (mt) {
    const openN = roomsOpen();
    mt.innerHTML = ROOMS.map((r, i) => {
      const open = i < openN;
      const now = i === openN - 1;
      return `<div class="room ${open ? "open" : ""} ${now ? "now" : ""} ${state.theme === r.id ? "now" : ""}" data-room="${r.id}">${r.art}<br>${open ? r.name : "🔒"}</div>`;
    }).join("");
  }
  
  applyTheme(state.theme || "hatchery");
  const pr = document.getElementById("perchRow");
  if (pr) {
    state.perch = state.perch || [null, null, null];
    pr.innerHTML = [0, 1, 2].map(i => {
      const open = perchOpen(i);
      const p = state.perch[i];
      const armed = perchArmed === i;
      if (!open) return `<div class="perch lock" data-perch="${i}">locked</div>`;
      if (p) return `<div class="perch on ${armed ? "armed" : ""}" data-perch="${i}">${dragonSvg(p.level, 26, 1, p.shiny)}<span>${p.shiny ? '✨ ' : ''}${CHAIN[p.level].name}</span></div>`;
      return `<div class="perch ${armed ? "armed" : ""}" data-perch="${i}">empty perch</div>`;
    }).join("");
  }
  const cells = board();
  boardEl.innerHTML = "";
  for (let i = 0; i < cells.length; i++) {
    const cell = document.createElement("div");
    const flashed = state._flash && state._flash.includes(i);
    cell.className = "cell" + (isLocked(i) ? " locked" : "") + (isAsh(i) ? " ash" : "") + (flashed ? " flash" : "");
    cell.dataset.i = i;
    if (isLocked(i)) cell.textContent = "fog • " + unlockCost() + " 🪙";
    else if (isAsh(i)) cell.innerHTML = ashSvg();
    else if (cells[i]) cell.innerHTML = itemHtml(cells[i]);
    boardEl.appendChild(cell);
  }
  if (state.mode === "stage") checkTrailStuck();
  if (state._flash && state._flash.length) {
    setTimeout(() => { state._flash = []; }, 280);
  }

  tickEnergy();
}

function cellFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const cell = el.closest(".cell");
  return cell ? +cell.dataset.i : null;
}

boardEl.addEventListener("pointerdown", (e) => {
  const cell = e.target.closest(".cell");
  if (!cell) return;
  const i = +cell.dataset.i;
  if (isLocked(i)) { unlock(i); return; }
  if (overflowArm && board()[i] && state.mode !== "stage") {
    if (overflowArm === "perch") {
      const slot = freePerchSlot();
      if (slot < 0) { toast("No open perch"); overflowArm = null; return; }
      seatPerch(slot, i);
    } else if (overflowArm === "dismiss") {
      const it = board()[i];
      const pay = dismissPay(it.level, it.shiny);
      if (it.count > 1) it.count -= 1;
      else board()[i] = null;
      state.coins += pay;
      toast(`Dismissed ${it.shiny ? '✨ Shiny ' : ''}${CHAIN[it.level].name} • +${pay} 🪙`);
      sfx("gather");
      save(); render();
    }
    overflowArm = null;
    return;
  }
  if (perchArmed >= 0 && board()[i] && state.mode !== "stage") {
    seatPerch(perchArmed, i);
    return;
  }
  if (!board()[i]) return;
  drag = { from: i };
  ghost = document.createElement("div");
  ghost.className = "ghost";
  ghost.innerHTML = dragonSvg(board()[i].level, 42, board()[i].count, board()[i].shiny);
  document.body.appendChild(ghost);
  ghost.style.left = e.clientX + "px";
  ghost.style.top = e.clientY + "px";
  boardEl.setPointerCapture(e.pointerId);
});

boardEl.addEventListener("pointermove", (e) => {
  if (!drag || !ghost) return;
  ghost.style.left = e.clientX + "px";
  ghost.style.top = e.clientY + "px";
  
  document.querySelectorAll(".cell.valid").forEach(c => c.classList.remove("valid"));
  document.querySelectorAll(".perch.valid").forEach(c => c.classList.remove("valid"));
  
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const cell = el ? el.closest(".cell") : null;
  const perch = el ? el.closest("[data-perch]") : null;

  if (perch && state.mode !== "stage") {
    if (perchOpen(+perch.dataset.perch)) {
      perch.classList.add("valid");
    }
  } else if (cell) {
    const over = +cell.dataset.i;
    if (over == null || isLocked(over) || isAsh(over)) return;
    const a = board()[drag.from];
    const b = board()[over];
    if (over !== drag.from && a && ((b && a.level === b.level) || !b)) {
      cell.classList.add("valid");
    }
  }
});

function endDrag(e) {
  if (!drag) return;
  const from = drag.from;
  if (ghost) ghost.remove();
  ghost = null;
  document.querySelectorAll(".cell.valid").forEach(c => c.classList.remove("valid"));
  document.querySelectorAll(".perch.valid").forEach(c => c.classList.remove("valid"));
  
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const cellEl = el ? el.closest(".cell") : null;
  const perchEl = el ? el.closest("[data-perch]") : null;

  const cells = board();

  if (perchEl && state.mode !== "stage") {
    const slot = +perchEl.dataset.perch;
    if (perchOpen(slot) && cells[from]) {
      const draggedItem = cells[from];
      const existingPerch = state.perch[slot];
      
      if (draggedItem.count > 1) {
        if (existingPerch) {
           toast("Perch must be empty to split stack.");
        } else {
           state.perch[slot] = { level: draggedItem.level, count: 1, shiny: draggedItem.shiny };
           draggedItem.count -= 1;
           sfx("buy");
        }
      } else {
        state.perch[slot] = { level: draggedItem.level, count: 1, shiny: draggedItem.shiny };
        cells[from] = existingPerch ? { level: existingPerch.level, count: 1, shiny: existingPerch.shiny } : null;
        sfx("buy");
      }
    }
  } else if (cellEl) {
    const over = +cellEl.dataset.i;
    if (over != null && over !== from && cells[from] && !isLocked(over) && !isAsh(over)) {
      if (cells[over] && cells[over].level === cells[from].level) {
        mergeInto(from, over);
      } else if (!cells[over]) {
        cells[over] = cells[from];
        cells[from] = null;
      }
    }
  }
  drag = null;
  save(); render();
}

boardEl.addEventListener("pointerup", endDrag);
boardEl.addEventListener("pointercancel", endDrag);

nestEl.addEventListener("click", (e) => {
  const el = e.target.closest("[data-decor]");
  if (el) buyDecor(el.dataset.decor);
});

document.getElementById("mountain").addEventListener("click", (e) => {
  const el = e.target.closest("[data-room]");
  if (!el) return;
  const id = el.dataset.room;
  const room = ROOMS.find(r => r.id === id);
  if (!room) return;
  if (room.need && !state.decor[room.need]) { toast("That room is still sealed"); return; }
  applyTheme(id);
  save(); render();
});

document.getElementById("perchRow").addEventListener("click", (e) => {
  const el = e.target.closest("[data-perch]");
  if (!el) return;
  const i = +el.dataset.perch;
  if (!perchOpen(i) || state.mode === "stage") return;
  if (state.perch[i] && perchArmed !== i) { emptyPerch(i); return; }
  perchArmed = perchArmed === i ? -1 : i;
  render();
  if (perchArmed >= 0) toast("Tap a nest dragon to perch it");
});

gatherBtn.addEventListener("click", gather);
document.getElementById("buyEgg").addEventListener("click", buyEgg);
document.getElementById("chestOk").addEventListener("click", () => {
  const box = document.getElementById("chestBox");
  const needsOpen = box && box.style.display !== "none" && !box.disabled;
  if (needsOpen) { toast("Tap the chest to open it"); return; }
  document.getElementById("chest").classList.remove("open");
  levelShowing = false;
  showLevelEvent();
});
document.getElementById("chestBox").addEventListener("click", revealChest);

document.getElementById("hint").addEventListener("click", enterStage);

document.getElementById("restartTrail").addEventListener("click", restartTrail);
document.getElementById("winHome").addEventListener("click", hideTrailWin);
document.getElementById("winAgain").addEventListener("click", () => {
  hideTrailWin();
  restartTrail();
});
document.getElementById("homeTrail").addEventListener("click", () => {
  hideTrailFail();
  state.mode = "home";
  resetTrail();
  toast("Returned to the nest");
  save(); render();
});

document.getElementById("nameLine").addEventListener("click", () => {
  const free = (state.nameChanges || 0) === 0;
  document.getElementById("nameHint").textContent = free
    ? "First change is free."
    : "Rename costs " + RENAME_COST + " 🪙.";
  document.getElementById("nameInput").value = state.playerName || "";
  document.getElementById("nameBox").classList.add("open");
});

document.getElementById("nameNo").addEventListener("click", () => {
  document.getElementById("nameBox").classList.remove("open");
});

document.getElementById("nameGo").addEventListener("click", () => {
  const raw = (document.getElementById("nameInput").value || "").trim().replace(/\s+/g, " ");
  if (raw.length < 2) { toast("Need at least 2 letters"); return; }
  if (raw.length > 16) { toast("16 letters max"); return; }
  if (raw === (state.playerName || "Keeper")) {
    document.getElementById("nameBox").classList.remove("open");
    return;
  }
  const free = (state.nameChanges || 0) === 0;
  if (!free) {
    if (state.coins < RENAME_COST) { toast("Need " + RENAME_COST + " 🪙"); return; }
    state.coins -= RENAME_COST;
  }
  state.playerName = raw;
  state.nameChanges = (state.nameChanges || 0) + 1;
  document.getElementById("nameBox").classList.remove("open");
  toast(free ? "Welcome, " + raw : "Renamed for " + RENAME_COST + " 🪙");
  save(); render();
});

document.getElementById("muteBtn").addEventListener("click", () => {
  state.muted = !state.muted;
  save(); render();
  toast(state.muted ? "Sound off" : "Sound on");
});

document.getElementById("bookBtn").addEventListener("click", () => {
  renderBook();
  document.getElementById("book").classList.add("open");
});

document.getElementById("bookClose").addEventListener("click", () => {
  document.getElementById("book").classList.remove("open");
});

document.getElementById("resetAll").addEventListener("click", () => {
  document.getElementById("wipe").classList.add("open");
  const inp = document.getElementById("wipeInput");
  inp.value = "";
  document.getElementById("wipeGo").disabled = true;
  inp.focus();
});

document.getElementById("wipeInput").addEventListener("input", (e) => {
  document.getElementById("wipeGo").disabled = e.target.value.trim() !== "Delete";
});

document.getElementById("wipeGo").addEventListener("click", () => {
  if (document.getElementById("wipeInput").value.trim() !== "Delete") return;
  localStorage.removeItem(SAVE);
  for (let v = 1; v <= 10; v++) localStorage.removeItem("ember-nest-v" + v);
  location.reload();
});

document.getElementById("wipeNo").addEventListener("click", () => {
  document.getElementById("wipe").classList.remove("open");
});

document.getElementById("overClose").addEventListener("click", () => {
  document.getElementById("overflow").classList.remove("open");
  overflowArm = null;
});

document.getElementById("overPerch").addEventListener("click", () => {
  if (freePerchSlot() < 0) { toast("No open perch"); return; }
  overflowArm = "perch";
  document.getElementById("overflow").classList.remove("open");
  toast("Tap a nest dragon to perch it");
});

document.getElementById("overDrop").addEventListener("click", () => {
  overflowArm = "dismiss";
  document.getElementById("overflow").classList.remove("open");
  toast("Tap a nest dragon to dismiss it");
});

document.getElementById("guideBtn").addEventListener("click", showGuide);
document.getElementById("guideClose").addEventListener("click", () => {
  state.seenGuide = true;
  document.getElementById("guide").classList.remove("open");
  save();
});

document.getElementById("sleepyGuideClose").addEventListener("click", () => {
  document.getElementById("sleepyGuide").classList.remove("open");
});

document.getElementById("book").addEventListener("click", (e) => {
  if (e.target.id === "book") document.getElementById("book").classList.remove("open");
});
// Tab Switching Logic
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    
    const targetTab = e.currentTarget;
    targetTab.classList.add("active");
    
    const viewId = targetTab.dataset.tab;
    document.getElementById(viewId).classList.add("active");
  });
});
load();
scanBook();
if (!state.hearthDone && (state.cells || []).some(it => it && it.level >= 4)) {
  completeHearthGoal();
}
if (!state.cells.some(Boolean)) {
  [0,0,0,0,0,0,1,1,0].forEach(lv => spawn(lv, 1));
  save();
}
render();
