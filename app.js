const COLS = 5, ROWS = 5, MAX_ENERGY = 5;
const SAVE = "ember-nest-save";
const REGEN_MS = 8000;
const PERCH_MS = 60000;
const OPEN_START = 20; // Leaves 5 tiles locked by default on a 25-tile grid
const STAGE_GOAL = 3;
const ASH_GRACE = 1;
const ASH_PER_MERGE = 2;
const ASH_FAIL = 10;   // Lowered slightly to match the smaller board capacity
const ASH_GOAL = 8;    // Lowered from 6 to keep the Ash Trail balanced
const TRAIL_GATHERS = 4;
const DAILY_PAYS = [1200, 800, 400];
const DAILY_CLEARS = 3;
const RENAME_COST = 2000;
const IMG_DIR = "Images/";

// --- UI SAFETY HELPERS ---
function getPerchYield(p, i) {
  if (!p) return { base: 0, bonus: 0, total: 0, hasSynergy: false };
  const curve = [5, 15, 30, 60, 120, 240, 480, 960]; 
  let baseIncome = Math.floor((curve[p.level] || 5) * (p.shiny ? 2.5 : 1)) * 3;
  
  const roomElements = ["fire", "nature", "water"]; 
  const requiredElement = roomElements[i];
  const hasSynergy = (p.element === requiredElement || p.element === "neutral");
  
  let bonusIncome = hasSynergy ? Math.floor(baseIncome * 0.5) : 0;
  
  return { base: baseIncome, bonus: bonusIncome, total: baseIncome + bonusIncome, hasSynergy };
}
// --- KEEPER'S CUSTOMIZER MIRROR FUNCTIONS ---
let currentCustomizerSlot = 'torso';

function openExpandedCustomizer() {
  const modal = document.getElementById('expandedCustomizerModal');
  if (modal) {
    modal.style.display = 'flex';
    renderExpandedModalLayers();
    renderExpandedItemGrid(currentCustomizerSlot);
  }
}

function closeExpandedCustomizer() {
  const modal = document.getElementById('expandedCustomizerModal');
  if (modal) modal.style.display = 'none';
}

function renderExpandedModalLayers() {
  const eq = state.keeper?.equipment || {};
  
  const bodyL = document.getElementById('modal-layer-body');
  const legsL = document.getElementById('modal-layer-legs');
  const torsoL = document.getElementById('modal-layer-torso');
  const headL = document.getElementById('modal-layer-head');

  if (bodyL) bodyL.src = eq.body || 'assets/avatar/body_base.png';
  
  if (legsL) {
    if (eq.legs) { legsL.src = eq.legs; legsL.style.display = 'block'; }
    else { legsL.style.display = 'none'; }
  }
  
  if (torsoL) {
    if (eq.torso) { torsoL.src = eq.torso; torsoL.style.display = 'block'; }
    else { torsoL.style.display = 'none'; }
  }
  
  if (headL) {
    if (eq.head) { headL.src = eq.head; headL.style.display = 'block'; }
    else { headL.style.display = 'none'; }
  }
}

function renderExpandedItemGrid(slotType) {
  const grid = document.getElementById('expandedItemGrid');
  if (!grid) return;
  grid.innerHTML = '';
  
  const stashData = state.stash || {};
  let found = false;
  
  for (const [itemId, quantity] of Object.entries(stashData)) {
    const itemDef = STASH_CATALOG[itemId];
    if (itemDef && itemDef.type === 'cosmetic' && itemDef.slot === slotType) {
      found = true;
      const slotEl = document.createElement('div');
      slotEl.className = 'stash-slot filled';
      slotEl.style.cursor = 'pointer';
      
      const isEquipped = state.keeper?.equipment?.[slotType] === itemDef.img;
      if (isEquipped) slotEl.style.borderColor = '#d4af37';
      
      slotEl.innerHTML = `
        <div style="font-size: 1.8rem;">${itemDef.icon}</div>
        <div style="position: absolute; bottom: 2px; font-size: 0.6rem; color: #fff; text-shadow: 0 1px 2px #000;">${itemDef.name}</div>
      `;
      
      slotEl.onclick = () => {
        state.keeper.equipment[slotType] = itemDef.img;
        save();
        renderKeeperQuarters();       
        renderExpandedModalLayers();    
        renderExpandedItemGrid(slotType); 
        toast("Equipped " + itemDef.name);
      };
      grid.appendChild(slotEl);
    }
  }
  
  if (!found) {
    grid.innerHTML = `<div style="grid-column: span 3; color: #7a7a8c; font-size: 0.75rem; padding: 15px; text-align: center;">No items found for this slot.</div>`;
  }
}

// --- KEEPER'S CUSTOMIZER MIRROR LISTENERS ---

// 1. Click the Avatar Frame to open the expanded modal
document.getElementById('avatarFrameBtn')?.addEventListener('click', openExpandedCustomizer);

// 2. Click the X or Done button to close it
document.getElementById('closeExpandedModalBtn')?.addEventListener('click', closeExpandedCustomizer);
document.getElementById('modalDoneBtn')?.addEventListener('click', closeExpandedCustomizer);

// 3. Unequip Button logic
document.getElementById('modalUnequipBtn')?.addEventListener('click', () => {
  if (state.keeper?.equipment) {
    state.keeper.equipment[currentCustomizerSlot] = null;
    save();
    renderKeeperQuarters();
    renderExpandedModalLayers();
    renderExpandedItemGrid(currentCustomizerSlot);
    toast("Slot unequipped.");
  }
});

// 4. Tab Switching logic (Torso, Legs, Head)
document.querySelectorAll('.customizer-tab').forEach(btn => {
  btn.addEventListener('click', (e) => {
    // Remove active state from all tabs
    document.querySelectorAll('.customizer-tab').forEach(b => {
      b.classList.remove('active');
      b.style.background = '#1b263b';
    });
    // Add active state to clicked tab
    const target = e.currentTarget;
    target.classList.add('active');
    target.style.background = '#415a77';
    
    currentCustomizerSlot = target.dataset.slot;
    renderExpandedItemGrid(currentCustomizerSlot);
  });
});
function setSafeHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
function setSafeText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
const TRAIL_BAG = [2, 2, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];

// --- KEEPER'S QUARTERS CATALOG ---
const STASH_CATALOG = {
  'rare_egg': { name: 'Rare Egg', icon: '🥚', type: 'consumable' },
  'time_skip_1h': { name: '1h Time Skip', icon: '⏳', type: 'consumable' },
  'breeder_tunic': { name: 'Breeder Tunic', icon: '🧥', type: 'cosmetic', slot: 'torso', img: 'torso_tunic.png' },
  'leather_cap': { name: 'Leather Cap', icon: '🧢', type: 'cosmetic', slot: 'head', img: 'head_leather_cap.png' },
  'rough_trousers': { name: 'Rough Trousers', icon: '👖', type: 'cosmetic', slot: 'legs', img: 'legs_trousers.png' }
};

// --- STASH & KEEPER LOGIC ---
// Exposed to window so we can test it from the developer console
window.addToStash = function(itemId, amount = 1) {
  // Guardrail: No dragons in the stash!
  if (STASH_CATALOG[itemId] && STASH_CATALOG[itemId].type === 'dragon') {
    console.warn("Dragons cannot be stashed!");
    return false; 
  }

  // Lazy initialize if not present
  if (!state.stash) state.stash = {};
  if (!state.stash[itemId]) state.stash[itemId] = 0;
  
  state.stash[itemId] += amount;
  
  save(); 
  renderKeeperQuarters();
  toast("Added " + amount + " " + (STASH_CATALOG[itemId]?.name || "Item") + " to Stash!");
  return true;
};

window.useFromStash = function(itemId) {
  if (state.stash && state.stash[itemId] && state.stash[itemId] > 0) {
    
    // Decrease count
    state.stash[itemId]--;
    
    // Clean up empty data to keep save file lightweight
    if (state.stash[itemId] === 0) {
      delete state.stash[itemId];
    }
    
    save();
    renderKeeperQuarters();
    toast("Used " + (STASH_CATALOG[itemId]?.name || "Item") + "!");
  }
};

function renderKeeperQuarters() {
  // 1. Initialize Keeper state if missing
  if (!state.keeper) {
    state.keeper = { 
      title: "Novice Breeder", 
      gender: "male", 
      equipment: { 
        body: "body_base.png",
        torso: null,
        head: null,
        legs: null
      } 
    };
  }
  
  // Update Profile Text
  document.getElementById('keeper-name-display').innerText = state.playerName || "Keeper";
  document.getElementById('keeper-title-display').innerText = state.keeper.title;

  // Render Layered Paper-Doll Avatar Images
  const eq = state.keeper.equipment || {};
  
  const bodyLayer = document.getElementById('layer-body');
  if (bodyLayer) {
    bodyLayer.src = `assets/avatar/${eq.body || 'body_base.png'}`;
  }

  const torsoLayer = document.getElementById('layer-torso');
  if (torsoLayer) {
    if (eq.torso) {
      torsoLayer.src = `assets/avatar/${eq.torso}`;
      torsoLayer.style.display = 'block';
    } else {
      torsoLayer.style.display = 'none';
    }
  }

  const headLayer = document.getElementById('layer-head');
  if (headLayer) {
    if (eq.head) {
      headLayer.src = `assets/avatar/${eq.head}`;
      headLayer.style.display = 'block';
    } else {
      headLayer.style.display = 'none';
    }
  }

  const legsLayer = document.getElementById('layer-legs');
  if (legsLayer) {
    if (eq.legs) {
      legsLayer.src = `assets/avatar/${eq.legs}`;
      legsLayer.style.display = 'block';
    } else {
      legsLayer.style.display = 'none';
    }
  }

  // 2. Render Stash Grid
  const stashGrid = document.getElementById('stash-grid');
  if (!stashGrid) return;
  
  stashGrid.innerHTML = ''; 
  const minSlots = 8;
  let currentSlots = 0;
  const stashData = state.stash || {};
  
  for (const [itemId, quantity] of Object.entries(stashData)) {
    if (quantity <= 0) continue;
    
    const itemDef = STASH_CATALOG[itemId] || { name: 'Unknown', icon: '❓' };
    const slot = document.createElement('div');
    slot.className = 'stash-slot filled';
    
    // Add visual HTML to the slot
    slot.innerHTML = `
      <div style="font-size: 2.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${itemDef.icon}</div>
      <div style="position: absolute; bottom: 4px; right: 6px; font-size: 0.85rem; font-weight: 800; color: #ffcf40; text-shadow: 0 1px 3px #000;">x${quantity}</div>
    `;
    
    // Clicking the item uses it
    slot.onclick = () => window.useFromStash(itemId);
    stashGrid.appendChild(slot);
    currentSlots++;
  }
  
  // Fill remaining space with empty slot outlines
  while (currentSlots < minSlots) {
    const emptySlot = document.createElement('div');
    emptySlot.className = 'stash-slot empty';
    stashGrid.appendChild(emptySlot);
    currentSlots++;
  }
}

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
  { id: "lamp", name: "Lamp walk", need: "lamp", art: "🏮" },
  { id: "spring", name: "Spring hall", need: "pool", art: "♨️" },
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
  if (state.muted) return; // Your master mute switch is already built in!
  
  if (kind === "merge") { beep(320, 0.07, "triangle", 0.05); setTimeout(() => beep(480, 0.1, "triangle", 0.06), 50); }
  else if (kind === "ash") beep(140, 0.16, "sawtooth", 0.03);
  else if (kind === "win") { beep(440, 0.12, "sine", 0.06); setTimeout(() => beep(660, 0.18, "sine", 0.06), 90); }
  else if (kind === "fail") beep(110, 0.28, "square", 0.04);
  else if (kind === "gather") beep(260, 0.06, "sine", 0.04);
  else if (kind === "buy") { beep(500, 0.08, "sine", 0.05); setTimeout(() => beep(700, 0.12, "sine", 0.05), 70); }
  else if (kind === "room") { beep(360, 0.1, "triangle", 0.05); setTimeout(() => beep(540, 0.16, "triangle", 0.05), 80); }
  else if (kind === "shiny") { beep(600, 0.1, "sine", 0.08); setTimeout(() => beep(900, 0.2, "triangle", 0.1), 80); }
  else if (kind === "click") { beep(800, 0.03, "square", 0.02); } // NEW: A short, snappy click for the Book!
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
function spawnFloatingText(x, y, text) {
  const p = document.createElement('div');
  p.className = 'floating-text';
  p.innerHTML = `${text} <span class="spinning-coin">🪙</span>`;
  p.style.left = x + 'px';
  p.style.top = y + 'px';
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 1000);
}
function xpNeed(lv) { return 30 + lv * 20; }
const levelQueue = [];
let levelShowing = false;
let currentBookTab = 0; // 0 = Main, 1 = Rare
let bankCoins = 0;
let bankTimer = 60; // 60 seconds per collection tick

