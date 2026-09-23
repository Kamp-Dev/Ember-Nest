// Mutable game state, persistence, board operations, merging, and Ash Trial rules.
// This file must load after game-data.js and before app.js.

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

  const burnNear = () => neighbors(landed).forEach(i => { if (clearAshAt(i)) flashes.push(i); });

  const burnFourDirections = () => {
    const targets = [];
    if (row > 0) targets.push((row - 1) * COLS + col);
    if (row < ROWS - 1) targets.push((row + 1) * COLS + col);
    if (col > 0) targets.push(row * COLS + (col - 1));
    if (col < COLS - 1) targets.push(row * COLS + (col + 1));
    targets.forEach(i => { if (clearAshAt(i)) flashes.push(i); });
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

function generateTrail() {
  resetTrail(); // Rely on resetTrail to clear the board rather than duplicating logic

  let bagIndex = 0;

  // Guaranteed extra starting egg
  state.stageCells[0] = { level: 0, count: 1, shiny: false };

  // Fill cells skipping multiples of 7
  for (let i = 1; i < COLS * ROWS && bagIndex < TRAIL_BAG.length; i++) {
    if (i % 7 !== 0) {
      const isShiny = Math.random() < 0.05;
      state.stageCells[i] = { level: TRAIL_BAG[bagIndex], count: 1, shiny: isShiny };
      if (isShiny && typeof discoverRare === "function") discoverRare(TRAIL_BAG[bagIndex]);
      bagIndex++;
    }
  }

  // Fill remaining blanks
  for (let i = 0; i < COLS * ROWS && bagIndex < TRAIL_BAG.length; i++) {
    if (!state.stageCells[i]) {
      const isShiny = Math.random() < 0.05;
      state.stageCells[i] = { level: TRAIL_BAG[bagIndex], count: 1, shiny: isShiny };
      if (isShiny && typeof discoverRare === "function") discoverRare(TRAIL_BAG[bagIndex]);
      bagIndex++;
    }
  }

  // Sample free cells without replacement so generation always terminates.
  const free = state.stageCells.map((cell, i) => cell ? -1 : i).filter(i => i >= 0);
  for (let n = 0; n < ASH_GOAL && free.length; n++) {
    const index = free.splice(Math.floor(Math.random() * free.length), 1)[0];
    state.ash[index] = true;
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
  state.trailGathers = TRAIL_GATHERS + (state.pouchBonus || 0) + (state.dailyPouchBonus || 0);
  state.ashBurned = 0;
  state.trailWon = false;
  state._flash = [];
}
// --- TRAIL WIN/FAIL STATES & UI ---

function canFiveMerge() {
  const tally = {};
  board().forEach(it => {
    if (it && it.level < CHAIN.length - 1) tally[it.level] = (tally[it.level] || 0) + it.count;
  });
  return Object.values(tally).some(n => n >= 5);
}

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
  stageMerges: 0, trailGathers: TRAIL_GATHERS, ashCleared: false, ashWins: 0,
  lastAshWinAt: 0, ashDayKey: "", ashDayWins: 0,
  book: { 0: true }, rareBook: {}, elementBook: {}, rareElementBook: {}, masteryClaims: {}, gives: 0, maxEnergy: MAX_ENERGY,
  hearthDone: false, highestDiscovered: 0, eggsBought: 0, xp: 0, level: 1, pouchBonus: 0,
  perch: [null, null, null], perchBank: 0, theme: "hatchery", perchAt: 0,
  seenGuide: false, muted: false, playerName: "Keeper", nameChanges: 0,
  sleepyDone: false, sleepyStreak: 0, questTab: 0, tributes: 0,
  keeper: { title: 'Novice Breeder', equipment: { body: 'body_base.png', torso: null, head: null, legs: null } },
  stash: {}, rewardInbox: [], elderReserve: [], elderReserveNextId: 1, bonusSeals: 0, collectionGoal: null, saveForDecor: true, sanctuaryRank: 0,
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

    const saved = JSON.parse(raw);
    state = { ...defaultState(), ...saved };
    state.bonusSeals = Number.isSafeInteger(saved.bonusSeals) && saved.bonusSeals >= 0 ? saved.bonusSeals : 0;
    state.elderReserve = Array.isArray(saved.elderReserve) ? saved.elderReserve.filter(entry =>
      entry?.dragon?.level === 5 && Number.isSafeInteger(entry.dragon.count) && entry.dragon.count > 0) : [];
    // Reassign IDs on load to repair malformed/duplicate IDs without losing dragons.
    state.elderReserve.forEach((entry, index) => { entry.id = index + 1; });
    state.elderReserveNextId = state.elderReserve.length + 1;
    // Existing players keep their purchase preference; new games start protected.
    state.saveForDecor = saved.saveForDecor === true;
    state.rewardInbox = Array.isArray(saved.rewardInbox) ? saved.rewardInbox.filter(r =>
      r && Number.isInteger(r.level) && r.level >= 0 && r.level < CHAIN.length &&
      Number.isSafeInteger(r.quantity) && r.quantity > 0) : [];
    if (!state.keeper) {
      state.keeper = {
        name: "Keeper",
        title: "Novice Breeder",
        equipment: { body: "body_base.png", torso: null, head: null, legs: null },
      };
    }
    if (!state.stash) state.stash = {};
    state.maxEnergy = Math.max(MAX_ENERGY, Number(state.maxEnergy) || MAX_ENERGY,
      state.level >= 6 ? 25 : 0, state.hearthDone ? 30 : 0);
    // Legacy quest counters remain inert; weekly contracts start independently.
    state.questDone = false;

    const gridSize = COLS * ROWS;
    ["cells", "locked", "stageCells", "ash"].forEach(key => {
      if (!Array.isArray(state[key])) state[key] = defaultState()[key];
      if (state[key].length !== gridSize) {
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

// Preserve fractional timer progress and refill all elapsed ticks, including offline.
function replenishEnergy(now = Date.now()) {
  const cap = state.maxEnergy || MAX_ENERGY;
  if (state.energy >= cap) { state.nextEnergyAt = now + REGEN_MS; return; }
  if (!Number.isFinite(state.nextEnergyAt)) state.nextEnergyAt = now + REGEN_MS;
  if (now < state.nextEnergyAt) return;
  const ticks = 1 + Math.floor((now - state.nextEnergyAt) / REGEN_MS);
  state.energy = Math.min(cap, state.energy + ticks);
  state.nextEnergyAt = state.energy >= cap ? now + REGEN_MS : state.nextEnergyAt + ticks * REGEN_MS;
}

function gatherBaseLevel() {
  return highestOwned() >= 4 ? 1 : 0;
}

function gatherLevel() {
  const base = gatherBaseLevel();
  return highestOwned() >= 3 && Math.random() < GATHER_UPGRADE_CHANCE ? base + 1 : base;
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

  const index = Number.isInteger(at) && at >= 0 && at < cells.length && !cells[at] && !isLocked(at) && !isAsh(at)
    ? at
    : free[Math.floor(Math.random() * free.length)];
  const shiny = forceShiny || Math.random() < 0.05;
  if (shiny && typeof discoverRare === "function") discoverRare(level);

  const elements = ["fire", "water", "nature"];
  const element = level >= 2 ? elements[Math.floor(Math.random() * elements.length)] : "neutral";
  cells[index] = { level, count, shiny, element };
  if (typeof recordElementDiscovery === 'function') recordElementDiscovery(cells[index]);
  return true;
}

function findLevel(level) {
  return state.cells.findIndex(cell => cell && cell.level === level);
}

// Reward-only delivery. Paid purchases/consumables continue to fail without charge.
function grantDragonReward(level, quantity = 1) {
  if (!Number.isInteger(level) || level < 0 || level >= CHAIN.length ||
      !Number.isSafeInteger(quantity) || quantity <= 0) return;
  state.rewardInbox = state.rewardInbox || [];
  const pending = state.rewardInbox.find(r => r.level === level);
  if (pending) pending.quantity += quantity;
  else state.rewardInbox.push({level, quantity});
  deliverRewardInbox();
}
function deliverRewardInbox() {
  if (state.mode !== 'home') return 0;
  let delivered = 0;
  const queue = state.rewardInbox || [];
  while (queue.length && emptyOpen().length) {
    const reward = queue[0];
    if (!spawn(reward.level, 1)) break;
    reward.quantity--;
    delivered++;
    if (!reward.quantity) queue.shift();
  }
  return delivered;
}
function rewardInboxCount() {
  return (state.rewardInbox || []).reduce((n,r) => n + r.quantity, 0);
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

// Resolves a merge without depending on a particular input method. UI feedback
// is delegated to the existing presentation helpers in app.js.
function mergeInto(fromI, toI) {
  const cells = board();
  const source = cells[fromI];
  const target = cells[toI];
  if (!source || !target || fromI === toI || source.level !== target.level) return false;
  if (source.level >= CHAIN.length - 1) {
    toast("Elders keep watch • no further merge");
    return false;
  }

  const shiny = source.shiny || target.shiny || Math.random() < 0.08;
  let carriedElement = "neutral";
  if (source.count > target.count) carriedElement = source.element || "neutral";
  else if (target.count > source.count) carriedElement = target.element || "neutral";
  else carriedElement = source.element && source.element !== "neutral" ? source.element : (target.element || "neutral");

  let total = source.count + target.count;
  cells[fromI] = null;
  const produced = Math.floor(total / 5);
  total %= 5;

  if (!produced) {
    cells[toI] = { level: source.level, count: total, shiny: !!(source.shiny || target.shiny), element: carriedElement };
    return true;
  }

  const nextLevel = source.level + 1;
  let element = carriedElement;
  if (nextLevel >= 2 && (!element || element === "neutral")) {
    const elements = ["fire", "water", "nature"];
    element = elements[Math.floor(Math.random() * elements.length)];
  }

  const payout = state.mode === "stage" ? 0 : Math.round((80 + nextLevel * 45) * bonus() * (shiny ? 2 : 1));
  if (payout) state.coins += payout;
  if (state.mode !== "stage" && nextLevel === 4) completeHearthGoal();
  if (state.mode !== "stage") addXp(15 + nextLevel * 10);
  if (state.mode === 'home') {
    contractEvent('merge', produced);
    contractEvent('nurture', produced, nextLevel);
    contractEvent('earn', payout);
  }

  sfx(shiny ? "shiny" : "merge");
  const cellElement = boardEl?.children[toI];
  if (cellElement) {
    const rect = cellElement.getBoundingClientRect();
    spawnParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, shiny ? 20 : 12, shiny ? "#ffea75" : "#ffcf40");
  }
  if (shiny && typeof discoverRare === "function") discoverRare(nextLevel);
  if (typeof discover === "function") discover(nextLevel);
  toast(payout
    ? `${shiny ? "✨ Shiny " : ""}${CHAIN[nextLevel].name} hatched! +${payout} 🪙`
    : `${CHAIN[nextLevel].name} hatched!`);

  cells[toI] = { level: nextLevel, count: produced, shiny, element };
  if (typeof recordElementDiscovery === 'function') recordElementDiscovery(cells[toI]);
  if (total > 0) cells[fromI] = { level: source.level, count: total, shiny: source.shiny, element: carriedElement };

  if (state.mode === "stage") {
    applyWarmth(toI, nextLevel);
    if (state._flash?.length) sfx("ash");
    state.stageMerges = (state.stageMerges || 0) + 1;
    if ((state.ashBurned || 0) >= ASH_GOAL) {
      state.trailWon = true;
      state.ashTrialCompleted = true;
      save();
      setTimeout(winStage, 400);
      return true;
    }
    if (state.stageMerges > ASH_GRACE) {
      const ashSpawned = spawnAsh(ASH_PER_MERGE);
      if (!ashSpawned || ashCount() >= ASH_FAIL) setTimeout(failStage, 250);
    }
  }
  return true;
}
