// Mutable game state, persistence, board operations, merging, and Ash Trial rules.
// This file must load after game-data.js and before app.js.

function trialRules() {
  return state.trialKind === 'surge'
    ? {name:'Ember Surge',goal:12,grace:1,limit:12}
    : {name:'Ash Trial',goal:ASH_GOAL,grace:ASH_GRACE,limit:ASH_FAIL};
}
function trialPouchSize() { return TRAIL_GATHERS + (state.trialKind === 'surge' ? 12 : 0) + (state.pouchBonus || 0) + (state.dailyPouchBonus || 0); }
function clearAshAt(i) {
  if (!state.ash || !state.ash[i]) return false;
  state.ash[i] = false;
  state.ashBurned = (state.ashBurned || 0) + 1;
  return true;
}

function warmthTargets(landed, nextLevel) {
  if (!Number.isInteger(landed) || landed < 0 || landed >= COLS*ROWS || nextLevel < 1) return [];
  if (nextLevel <= 2) return neighbors(landed);
  const row = Math.floor(landed/COLS), col = landed%COLS;
  const targets = Array.from({length:COLS},(_,c)=>row*COLS+c);
  if (nextLevel >= 5) for(let r=0;r<ROWS;r++) targets.push(r*COLS+col);
  return [...new Set(targets)];
}
function applyWarmth(landed, nextLevel) {
  state._flash = warmthTargets(landed,nextLevel).filter(clearAshAt);
}
function trialInputLocked() { return state.mode === 'stage' && !!(state.trailWon || state.trialFailed); }

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
  for (let n = 0; n < ASH_START && free.length; n++) {
    const index = free.splice(Math.floor(Math.random() * free.length), 1)[0];
    state.ash[index] = true;
  }
  // Ash used to occupy the same eight leftover cells on every run. Shuffle
  // complete tile records so ash and starting dragons move together without
  // changing the opening resources or overlapping dragons with ash.
  if (state.trialKind !== 'surge') {
    for (let i = state.stageCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.stageCells[i], state.stageCells[j]] = [state.stageCells[j], state.stageCells[i]];
      [state.ash[i], state.ash[j]] = [state.ash[j], state.ash[i]];
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
  state.trialRunId = (state.trialRunId || 0) + 1;
  state.stageCells = Array(COLS * ROWS).fill(null);
  state.ash = Array(COLS * ROWS).fill(false);
  state.stageMerges = 0;
  state.trailGathers = trialPouchSize();
  state.ashBurned = 0;
  state.trailWon = false;
  state.trialFailed = false;
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
  battleRoster: [], battleNextId: 1, battleClears: {},
});

let state = defaultState();
let saveBlocked = false;
let lastSavedRaw = null;
function detectSaveConflict() {
  if (localStorage.getItem(SAVE) === lastSavedRaw) return false;
  saveBlocked = true;
  showSaveWarning('Another tab changed this save. Autosave is paused. Export this tab if you need its unsaved progress, then reload to use the newer save.');
  return true;
}
function showSaveWarning(message) {
  const warning = document.getElementById('saveWarning');
  if (warning) { warning.hidden = !message; warning.textContent = message; }
}

function load() {
  try {
    let raw = localStorage.getItem(SAVE);
    lastSavedRaw = raw;
    if (!raw) {
      for (let v = 10; v >= 1; v--) {
        raw = localStorage.getItem(`ember-nest-v${v}`);
        if (raw) break;
      }
    }
    if (!raw) return;

    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Invalid save format');
    validateBattleState(saved);
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
    if (saved.trialKind === 'surge') state.stageCells = Array(gridSize).fill(null);
    state.trialKind = 'ash';
    state.ash = Array(gridSize).fill(false);
    state.stageMerges = 0;
  } catch (error) {
    saveBlocked = true;
    showSaveWarning('Your save could not be read. Autosave is paused to protect it. Do not continue playing; keep this browser data and reload or seek recovery help.');
    console.error("Save state could not be loaded:", error);
  }
}