function addXp(n) {
  if (!n) return;
  state.xp = (state.xp || 0) + n;
  state.level = state.level || 1;
  
  let leveledUp = false; // Helps us track if a level up actually happened this time

  while (state.xp >= xpNeed(state.level)) {
    state.xp -= xpNeed(state.level);
    state.level += 1;
    leveledUp = true; // Flag that we grew a level!
    const u = applyLevelUnlock(state.level);
    levelQueue.push({
      level: state.level,
      unlock: u,
      chest: state.level % 5 === 0,
    });
  }

  // --- NEW: Update the Header Display instantly ---
  if (!levelShowing) showLevelEvent();
}

  // --- 1. SET UP THE FIRST MODAL ---
function showLevelEvent() {
  const ev = levelQueue.shift();
  if (!ev) { levelShowing = false; return; }
  levelShowing = true;
  
  const t = document.getElementById("chestTitle");
  const s = document.getElementById("chestSub");
  const box = document.getElementById("chestBox");
  const okBtn = document.getElementById("chestOk");
  
  if (t) t.textContent = "Level " + ev.level;
  if (s) s.textContent = ev.unlock || "The ember burns brighter.";
  
  // Clean out the old text loot container just in case
  const loot = document.getElementById("rewardList");
  if (loot) loot.innerHTML = "";
  
  if (box) {
    box.style.display = ev.chest ? "block" : "none";
    
    // Set the CLOSED chest image
    box.style.backgroundImage = "url('Images/chest-closed.png')"; 
    box.dataset.level = ev.chest ? String(ev.level) : "";
    box.disabled = false;
  }
  
  if (okBtn) {
    // If there is a chest, hide the continue button so they HAVE to click the chest!
    okBtn.style.display = ev.chest ? "none" : "block";
    okBtn.textContent = "Continue";
  }
  
  document.getElementById("chest")?.classList.add("open");
  sfx("room");
}
// --- STASH & KEEPER LOGIC ---
window.addToStash = function(itemId, amount = 1) {
  if (STASH_CATALOG[itemId] && STASH_CATALOG[itemId].type === 'dragon') {
    console.warn("Dragons cannot be stashed!");
    return false; 
  }

  if (!state.stash) state.stash = {};
  if (!state.stash[itemId]) state.stash[itemId] = 0;
  
  state.stash[itemId] += amount;
  
  save(); 
  renderKeeperQuarters();
  toast("Added " + amount + " " + (STASH_CATALOG[itemId]?.name || "Item") + " to Stash!");
  return true;
};

window.useFromStash = function(itemId) {
  if (state.stash && state.stash[itemId] && state.stash[itemId] > 0) {
    state.stash[itemId]--;
    
    if (state.stash[itemId] === 0) {
      delete state.stash[itemId];
    }
    
    save();
    renderKeeperQuarters();
    toast("Used " + (STASH_CATALOG[itemId]?.name || "Item") + "!");
  }
};

function renderKeeperQuarters() {
  // 1. Initialize Keeper state with equipment slots if missing
  if (!state.keeper) {
    state.keeper = {
      title: "Novice Breeder",
      gender: "male", // can toggle between male/female templates
      equipment: {
        body: "assets/avatar/body_base.png",
        torso: null, // e.g., "breeder_tunic.png"
        head: null,   // e.g., "leather_cap.png"
        legs: null    // e.g., "breeder_pants.png"  
      }
    };
  }
  
  // Update Profile Text
  document.getElementById('keeper-name-display').innerText = state.playerName || "Keeper";
  document.getElementById('keeper-title-display').innerText = state.keeper.title;

  // Render Layered Paper-Doll Avatar Images
  const eq = state.keeper.equipment || {};
  
  const bodyLayer = document.getElementById('layer-body');
  if (bodyLayer) {
    bodyLayer.src = `assets/avatar/${eq.body || 'body_base.png'}`;
  }

  const legsLayer = document.getElementById('layer-legs');
  if (legsLayer) {
    if (eq.legs) {
      legsLayer.src = `assets/avatar/${eq.legs}`;
      legsLayer.style.display = 'block';
    } else {
      legsLayer.style.display = 'none';
    }
  }

  const torsoLayer = document.getElementById('layer-torso');
  if (torsoLayer) {
    if (eq.torso) {
      torsoLayer.src = `assets/avatar/${eq.torso}`;
      torsoLayer.style.display = 'block';
    } else {
      torsoLayer.style.display = 'none';
    }
  }

  const headLayer = document.getElementById('layer-head');
  if (headLayer) {
    if (eq.head) {
      headLayer.src = `assets/avatar/${eq.head}`;
      headLayer.style.display = 'block';
    } else {
      headLayer.style.display = 'none';
    }
  }

  // 2. Render Stash Grid
  const stashGrid = document.getElementById('stash-grid');
  if (!stashGrid) return;
  
  stashGrid.innerHTML = ''; 
  const minSlots = 8;
  let currentSlots = 0;
  const stashData = state.stash || {};
  
  for (const [itemId, quantity] of Object.entries(stashData)) {
    if (quantity <= 0) continue;
    
    const itemDef = STASH_CATALOG[itemId] || { name: 'Unknown', icon: '❓' };
    const slot = document.createElement('div');
    slot.className = 'stash-slot filled';
    
    // Add visual HTML to the slot
    slot.innerHTML = `
      <div style="font-size: 2.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${itemDef.icon}</div>
      <div style="position: absolute; bottom: 4px; right: 6px; font-size: 0.85rem; font-weight: 800; color: #ffcf40; text-shadow: 0 1px 3px #000;">x${quantity}</div>
    `;
    
    // Clicking the item uses it
    slot.onclick = () => window.useFromStash(itemId);
    stashGrid.appendChild(slot);
    currentSlots++;
  }
  
  // Fill remaining space with empty slot outlines
  while (currentSlots < minSlots) {
    const emptySlot = document.createElement('div');
    emptySlot.className = 'stash-slot empty';
    stashGrid.appendChild(emptySlot);
    currentSlots++;
  }
}

// --- 2. FIREWORKS & THE REVEAL ---
function revealChest() {
  const box = document.getElementById("chestBox");
  const lv = box && box.dataset.level ? +box.dataset.level : 1;
  
  // 1. Swap image to OPEN chest
  if (box) {
     box.style.backgroundImage = "url('Images/chest-open.png')";
     box.disabled = true;
  }
  
  // 2. Safe Visuals & Audio (Will not crash if functions are missing)
  try {
    const rect = box.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    if (typeof spawnParticles === "function") {
      spawnParticles(cx, cy, 20, '#ffea75'); 
      setTimeout(() => spawnParticles(cx, cy, 25, '#ffcf40'), 150);
      setTimeout(() => spawnParticles(cx, cy, 15, '#d45817'), 300);
    }
    if (typeof sfx === "function") sfx("win");
  } catch (err) { console.log("Visuals skipped safely"); }
  
  // 3. Loot Math
  const tier = Math.max(1, Math.floor(lv / 5));
  const coins = 3000 * tier;
  const eggs = Math.min(8, 2 + tier * 2);
  
  if (typeof state !== "undefined") state.coins = (state.coins || 0) + coins;
  const lines = ["🪙 " + coins + " ember coins", eggs + " eggs ➔ nest"];
  
  // 4. Safe Spawning (This is what likely crashed it!)
  try {
    if (typeof spawn === "function") {
      for (let i = 0; i < eggs; i++) spawn(0, 1);
      if (tier >= 2) { spawn(1, 1); spawn(1, 1); lines.push("2 hatchlings ➔ nest"); }
      if (tier >= 3) { spawn(2, 1); lines.push("1 wyrmling ➔ nest"); }
      if (tier >= 5) { spawn(3, 1); lines.push("1 Young ➔ nest"); }
    }
  } catch (err) { console.log("Spawning skipped safely"); }
  
  // 5. Trigger the Second Modal (This is guaranteed to run now!)
  setTimeout(() => {
    document.getElementById("chest").classList.remove("open");
    
    const loot = document.getElementById("rewardList");
    if (loot) {
      loot.innerHTML = lines.map(x => "<div style='padding:8px 0; font-size:0.95rem; border-bottom: 1px solid rgba(222, 183, 129, 0.2);'>" + x + "</div>").join("");
    }
    
    document.getElementById("lootModal")?.classList.add("open");
  }, 900);
  
  try {
    if (typeof save === "function") save(); 
    if (typeof render === "function") render();
  } catch (err) {}
}

function applyLevelUnlock(lv) {
  if (lv === 2) { state.pouchBonus = (state.pouchBonus || 0) + 3; return "trail pouch +3"; }
  if (lv === 3) return "Hearth wish unlocked";
  if (lv === 4) { openFogFree(3); return "3 land opened"; }
  if (lv === 6) { state.maxEnergy = Math.max(state.maxEnergy || 5, 6); return "max energy 6"; }
  if (lv === 8) { state.pouchBonus = (state.pouchBonus || 0) + 3; return "trail pouch +3"; }
  return "Your legacy ascends.";
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
  if (app) app.setAttribute("data-theme", state.theme);
  }

let perchArmed = -1;

function perchIncome() {
  let total = 0;
  if (!state.perch) return total;
  
  for (let i = 0; i < 3; i++) {
    if (state.perch[i]) {
      const yieldData = getPerchYield(state.perch[i], i);
      total += yieldData.total;
    }
  }
  return total;
}

function tributeCost() {
  return 25000 + ((state.tributes || 0) * 25000);
}

function showGuide() {
  document.getElementById("guide")?.classList.add("open");
}

