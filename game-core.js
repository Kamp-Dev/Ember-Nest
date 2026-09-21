// Mutable game state, persistence, and low-level board operations.
// This file must load after game-data.js and before app.js.

const defaultState = () => ({
  coins: 20,
  energy: 5,
  cells: Array(COLS * ROWS).fill(null),
  locked: Array.from({ length: COLS * ROWS }, (_, i) => i >= OPEN_START),
  decor: {}, quest: 0, questDone: false,
  nextEnergyAt: Date.now() + REGEN_MS,
  mode: "home",
  stageCells: Array(COLS * ROWS).fill(null),
  ash: Array(COLS * ROWS).fill(false),
  stageMerges: 0, trailGathers: 6, ashCleared: false, ashWins: 0,
  lastAshWinAt: 0, ashDayKey: "", ashDayWins: 0,
  book: { 0: true }, rareBook: {}, gives: 0, maxEnergy: 5,
  hearthDone: false, eggsBought: 0, xp: 0, level: 1, pouchBonus: 0,
  perch: [null, null, null], perchBank: 0, theme: "hatchery", perchAt: 0,
  seenGuide: false, muted: false, playerName: "Keeper", nameChanges: 0,
  sleepyDone: false, sleepyStreak: 0, questTab: 0, tributes: 0,
});

let state = defaultState();

function load() {
  try {
    let raw = localStorage.getItem(SAVE);
    if (!raw) {
      for (let v = 10; v >= 1; v--) {
        raw = localStorage.getItem(`ember-nest-v${v}`);
        if (raw) break;
      }
    }
    if (!raw) return;

    state = { ...defaultState(), ...JSON.parse(raw) };
    if (!state.keeper) {
      state.keeper = {
        name: "Keeper",
        title: "Novice Breeder",
        equipment: { body: "body_base.png", torso: null, head: null, legs: null },
      };
    }
    if (!state.stash) state.stash = {};

    const gridSize = COLS * ROWS;
    ["cells", "locked", "stageCells", "ash"].forEach(key => {
      if (Array.isArray(state[key]) && state[key].length !== gridSize) {
        state[key] = state[key].length > gridSize ? state[key].slice(0, gridSize) : defaultState()[key];
      }
    });
    state.mode = "home";
    state.ash = Array(gridSize).fill(false);
    state.stageMerges = 0;
  } catch (error) {
    console.error("Save state could not be loaded:", error);
  }
}

function save() {
  localStorage.setItem(SAVE, JSON.stringify(state));
}

function board() {
  return state.mode === "stage" ? state.stageCells : state.cells;
}

function isLocked(index) {
  return state.mode !== "stage" && !!state.locked[index];
}

function isAsh(index) {
  return state.mode === "stage" && !!(state.ash && state.ash[index]);
}

function ashCount() {
  return (state.ash || []).filter(Boolean).length;
}

function emptyOpen() {
  return board()
    .map((value, index) => (!value && !isLocked(index) && !isAsh(index) ? index : -1))
    .filter(index => index >= 0);
}

function spawn(level, count = 1, at, forceShiny = false) {
  const cells = board();
  const free = emptyOpen();
  if (!free.length) {
    if (state.mode !== "stage") showOverflow();
    else toast("Board full • merge what you have");
    return false;
  }

  const index = at != null && !cells[at] && !isLocked(at)
    ? at
    : free[Math.floor(Math.random() * free.length)];
  const shiny = forceShiny || Math.random() < 0.05;
  if (shiny && typeof discoverRare === "function") discoverRare(level);

  const elements = ["fire", "water", "nature"];
  const element = level >= 2 ? elements[Math.floor(Math.random() * elements.length)] : "neutral";
  cells[index] = { level, count, shiny, element };
  return true;
}

function findLevel(level) {
  return state.cells.findIndex(cell => cell && cell.level === level);
}

function consumeOne(level) {
  const index = findLevel(level);
  if (index < 0) return false;
  if (state.cells[index].count > 1) state.cells[index].count -= 1;
  else state.cells[index] = null;
  return true;
}

function neighbors(index) {
  const column = index % COLS;
  const row = Math.floor(index / COLS);
  const result = [];
  if (column > 0) result.push(index - 1);
  if (column < COLS - 1) result.push(index + 1);
  if (row > 0) result.push(index - COLS);
  if (row < ROWS - 1) result.push(index + COLS);
  return result;
}