function save() {
  if (saveBlocked) return false;
  try {
    if (detectSaveConflict()) return false;
    const raw = JSON.stringify(state);
    localStorage.setItem(SAVE, raw);
    lastSavedRaw = raw;
    showSaveWarning('');
    return true;
  } catch (error) {
    showSaveWarning('Progress is not saving. Keep this tab open, free browser storage or allow site storage, then try another action. Do not clear site data.');
    return false;
  }
}

// Only this versioned export format is accepted; arbitrary legacy JSON is not imported.
function backupPayload() {
  const data=JSON.parse(JSON.stringify(state));
  data.mode='home';data.trialKind='ash';data.stageCells=Array(COLS*ROWS).fill(null);
  data.ash=Array(COLS*ROWS).fill(false);data.stageMerges=0;data.trailWon=false;data.trialFailed=false;
  return {format:'ember-nest-backup',version:1,createdAt:new Date().toISOString(),data};
}
function validateBackup(text) {
  if(typeof text!=='string'||text.length>2000000)throw new Error('Backup is too large (maximum 2 MB).');
  const payload=JSON.parse(text);
  if(payload?.format!=='ember-nest-backup'||payload.version!==1)throw new Error('Choose an Ember Nest version 1 backup.');
  const data=payload.data;
  const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
  if(!object(data))throw new Error('Missing save data.');
  function inspect(value,depth=0){
    if(depth>16)throw new Error('Backup nesting is invalid.');
    if(typeof value==='number'&&!Number.isFinite(value))throw new Error('Invalid number.');
    if(typeof value==='string'&&(value.length>1000||/[<>"`]|javascript:|data:text\/html/i.test(value)))throw new Error('Backup contains unsupported text or markup.');
    if(value&&typeof value==='object')for(const [key,child]of Object.entries(value)){
      if(['__proto__','constructor','prototype'].includes(key))throw new Error('Unsafe backup key.');
      inspect(child,depth+1);
    }
  }
  inspect(data);
  for(const key of ['coins','energy','level','maxEnergy','xp'])if(!Number.isSafeInteger(data[key])||data[key]<0)throw new Error('Invalid '+key+'.');
  if(data.level<1||data.maxEnergy<1)throw new Error('Invalid player level or energy capacity.');
  for(const [key,value]of Object.entries(defaultState())){
    if(!(key in data))continue;
    if(Array.isArray(value)&&!Array.isArray(data[key]))throw new Error('Invalid '+key+' list.');
    if(object(value)&&!object(data[key]))throw new Error('Invalid '+key+' record.');
    if(typeof value==='boolean'&&typeof data[key]!=='boolean')throw new Error('Invalid '+key+' flag.');
    if(typeof value==='string'&&typeof data[key]!=='string')throw new Error('Invalid '+key+' text.');
    if(typeof value==='number'&&(!Number.isFinite(data[key])||data[key]<0))throw new Error('Invalid '+key+' number.');
  }
  const dragon=d=>d===null||(object(d)&&Number.isInteger(d.level)&&d.level>=0&&d.level<=5&&Number.isSafeInteger(d.count)&&d.count>0&&(!d.element||['neutral','fire','water','nature'].includes(d.element)));
  if(!Array.isArray(data.cells)||data.cells.length!==25||!data.cells.every(dragon)||!Array.isArray(data.locked)||data.locked.length!==25||!data.locked.every(v=>typeof v==='boolean'))throw new Error('Invalid board.');
  if(!Array.isArray(data.perch)||data.perch.length!==3||!data.perch.every(dragon))throw new Error('Invalid Roost.');
  if(!object(data.keeper)||!object(data.keeper.equipment)||!object(data.stash)||!Object.values(data.stash).every(n=>Number.isSafeInteger(n)&&n>=0))throw new Error('Invalid keeper or inventory.');
  if(!Object.values(data.keeper.equipment).every(v=>v===null||typeof v==='string'&&/^[A-Za-z0-9_./-]+$/.test(v)))throw new Error('Invalid equipment references.');
  for(const key of ['completedContractWeeks','wardrobeClaims','collectionOwned','redeemedCosmetics','claimedChests','expeditionJournal'])if(data[key]!==undefined&&!object(data[key]))throw new Error('Invalid '+key+' record.');
  if(data.wardrobePending!==undefined&&(!Array.isArray(data.wardrobePending)||!data.wardrobePending.every(v=>typeof v==='string')))throw new Error('Invalid reward list.');
  if(data.contracts&&(!object(data.contracts)||!Array.isArray(data.contracts.items)||data.contracts.items.length!==5||!data.contracts.items.every(c=>object(c)&&['gather','merge','roost','nurture','trial','donate','earn'].includes(c.kind)&&Number.isFinite(c.target)&&c.target>0&&Number.isFinite(c.progress)&&c.progress>=0&&Number.isFinite(c.reward)&&c.reward>=0)))throw new Error('Invalid weekly contracts.');
  if(data.contracts?.bonus&&(!Array.isArray(data.contracts.bonus)||data.contracts.bonus.length!==2||!data.contracts.bonus.every(c=>object(c)&&['gather','merge'].includes(c.kind)&&Number.isFinite(c.target)&&c.target>0&&Number.isFinite(c.progress)&&c.progress>=0)))throw new Error('Invalid bonus goals.');
  if(data.contracts?.items.some(c=>['donate','nurture'].includes(c.kind)&&(!Number.isInteger(c.want)||c.want<0||c.want>5)))throw new Error('Invalid contract dragon stage.');
  if(data.rewardInbox&&!data.rewardInbox.every(r=>object(r)&&Number.isInteger(r.level)&&r.level>=0&&r.level<=5&&Number.isSafeInteger(r.quantity)&&r.quantity>0))throw new Error('Invalid pending dragons.');
  if(data.expedition&&(!object(data.expedition)||!Object.hasOwn(EXPEDITION_ROUTES,data.expedition.route)||!Object.hasOwn(EXPEDITION_PACKAGES,data.expedition.package)||!Number.isFinite(data.expedition.id)||!Number.isFinite(data.expedition.readyAt)))throw new Error('Invalid expedition.');
  if(data.elderReserve&&!data.elderReserve.every(e=>object(e)&&e.dragon?.level===5&&dragon(e.dragon)))throw new Error('Invalid Elder reserve.');
  validateBattleState(data);
  data.mode='home';data.trialKind='ash';data.stageCells=Array(25).fill(null);data.ash=Array(25).fill(false);data.stageMerges=0;data.trailWon=false;data.trialFailed=false;
  return data;
}
function commitBackupRestore(text,expectedRaw) {
  if(state.mode==='stage')throw new Error('Leave your Trial before restoring.');
  const restored=validateBackup(text);
  const previous=localStorage.getItem(SAVE);
  if(previous!==expectedRaw)throw new Error('The current save changed. Preview the backup again before restoring.');
  // If the recovery copy cannot be written, do not replace the primary save.
  if(previous!==null)localStorage.setItem(SAVE+'-before-restore',previous);
  const raw=JSON.stringify(restored);
  localStorage.setItem(SAVE,raw);
  lastSavedRaw=raw;saveBlocked=true;
  showSaveWarning('Backup restored. Reload this page to continue.');
  return true;
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
  if (trialInputLocked()) return false;
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
  return state.cells.findIndex(cell => cell && !cell.training && cell.level === level);
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
  if (trialInputLocked()) return false;
  const cells = board();
  const source = cells[fromI];
  const target = cells[toI];
  if (!source || !target || fromI === toI || source.level !== target.level) return false;
  if(source.training || target.training){toast('Trained dragons grow in the Battle Lodge; their identity stays safe.');return false;}
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
    const rules = trialRules();
    const runId = state.trialRunId;
    if ((state.ashBurned || 0) >= rules.goal) {
      state.trailWon = true;
      if (state.trialKind !== 'surge') state.ashTrialCompleted = true;
      save();
      setTimeout(() => { if (state.trialRunId === runId) winStage(); }, 400);
      return true;
    }
    if (state.stageMerges > rules.grace) {
      const ashSpawned = spawnAsh(ASH_PER_MERGE);
      if (!ashSpawned || ashCount() >= rules.limit) setTimeout(() => { if (state.trialRunId === runId) failStage(); }, 250);
    }
  }
  return true;
}