function seatPerch(slot, boardI) {
  if (!perchOpen(slot) || state.mode === "stage") return;
  const cells = board();
  const draggedItem = cells[boardI];
  if (!draggedItem) return;
  
  const existingPerch = state.perch[slot];
  
  // Calculate income for the floating pop-up (+30, etc.)
  const curve = [5, 15, 30, 60, 120, 240];
  const incomeValue = Math.floor((curve[draggedItem.level] || 5) * (draggedItem.shiny ? 2.5 : 1));
  
  // Grab the perch element position *before* the render wipes or changes it
  const targetPerchEl = document.querySelectorAll('.perch')[slot];
  let spawnX = window.innerWidth / 2;
  let spawnY = window.innerHeight / 2;
  if (targetPerchEl) {
    const rect = targetPerchEl.getBoundingClientRect();
    spawnX = rect.left + rect.width / 2;
    spawnY = rect.top + rect.height / 2;
  }
  
  if (draggedItem.count > 1) {
    if (existingPerch) {
      toast("Perch must be empty to split stack.");
      return;
    } else {
      state.perch[slot] = { level: draggedItem.level, count: 1, shiny: draggedItem.shiny, element: draggedItem.element || "neutral" };
      draggedItem.count -= 1;
    }
  } else {
    state.perch[slot] = { level: draggedItem.level, count: 1, shiny: draggedItem.shiny, element: draggedItem.element || "neutral" };
    cells[boardI] = existingPerch ? { level: existingPerch.level, count: 1, shiny: existingPerch.shiny, element: existingPerch.element || "neutral" } : null;
  }

  // Trigger the floating text particle with the rotating coin
  spawnFloatingText(spawnX, spawnY, `+${incomeValue}`);

  perchArmed = -1;
  sfx("buy");
  save(); render();
}

function emptyPerch(slot) {
  const p = state.perch[slot];
  if (!p) return;
  
  const free = emptyOpen();
  if (!free.length) {
    toast("Board full");
    return;
  }
  
  // Drop it onto a free cell while preserving its exact element and shiny status!
  const spot = free[Math.floor(Math.random() * free.length)];
  const cells = board();
  cells[spot] = { 
    level: p.level, 
    count: p.count, 
    shiny: p.shiny,  // <-- The comma was missing right here!
    element: p.element || "neutral" 
  };

  state.perch[slot] = null;
  perchArmed = -1;
  save(); 
  render();
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
        <image href="Images/egg-art.png" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="-webkit-user-drag: none; user-select: none; pointer-events: none;" />
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
    const imgs = ["Images/hatchling-1.png", "Images/hatchling-2.png", "Images/hatchling-3.png", "Images/hatchling-4.png"];
    const currentImg = imgs[n - 1] || imgs[0];
    return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" ${shiny ? 'style="filter: drop-shadow(0 0 4px #ffcf40);"' : ''}>
      <g style="animation: breathe 1.4s infinite ease-in-out; transform-origin: 16px 16px;">
        <image href="${currentImg}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="-webkit-user-drag: none; user-select: none; pointer-events: none;" />
      </g>
    </svg>`;
  }

  if (level === 2) {
    const imgs = ["Images/wyrmling-1.png", "Images/wyrmling-2.png", "Images/wyrmling-3.png", "Images/wyrmling-4.png"];
    const currentImg = imgs[n - 1] || imgs[0];
    return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" ${shiny ? 'style="filter: drop-shadow(0 0 4px #ffcf40);"' : ''}>
      <g style="animation: breathe 1.5s infinite ease-in-out; transform-origin: 16px 16px;">
        <image href="${currentImg}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="-webkit-user-drag: none; user-select: none; pointer-events: none;" />
      </g>
    </svg>`;
  }

  if (level === 3) {
    const imgs = ["Images/young-1.png", "Images/young-2.png", "Images/young-3.png", "Images/young-4.png"];
    const currentImg = imgs[n - 1] || imgs[0];
    return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" ${shiny ? 'style="filter: drop-shadow(0 0 4px #ffcf40);"' : ''}>
      <g style="animation: breathe 1.6s infinite ease-in-out; transform-origin: 16px 16px;">
        <image href="${currentImg}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="-webkit-user-drag: none; user-select: none; pointer-events: none;" />
      </g>
    </svg>`;
  }

  if (level === 4) {
    const imgs = ["Images/hearth-1.png", "Images/hearth-2.png", "Images/hearth-3.png", "Images/hearth-4.png"];
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
    const elderImages = ["Images/elder-1.png", "Images/elder-1.png", "Images/elder-1.png", "Images/elder-1.png"]; 
    const currentImg = IMG_DIR + elderImages[n - 1] || IMG_DIR + elderImages[0];
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
  // Added width="42" height="42" to perfectly match your dragon sizing!
  return `<svg viewBox="0 0 32 32" width="42" height="42" aria-hidden="true" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
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
  tributes: 0,
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
    // Add this inside your load() or initGame() function after fetching the save:
    if (!gameState.keeper) {
        gameState.keeper = {
            name: "Keeper",
            title: "Novice Breeder",
            avatar: "Images/hearth-1.png"
        };
    }

    // Initialize stash as a dictionary for stackable items
    if (!gameState.stash) {
        gameState.stash = {}; // Example: { 'time_skip_1h': 2, 'rare_egg': 1 }
    }
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
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl?.classList.add("show");
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
  if (el) el?.classList.add("open");
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
  
  // Calculate exactly where the dragon goes
  const i = at != null && !cells[at] && !isLocked(at) ? at : free[Math.floor(Math.random() * free.length)];
  
  // Calculate if it is shiny
  const shiny = forceShiny || (Math.random() < 0.05);
  if (shiny) discoverRare(level);

// Pick an element only for Tier 2 and above. Eggs and Hatchlings stay neutral!
  let assignedElement = null;
  if (level >= 2) {
    const CORE_ELEMENTS = ["fire", "water", "nature"];
    assignedElement = CORE_ELEMENTS[Math.floor(Math.random() * CORE_ELEMENTS.length)];
  } else {
    assignedElement = "neutral";
  }

  // Save everything (including the neutral/assigned element) to the exact cell
  cells[i] = { level, count, shiny, element: assignedElement };
  
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

  // --- MAJORITY ELEMENT INHERITANCE LOGIC ---
  // Compare stack counts to see whose element takes command!
  let carriedElement = "neutral";
  if (a.count > b.count) {
    carriedElement = a.element || "neutral";
  } else if (b.count > a.count) {
    carriedElement = b.element || "neutral";
  } else {
    // If counts are equal, prioritize the dragged item, or fall back to whichever has an active element
    carriedElement = a.element && a.element !== "neutral" ? a.element : (b.element || "neutral");
  }

  let total = a.count + b.count;
  cells[fromI] = null;
  let produced = 0;
  while (total >= 5) {
    total -= 5;
    produced += 1;
  }
  if (produced) {
    const next = a.level + 1;
    
    // --- ELEMENTAL MUTATION LOGIC ---
    // Carry the element forward, but if it's hitting Level 2+ and was neutral, awaken an element!
    let finalElement = carriedElement;
    if (next >= 2 && (!finalElement || finalElement === "neutral")) {
      const CORE_ELEMENTS = ["fire", "water", "nature"];
      finalElement = CORE_ELEMENTS[Math.floor(Math.random() * CORE_ELEMENTS.length)];
    }
    // --------------------------------

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
      // 1. Lock the newly upgraded Dragon (with finalElement) directly under the player's mouse
      cells[toI] = { level: next, count: produced, shiny: isShiny, element: finalElement };
      
      // 2. Safely bounce the leftover un-merged items back (retaining their element too)
      cells[fromI] = { level: a.level, count: total, shiny: a.shiny, element: carriedElement };
    } else {
      // Perfect 5-merge with no leftovers (carrying the awakened element forward)
      cells[toI] = { level: next, count: produced, shiny: isShiny, element: finalElement };
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
    // Just stacking items together without hitting 5
    cells[toI] = { level: a.level, count: total, shiny: a.shiny, element: carriedElement };
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
  
  // --- GUARANTEED EXTRA STARTING EGG ---
  // Drops an extra Level 0 egg into the very first cell to prevent early-game stalls
  state.stageCells[0] = { level: 0, count: 1, shiny: false };

  for (let i = 1; i < COLS * ROWS && bagIndex < TRAIL_BAG.length; i++) {
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

// --- DRAGON BOOK PAGINATION LOGIC ---
let currentBookPage = 0; // Starts at Tier 0 (Egg)

// Arrow Click Handlers (Using the "gather" sfx as a nice paper-flip sound!)
document.getElementById("prevPageBtn")?.addEventListener("click", () => {
  if (currentBookPage > 0) {
    currentBookPage--;
    renderBook();
    sfx("gather"); 
  }
});

document.getElementById("nextPageBtn")?.addEventListener("click", () => {
  if (currentBookPage < CHAIN.length - 1) {
    currentBookPage++;
    renderBook();
    sfx("gather"); 
  }
});

function renderBook() {
  const spread = document.getElementById("bookSpread");
  if (!spread) return;
  
  state.book = state.book || { 0: true };
  state.rareBook = state.rareBook || {};
  
  const isRare = currentBookTab === 1;
  const known = isRare ? !!state.rareBook[currentBookPage] : !!state.book[currentBookPage];
  const spec = CHAIN[currentBookPage];
  
  // 1. Update Arrow States (Disable if at start or end of the book)
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");
  if (prevBtn) prevBtn.disabled = currentBookPage === 0;
  if (nextBtn) nextBtn.disabled = currentBookPage === CHAIN.length - 1;

  // 2. Build the Two-Page Spread
  let artHtml = "";
  let textHtml = "";

  if (known) {
    artHtml = dragonSvg(currentBookPage, 75, 1, isRare); // Big dragon!
    textHtml = `
      <h3 style="color: #2b1d14; margin: 0 0 8px 0; font-family: 'Playfair Display', serif; font-size: 1.1rem; border-bottom: 1px solid rgba(43,29,20,0.3); padding-bottom: 4px;">
        ${isRare ? '✨ ' : ''}${spec.name}
      </h3>
      <p style="color: #4a2c17; font-size: 0.75rem; font-family: 'Montserrat', sans-serif; margin: 0; line-height: 1.4;">
        ${isRare ? '<strong>Perch Bonus:</strong> 2.5x coin rate.<br><br>' : ''}${LORE[currentBookPage]}
      </p>
    `;
  } else {
    // Locked Page Template
    artHtml = `<div style="font-size: 3rem; opacity: 0.4; filter: grayscale(100%);">❓</div>`;
    textHtml = `
      <h3 style="color: #2b1d14; margin: 0 0 8px 0; font-family: 'Playfair Display', serif; font-size: 1.1rem; border-bottom: 1px solid rgba(43,29,20,0.3); padding-bottom: 4px; opacity: 0.5;">
        Unknown
      </h3>
      <p style="color: #4a2c17; font-size: 0.75rem; font-family: 'Montserrat', sans-serif; margin: 0; opacity: 0.6; font-style: italic;">
        ${isRare ? 'Find a shiny variant in the mountain.' : 'Not yet hatched.'}
      </p>
    `;
  }

  // 3. Inject into the DOM
  spread.innerHTML = `
    <div class="page-left">
      ${artHtml}
    </div>
    <div class="page-right">
      ${textHtml}
    </div>
  `;

// 4. Update the tracker numbers for BOTH tabs simultaneously
  const countMain = document.getElementById("countMain");
  const countRare = document.getElementById("countRare");
  
  if (countMain) countMain.textContent = bookKnown();
  if (countRare) countRare.textContent = rareBookKnown();
}

// Reset page to 0 when swapping between Main and Rare tabs
window.switchBookTab = (tabIndex) => {
  currentBookTab = tabIndex;
  currentBookPage = 0; 
  document.getElementById("tabMain").classList.toggle("active", tabIndex === 0);
  document.getElementById("tabRare").classList.toggle("active", tabIndex === 1);
  renderBook();
};

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
  if (el) el?.classList.add("open");
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
    
    // FIX: Send the player back to the Home Board instead of the Trials menu!
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.querySelector('[data-tab="view-board"]')?.classList.add("active");
    document.getElementById("view-board")?.classList.add("active");
    
  } else {
    state.mode = "stage";
    generateTrail();
    toast("Ash Trail • burn " + ASH_GOAL + " ash to finish");
    if (!state.seenGuide) showGuide();
    
    // Go to BOARD tab to play
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.querySelector('[data-tab="view-board"]')?.classList.add("active");
    document.getElementById("view-board")?.classList.add("active");
    
    // --- FORCE LOCK EXPLICITLY ON STAGE ENTRY ---
    document.documentElement.classList.add("lock-scroll");
    document.body.classList.add("lock-scroll");
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
  if (el) el?.classList.add("open");
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
  if (state.coins < cost) { toast(`Land costs ${cost} <span class="spinning-coin">🪙</span>`); return; }
  state.coins -= cost;
  state.locked[i] = false;
  toast("Land opened");
  save(); render();
}

function gather() {
  console.log("Gather clicked! Current Energy:", state.energy);
  if (state.mode === "stage") {
    if ((state.trailGathers || 0) <= 0){
      toast("Trail pouch is empty • merge what you have");
      return;
    }
    // Added a warning if the stage board is full
    if (!spawn(0, 1)){
      toast("No space left on the board!");
      return;
    }
    state.trailGathers -= 1;
    sfx("gather");

    save();
    render();
    renderBoard();
    
    return;
  }

  // Safety check: force energy to be a number
  if (typeof state.energy !== 'number') state.energy = 5;

  if (state.energy <= 0){
    toast("Energy empty • wait a moment");
    return;
  }

  //The fix: Tell the player WHY it won't spawn
  if (!spawn(0, 1)){
    toast("No space left on the board");
    return;
  }

  state.energy -= 1;

  // --- Bulletproof Gather Particles ---
  const gBtn = document.getElementById("gather");
  if (gBtn) {
    const rect = gBtn.getBoundingClientRect();
    spawnParticles(rect.left + (rect.width / 2), rect.top + (rect.height / 2), 8, '#ff8033'); 
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

function itemHtml(item) {
  const spec = CHAIN[item.level];
  
  // Tier-coded border colors matching progression power
  const tierBorders = ["#4a2c17", "#6b4a32", "#d45817", "#ff6a20", "#ffcf40", "#ffe08a"];
  const borderColor = tierBorders[item.level] || "#4a2c17";

// --- Elemental Badge Setup (Only show for Fire, Water, or Nature) ---
  let elementIcon = "";
  if (item.element === "fire") elementIcon = "Images/ember.png";
  else if (item.element === "water") elementIcon = "Images/water.png";
  else if (item.element === "nature") elementIcon = "Images/leaf.png";

  const badgeHTML = elementIcon ? `
    <img src="${elementIcon}" alt="${item.element}" style="
      position: absolute; 
      top: 2px; 
      right: 2px; 
      width: 18px; 
      height: 18px; 
      border-radius: 50%;
      aspect-ratio: 1;
      object-fit: cover;
      filter: drop-shadow(0 2px 3px rgba(0,0,0,0.85)); 
      z-index: 10; 
      pointer-events: none;
    ">` : "";

  return `<div class="item pop" style="position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
    
    <!-- Custom Elemental Badge -->
    ${badgeHTML}

    ${dragonSvg(item.level, 42, item.count, item.shiny)}
    
    <!-- Floating Name Pill with Tier Border -->
    <div class="lvl" style="
      position: absolute; 
      bottom: -4px; 
      font-size: 0.65rem; 
      font-weight: 700; 
      letter-spacing: 0.5px;
      color: ${item.shiny ? '#ffcf40' : '#f8ece4'}; 
      background: linear-gradient(to bottom, rgba(30, 21, 17, 0.95), rgba(18, 12, 10, 0.95));
      border: 1px solid ${borderColor};
      padding: 1px 6px; 
      border-radius: 8px;
      white-space: nowrap;
      box-shadow: 0 2px 4px rgba(0,0,0,0.8);
      z-index: 5;
    ">
      ${item.shiny ? '✨ ' : ''}${spec.name}
    </div>

    ${item.count > 1 ? `
      <!-- Stack Count Badge (Moved to Top-Left so it doesn't collide with the element icon) -->
      <div style="
        position: absolute; 
        top: 2px; 
        left: 4px; 
        background: var(--ember); 
        color: white; 
        font-size: 0.6rem; 
        font-weight: 800; 
        padding: 1px 4px; 
        border-radius: 6px; 
        border: 1px solid #ffcf40;
        box-shadow: 0 1px 3px rgba(0,0,0,0.5);
        z-index: 5;
      ">
        ×${item.count}
      </div>
    ` : ''}
  </div>`;
}


function renderQuest() {
  const box = document.getElementById("questBox");
  const topBox = document.getElementById("topQuestBox"); // We now use both boxes!
  if (!box || !topBox) return; // UI Safety check!
  
  // 1. STAGE MODE (Only 1 Quest)
  if (state.mode === "stage") {
    const have = board().some(c => c && c.level >= STAGE_GOAL);
    box.className = "quest quest-card";
    box.style.display = "block"; // Ensure it's visible
    box.style.backgroundImage = "linear-gradient(rgba(11, 22, 51, 0.75), rgba(11, 22, 51, 0.9)), url('Images/Mountains%20View.jpg')";
    box.style.backgroundSize = "cover";
    box.style.backgroundPosition = "center";
    box.style.border = "1px solid #778da9"; 
    
    box.innerHTML = `
      <div class="art">${dragonSvg(STAGE_GOAL, 42)}</div>
      <p>Burn <b>${ASH_GOAL} ash</b> • ${state.ashBurned || 0}/${ASH_GOAL} cleared<br>
      <span style="font-size:0.7rem; color:#deb781;">Live ash limits: ${ashCount()}/${ASH_FAIL}</span></p>
      <button id="giveBtnStage" disabled>${have ? "Done" : "Goal"}</button>
    `;
    
    topBox.style.display = "none"; // Hide the second card
    updateCarouselDots();
    return;
  }

  // 2. HOME MODE (1 or 2 Quests)
  const homeBg = "linear-gradient(rgba(11, 22, 51, 0.43), rgb(11, 22, 51)), url('Images/Mountains%20View.jpg')";
  
  // Apply base styles to both cards
  box.className = "quest sleepy quest-card";
  box.style.backgroundImage = homeBg;
  box.style.backgroundSize = "cover";
  box.style.backgroundPosition = "center";

  topBox.className = "quest sleepy quest-card";
  topBox.style.backgroundImage = homeBg;
  topBox.style.backgroundSize = "cover";
  topBox.style.backgroundPosition = "center";

  const hasSleepy = !state.sleepyDone && state.level >= 3;

  // Set up Normal Quest Data (used in both scenarios)
  const list = wishList();
  const q = list[state.quest % list.length];
  const haveNormal = findLevel(q.want) >= 0;
  const normalQuestHTML = `
    <div style="display:flex; align-items:center; gap:12px; width:100%;">
      <div class="art">${dragonSvg(q.want, 40)}</div>
      <div style="flex:1;">
        <p id="wishText" style="margin: 0; line-height: 1.4;">${state.questDone ? "The nest settles..." : q.text}<br>
        <span style="font-size:0.7rem;">Gifts: ${(state.gives || 0) % 5}/5</span></p>
      </div>
      <!-- Wrapped the single button to match Sleepy's layout spacing -->
      <div style="display:flex; flex-direction:column; justify-content:center;">
        <button id="giveBtnNormal" ${haveNormal && !state.questDone ? "" : "disabled"}>${state.questDone ? "✨" : "Give"}</button>
      </div>
    </div>
  `;
  // --- RENDER LOGIC ---
  if (hasSleepy) {
    // We have TWO quests: Put Sleepy in the first box, Normal in the second box
    box.style.display = "block";
    topBox.style.display = "block"; 
    
    // --- NEW: Enable scrolling when 2 cards exist ---
    if (box.parentElement) {
      box.parentElement.style.overflowX = "auto";
    }
    
    const haveSleepy = findLevel(3) >= 0; 
    box.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; width:100%;">
        <div class="art">
          ${dragonSvg(3, 40)}
          <div class="zzz">Zzz</div>
        </div>
        <div style="flex:1;">
          <p style="color:#a9d6e5; margin: 0; line-height: 1.4;">Sleepy Dragon needs a <b>Young</b> dragon.<br>
          <span style="font-size:0.7rem;">Streak: ${state.sleepyStreak || 0}/7</span></p>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px; justify-content:center;">
          <button id="giveBtnSleepy" ${haveSleepy ? "" : "disabled"}>Wake</button>
          <button id="sleepyInfoBtn" style="padding:4px; font-size:0.7rem; background:#415a77; border-color:#e0e1dd; box-shadow:0 2px 0 #1b263b;">Info</button>
        </div>
      </div>
    `;
    topBox.innerHTML = normalQuestHTML;

    // Attach Click Handlers for BOTH
    const btnSleepy = document.getElementById("giveBtnSleepy");
    if (btnSleepy) btnSleepy.onclick = fulfillSleepy;
    
    const sInfo = document.getElementById("sleepyInfoBtn");
    if (sInfo) sInfo.onclick = () => document.getElementById("sleepyGuide")?.classList.add("open");
    
    const btnNormal = document.getElementById("giveBtnNormal");
    if (btnNormal) btnNormal.onclick = fulfillQuest;
    
  } else {
    // We only have ONE quest. Put it in the first box and hide the second box.
    box.style.display = "block";
    topBox.style.display = "none";
    topBox.innerHTML = "";
    
    box.innerHTML = normalQuestHTML;
    
    // --- NEW: Lock the scroll and snap back! ---
    if (box.parentElement) {
      box.parentElement.style.overflowX = "hidden"; // Disables scrolling entirely
      box.parentElement.scrollLeft = 0;             // Snaps back to the start
    }
    
    // Attach Click Handlers
    const btnNormal = document.getElementById("giveBtnNormal");
    if (btnNormal) btnNormal.onclick = fulfillQuest;
  }
  
  // Re-attach Wish text click handler (for normal quests)
  const wish = document.getElementById("wishText");
  if (wish && !state.questDone) {
    wish.style.cursor = "pointer";
    wish.onclick = () => {
      const pay = q.reward * bonus();
      toast(CHAIN[q.want].name + " • " + q.reward + " × " + bonus() + " = " + pay + " 🪙");
    };
  }

  // Update dots based on what is visible!
  updateCarouselDots();
}

function tickEnergy() {
  const cap = state.maxEnergy || MAX_ENERGY;
  
  // 1. Update the New App UI Header Stats
  setSafeText("energyCount", state.energy + "/" + cap);
  
  const timerEl = document.getElementById("energyTimer");

  if (state.energy >= cap) {
    state.nextEnergyAt = Date.now() + REGEN_MS;
    
    // Set new timer to FULL and turn it gold
    if (timerEl) {
      timerEl.innerText = "FULL";
      timerEl.style.color = "#d4af37"; 
    }
    setSafeText("regen", ""); // Clears the old UI just in case it's still in your HTML
  } else {
    if (!state.nextEnergyAt) state.nextEnergyAt = Date.now() + REGEN_MS;
    let left = state.nextEnergyAt - Date.now();
    
    if (left <= 0) {
      state.energy = Math.min(cap, state.energy + 1);
      state.nextEnergyAt = Date.now() + REGEN_MS;
      save();
      render();
    } else {
      // Convert remaining milliseconds into MM:SS format
      const totalSeconds = Math.ceil(left / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const formattedSeconds = seconds.toString().padStart(2, '0');
      
      // Update new timer
      if (timerEl) {
        timerEl.innerText = `${minutes}:${formattedSeconds}`;
        timerEl.style.color = "#a0a0b5"; // Keep it grey while counting
      }
      setSafeText("regen", ""); // Clears the old UI
    }
  }
}

  const pBtn = document.getElementById("collectPerchBtn");
  if (pBtn) {
    if ((state.perchBank || 0) > 0) {
      pBtn.style.display = "block";
      setSafeText("perchBankAmt", state.perchBank);
    } else {
      pBtn.style.display = "none";
    }
  }

  const inc = perchIncome();
  if (!inc) {
    setSafeText("perchLabel", "Perch: park a dragon");
  } else {
    const wait = Math.max(0, state.perchAt + PERCH_MS - Date.now());
    setSafeText("perchLabel", "Perch: " + Math.ceil(wait / 1000) + "s • +" + inc);
  }


function renderTrialBanner() {
  const box = document.getElementById("trialBox");
  if (!box) return;
  const have = board().some(c => c && c.level >= STAGE_GOAL);
  
  box.className = "quest sleepy";
  box.style.width = "100%";
  box.style.boxSizing = "border-box";
  box.style.display = "flex";
  box.style.alignItems = "center";
  box.style.justifyContent = "space-between";
  
  box.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
      <!-- Removed background/padding constraints from .art so the svg overflows cleanly -->
      <div class="art" style="flex-shrink: 0; background: none; border: none; padding: 0; min-width: auto; min-height: auto; margin-left: 0px;">
        ${dragonSvg(STAGE_GOAL, 100)}
      </div>
      
      <div style="flex: 1; margin-left: 10px;">
        <p style="margin: 0; font-size: 0.9rem; color: #ffffff;">Ash Trial • Mountain Embers <b> </b><br>
        <span style="font-size: 0.75rem; color: #deb781;">${state.ashBurned || 0}/${ASH_GOAL} cleared • Limits: ${ashCount()}/${ASH_FAIL}</span></p>
      </div>
      
      <button id="trialBtn" style="background: linear-gradient(to bottom, #415a77, #1b263b); border: 1px solid #778da9; color: #e0e1dd; font-weight: 700; padding: 8px 14px; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 0 #0d1b2a; flex-shrink: 0; margin-left: auto;">
        ${state.mode === "stage" ? "Leave" : "Enter"}
      </button>
    </div>
  `;
  
  const tBtn = document.getElementById("trialBtn");
  if (tBtn) tBtn.onclick = enterStage;
}

// --- ROOST & DRAGON PICKER LOGIC ---
let roostTargetSlot = -1;

function renderRoost() {
  const container = document.getElementById("roostPerchContainer");
  if (!container) return;
  
  state.perch = state.perch || [null, null, null];
  const slotNames = ["Hatchery Hearth", "Moss Alcove", "Lamp Walk"];
  
  const themes = [
    { border: "#d45817", bg: "rgba(40, 15, 5, 0.5)", glow: "rgba(212, 88, 23, 0.25)", synergyText: "Loves Fire Dragons" }, 
    { border: "#76c893", bg: "rgba(10, 35, 20, 0.5)", glow: "rgba(118, 200, 147, 0.2)", synergyText: "Loves Nature Dragons" }, 
    { border: "#ffcf40", bg: "rgba(30, 25, 10, 0.5)", glow: "rgba(255, 207, 64, 0.2)", synergyText: "Loves Water Dragons" }  
  ];
  
  // Track the sum of all active perches
  let grandTotalIncome = 0;
  
  container.innerHTML = [0, 1, 2].map(i => {
    const open = perchOpen(i);
    const p = state.perch[i];
    const t = themes[i];
    
    // --- 1. LOCKED SLOT ---
    if (!open) {
      return `<div style="background: rgba(15, 23, 42, 0.8); border: 1px dashed #415a77; padding: 24px; border-radius: 16px; text-align: center; opacity: 0.6; box-shadow: inset 0 4px 15px rgba(0,0,0,0.6);">
        <span style="font-size: 1.8rem; filter: grayscale(100%); opacity: 0.5;">🔒</span>
        <h4 style="margin: 10px 0 0; color: #778da9; font-family: 'Playfair Display', serif;">${slotNames[i]}</h4>
        <span style="font-size: 0.7rem; color: #415a77; text-transform: uppercase; letter-spacing: 1px;">Sealed</span>
      </div>`;
    }
    
// --- 2. OCCUPIED ALCOVE ---
    if (p) {
      const yieldData = getPerchYield(p, i);
      grandTotalIncome += yieldData.total; 
      const hasSynergy = yieldData.hasSynergy;
      
      let elementIcon = "";
      if (p.element === "fire") elementIcon = "Images/ember.png";
      else if (p.element === "water") elementIcon = "Images/water.png";
      else if (p.element === "nature") elementIcon = "Images/leaf.png";
      
      const badgeHTML = elementIcon ? `
        <img src="${elementIcon}" alt="${p.element}" style="
          position: absolute; top: 0px; right: 0px; width: 22px; height: 22px; 
          border-radius: 50%; aspect-ratio: 1; object-fit: cover;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.9)); z-index: 10;
        ">` : "";
      
      return `<div style="position: relative; background: linear-gradient(to bottom, rgba(15,20,35,0.85), rgba(10,15,25,0.95)), url('Images/Mountains%20View.jpg'); background-size: cover; background-position: center; border: 1px solid ${hasSynergy ? t.border : (p.shiny ? '#ffea75' : '#415a77')}; padding: 18px; border-radius: 16px; display: flex; align-items: center; gap: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.6), inset 0 0 40px ${hasSynergy ? t.glow : 'rgba(0,0,0,0)'};">
        
        <div style="position: relative; background: radial-gradient(circle, ${hasSynergy ? t.glow : 'rgba(255,255,255,0.05)'} 0%, rgba(0,0,0,0.8) 80%); border-radius: 50%; width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: inset 0 4px 10px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5);">
          ${badgeHTML}
          ${dragonSvg(p.level, 56, 1, p.shiny)}
        </div>
        
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h4 style="margin: 0; font-family: 'Playfair Display', serif; color: ${p.shiny ? '#ffea75' : '#e0e1dd'}; font-size: 1.2rem; text-shadow: 1px 1px 3px rgba(0,0,0,0.9);">
              ${p.shiny ? '✨ ' : ''}${CHAIN[p.level].name}
            </h4>
            ${hasSynergy ? `<span style="font-size: 0.6rem; background: ${t.border}; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold; letter-spacing: 0.5px; box-shadow: 0 0 8px ${t.border};">SYNERGY</span>` : ''}
          </div>
          
          <p style="margin: 4px 0 0; font-size: 0.7rem; color: ${hasSynergy ? t.border : '#778da9'}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${slotNames[i]}</p>
          
          <div style="margin-top: 8px; display: inline-block; background: rgba(0,0,0,0.5); padding: 4px 10px; border-radius: 6px; border: 1px solid ${hasSynergy ? t.border : 'rgba(255, 207, 64, 0.2)'};">
            <span style="font-size: 0.8rem; font-weight: 800; color: ${hasSynergy ? t.border : '#ffcf40'};">
              +${yieldData.base} 🪙/m ${hasSynergy ? `<span style="color: #ffea75; margin-left: 4px; text-shadow: 0 0 5px rgba(255, 234, 117, 0.5);">(+${yieldData.bonus} ✨)</span>` : ''}
            </span>
          </div>
        </div>
        
        <button onclick="emptyPerch(${i})" style="background: linear-gradient(to bottom, #a12b2b, #5c1414); border: 1px solid #ff4d4d; color: #f8ece4; padding: 12px; border-radius: 10px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.5);">Return</button>
      </div>`;
    }
    
    // --- 3. EMPTY ALCOVE ---
    return `<div style="background: ${t.bg}; border: 2px dashed ${t.border}; padding: 24px; border-radius: 16px; text-align: center; cursor: pointer; box-shadow: inset 0 4px 20px rgba(0,0,0,0.6);" onclick="openPickerModal(${i})">
      <div style="width: 48px; height: 48px; margin: 0 auto 12px; border-radius: 50%; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; border: 1px solid ${t.border}; box-shadow: 0 2px 8px rgba(0,0,0,0.5);">
        <span style="font-size: 1.8rem; color: ${t.border}; font-weight: bold;">+</span>
      </div>
      <h4 style="margin: 0; color: ${t.border}; font-family: 'Playfair Display', serif; font-size: 1.1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">Send to ${slotNames[i]}</h4>
      <span style="font-size: 0.75rem; color: rgba(224, 225, 221, 0.8); display: block; margin-top: 4px;">${t.synergyText}</span>
    </div>`;
    
  }).join("");
  
  // Push the final calculated tally to the Bank Vault UI
  const vaultIncomeEl = document.getElementById("bankRate");
  if (vaultIncomeEl) {
    vaultIncomeEl.innerText = `+${grandTotalIncome}/m`;
  }
}

function openPickerModal(slotId) {
  if (state.mode === "stage") {
    toast("Return to the nest first!");
    return;
  }
  roostTargetSlot = slotId;
  const grid = document.getElementById("roostPickerGrid");
  const modal = document.getElementById("roostPickerModal");
  if (!grid || !modal) return;
  
  grid.innerHTML = "";
  
  // 1. Gather all eligible dragons and remember their original board index
  const cells = board();
  let eligibleDragons = cells.map((cell, index) => ({ cell, index }))
    .filter(item => item.cell && !isLocked(item.index) && !isAsh(item.index));
    
  // 2. Sort them from Highest Level to Lowest (and put Shiny dragons first in ties)
  eligibleDragons.sort((a, b) => {
    if (b.cell.level !== a.cell.level) {
      return b.cell.level - a.cell.level; // Highest level first
    }
    return (b.cell.shiny ? 1 : 0) - (a.cell.shiny ? 1 : 0); // Shiny first if same level
  });
  
  // 3. Render the sorted list
  if (eligibleDragons.length === 0) {
    grid.innerHTML = `<div style="grid-column: span 3; color: #deb781; font-size: 0.85rem; padding: 20px;">No dragons available on the board. Gather some eggs!</div>`;
  } else {
    eligibleDragons.forEach(item => {
      const cell = item.cell;
      const originalIndex = item.index; // We need this so it pulls the correct dragon from the board!
      
      const card = document.createElement("div");
      card.style.background = "linear-gradient(to bottom, #1b263b, #0d1b2a)";
      card.style.border = `1px solid ${cell.shiny ? '#ffcf40' : '#415a77'}`;
      card.style.borderRadius = "8px";
      card.style.padding = "10px 4px";
      card.style.cursor = "pointer";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.alignItems = "center";
      
      // Grab the element and force lowercase
      let el = (cell.element || "neutral").toLowerCase();

      // Translate old save data to match your actual image files!
      if (el === "fire") el = "ember";
      if (el === "nature") el = "leaf";

      card.innerHTML = `
        ${dragonSvg(cell.level, 42, 1, cell.shiny)}
        
        <!-- NEW: Element Badge (With auto-translator and broken-image hider) -->
        <div style="display: flex; align-items: center; justify-content: center; gap: 4px; background: rgba(0,0,0,0.5); border: 1px solid #415a77; padding: 2px 6px; border-radius: 4px; margin-top: 6px;">
           <img src="Images/${el}.png" style="width: 14px; height: 14px; flex-shrink: 0; object-fit: cover; border-radius: 50%;" onerror="this.style.display='none'">
           <span style="font-size: 0.6rem; color: #deb781; text-transform: capitalize;">${el}</span>
        </div>

        <span style="font-size: 0.65rem; font-weight: 700; color: ${cell.shiny ? '#ffcf40' : '#e0e1dd'}; margin-top: 6px; text-align: center;">
          ${cell.shiny ? '✨ ' : ''}${CHAIN[cell.level].name}
        </span>
        ${cell.count > 1 ? `<span style="font-size: 0.6rem; color: #ff8033; font-weight: 700; margin-top: 2px;">(x${cell.count})</span>` : ''}
      `;
      
      // Pass the original board index to the click handler
      card.onclick = () => selectDragonForRoost(originalIndex);
      grid.appendChild(card);
    });
  }
  
  modal.style.display = "flex";
}

function selectDragonForRoost(boardIndex) {
  if (roostTargetSlot < 0 || roostTargetSlot > 2) return;
  
  const cells = board();
  const draggedItem = cells[boardIndex];
  if (!draggedItem) return;
  
  // Preserve the element when sending to the perch!
  const itemElement = draggedItem.element || "neutral";

  if (draggedItem.count > 1) {
    state.perch[roostTargetSlot] = { level: draggedItem.level, count: 1, shiny: draggedItem.shiny, element: itemElement };
    draggedItem.count -= 1;
  } else {
    state.perch[roostTargetSlot] = { level: draggedItem.level, count: 1, shiny: draggedItem.shiny, element: itemElement };
    cells[boardIndex] = null; 
  }
  
  sfx("buy");
  toast(`Sent ${CHAIN[draggedItem.level].name} to the Roost!`);
  closePickerModal();
  save(); 
  render();
}

function closePickerModal() {
  roostTargetSlot = -1;
  document.getElementById("roostPickerModal").style.display = "none";
}

// Attach listener to the close button
document.getElementById("closePickerBtn")?.addEventListener("click", closePickerModal);

function render() {
  rollDaily();
// --- Safe temporary patch to assign elements to existing board items ---
  const activeCells = board();
  if (Array.isArray(activeCells)) {
    activeCells.forEach(cell => {
      if (cell && !cell.element) {
        const CORE_ELEMENTS = ["fire", "water", "nature"];
        cell.element = CORE_ELEMENTS[Math.floor(Math.random() * CORE_ELEMENTS.length)];
      }
    });
  }
  // Update texts safely without crashing
  setSafeHTML("title", state.mode === "stage" ? "Ash <span>Trial</span>" : "Ember <span>Nest</span>");

  // Render Quests and Trials live on the screen
  renderQuest();
  renderTrialBanner();

  setSafeText("hint", state.mode === "stage" ? "Leave trial" : trailWaitLabel());
  setSafeText("muteBtn", state.muted ? "🔇" : "🔊");
  setSafeText("lvlChip", "Lv " + (state.level || 1) + " • " + (state.xp || 0) + "/" + xpNeed(state.level || 1));
  
  // Hide perchRow in trials, show it on the home board
  const perchRow = document.getElementById("perchRow");
  if (perchRow) {
    perchRow.style.display = (state.mode === "stage") ? "none" : "";
  }
  
  // --- Bulletproof "Leave Trial" Button Toggle ---
  const exitBtn = document.getElementById("exitTrialBtn");
  if (exitBtn) {
    if (state.mode === "stage") {
      exitBtn.style.setProperty("display", "block", "important");
      exitBtn.onclick = enterStage; // Bind the click directly
    } else {
      exitBtn.style.setProperty("display", "none", "important"); // Force hide everywhere else
    }
  }
// --- Dynamic Auto Merge Button State Check ---
  const autoBtn = document.getElementById("autoMergeBtn");
  if (autoBtn) {
    if (state.mode === "stage") {
      autoBtn.style.setProperty("display", "none", "important"); // Hide during Ash Trail
    } else {
      autoBtn.style.setProperty("display", "inline-flex", "important");
      
      if ((state.level || 1) >= 5) {
        autoBtn.textContent = "Auto Merge";
        autoBtn.disabled = false;
        autoBtn.classList.remove("locked-btn");
        autoBtn.style.opacity = "1";
        autoBtn.style.cursor = "pointer";
        autoBtn.style.pointerEvents = "auto";
      } else {
        autoBtn.textContent = "Auto Merge (Lv. 5)";
        autoBtn.disabled = true;
        autoBtn.classList.add("locked-btn");
      }
    }
  }

  // ... rest of your render function code ...
  // 1. Update the New App UI Header Stats
  setSafeText("coinCount", state.coins);
  setSafeText("energyCount", state.energy + "/" + (state.maxEnergy || MAX_ENERGY));
  // ... rest of your render function code ...
  
  const nl = document.getElementById("nameLine");
  if (nl) {
    const n = state.playerName || "Keeper";
    nl.textContent = n + (state.nameChanges ? "" : " • tap to name");
  }
  setSafeText("bonus", bonus());
  
  if (gatherBtn) {
    // We removed the disabled line so the button is ALWAYS clickable!
    // The gather() function will handle the warning messages instead.
    
    gatherBtn.textContent = state.mode === "stage" 
      ? "Gather egg • " + (state.trailGathers || 0) + " left" 
      : "Gather egg 🥚";
  }

  setSafeText("helpText", state.mode === "stage" 
    ? "Merge next to ash to clear it • Wyrmlings clear 4 directions" 
    : "5-merge to grow • tap fogged tiles to open land • quests use one dragon");

  renderBook();
  
// --- Buy Egg Button Visibility ---
  const buy = document.getElementById("buyEgg");
  if (buy) {
    buy.innerHTML = "Buy egg • " + eggPrice() + ' <span class="spinning-coin">🪙</span>';
    
    if (state.mode === "stage") {
      buy.style.setProperty("display", "none", "important"); // Forces through the CSS lock
      buy.disabled = true;
      buy.style.opacity = ".45";
    } else {
      buy.style.setProperty("display", "inline-flex", "important");
      buy.disabled = false;
      buy.style.opacity = "1";
    }
  }
  
  renderQuest();
  renderRoost();
  
  setSafeText("tributeBtn", `Mountain Tribute: ${tributeCost()} 🪙 (+1 Bonus)`);

  if (nestEl) {
    nestEl.innerHTML = DECOR.map(d => {
      const owned = !!state.decor[d.id];
      return `<div class="decor ${owned ? "owned" : ""}" data-decor="${d.id}">
        <div class="ico">${d.art}</div>
        <div>${d.name}</div>
        <div>${owned ? "placed" : d.cost + " 🪙"}</div>
      </div>`;
    }).join("");
  }
  
  setSafeText("roomCount", roomsOpen());
  
const mt = document.getElementById("mountain");
  if (mt) {
    const openN = roomsOpen();
    mt.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${ROOMS.map((r, i) => {
          const open = i < openN;
          const now = i === openN - 1;
          const isSelected = state.theme === r.id;
          
          // Check if room requires a decor item
          const decorItem = r.need ? DECOR.find(d => d.id === r.need) : null;
          const costText = decorItem ? `${decorItem.cost} 🪙` : "";

          // 1. ADD YOUR IMAGES HERE (Map the room's ID to its exact filename)
          const roomImages = {
            "hatchery": "Images/Hatchery.jpg",
            "alcove": "Images/moss alcove.jpg",
            "lamp": "Images/lamp walk.jpg",
            "spring": "Images/spring hall.jpg",
            "vault": "Images/tea vault.jpg",
            // You can easily add more here later!
            // "spring": "Spring Hall.jpg",
          };

          // 2. BUILD THE BACKGROUND STYLE CLEANLY
          const bgImage = roomImages[r.id];
          let bgStyle = open ? 'rgba(27, 38, 59, 0.4)' : 'rgba(15, 23, 42, 0.7)'; // Default colors
          
          if (bgImage) {
             // If this room has an image in our list above, use it!
             bgStyle = `linear-gradient(rgba(11, 0, 172, 0.27), rgba(18, 12, 10, 0.9)), url('${bgImage}')`;
          }

          return `
            <div class="room ${open ? "open" : ""} ${now ? "now" : ""} ${isSelected ? "now" : ""}" data-room="${r.id}"
                 style="border: 1px solid #778da9; border-radius: 8px; padding: 12px 100px; min-height: 48px; background: ${bgStyle}; background-size: cover; background-position: center; opacity: ${open ? '1' : '0.75'}; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s ease;">
              
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 1.5rem; filter: ${open ? 'none' : 'grayscale(100%)'};">${r.art}</span>
                <div>
                  <h4 style="margin: 0; color: #e0e1dd; font-size: 0.95rem;">${open ? r.name : "🔒 " + r.name}</h4>
                  <small style="color: #deb781;">${open ? (r.need ? "Unlocked via " + r.need : "Starting Room") : "Locked"}</small>
                </div>
              </div>

              <div>
                ${!open && costText ? `
                  <button onclick="event.stopPropagation(); buyDecor('${r.need}')" 
                          style="background: linear-gradient(to bottom, #415a77, #1b263b); border: 1px solid #778da9; color: #ffcf40; font-weight: 700; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; box-shadow: 0 2px 0 #0d1b2a;">
                    Unlock: ${costText}
                  </button>
                ` : `<span class="room-status" style="color: ${isSelected ? '#ffcf40' : '#76c893'};">${isSelected ? 'Active' : (open ? 'Ready' : '')}</span>`}
              </div>

            </div>
          `;
        }).join("")}
      </div>
    `;
  }
  
  applyTheme(state.theme || "hatchery");
  
  const pr = document.getElementById("perchRow");
  const prNest = document.getElementById("perchRowNest");
  
  function handlePerchClick(e) {
  const el = e.target.closest("[data-perch]");
  if (!el) return;
  const i = +el.dataset.perch;
  if (!perchOpen(i) || state.mode === "stage") return;
  if (state.perch[i] && perchArmed !== i) { emptyPerch(i); return; }
  perchArmed = perchArmed === i ? -1 : i;
  render();
  if (perchArmed >= 0) toast("Tap a nest dragon to perch it");
}
  if (pr || prNest) {
    state.perch = state.perch || [null, null, null];
    
    const perchHTML = [0, 1, 2].map(i => {
      const open = perchOpen(i);
      const p = state.perch[i];
      const armed = perchArmed === i;
      
      // Locked state (No img tag)
      if (!open) {
        return `<div class="perch lock" data-perch="${i}">
                  <span>Locked</span>
                </div>`;
      }
      
      // Occupied state (Bigger dragon, clean absolute-positioned label)
      if (p) {
        return `<div class="perch on ${armed ? "armed" : ""}" data-perch="${i}">
                  <!-- The Dragon: Sized up to 38px and shifted slightly up to center nicely -->
                  <div style="transform: translateY(-5px); z-index: 1;">
                    ${dragonSvg(p.level, 38, 1, p.shiny)}
                  </div>
                  
                  <!-- The Label: A tiny, elegant glass pill at the bottom -->
                  <div style="position: absolute; bottom: 4px; font-size: 0.55rem; font-weight: 700; letter-spacing: 0.5px; background: rgba(10, 5, 3, 0.8); border: 1px solid ${p.shiny ? '#ffcf40' : 'rgba(222, 183, 129, 0.3)'}; color: ${p.shiny ? '#ffea75' : '#e0e1dd'}; padding: 2px 6px; border-radius: 6px; white-space: nowrap; z-index: 2; box-shadow: 0 2px 4px rgba(0,0,0,0.6);">
                    ${p.shiny ? '✨ ' : ''}${CHAIN[p.level].name}
                  </div>
                </div>`;
      }
      
      // Empty state (No img tag! Just the text)
      return `<div class="perch ${armed ? "armed" : ""}" data-perch="${i}">
                <span style="font-size: 0.65rem; font-weight: 700;">Empty Perch</span>
              </div>`;
    }).join("");

    if (pr) pr.innerHTML = perchHTML;
    if (prNest) prNest.innerHTML = perchHTML;
  }
  
  const cells = board();
  if (boardEl) {
    boardEl.innerHTML = "";
    for (let i = 0; i < cells.length; i++) {
      const cell = document.createElement("div");
      const flashed = state._flash && state._flash.includes(i);
      cell.className = "cell" + (isLocked(i) ? " locked" : "") + (isAsh(i) ? " ash" : "") + (flashed ? " flash" : "");
      cell.dataset.i = i;
      if (isLocked(i)) cell.innerHTML = "fog • " + unlockCost() + ' <span class="spinning-coin">🪙</span>';
      else if (isAsh(i)) cell.innerHTML = ashSvg();
      else if (cells[i]) cell.innerHTML = itemHtml(cells[i]);
      boardEl.appendChild(cell);
    }
  }
  
  if (state.mode === "stage") checkTrailStuck();
  if (state._flash && state._flash.length) {
    setTimeout(() => { state._flash = []; }, 280);
  }

  renderKeeperQuarters();
  tickEnergy();
}

function cellFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const cell = el.closest(".cell");
  return cell ? +cell.dataset.i : null;
}

boardEl?.addEventListener("pointerdown", (e) => {
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
// Tab Switching Logic
let pendingTab = null;
let pendingViewId = null;
let drag = null, ghost = null;

boardEl?.addEventListener("pointermove", (e) => {
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
      perch?.classList.add("valid");
    }
  } else if (cell) {
    const over = +cell.dataset.i;
    if (over == null || isLocked(over) || isAsh(over)) return;
    const a = board()[drag.from];
    const b = board()[over];
    if (over !== drag.from && a && ((b && a.level === b.level) || !b)) {
      cell?.classList.add("valid");
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

    // --- 1. DROPPING ONTO A PERCH ---
    if (perchEl && state.mode !== "stage") {
        const slot = +perchEl.dataset.perch;
        if (perchOpen(slot) && cells[from]) {
            const draggedItem = cells[from];
            const existingPerch = state.perch[slot];
            const curve = [5, 15, 30, 60, 120, 240];
            const incomeValue = Math.floor((curve[draggedItem.level] || 5) * (draggedItem.shiny ? 2.5 : 1));
            const rect = perchEl.getBoundingClientRect();
            spawnFloatingText(rect.left + rect.width / 2, rect.top + rect.height / 2, `+${incomeValue}`);
            
            // Capture the element so we don't lose it!
            const itemElement = draggedItem.element || "neutral";
            
            if (draggedItem.count > 1) {
                if (existingPerch) {
                   toast("Perch must be empty to split stack.");
                } else {
                   state.perch[slot] = { level: draggedItem.level, count: 1, shiny: draggedItem.shiny, element: itemElement };
                   draggedItem.count -= 1;
                   sfx("buy");
                }
            } else {
                state.perch[slot] = { level: draggedItem.level, count: 1, shiny: draggedItem.shiny, element: itemElement };
                cells[from] = existingPerch ? { level: existingPerch.level, count: 1, shiny: existingPerch.shiny, element: existingPerch.element || "neutral" } : null;
                sfx("buy");
            }
        }
    } 
    // --- 2. DROPPING ONTO THE BOARD ---
    else if (cellEl) {
        const to = parseInt(cellEl.dataset.i, 10);
        if (from !== to && !isLocked(to)) {
            if (!cells[to]) {
                // Move to an empty tile
                cells[to] = cells[from];
                cells[from] = null;
            } else if (cells[from].level === cells[to].level) {
                // Merge if levels match
                mergeInto(from, to);
            } else {
                // Swap places if levels are different
                const temp = cells[to];
                cells[to] = cells[from];
                cells[from] = temp;
            }
        }
    }

    drag = null;
    save(); 
    render();
    endDrag();
}

function initGame() {
  
  // --- DRAG & DROP LISTENERS ---
  boardEl?.addEventListener("pointerup", endDrag);
  boardEl?.addEventListener("pointercancel", endDrag);

  // --- MOUNTAIN & NEST LISTENERS ---
  nestEl?.addEventListener("click", (e) => {
    const el = e.target.closest("[data-decor]");
    if (el) buyDecor(el.dataset.decor);
  });

  document.getElementById("mountain")?.addEventListener("click", (e) => {
    const el = e.target.closest("[data-room]");
    if (!el) return;
    const id = el.dataset.room;
    const room = ROOMS.find(r => r.id === id);
    if (!room) return;
    if (room.need && !state.decor[room.need]) { toast("That room is still sealed"); return; }
    applyTheme(id);
    save(); 
    render();
  });

  document.getElementById("perchRow")?.addEventListener("click", (e) => {
    const el = e.target.closest("[data-perch]");
    if (!el) return;
    const i = +el.dataset.perch;
    if (!perchOpen(i) || state.mode === "stage") return;
    if (state.perch[i] && perchArmed !== i) { emptyPerch(i); return; }
    perchArmed = perchArmed === i ? -1 : i;
    render();
    if (perchArmed >= 0) toast("Tap a nest dragon to perch it");
  });

  // --- CORE GAME BUTTONS ---
  gatherBtn?.addEventListener("click", gather);
  
  document.getElementById("dragonBank")?.addEventListener("click", () => {
    const bankValue = state.perchBank || 0;
    if (bankValue > 0) {
      state.coins += bankValue;
      toast("Collected " + bankValue + " 🪙 from the Dragon Bank!");
      
      state.perchBank = 0;
      state.perchAt = Date.now(); // <-- THIS RESETS THE TIMER!
      
      sfx("gather");
      document.getElementById("dragonBank").classList.remove("is-maxed");
      save();
      render();
    } else {
      toast("The perches are still gathering coins...");
    }
  });

  document.getElementById("hint")?.addEventListener("click", enterStage);
  
  document.getElementById("muteBtn")?.addEventListener("click", () => {
    state.muted = !state.muted;
    save(); 
    render();
    toast(state.muted ? "Sound off" : "Sound on");
  });

  // --- MODALS (CHESTS & LOOT) ---
  document.getElementById("chestOk")?.addEventListener("click", () => {
    document.getElementById("chest").classList.remove("open");
    levelShowing = false;
    showLevelEvent(); 
  });
  document.getElementById("chestBox")?.addEventListener("click", revealChest);
  document.getElementById("lootOk")?.addEventListener("click", () => {
    document.getElementById("lootModal").classList.remove("open");
    levelShowing = false;
    showLevelEvent(); 
  });

  // --- ASH TRAIL OVERLAYS ---
  document.getElementById("restartTrail")?.addEventListener("click", restartTrail);
  document.getElementById("winHome")?.addEventListener("click", hideTrailWin);
  document.getElementById("winAgain")?.addEventListener("click", () => {
    hideTrailWin();
    restartTrail();
  });
  document.getElementById("homeTrail")?.addEventListener("click", () => {
    hideTrailFail();
    state.mode = "home";
    resetTrail();
    toast("Returned to the nest");
    save(); 
    render();
  });

  // --- RENAMING SYSTEM ---
  document.getElementById("nameLine")?.addEventListener("click", () => {
    const free = (state.nameChanges || 0) === 0;
    document.getElementById("nameHint").textContent = free ? "First change is free." : "Rename costs " + RENAME_COST + " 🪙.";
    document.getElementById("nameInput").value = state.playerName || "";
    document.getElementById("nameBox")?.classList.add("open");
  });
  document.getElementById("nameNo")?.addEventListener("click", () => {
    document.getElementById("nameBox").classList.remove("open");
  });
  document.getElementById("nameGo")?.addEventListener("click", () => {
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
    save(); 
    render();
  });

  // --- DRAGON BOOK ---
  document.getElementById("bookBtn")?.addEventListener("click", () => {
    sfx("click"); 
    renderBook();
    document.getElementById("book")?.classList.add("open");
  });
  document.getElementById("bookClose")?.addEventListener("click", () => {
    document.getElementById("book").classList.remove("open");
    switchBookTab(0); 
  });
  document.getElementById("book")?.addEventListener("click", (e) => {
    if (e.target.id === "book") {
      document.getElementById("book").classList.remove("open");
      switchBookTab(0); 
    }
  });
  document.getElementById("resetBookBtn")?.addEventListener("click", () => {
    if (confirm("Are you sure you want to reset your Dragon Book progress? This will lock discovered entries again.")) {
      state.book = { 0: true };
      state.rareBook = {};
      save();
      renderBook();
      toast("Dragon Book reset.");
    }
  });

  // --- HARD RESET / WIPE ---
  document.getElementById("resetBookGameBtn")?.addEventListener("click", () => {
    document.getElementById("book")?.classList.remove("open");
    document.getElementById("wipe")?.classList.add("open");
    const inp = document.getElementById("wipeInput");
    if (inp) { inp.value = ""; document.getElementById("wipeGo").disabled = true; inp.focus(); }
  });
  document.getElementById("resetAll")?.addEventListener("click", () => {
    document.getElementById("wipe")?.classList.add("open");
    const inp = document.getElementById("wipeInput");
    if (inp) { inp.value = ""; document.getElementById("wipeGo").disabled = true; inp.focus(); }
  });
  document.getElementById("wipeInput")?.addEventListener("input", (e) => {
    document.getElementById("wipeGo").disabled = e.target.value.trim() !== "Delete";
  });
  document.getElementById("wipeGo")?.addEventListener("click", () => {
    if (document.getElementById("wipeInput").value.trim() !== "Delete") return;
    localStorage.removeItem(SAVE);
    for (let v = 1; v <= 10; v++) localStorage.removeItem("ember-nest-v" + v);
    location.reload();
  });
  document.getElementById("wipeNo")?.addEventListener("click", () => {
    document.getElementById("wipe")?.classList.remove("open");
  });

  // --- OVERFLOW MODAL ---
  document.getElementById("overClose")?.addEventListener("click", () => {
    document.getElementById("overflow").classList.remove("open");
    overflowArm = null;
  });
  document.getElementById("overPerch")?.addEventListener("click", () => {
    if (freePerchSlot() < 0) { toast("No open perch"); return; }
    overflowArm = "perch";
    document.getElementById("overflow").classList.remove("open");
    toast("Tap a nest dragon to perch it");
  });
  document.getElementById("overDrop")?.addEventListener("click", () => {
    overflowArm = "dismiss";
    document.getElementById("overflow").classList.remove("open");
    toast("Tap a nest dragon to dismiss it");
  });

  // --- GUIDES ---
  document.getElementById("guideBtn")?.addEventListener("click", showGuide);
  document.getElementById("guideClose")?.addEventListener("click", () => {
    state.seenGuide = true;
    document.getElementById("guide").classList.remove("open");
    save();
  });
  document.getElementById("sleepyGuideClose")?.addEventListener("click", () => {
    document.getElementById("sleepyGuide").classList.remove("open");
  });

  // --- TAB SWITCHING (NEST) ---
  document.querySelectorAll(".nest-tab-btn").forEach(btn => {
    btn?.addEventListener("click", (e) => {
      document.querySelectorAll(".nest-tab-btn").forEach(b => {
        b.classList.remove("active");
        b.style.background = "#1b263b"; 
      });
      document.querySelectorAll(".nest-sub-view").forEach(v => {
        v.style.display = "none";
      });
      const targetSubTab = e.currentTarget;
      targetSubTab.classList.add("active");
      targetSubTab.style.background = "#415a77"; 
      const subViewId = targetSubTab.dataset.subtab;
      const activeSubView = document.getElementById(subViewId);
      if (activeSubView) activeSubView.style.display = "block";
    });
  });
}

// The function that actually switches the screens
function executeTabSwitch(targetTab, viewId) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  
  targetTab?.classList.add("active");
  document.getElementById(viewId)?.classList.add("active");

  // Dynamic Scroll Lock (locking both html and body)
  if (viewId === "view-board") {
    document.documentElement.classList.add("lock-scroll");
    document.body.classList.add("lock-scroll");
  } else {
    document.documentElement.classList.remove("lock-scroll");
    document.body.classList.remove("lock-scroll");
  }
}
// 4. Prevent scrolling when the body has the "lock-scroll" class
window.addEventListener("wheel", (e) => {
  if (document.body.classList.contains("lock-scroll")) {
    e.preventDefault();
  }
}, { passive: false });
// 1. Intercepting the Tab Click
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn?.addEventListener("click", (e) => {
    const targetTab = e.currentTarget;
    const viewId = targetTab.dataset.tab;

    if (state.mode === "stage" && viewId !== "view-board") {
      pendingTab = targetTab;
      pendingViewId = viewId;
      
      const modal = document.getElementById("forfeitModal");
      if (modal) modal.style.display = "block";
      return; 
    }

    executeTabSwitch(targetTab, viewId);
  });
});

// 2. "Cancel"
document.getElementById("cancelWarningBtn")?.addEventListener("click", () => {
  const modal = document.getElementById("forfeitModal");
  if (modal) modal.style.display = "none";
  pendingTab = null;
  pendingViewId = null;
});

// 3. "Leave"
document.getElementById("confirmWarningBtn")?.addEventListener("click", () => {
  const modal = document.getElementById("forfeitModal");
  if (modal) modal.style.display = "none";
  
  state.mode = "home";
  resetTrail();
  save();
  
  const exitBtn = document.getElementById("exitTrialBtn");
  if (exitBtn) exitBtn.style.display = "none";
  
  render();
  
  if (pendingTab && pendingViewId) {
    executeTabSwitch(pendingTab, pendingViewId);
  }
  
  pendingTab = null;
  pendingViewId = null;
});

load();

// --- FORCE SCROLL LOCK ON INITIAL PAGE LOAD ---
document.documentElement.classList.add("lock-scroll");
document.body.classList.add("lock-scroll");

// --- BACKGROUND DRAGON BANK SYNC ---
// --- UNIFIED BACKGROUND TICK LOOP (Energy Regen & Dragon Bank) ---
setInterval(() => {
  // 1. Handle Energy Regeneration
  const cap = state.maxEnergy || MAX_ENERGY;
  if (state.energy < cap) {
    if (!state.nextEnergyAt) state.nextEnergyAt = Date.now() + REGEN_MS;
    let left = state.nextEnergyAt - Date.now();
    if (left <= 0) {
      state.energy = Math.min(cap, state.energy + 1);
      state.nextEnergyAt = Date.now() + REGEN_MS;
      save();
      // 🔥 RENDER CALL REMOVED: Your dragging will never be interrupted again! 🔥
    }
  }

  // 2. Handle Perch / Dragon Bank Accumulation
  if (state.mode === "home" && (state.perch || []).some(Boolean)) {
    if (!state.perchAt) state.perchAt = Date.now();
    
    if (Date.now() >= state.perchAt + PERCH_MS) {
      const ticks = Math.floor((Date.now() - state.perchAt) / PERCH_MS);
      if (ticks > 0) {
        // 1 tick = 1 minute, so you get the full perchIncome() amount!
        const inc = perchIncome() * ticks;
        
        // 8 hours of capacity = 480 minutes
        const maxBank = perchIncome() * 480;        
        state.perchBank = Math.min(maxBank, (state.perchBank || 0) + inc);
        state.perchAt += ticks * PERCH_MS;
        save();
      }
    }
  }

  // 3. Refresh UI Elements Live Every Second
  tickEnergy(); 
  
  const currentInc = perchIncome();
  const maxBankLimit = currentInc * 480; // Matched to 8 hours!

  const bankCountEl = document.getElementById("bankCount");
  const dragonBankBtn = document.getElementById("dragonBank"); 
  const bankTimerDisplay = document.getElementById("bankTimer"); 

  if (bankCountEl) {
    const newVal = (state.perchBank || 0);

    if (dragonBankBtn && maxBankLimit > 0) {
      if (newVal >= maxBankLimit) {
        dragonBankBtn.classList.add("is-maxed");
        if (bankTimerDisplay) bankTimerDisplay.textContent = "MAX";
      } else {
        dragonBankBtn.classList.remove("is-maxed");
        if (bankTimerDisplay && state.perchAt) {
           const timeRemaining = Math.max(0, Math.ceil((state.perchAt + PERCH_MS - Date.now()) / 1000));
           bankTimerDisplay.textContent = `Next: ${timeRemaining}s`;
        }
      }
    }

    if (!bankCountEl.querySelector('.spinning-coin')) {
      bankCountEl.innerHTML = newVal + ' <span class="spinning-coin">🪙</span>';
    } else {
      bankCountEl.firstChild.nodeValue = newVal + " ";
    }
  }
  
  setSafeText("bankRate", currentInc > 0 ? "+" + currentInc + "/m" : "");
  
  if (state.perchAt && (state.perch || []).some(Boolean)) {
    const elapsed = Date.now() - state.perchAt;
    const left = Math.max(0, PERCH_MS - (elapsed % PERCH_MS));
    setSafeText("bankTimer", "Next: " + Math.ceil(left / 1000) + "s");
  } else {
    setSafeText("bankTimer", "Perch a dragon");
  }
}, 1000);

function updateCarouselDots() {
  const carousel = document.getElementById("quest-carousel");
  const dotsContainer = document.getElementById("quest-dots");
  
  if (!carousel || !dotsContainer) return;

  // Find cards with actual content
  const questCards = Array.from(carousel.querySelectorAll(".quest-card")).filter(card => card.innerHTML.trim() !== "" && card.style.display !== "none");

  // Hide dots if only 1 quest is active
  if (questCards.length <= 1) {
    dotsContainer.innerHTML = "";
    return;
  }

  dotsContainer.innerHTML = "";

  // Generate dots
  questCards.forEach((_, index) => {
    const dot = document.createElement("div");
    dot.className = "dot";
    
    const scrollIndex = Math.round(carousel.scrollLeft / carousel.offsetWidth) || 0;
    if (index === scrollIndex) dot.classList.add("active");
    
    dotsContainer.appendChild(dot);
  });

  // Listen to swiping
  carousel.onscroll = () => {
    const scrollIndex = Math.round(carousel.scrollLeft / carousel.offsetWidth);
    const allDots = dotsContainer.querySelectorAll(".dot");
    allDots.forEach((dot, i) => {
      dot.classList.toggle("active", i === scrollIndex);
    });
  };
}

// --- AUTO MERGE LOGIC ---
function triggerAutoMerge() {
  // 1. Safety Check: Ensure they are actually Level 5
  if ((state.level || 1) < 5) {
    toast("Auto Merge unlocks at Level 5!");
    return;
  }

  let mergedSomething = false;
  const cells = board();
  let keepChecking = true;

  // 2. The Sweeper: Loops over the board compressing everything it can
  while (keepChecking) {
    keepChecking = false;

    for (let i = 0; i < cells.length; i++) {
      if (!cells[i]) continue; // Skip empty tiles
      
      let shinyMatchIdx = -1;
      let standardMatchIdx = -1;

      // Look ahead to find a matching partner
      for (let j = i + 1; j < cells.length; j++) {
        if (!cells[j]) continue; 

        if (cells[i].level === cells[j].level) {
          // If we found a shiny match (or if 'i' is already shiny and this is a match), lock it!
          if (cells[i].shiny || cells[j].shiny) {
            shinyMatchIdx = j;
            break; // Stop looking, we found the perfect shiny pair!
          } else if (standardMatchIdx === -1) {
            standardMatchIdx = j; // Keep track of the first standard match just in case
          }
        }
      }

      // Prioritize the shiny match if we found one, otherwise fall back to standard
      const mergeIdx = shinyMatchIdx !== -1 ? shinyMatchIdx : standardMatchIdx;

      if (mergeIdx !== -1) {
        let fromI = i;
        let toI = mergeIdx;

        // CRITICAL FIX: If the target (j) is shiny but (i) is normal, we swap the direction!
        // This guarantees the shiny status survives even if they just stack (e.g., 2 + 2 = 4)
        // instead of fully leveling up and triggering the normal shiny inherit logic.
        if (cells[mergeIdx].shiny && !cells[i].shiny) {
          fromI = mergeIdx;
          toI = i;
        }

        const success = mergeInto(fromI, toI);
        
        if (success) {
          mergedSomething = true;
          keepChecking = true; // Restart the sweep to catch chain reactions!
          break; // Break the outer for-loop
        }
      }
    }
  }

  // 3. Finalize the Board
  if (mergedSomething) {
    save(); 
    render();
  } else {
    toast("The nest is completely tidy.");
  }
}
// --- DEV CHEAT: Tap the Level Pill to instantly Level Up! ---
document.querySelector(".level-pill")?.addEventListener("click", () => {
  // Gives you exactly the amount of XP needed to hit the next level
  addXp(xpNeed(state.level || 1)); 
});

// --- BOOT SEQUENCE ---
initGame();
load();

scanBook();

if (!state.hearthDone && (state.cells || []).some(it => it && it.level >= 4)) {
  completeHearthGoal();
}

if (!state.cells.some(Boolean)) {
  [0, 0, 0, 0, 0].forEach(lv => spawn(lv, 1));
  save();
}

render();