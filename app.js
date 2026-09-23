// ==========================================
// MODULE 1.5: UI SAFETY HELPERS
// ==========================================

function setSafeHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function setSafeText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
// ==========================================
// MODULE 1.5: UI & PATHING HELPERS
// ==========================================

// Guarantees we only ever have exactly one "assets/avatar/" prefix
function getCleanPath(rawName, defaultName = '') {
  let nameToClean = rawName || defaultName;
  if (!nameToClean) return '';
  let clean = nameToClean.replace(/assets\/avatar\//g, '').split('/').pop();
  return `assets/avatar/${clean}`;
}
function applyTheme(id) {
  state.theme = id || "hatchery";
  document.getElementById("app")?.setAttribute("data-theme", state.theme);
}

let guideReturnFocus = null;
function showGuide() {
  const guide = document.getElementById("guide");
  if (!guide || guide.classList.contains("open")) return;
  guideReturnFocus = document.activeElement;
  guide.classList.add("open");
  document.getElementById("guideClose")?.focus();
}

// Appearance is a device preference, independent of rooms and game saves.
const APPEARANCE_KEY = 'ember-nest-appearance';
function setAppearance(value, persist = true) {
  const dark = value === 'dark';
  document.documentElement.dataset.appearance = dark ? 'dark' : 'light';
  const button = document.getElementById('appearanceBtn');
  if (button) {
    button.textContent = dark ? '☀' : '☾';
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    button.title = dark ? 'Switch to light theme' : 'Switch to dark theme';
  }
  if (persist) {
    try { localStorage.setItem(APPEARANCE_KEY, dark ? 'dark' : 'light'); }
    catch (_) { toast('Theme changed for this visit; browser storage is unavailable.'); }
  }
}
let initialAppearance = 'light';
try { initialAppearance = localStorage.getItem(APPEARANCE_KEY); } catch (_) {}
setAppearance(initialAppearance, false);
document.getElementById('appearanceBtn')?.addEventListener('click', () => {
  setAppearance(document.documentElement.dataset.appearance === 'dark' ? 'light' : 'dark');
});

// Default to the device preference; an explicit in-game choice takes priority
// for dragon/tile effects. Other UI still follows reduced motion.
function setTileMotion(value, persist = true) {
  const mode = value === 'off' ? 'off' : 'on';
  document.documentElement.dataset.tileMotion = mode;
  const button = document.getElementById('tileMotionBtn');
  if (button) { button.setAttribute('aria-pressed',String(mode === 'on')); button.setAttribute('aria-label',`Dragon & tile motion: ${mode === 'on' ? 'On' : 'Off'}`); }
  if (persist) { try { localStorage.setItem('ember-nest-tile-motion',mode); } catch (_) {} }
}
let initialTileMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'off' : 'on';
try { initialTileMotion = localStorage.getItem('ember-nest-tile-motion') || initialTileMotion; } catch (_) {}
setTileMotion(initialTileMotion,false);
document.getElementById('tileMotionBtn')?.addEventListener('click',()=>setTileMotion(document.documentElement.dataset.tileMotion === 'on' ? 'off' : 'on'));

function closeGuide() {
  document.getElementById("guide")?.classList.remove("open");
  state.seenGuide = true;
  save();
  guideReturnFocus?.focus();
}
// --- GLOBAL DOM REFERENCES ---
const boardEl = document.getElementById("board");
const nestEl = document.getElementById("nest");
const toastEl = document.getElementById("toast");
const gatherBtn = document.getElementById("gather");

function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove("show"), 2500);
}

function showOverflow() {
  if (state.mode === "stage") return;
  
  const el = document.getElementById("overflow");
  const p = document.getElementById("overWhy");
  const slot = freePerchSlot(); // Ensures they actually have room before offering it
  
  if (p) {
    p.textContent = slot >= 0
      ? "Seat one on a perch, or dismiss one for a few coins (no bonus)."
      : "No free perch. Dismiss one dragon for a few coins (no bonus).";
  }
  
  const perchBtn = document.getElementById("overPerch");
  if (perchBtn) perchBtn.disabled = slot < 0;
  
  el?.classList.add("open");
}
window.toggleQuestTab = () => {
  state.questTab = state.questTab === 0 ? 1 : 0;
  render();
};

// ==========================================
// MODULE 2: STATE & MATH HELPERS
// ==========================================

const levelQueue = [];
let levelShowing = false;
let currentBookTab = 0; 
let bankCoins = 0;
let bankTimer = 60;
let currentCustomizerSlot = 'torso'; // Used by the mirror UI
// --- GLOBAL UI STATE TRACKERS ---
let currentBookPage = 0;
let currentBookElement = 'growth';
let perchArmed = -1;
let overflowArm = null;
let roostTargetSlot = -1;
let drag = null;
let ghost = null;
let pendingTab = null;
let pendingViewId = null;

function getPerchYield(p, i) {
  if (!p) return { base: 0, bonus: 0, total: 0, hasSynergy: false };
  
  const baseIncome = Math.floor((PERCH_INCOME_BY_LEVEL[p.level] || PERCH_INCOME_BY_LEVEL[0]) *
    (p.shiny ? PERCH_SHINY_MULTIPLIER : 1));
  
  const roomElements = ["fire", "nature", "water"]; 
  const hasSynergy = (p.element === roomElements[i] || p.element === "neutral");
  const bonusIncome = hasSynergy ? Math.floor(baseIncome * 0.5) : 0;
  
  return { base: baseIncome, bonus: bonusIncome, total: baseIncome + bonusIncome, hasSynergy };
}
// ==========================================
// MODULE 3: KEEPER'S CUSTOMIZER UI
// ==========================================

function openExpandedCustomizer() {
  const modal = document.getElementById('expandedCustomizerModal');
  if (modal) {
    modal.style.display = 'flex';
    // Note: Ensure renderExpandedModalLayers and renderExpandedItemGrid exist below!
    renderExpandedModalLayers();
    renderExpandedItemGrid(currentCustomizerSlot);
  }
}

function renderExpandedModalLayers() {
  const equipment = state.keeper?.equipment || {};

  // 1. Body Base Layer
  const bodyImg = document.getElementById('modal-layer-body');
  if (bodyImg) {
    bodyImg.src = IMG_DIR + (equipment.body || "body_base.png");
    bodyImg.style.display = 'block';
  }

  // 2. Dynamic Layers (Legs, Torso, Head)
  const layers = ['legs', 'torso', 'head'];
  layers.forEach(layer => {
    const imgEl = document.getElementById(`modal-layer-${layer}`);
    if (imgEl) {
      imgEl.style.display = equipment[layer] ? 'block' : 'none';
      if (equipment[layer]) imgEl.src = IMG_DIR + equipment[layer];
    }
  });

  // 3. Unified Border Rendering (Handles both the Mirror Modal and DK Portrait)
  const equippedBorder = equipment.border;
  let finalBorderSrc = null;

  if (equippedBorder) {
    // Elegant fallback: Check catalog key first, then search by filename, else fallback to raw string
    const catalogItem = STASH_CATALOG[equippedBorder] || 
                        Object.values(STASH_CATALOG).find(def => def.slot === 'border' && def.img && def.img.includes(equippedBorder));
    
    finalBorderSrc = catalogItem ? catalogItem.img : `assets/avatar/${equippedBorder.split('/').pop()}`;
  }

  // Apply the calculated border to both elements cleanly
  const borderLayer = document.getElementById('dk-border');
  const borderImg = document.getElementById('modal-layer-border');

  [borderLayer, borderImg].forEach(el => {
    if (el) {
      el.style.display = finalBorderSrc ? 'block' : 'none';
      if (finalBorderSrc) el.src = finalBorderSrc;
    }
  });
}

function renderExpandedItemGrid(slotType) {
  const modalGrid = document.getElementById('expandedItemGrid'); 
  if (!modalGrid) return;
  const entries = stashInventory(slotType);
  updateWardrobeGrid(modalGrid, entries.length ? entries.map(stashTileHtml).join('') : '<p class="wardrobe-empty">No clothing for this slot yet. See Wardrobe milestones under The Stash.</p>');
}

// ==========================================
// MODULE 4: KEEPER'S CUSTOMIZER LISTENERS
// ==========================================

function closeExpandedCustomizer() {
  const modal = document.getElementById('expandedCustomizerModal');
  if (modal) modal.style.display = 'none';
}

// 1. Open / Close Modal Listeners (Grouped cleanly)
document.getElementById('avatarFrameBtn')?.addEventListener('click', openExpandedCustomizer);
document.getElementById('avatarFrameBtn')?.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openExpandedCustomizer(); }
});
['closeExpandedModalBtn', 'modalDoneBtn'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', closeExpandedCustomizer);
});

// 2. Unequip Button Logic
document.getElementById('modalUnequipBtn')?.addEventListener('click', () => {
  if (!state.keeper?.equipment) return;
  
  const slotType = currentCustomizerSlot;
  const currentImg = state.keeper.equipment[slotType];

  if (currentImg) {
    // Scan catalog to find the item ID matching the worn image filename
    let foundItemId = null;
    for (const [key, def] of Object.entries(STASH_CATALOG)) {
      if (def.slot === slotType && def.img && def.img.split('/').pop() === currentImg) {
        foundItemId = key;
        break;
      }
    }
    
    // Refund item back into the player's stash
    if (foundItemId) {
      if (!state.stash) state.stash = {};
      state.stash[foundItemId] = (state.stash[foundItemId] || 0) + 1;
    }
  }

  // Clear slot, save, and refresh UI
  state.keeper.equipment[slotType] = null;
  
  if (typeof save === 'function') save();
  renderKeeperQuarters();
  renderExpandedModalLayers();
  renderExpandedItemGrid(slotType);
  toast("Slot unequipped.");
});

// 3. Tab Switching Logic (Reworked to use CSS classes instead of inline styles)
document.querySelectorAll('.customizer-tab').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.customizer-tab').forEach(b => b.classList.remove('active'));
    
    const target = e.currentTarget;
    target.classList.add('active');
    
    currentCustomizerSlot = target.dataset.slot;
    renderExpandedItemGrid(currentCustomizerSlot);
  });
});
// ==========================================
// MODULE 5: STASH & KEEPER LOGIC
// ==========================================
// --- Permanent wardrobe rewards and shared equipment rendering ---
function rememberWardrobeContract() {
  if (state.contracts?.completed || state.contracts?.items?.some(item => item.claimed === true)) state.wardrobeFirstContract = true;
}
function wardrobeProgress(id) {
  const requirement = STASH_CATALOG[id]?.requirement;
  if (!requirement) return {current:0, target:1, label:'Unavailable'};
  const [kind, goal] = requirement;
  if (kind === 'level') return {current:Math.min(state.level || 1, goal), target:goal, label:`Reach keeper level ${goal}`};
  if (kind === 'contract') return {current:state.wardrobeFirstContract === true || completedWeeksCount() > 0 ? 1 : 0, target:1, label:'Claim your first weekly contract'};
  if (kind === 'trial') return {current:state.ashTrialCompleted === true ? 1 : 0, target:1, label:'Complete the Ash Trial'};
  if (kind === 'weeks') return {current:Math.min(completedWeeksCount(), goal), target:goal, label:`Complete ${goal} contract week${goal > 1 ? 's' : ''} (not consecutive)`};
  if (kind === 'mastery') return {current:state.masteryClaims?.[goal] === true ? 1 : 0, target:1, label:`Claim ${ELEMENT_BOOK[goal].name} mastery in the Dragon Book`};
  return {current:['fire','water','nature'].filter(e => state.masteryClaims?.[e + '_rare'] === true).length, target:3, label:'Claim all three Radiant elemental masteries'};
}
function awardWardrobeMilestones() {
  awardElementPrisms();
  rememberWardrobeContract();
  rememberCompletedWeek();
  if (!state.wardrobeClaims || typeof state.wardrobeClaims !== 'object' || Array.isArray(state.wardrobeClaims)) state.wardrobeClaims = {};
  if (!state.stash || typeof state.stash !== 'object' || Array.isArray(state.stash)) state.stash = {};
  const added = [];
  let changed = false;
  for (const id of WARDROBE_IDS) {
    if (state.wardrobeClaims[id] === true) continue;
    const owned = ownsCosmeticReward(id);
    const progress = wardrobeProgress(id);
    if (!owned && progress.current < progress.target) continue;
    state.wardrobeClaims[id] = true;
    changed = true;
    if (!owned) { state.stash[id] = 1; added.push(id); }
  }
  if (added.length) state.wardrobePending = [...new Set([...pendingWardrobeRewards(), ...added])];
  if (changed) save();
  const announcement = document.getElementById('wardrobeAnnouncement');
  if (announcement && added.length) announcement.textContent = `${added.length} new wardrobe reward${added.length > 1 ? 's' : ''} added to The Stash!`;
  return added;
}
// Rewards are already owned when revealed. This queue never pays out a second time.
let wardrobeDialogKind = null;
let wardrobeDialogItem = null;
let wardrobeReturnFocus = null;
function pendingWardrobeRewards() {
  return [...new Set(Array.isArray(state.wardrobePending) ? state.wardrobePending : [])]
    .filter(id => WARDROBE_IDS.includes(id) && state.wardrobeClaims?.[id] === true && ownsCosmeticReward(id));
}
function renderWardrobeInbox() {
  const button = document.getElementById('wardrobeInbox');
  if (!button) return;
  const count = pendingWardrobeRewards().length;
  button.hidden = !count;
  button.textContent = `Reveal new rewards (${count})`;
}
function openWardrobeReward() {
  const id = pendingWardrobeRewards()[0];
  if (!id) return;
  showWardrobeDialog('reward', id);
}
function showWardrobeDialog(kind, id) {
  const modal = document.getElementById('wardrobeDialog');
  const item = STASH_CATALOG[id];
  if (!modal || !item || !ownsCosmeticReward(id)) return;
  if (!wardrobeDialogKind) wardrobeReturnFocus = document.activeElement;
  wardrobeDialogKind = kind; wardrobeDialogItem = id;
  const progress = item.description || (item.requirement ? wardrobeProgress(id).label : item.type === 'consumable' ? (id === 'rare_egg' ? 'Hatches a shiny egg into an open board tile.' : 'Adds one hour of current Roost income, up to bank capacity.') : Number.isInteger(item.tokenCost) ? 'Collected from the weekly contract cosmetic shop.' : 'Collected keeper clothing.');
  const worn = !!item.img && state.keeper?.equipment?.[item.slot]?.split('/').pop() === item.img.split('/').pop();
  const currentEntry = item.type === 'cosmetic' ? stashInventory(item.slot).find(entry => entry.equipped) : null;
  const current = currentEntry && currentEntry.itemId !== id ? STASH_CATALOG[currentEntry.itemId] : null;
  modal.innerHTML = `<section class="wardrobe-dialog-card ${kind === 'details' ? 'item-detail-card' : ''} rarity-${item.rarity}" tabindex="-1">
    <button class="wardrobe-dialog-close" aria-label="Close reward details" onclick="closeWardrobeDialog()">×</button>
    <p class="wardrobe-eyebrow">${kind === 'reward' ? 'Milestone reached · ' + pendingWardrobeRewards().length + ' new' : worn ? 'Currently equipped' : 'Selected item'}</p>
    <h2 id="wardrobeDialogTitle">${item.name}</h2>
    <div class="wardrobe-reveal-art">${item.img ? `<img src="${item.img}" alt="${item.name}">` : `<span class="wardrobe-consumable-icon">${item.icon}</span>`}<span aria-hidden="true">✦</span></div>
    <p class="wardrobe-eyebrow">${item.rarity} · ${item.slot || 'Consumable'}</p><p>${progress}</p>
    <p class="item-purpose">${item.type === 'cosmetic' ? 'Permanent cosmetic · No stat bonuses' : 'Single-use item · Home board only'}${worn ? ' · Equipped' : ''}</p>
    <p class="item-owned">Owned: ${Math.max(0,Number(state.stash?.[id]) || 0) + (worn ? 1 : 0)}</p>
    ${kind === 'details' && current ? `<div class="equipment-comparison rarity-${current.rarity}"><img src="${current.img}" alt=""><div><small>Currently equipped · ${current.rarity}</small><strong>${current.name}</strong><p>Replacing returns this item to The Stash.</p></div></div>` : ''}
    <div class="wardrobe-dialog-actions">${kind === 'reward' ? '<button onclick="finishWardrobeReward(true)">Equip now</button><button onclick="finishWardrobeReward(false)">Keep in Stash</button>' : `<button onclick="useInspectedItem()">${item.type === 'cosmetic' ? worn ? 'Unequip' : current ? 'Replace' : 'Equip' : 'Use item'}</button><button onclick="closeWardrobeDialog()">Close</button>`}</div>
    ${kind === 'reward' && pendingWardrobeRewards().length > 1 ? '<button class="wardrobe-quiet" onclick="keepAllWardrobeRewards()">Keep all in Stash</button>' : ''}</section>`;
  modal.hidden = false;
  modal.querySelector?.('.wardrobe-dialog-card')?.focus();
}
function closeWardrobeDialog() {
  pendingPrism = null;
  const modal = document.getElementById('wardrobeDialog');
  if (modal) modal.hidden = true;
  wardrobeDialogKind = null; wardrobeDialogItem = null;
  if (wardrobeReturnFocus?.isConnected) wardrobeReturnFocus.focus({preventScroll:true});
  else document.getElementById('avatarFrameBtn')?.focus();
  wardrobeReturnFocus = null;
  renderWardrobeInbox();
}
function finishWardrobeReward(equip) {
  const id = wardrobeDialogItem;
  if (wardrobeDialogKind !== 'reward' || !pendingWardrobeRewards().includes(id)) return;
  state.wardrobePending = pendingWardrobeRewards().filter(item => item !== id);
  save();
  const item = STASH_CATALOG[id];
  const worn = state.keeper?.equipment?.[item.slot]?.split('/').pop() === item.img.split('/').pop();
  if (equip && !worn) window.useFromStash(id);
  renderWardrobeInbox();
  if (pendingWardrobeRewards().length) openWardrobeReward(); else closeWardrobeDialog();
}
function keepAllWardrobeRewards() {
  if (wardrobeDialogKind !== 'reward') return;
  state.wardrobePending = []; save(); closeWardrobeDialog();
}
let stashFilter = 'all';
let stashSort = 'equipped';
let stashInspect = true;
function setStashBrowse(kind, value) {
  if (kind === 'filter' && ['all','cosmetic','clothing','head','torso','legs','border','consumable'].includes(value)) stashFilter = value;
  if (kind === 'sort' && ['equipped','rarity','name'].includes(value)) stashSort = value;
  if (kind === 'inspect') stashInspect = value === 'inspect';
  const category = document.getElementById('stashCategory');
  if (category) category.value = stashFilter;
  document.querySelectorAll?.('[data-stash-filter]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.stashFilter === stashFilter)));
  renderStash(); renderExpandedItemGrid(currentCustomizerSlot);
}
function browsedStash() {
  const rank = {common:0,uncommon:1,rare:2,epic:3,legendary:4,mythic:5};
  return stashInventory().filter(entry => {
    const item = STASH_CATALOG[entry.itemId];
    return stashFilter === 'all' || (stashFilter === 'clothing' && ['head','torso','legs'].includes(item.slot)) || item.slot === stashFilter || item.type === stashFilter;
  }).sort((a,b) => {
    const x=STASH_CATALOG[a.itemId], y=STASH_CATALOG[b.itemId];
    return (stashSort === 'equipped' ? Number(b.equipped)-Number(a.equipped) : stashSort === 'rarity' ? (rank[y.rarity] || 0)-(rank[x.rarity] || 0) : 0) || x.name.localeCompare(y.name);
  });
}
let pendingRestore = null;
let restoreReadId = 0;
function downloadSaveText(text,name) {
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=name;
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportGameBackup() {
  try { downloadSaveText(JSON.stringify(backupPayload(),null,2),'ember-nest-backup.json');setSafeText('backupStatus','Backup download requested. Keep the file somewhere safe; this is not cloud sync.'); }
  catch(error){setSafeText('backupStatus','Backup download failed: '+error.message);}
}
function exportBeforeRestore() {
  try {
    const raw=localStorage.getItem(SAVE+'-before-restore');
    if(!raw)throw new Error('No pre-restore copy is available yet.');
    const data=JSON.parse(raw);
    downloadSaveText(JSON.stringify({format:'ember-nest-backup',version:1,createdAt:new Date().toISOString(),data},null,2),'ember-nest-before-restore.json');
    setSafeText('backupStatus','Pre-restore copy download requested.');
  } catch(error){setSafeText('backupStatus',error.message);}
}
function cancelBackupRestore() {
  restoreReadId++;pendingRestore=null;
  const confirm=document.getElementById('confirmBackupRestore');if(confirm)confirm.disabled=true;
  const input=document.getElementById('backupFile');if(input)input.value='';
  setSafeText('backupStatus','Restore cancelled. Current save unchanged.');
}
async function previewBackupFile(input) {
  const readId=++restoreReadId;pendingRestore=null;
  const confirm=document.getElementById('confirmBackupRestore');if(confirm)confirm.disabled=true;
  try {
    if(state.mode==='stage')throw new Error('Leave the Trial before restoring.');
    const file=input.files?.[0];if(!file)return;
    if(file.size>2000000)throw new Error('Backup is too large (maximum 2 MB).');
    const text=await file.text();if(readId!==restoreReadId)return;
    const restored=validateBackup(text);
    pendingRestore={text,expectedRaw:localStorage.getItem(SAVE)};
    setSafeText('backupStatus',`Ready to replace this save with level ${restored.level}, ${restored.coins.toLocaleString()} coins, and ${restored.cells.filter(Boolean).length} occupied board tiles. This replaces progress; it does not merge saves. A pre-restore copy will be kept on this device. Confirm only if this is the save you want.`);
    if(confirm)confirm.disabled=false;
  } catch(error){if(readId===restoreReadId)setSafeText('backupStatus','Cannot restore: '+error.message);}
}
function confirmBackupRestore() {
  if(!pendingRestore)return;
  try {
    commitBackupRestore(pendingRestore.text,pendingRestore.expectedRaw);pendingRestore=null;
    const button=document.getElementById('confirmBackupRestore');if(button)button.disabled=true;
    window.location.reload();
  } catch(error){pendingRestore=null;const button=document.getElementById('confirmBackupRestore');if(button)button.disabled=true;setSafeText('backupStatus','Restore not completed: '+error.message);}
}
window.addEventListener('storage',event=>{
  if(event.key===SAVE||event.key===null){try{detectSaveConflict();}catch(_){showSaveWarning('Save storage is unavailable. Keep this tab open and export a backup.');}}
});
let pendingPrism = null;
function awardElementPrisms() {
  let added = 0;
  if (state.level >= 10 && !state.prismIntroClaimed) { state.prismIntroClaimed = true; added++; }
  const weekly = state.contracts;
  if (weekly?.completed && weekly.bonus?.length === 2 && weekly.bonus.every(item => item.claimed) && !weekly.prismClaimed) {
    weekly.prismClaimed = true; added++;
  }
  if (added) {
    state.stash = state.stash || {};
    state.stash.element_prism = (state.stash.element_prism || 0) + added;
    save();
    toast('Element Prism added to The Stash · Items.');
  }
}
function prismTargets(dragon) {
  if(dragon?.training)return []; // Keep trained elemental identities stable.
  if (!dragon || !Number.isInteger(dragon.level) || dragon.level < 2 || dragon.level > 5 || !Number.isSafeInteger(dragon.count) || dragon.count < 1) return [];
  const discoveries = dragon.shiny ? state.rareElementBook : state.elementBook;
  return ['fire','water','nature'].filter(element => element !== (dragon.element || 'neutral') && discoveries?.[element]?.[dragon.level] === true);
}
function prismLabel(dragon) {
  return (dragon.shiny ? 'Shiny ' : '') + (({fire:'Fire',water:'Water',nature:'Nature'})[dragon.element] || 'Neutral') + ' ' + CHAIN[dragon.level].name + ' ×' + dragon.count;
}
function openElementPrism() {
  if (state.mode !== 'home' || !(state.stash?.element_prism > 0)) return;
  const modal = document.getElementById('wardrobeDialog');
  if (!modal) return;
  recoverElementDiscoveries();
  pendingPrism = null;
  if (wardrobeDialogKind !== 'prism') wardrobeReturnFocus = document.activeElement;
  wardrobeDialogKind = 'prism'; wardrobeDialogItem = 'element_prism';
  const choices = state.cells.map((dragon,index) => !state.locked[index] && prismTargets(dragon).length ?
    '<section class="contract-row"><strong>Tile ' + (index+1) + ' · ' + prismLabel(dragon) + '</strong><p>Change entire stack to:</p>' +
    prismTargets(dragon).map(element => '<button onclick="previewElementPrism(' + index + ',\'' + element + '\')">' + ({fire:'Fire',water:'Water',nature:'Nature'})[element] + '</button>').join('') + '</section>' : '').join('');
  modal.innerHTML = '<section class="wardrobe-dialog-card item-detail-card rarity-rare" tabindex="-1"><h2 id="wardrobeDialogTitle">Element Prism · choose a stack</h2><p>' + STASH_CATALOG.element_prism.description + '</p><p>Only unlocked Board tiles are eligible; Roost, reserve and Trial dragons are excluded. No coins, XP, or new mastery discoveries are awarded.</p>' +
    (choices || '<p>No eligible stacks. Discover another element at the same stage first, then place your dragon on the Board.</p>') + '<button onclick="closeWardrobeDialog()">Cancel · keep item</button></section>';
  modal.hidden = false; modal.querySelector?.('.wardrobe-dialog-card')?.focus();
}
function previewElementPrism(index, element) {
  if (state.mode !== 'home' || !Number.isInteger(index) || state.locked[index] || !(state.stash?.element_prism > 0)) return;
  const dragon = state.cells[index];
  if (!prismTargets(dragon).includes(element)) return;
  const modal = document.getElementById('wardrobeDialog');
  if (!modal) return;
  pendingPrism = {index, element, dragon, snapshot:JSON.stringify(dragon)};
  modal.innerHTML = '<section class="wardrobe-dialog-card item-detail-card rarity-rare" tabindex="-1"><h2 id="wardrobeDialogTitle">Confirm element change</h2><p>Board tile ' + (index+1) + '</p><p>' + prismLabel(dragon) + ' → ' + prismLabel({...dragon,element}) + '</p><p>Costs 1 Element Prism for the entire stack. Stage, count and shiny status stay the same. No mastery, coins or XP are awarded. Changing back would require another Prism.</p><button onclick="confirmElementPrism()">Confirm · use 1 Prism</button><button onclick="openElementPrism()">Choose another stack</button><button onclick="closeWardrobeDialog()">Cancel · keep item</button></section>';
  modal.querySelector?.('.wardrobe-dialog-card')?.focus();
}
function confirmElementPrism() {
  const request = pendingPrism;
  if (!request || state.mode !== 'home' || !(state.stash?.element_prism > 0)) return false;
  const dragon = state.cells[request.index];
  if (state.locked[request.index] || dragon !== request.dragon || JSON.stringify(dragon) !== request.snapshot || !prismTargets(dragon).includes(request.element)) {
    pendingPrism = null; toast('That stack changed. Please choose it again.'); openElementPrism(); return false;
  }
  state.cells[request.index] = {...dragon,element:request.element};
  state.stash.element_prism--;
  if (!state.stash.element_prism) delete state.stash.element_prism;
  pendingPrism = null;
  save(); closeWardrobeDialog(); render(); toast('Element changed. Stage, stack and shiny status preserved.');
  return true;
}
function activateStashItem(id) {
  if (stashInspect) showWardrobeDialog('details',id);
  else { window.useFromStash(id); renderExpandedItemGrid(currentCustomizerSlot); }
}
function useInspectedItem() {
  if (wardrobeDialogKind !== 'details' || !ownsCosmeticReward(wardrobeDialogItem)) return;
  const id = wardrobeDialogItem;
  closeWardrobeDialog(); window.useFromStash(id); renderExpandedItemGrid(currentCustomizerSlot);
}
document.getElementById('wardrobeDialog')?.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); closeWardrobeDialog(); }
  if (event.key === 'Tab') {
    const buttons = [...document.getElementById('wardrobeDialog').querySelectorAll('button:not(:disabled)')];
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && (document.activeElement === first || !buttons.includes(document.activeElement))) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
});
function renderWardrobeMilestones() {
  const panel = document.getElementById('wardrobeMilestones');
  if (!panel) return;
  const signature = JSON.stringify([state.level,state.ashTrialCompleted,state.wardrobeFirstContract,state.completedContractWeeks,state.masteryClaims,state.wardrobeClaims]);
  if (panel.wardrobeSignature === signature) return;
  panel.wardrobeSignature = signature;
  panel.innerHTML = WARDROBE_SETS.map(set => `<section class="wardrobe-set rarity-${set.rarity}"><h4>${set.name} <small>${set.rarity}</small></h4>` +
    ['head','torso','legs'].map(slot => {
      const id = `wardrobe_${set.rarity}_${slot}`, item = STASH_CATALOG[id], p = wardrobeProgress(id), earned = state.wardrobeClaims?.[id] === true;
      return `<div class="wardrobe-goal"><img src="${item.img}" alt="" loading="lazy" width="48" height="48"><div><strong>${slot === 'legs' ? 'Legs & boots' : slot === 'head' ? 'Head' : 'Torso'}${earned ? ' · Earned ✓' : ''}</strong><p>${p.label}</p><span>${earned ? 'Permanent · Equip from The Stash' : `${p.current}/${p.target}`}</span></div></div>`;
    }).join('') + '</section>').join('');
}
function nextWardrobeReward() {
  return WARDROBE_IDS.filter(id => state.wardrobeClaims?.[id] !== true).map(id => ({id,...wardrobeProgress(id)}))
    .sort((a,b) => b.current/b.target - a.current/a.target || WARDROBE_IDS.indexOf(a.id)-WARDROBE_IDS.indexOf(b.id))[0] || null;
}
function renderNextWardrobeReward() {
  const panel = document.getElementById('nextWardrobeReward');
  if (!panel) return;
  const next = nextWardrobeReward();
  if (!next) { panel.innerHTML = '<strong>Wardrobe complete ✦</strong><p>All 15 milestone pieces earned. Mix your favorites in The Stash!</p>'; return; }
  const item=STASH_CATALOG[next.id];
  const html=`<img src="${item.img}" alt="" width="62" height="62"><div><small>Next wardrobe reward · ${item.rarity}</small><strong>${item.name}</strong><p>${next.label}</p><progress max="${next.target}" value="${next.current}" aria-label="${item.name} milestone progress"></progress><span>${next.current}/${next.target}</span><button onclick="openWardrobeMilestones()">View milestones</button></div>`;
  if (panel.wardrobeHtml !== html) { panel.innerHTML=html; panel.wardrobeHtml=html; }
}
function openWardrobeMilestones() {
  const journal = document.querySelector('.wardrobe-journal');
  if (journal) { journal.open=true; journal.querySelector('summary')?.focus(); journal.scrollIntoView({block:'nearest'}); }
}
function fitKeeperLayer(el, file) {
  if (!el) return;
  const item = Object.values(STASH_CATALOG).find(def => def.img && def.img.split('/').pop() === file?.split('/').pop());
  // Inventory identities stay stable; fitted worn art is separate from loose-item icons.
  const box = item?.wornOverlay || item?.overlay || [0,0,100,100];
  if (item?.wornImg) el.src = item.wornImg;
  Object.assign(el.style, {inset:'auto', left:box[0]+'%', top:box[1]+'%', width:box[2]+'%', height:box[3]+'%', objectFit:'fill', transform:'none'});
  // The neck is in front of the rear collar, not behind the entire garment.
  // Work in body-canvas coordinates, using the same fitted box as the shirt.
  // This keeps all eight collars consistent without modifying inventory art.
  if (item?.slot === 'torso') {
    const neckMask = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" preserveAspectRatio="none"><rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" fill="white"/><path fill="black" d="M45.4 50 L54.6 50 L54.6 52.6 Q50 56.4 45.4 52.6 Z"/></svg>`;
    el.style.maskImage = 'url("data:image/svg+xml,' + encodeURIComponent(neckMask) + '")';
    el.style.maskMode = 'luminance';
    el.style.maskSize = '100% 100%';
  } else {
    el.style.maskImage = 'none';
  }
  // Hide the base trousers only; retain the hands beside them and restore on unequip.
  if (file?.split('/').pop() === 'body_base.png') {
    const wearingTorso = Object.values(STASH_CATALOG).some(def => def.slot === 'torso' && def.img?.split('/').pop() === state.keeper?.equipment?.torso?.split('/').pop());
    // Remove the base gray shirt, not the neck or bare arms. SVG coordinates use
    // the original square body canvas so this mask scales identically in every view.
    const shirtMask = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" fill="white"/><path fill="black" d="M43.4 51.8 Q50 58.3 56.6 51.8 L63 53 L67.5 61.2 L60.9 65.2 L63 77.8 Q50 80 37 77.8 L39.1 65.2 L32.6 61.2 L35 53 Z"/></svg>';
    el.style.maskImage = wearingTorso ? 'url("data:image/svg+xml,' + encodeURIComponent(shirtMask) + '")' : 'none';
    el.style.maskMode = 'luminance';
    el.style.maskSize = '100% 100%';
    const wearingLegs = Object.values(STASH_CATALOG).some(def => def.wardrobe && def.slot === 'legs' && def.img.split('/').pop() === state.keeper?.equipment?.legs?.split('/').pop());
    el.style.clipPath = wearingLegs ? 'polygon(0% 0%,100% 0%,100% 100%,66.7% 100%,66.7% 89%,64% 89%,64% 78%,36% 78%,36% 89%,33.3% 89%,33.3% 100%,0% 100%)' : 'none';
  }
}
function stashInventory(slotType) {
  const entries = [];
  for (const [id, item] of Object.entries(STASH_CATALOG)) {
    if (slotType && (item.type !== 'cosmetic' || item.slot !== slotType)) continue;
    const equipped = !!item.img && state.keeper?.equipment?.[item.slot]?.split('/').pop() === item.img.split('/').pop();
    const quantity = Math.max(0, Number(state.stash?.[id]) || 0);
    if (equipped || quantity > 0) entries.push({itemId:id, quantity:equipped ? 1 : quantity, equipped});
  }
  return entries.sort((a,b) => Number(b.equipped) - Number(a.equipped));
}
function stashTileHtml({itemId, quantity, equipped}) {
  const item = STASH_CATALOG[itemId], rarity = item.rarity || 'common';
  const label = `${item.name} · ${rarity}${stashInspect ? ' · Inspect details' : equipped ? ' · Equipped. Click again to unequip' : item.type === 'cosmetic' ? ' · Equip' : ' · Use'}`;
  const particles = ['epic','legendary','mythic'].includes(rarity) ? '<i class="rarity-mote mote-one"></i><i class="rarity-mote mote-two"></i><i class="rarity-mote mote-three"></i>' : '';
  return `<button type="button" data-item-id="${itemId}" class="stash-slot filled rarity-${rarity}${equipped ? ' is-equipped' : ''}" title="${label}" aria-label="${label}" ${item.type === 'cosmetic' ? `aria-pressed="${equipped}"` : ''} onclick="activateStashItem('${itemId}')">
    ${item.img ? `<img src="${item.img}" alt="" loading="lazy" decoding="async">` : `<span class="stash-icon">${item.icon || '❓'}</span>`}
    <span class="stash-rarity">${rarity}</span>${equipped ? '<span class="stash-equipped">Equipped</span>' : quantity > 1 ? `<span class="stash-quantity">×${quantity}</span>` : ''}
    <span class="rarity-effects" aria-hidden="true">${particles}</span></button>`;
}
// --- STASH RENDERING & INTERACTION ---
function updateWardrobeGrid(grid, html) {
  // Keep animations and keyboard focus stable during unrelated game renders.
  if (grid.dataset?.wardrobeHtml === html) return;
  const focusId = grid.contains?.(document.activeElement) ? document.activeElement?.dataset?.itemId : null;
  grid.innerHTML = html;
  if (grid.dataset) grid.dataset.wardrobeHtml = html;
  if (focusId && Object.prototype.hasOwnProperty.call(STASH_CATALOG, focusId)) grid.querySelector?.(`[data-item-id="${focusId}"]`)?.focus({preventScroll:true});
}

function renderStash() {
  renderKeeperEquipment();
  const grid = document.querySelector('.stash-grid');
  if (!grid) return;
  const entries = browsedStash();
  const count = document.getElementById('stashResults');
  if (count) count.textContent = entries.length ? `${entries.length} item${entries.length === 1 ? '' : 's'} · ${stashInspect ? 'Tap an item for details.' : 'Tap to equip or use; tap equipped again to remove.'}` : 'No items in this category yet. Try All or check the milestones above.';
  const slots = Math.max(20, Math.ceil((entries.length + 4) / 4) * 4);
  updateWardrobeGrid(grid, entries.map(stashTileHtml).join('') + '<div class="stash-slot empty" aria-hidden="true"></div>'.repeat(slots - entries.length));
}
function renderKeeperEquipment() {
  const panel = document.getElementById('keeperEquipment');
  if (!panel) return;
  const html = ['head','torso','legs'].map(slot => {
    const entry = stashInventory(slot).find(entry => entry.equipped);
    const item = entry && STASH_CATALOG[entry.itemId];
    return `<button class="keeper-gear rarity-${item?.rarity || 'common'}" onclick="${item ? `showWardrobeDialog('details','${entry.itemId}')` : `browseKeeperSlot('${slot}')`}" aria-label="${slot}: ${item ? item.name + ', equipped. View details' : 'Empty. Browse items'}">${item ? `<img src="${item.img}" alt="">` : '<span aria-hidden="true">＋</span>'}<small>${slot}</small></button>`;
  }).join('');
  updateWardrobeGrid(panel,html);
}
function browseKeeperSlot(slot) {
  setStashBrowse('filter',slot);
  const options = document.querySelector('.stash-options');
  if (options) options.open = true;
  const select = document.getElementById('stashCategory');
  if (select) { select.value=slot; select.focus(); select.scrollIntoView?.({block:'nearest'}); }
}

window.handleStashClick = function(stashIndex) {
  const itemId = state.stash[stashIndex];
  if (!itemId) return; 
  
  const itemData = STASH_CATALOG[itemId];
  
  if (itemData.type === 'cosmetic') {
    state.keeper.equipment[itemData.slot] = itemData.img;
    state.stash.splice(stashIndex, 1);
    
    save();
    renderStash();
    if (typeof renderKeeperQuarters === "function") renderKeeperQuarters();
    if (typeof renderExpandedModalLayers === "function") renderExpandedModalLayers(); 
    
  } else if (itemData.type === 'consumable') {
    console.log(`You used a ${itemData.name}!`);
    // state.stash.splice(stashIndex, 1); 
    // save(); renderStash();
  }
}

window.renderExpandedModalLayers = function() {
  const eq = state.keeper?.equipment || {};
  
  // 1. DRY rendering for standard anatomical layers
  const layers = ['body', 'legs', 'torso', 'head'];
  layers.forEach(slot => {
    const el = document.getElementById(`modal-layer-${slot}`);
    if (el) {
      if (eq[slot] || slot === 'body') {
        const fileName = (eq[slot] || 'body_base.png').split('/').pop();
        el.src = `assets/avatar/${fileName}`;
        fitKeeperLayer(el, fileName);
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    }
  });

  // 2. Modal Border Layer Support
  const borderL = document.getElementById('modal-layer-border'); // BUG FIXED: Look up the missing element
  if (borderL) {
    const equippedBorder = eq.border;
    
    // Clean fallback lookup using .find()
    const borderItem = STASH_CATALOG[equippedBorder] || 
                       Object.values(STASH_CATALOG).find(def => def.slot === 'border' && def.img && def.img.includes(equippedBorder));

    if (borderItem?.img) {
      borderL.src = borderItem.img;
      borderL.style.display = 'block';
    } else {
      borderL.style.display = 'none';
    }
  }
};

window.addToStash = function(itemId, amount = 1) {
  // Guardrail: No dragons in the stash!
  if (STASH_CATALOG[itemId]?.type === 'dragon') {
    console.warn("Dragons cannot be stashed!");
    return false; 
  }

  if (!state.stash) state.stash = {};
  state.stash[itemId] = (state.stash[itemId] || 0) + amount;
  
  save(); 
  renderKeeperQuarters();
  toast(`Added ${amount} ${STASH_CATALOG[itemId]?.name || "Item"} to Stash!`);
  return true;
};

window.useFromStash = function(itemId) {
  const itemDef = STASH_CATALOG[itemId];
  if (!itemDef) return;

  // Failsafe: Ensure equipment object exists
  if (!state.keeper) state.keeper = { title: 'Novice Breeder' };
  if (!state.keeper.equipment) {
    state.keeper.equipment = { body: "body_base.png", torso: null, head: null, legs: null };
  }
  if (!state.stash) state.stash = {};

  if (itemDef.type === 'cosmetic') {
    const slot = itemDef.slot; 
    
    if (!itemDef.img) {
      console.error("Item is missing an 'img' property in STASH_CATALOG:", itemId);
      toast("Error: Missing item image data!");
      return; 
    }

    const currentlyEquippedImg = state.keeper.equipment[slot];
    const itemFileName = itemDef.img.split('/').pop();

    // An equipped tile stays visible in the Stash. Clicking it again toggles it off.
    if (currentlyEquippedImg?.split('/').pop() === itemFileName) {
      state.keeper.equipment[slot] = null;
      state.stash[itemId] = (state.stash[itemId] || 0) + 1;
      save();
      renderStash();
      renderKeeperQuarters();
      renderDragonKingPortrait();
      renderExpandedModalLayers();
      toast(`${itemDef.name} returned to Stash.`);
      return;
    }

    if (!state.stash?.[itemId] || state.stash[itemId] <= 0) return;
    
    // 1. If wearing something, find its catalog ID and return it to the stash
    if (currentlyEquippedImg) {
      const oldEntry = Object.entries(STASH_CATALOG).find(([key, def]) => 
        def.slot === slot && def.img && def.img.split('/').pop() === currentlyEquippedImg
      );
      
      if (oldEntry) {
        const oldItemId = oldEntry[0];
        state.stash[oldItemId] = (state.stash[oldItemId] || 0) + 1;
      }
    }

    // 2. Strip folder paths and save to Keeper state
    state.keeper.equipment[slot] = itemFileName;

    // 3. Deduct new item from stash
    state.stash[itemId] -= 1;
    if (state.stash[itemId] <= 0) delete state.stash[itemId];

    // 4. Save and refresh UI views
    if (typeof save === 'function') save(); 
    renderKeeperQuarters();
    renderDragonKingPortrait(); 
    renderExpandedModalLayers(); 
    toast(`Equipped ${itemDef.name}!`);

  } else if (itemDef.type === 'consumable') {
    if (!(state.stash[itemId] > 0)) return;
    if (state.mode !== 'home') { toast('Return to the nest to use this item.'); return; }
    let message;
    if (itemId === 'element_prism') { openElementPrism(); return; }
    if (itemId === 'rare_egg') {
      if (!spawn(0, 1, undefined, true)) return;
      message = 'A shiny egg was placed on your board!';
    } else if (itemId === 'time_skip_1h') {
      const rate = perchIncome();
      const bank = state.perchBank || 0;
      const capacity = rate * 480;
      if (!rate) { toast('Perch a dragon before using a Time Skip.'); return; }
      if (bank >= capacity) { toast('Collect your Dragon Bank coins first.'); return; }
      const earned = Math.min(rate * 60, capacity - bank);
      state.perchBank = bank + earned;
      message = `Time Skip added ${earned} coins to the Dragon Bank!`;
    } else {
      toast('This item cannot be used yet.');
      return;
    }
    state.stash[itemId] -= 1;
    if (state.stash[itemId] <= 0) delete state.stash[itemId];
    
    save(); 
    render();
    toast(message);
  }
};
// --- BORDER PORTRAIT RENDER ---
function renderDragonKingPortrait() {
  const borderImg = document.getElementById('dk-border');
  if (!borderImg) return;
  
  const equippedBorder = state.keeper?.equipment?.border; 
  
  // Clean fallback lookup using .find() instead of a bulky for-loop
  let borderItem = STASH_CATALOG[equippedBorder] || 
                   Object.values(STASH_CATALOG).find(def => def.slot === 'border' && def.img && def.img.includes(equippedBorder));

  if (borderItem?.img) {
     borderImg.src = borderItem.img;
     borderImg.style.display = 'block';
  } else {
     borderImg.style.display = 'none'; 
  }
}

// ==========================================
// MODULE 6: HOME SCREEN & STASH RENDERING
// ==========================================

function renderHeaderPortrait() {
  const eq=state.keeper?.equipment || {};
  for (const slot of ['body','torso','head']) {
    const el=document.getElementById(`header-${slot}`);
    if (!el) continue;
    const file=eq[slot] || (slot === 'body' ? 'body_base.png' : null);
    el.hidden=!file;
    if (file) { el.src=getCleanPath(file); fitKeeperLayer(el,file); }
  }
}
function renderKeeperQuarters() {
  renderHeaderPortrait();
  awardWardrobeMilestones();
  renderWardrobeInbox();
  renderWardrobeMilestones();
  renderNextWardrobeReward();
  if (!state.keeper) state.keeper = { title: "Novice Breeder", gender: "male" };
  if (!state.keeper.equipment) state.keeper.equipment = { body: "body_base.png", torso: null, head: null, legs: null };
  
  const nameDisplay = document.getElementById('keeper-name-display');
  if (nameDisplay) nameDisplay.innerText = state.playerName || "Keeper";
  
  const titleDisplay = document.getElementById('keeper-title-display');
  if (titleDisplay) titleDisplay.innerText = activeMasteryTitle() || state.keeper.title;

  // Render Layered Paper-Doll Avatar Images (Optimized)
  const eq = state.keeper.equipment;
  
  const bodyLayer = document.getElementById('layer-body');
  if (bodyLayer) bodyLayer.src = getCleanPath(eq.body, 'body_base.png');
  fitKeeperLayer(bodyLayer, eq.body || 'body_base.png');

  ['legs', 'torso', 'head'].forEach(layer => {
    const el = document.getElementById(`layer-${layer}`);
    if (el) {
      el.style.display = eq[layer] ? 'block' : 'none';
      if (eq[layer]) el.src = getCleanPath(eq[layer]);
      fitKeeperLayer(el, eq[layer]);
    }
  });

  // The shared renderer also includes equipped cosmetics as toggleable Stash tiles.
  renderStash();
}

// ==========================================
// MODULE 7: AUDIO & VFX
// ==========================================

let audioCtx = null;

function beep(freq, dur, type = "sine", vol = 0.05) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    
    o.type = type;
    o.frequency.value = freq;
    
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (dur || 0.12));
    
    o.connect(g); 
    g.connect(audioCtx.destination);
    
    o.start(); 
    o.stop(audioCtx.currentTime + (dur || 0.12));
  } catch (e) {
    // Fails silently if browser blocks audio context
  }
}

function sfx(kind) {
  if (state.muted) return; 

  switch (kind) {
    case "merge":
      beep(320, 0.07, "triangle", 0.05); 
      setTimeout(() => beep(480, 0.1, "triangle", 0.06), 50);
      break;
    case "ash":
      beep(140, 0.16, "sawtooth", 0.03);
      break;
    case "win":
      beep(440, 0.12, "sine", 0.06); 
      setTimeout(() => beep(660, 0.18, "sine", 0.06), 90);
      break;
    case "fail":
      beep(110, 0.28, "square", 0.04);
      break;
    case "gather":
      beep(260, 0.06, "sine", 0.04);
      break;
    case "buy":
      beep(500, 0.08, "sine", 0.05); 
      setTimeout(() => beep(700, 0.12, "sine", 0.05), 70);
      break;
    case "room":
      beep(360, 0.1, "triangle", 0.05); 
      setTimeout(() => beep(540, 0.16, "triangle", 0.05), 80);
      break;
    case "shiny":
      beep(600, 0.1, "sine", 0.08); 
      setTimeout(() => beep(900, 0.2, "triangle", 0.1), 80);
      break;
    case "click":
      beep(800, 0.03, "square", 0.02);
      break;
  }
}

// ==========================================
// MODULE 8: VFX & PARTICLES
// ==========================================

let activeParticleCount = 0;
function effectsReduced() { return document.hidden || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }
function spawnParticles(x, y, count = 8, color = '#ffcf40') {
  if (effectsReduced()) return;
  count = Math.max(0,Math.min(24,Math.floor(count),48-activeParticleCount));
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    
    const size = 4 + Math.random() * 6;
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 50;
    
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      left: ${x}px;
      top: ${y}px;
      --dx: ${Math.cos(angle) * dist}px;
      --dy: ${-20 - Math.sin(angle) * dist}px;
    `;
    
    document.body.appendChild(p);
    activeParticleCount++;
    setTimeout(() => { p.remove(); activeParticleCount--; }, 800);
  }
}

function spawnFloatingText(x, y, text) {
  if (effectsReduced()) return;
  const p = document.createElement('div');
  p.className = 'floating-text';
  p.innerHTML = `${text} <span class="spinning-coin">🪙</span>`;
  p.style.left = x + 'px';
  p.style.top = y + 'px';
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 1000);
}
// ==========================================
// MODULE 9: LEVELING & PROGRESSION
// ==========================================

function xpNeed(lv) { 
  return 30 + lv * 20; 
}

function addXp(n, deferPresentation = false) {
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

  if (!deferPresentation && !levelShowing) showLevelEvent();
}

function showLevelEvent() {
  const ev = levelQueue.shift();
  if (!ev) { 
    levelShowing = false; 
    return; 
  }
  
  levelShowing = true;
  
  const t = document.getElementById("chestTitle");
  const s = document.getElementById("chestSub");
  const box = document.getElementById("chestBox");
  const okBtn = document.getElementById("chestOk");
  
  if (t) t.textContent = `Level ${ev.level}`;
  if (s) s.textContent = ev.unlock || "The ember burns brighter.";
  
  const loot = document.getElementById("rewardList");
  if (loot) loot.innerHTML = "";
  
  if (box) {
    box.style.display = ev.chest ? "block" : "none";
    box.style.backgroundImage = "url('Images/chest-closed.png')"; 
    box.dataset.level = ev.chest ? String(ev.level) : "";
    box.disabled = false;
  }
  
  if (okBtn) {
    okBtn.style.display = ev.chest ? "none" : "block";
    okBtn.textContent = "Continue";
  }
  
  document.getElementById("chest")?.classList.add("open");
  sfx("room");
}
// ==========================================
// MODULE 9: LEVELING & PROGRESSION (CONT.)
// ==========================================

function revealChest() {
  const box = document.getElementById("chestBox");
  const lv = box && box.dataset.level ? +box.dataset.level : 1;
  if (!box || box.disabled || !Number.isInteger(lv) || lv < 5 || lv % 5 !== 0 || lv > state.level) return;
  state.claimedChests = state.claimedChests || {};
  if (state.claimedChests[lv]) return;
  state.claimedChests[lv] = true;
  
  // 1. Swap image to OPEN chest
  if (box) {
     box.style.backgroundImage = "url('Images/chest-open.png')";
     box.disabled = true;
  }
  
  // 2. Visuals & Audio
  const rect = box?.getBoundingClientRect();
  if (rect) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    
    spawnParticles(cx, cy, 20, '#ffea75'); 
    setTimeout(() => spawnParticles(cx, cy, 25, '#ffcf40'), 150);
    setTimeout(() => spawnParticles(cx, cy, 15, '#d45817'), 300);
  }
  sfx("win");
  
  // 3. Loot Math
  const tier = Math.max(1, Math.floor(lv / 5));
  const coins = Math.min(CHEST_MAX_COINS, CHEST_BASE_COINS + (tier - 1) * CHEST_COIN_STEP);
  const eggs = Math.min(8, 2 + tier * 2);
  
  if (state) state.coins = (state.coins || 0) + coins;
  const lines = [`🪙 ${coins} ember coins`, `${eggs} eggs ➔ nest`];
  
  // 4. Spawning Loot
  grantDragonReward(0, eggs);
  if (tier >= 2) { grantDragonReward(1, 2); lines.push("2 hatchlings ➔ nest"); }
  if (tier >= 3) { grantDragonReward(2); lines.push("1 wyrmling ➔ nest"); }
  if (tier >= 5) { grantDragonReward(3); lines.push("1 Young ➔ nest"); }
  if (rewardInboxCount()) lines.push('Board full: undelivered dragons are saved in Goals → Reward inbox.');
  
  // 5. Trigger the Second Modal
  setTimeout(() => {
    document.getElementById("chest")?.classList.remove("open");
    
    const loot = document.getElementById("rewardList");
    if (loot) {
      loot.innerHTML = lines.map(x => 
        `<div style="padding:8px 0; font-size:0.95rem; border-bottom: 1px solid rgba(222, 183, 129, 0.2);">${x}</div>`
      ).join("");
    }
    
    document.getElementById("lootModal")?.classList.add("open");
  }, 900);
  
  save(); 
  render(); // Updates the main board UI
}
function applyLevelUnlock(lv) {
  if (lv === 2) { state.pouchBonus = (state.pouchBonus || 0) + 3; return "trail pouch +3"; }
  if (lv === 3) return "Hearth wish unlocked";
  if (lv === 4) { openFogFree(1); return "1 land opened"; }
  if (lv === 6) { state.maxEnergy = Math.max(state.maxEnergy || MAX_ENERGY, 25); return "max energy 25"; }
  if (lv === 8) { state.pouchBonus = (state.pouchBonus || 0) + 3; return "trail pouch +3"; }
  return "Your legacy ascends.";
}

function completeHearthGoal() {
  if (state.hearthDone) return;
  state.hearthDone = true;
  state.maxEnergy = Math.max(state.maxEnergy || MAX_ENERGY, 30);
  state.coins += 5000;
  sfx("win");
  toast("Hearth hatched! +5000 🪙 • max energy 30 • improved Hatchery");
}

// ==========================================
// MODULE 10: ECONOMY & PERCH MATH
// ==========================================

function roomsOpen() {
  // Safe chaining in case state.decor is undefined
  return ROOMS.filter(r => !r.need || state.decor?.[r.need]).length; 
}

function perchOpen(i) {
  if (i === 0) return true;
  if (i === 1) return roomsOpen() >= 2;
  if (i === 2) return !!(state.hearthDone || roomsOpen() >= 5);
  return false;
}

function perchIncome() {
  let total = 0;
  if (!state.perch) return total;
  
  for (let i = 0; i < 3; i++) {
    if (state.perch[i]) {
      total += getPerchYield(state.perch[i], i).total;
    }
  }
  return total;
}

function tributeCost() {
  return 25000 + ((state.tributes || 0) * 25000);
}

function emptyPerch(slot) {
  if(state.mode!=='home')return;
  const p = state.perch[slot];
  if (!p) return;
  
  const free = emptyOpen();
  if (!free.length) {
    toast("Board full");
    return;
  }
  
  // Drop the dragon onto a random free cell while preserving all traits
  const spot = free[Math.floor(Math.random() * free.length)];
  const cells = board();
  
  cells[spot] = { ...p, element: p.element || "neutral" };

  state.perch[slot] = null;
  perchArmed = -1;
  
  save(); 
  render();
}

function seatPerch(slot, boardIndex) {
  if (state.mode !== 'home' || !perchOpen(slot) || state.perch[slot]) return;
  const dragon = state.cells[boardIndex];
  if (!dragon) return;
  state.perch[slot] = { ...dragon, count: 1 };
  if (dragon.count > 1) dragon.count--;
  else state.cells[boardIndex] = null;
  if (!state.perchAt) state.perchAt = Date.now();
  perchArmed = -1;
  save();
  render();
}

function openFogFree(n) {
  let left = n;
  for (let i = 0; i < state.locked.length && left > 0; i++) {
    if (state.locked[i]) { 
      state.locked[i] = false; 
      left--; 
    }
  }
}
function bonus() {
  return Math.round((1 + Math.min(state.tributes || 0, 10) * 0.05 + Object.keys(state.decor || {}).reduce((sum, id) => {
    const d = DECOR.find(x => x.id === id);
    return sum + (d ? d.bonus : 0);
  }, 0)) * 100) / 100;
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
// --- ECONOMY & PURCHASING ---

function highestOwned() {
  // Progression unlocks survive gifting dragons, moving them to the Roost,
  // and resetting the optional Dragon Book collection.
  const levels = [state.highestDiscovered, state.hearthDone ? 4 : 0,
    ...Object.keys(state.book || {}).filter(key => state.book[key]).map(Number),
    ...Object.keys(state.rareBook || {}).filter(key => state.rareBook[key]).map(Number),
    ...(state.cells || []).map(c => c?.level),
    ...(state.perch || []).map(c => c?.level),
    ...(state.elderReserve || []).map(entry => entry.dragon?.level),
    ...(state.battleRoster || []).map(d => d.level)];
  state.highestDiscovered = Math.max(0, ...levels.filter(level =>
    Number.isInteger(level) && level >= 0 && level < CHAIN.length));
  return state.highestDiscovered;
}

function trailGiftLevel() {
  return Math.min(2, Math.max(0, highestOwned() - 1));
}

function eggPrice() {
  rollDaily();
  return 250 + shopEggLevel() * 150 + Math.min(state.dailyEggsBought || 0, 10) * 25;
}

function shopEggLevel() { return Math.max(0, Math.min(2, highestOwned() - 2)); }

function nextDecorGoal() {
  return DECOR.find(d => !state.decor?.[d.id] && highestOwned() >= d.needStage) || null;
}
function toggleDecorSavings() {
  if (state.mode !== 'home') return;
  state.saveForDecor = !state.saveForDecor;
  save(); render();
}
function collectRewardInbox() {
  if (state.mode !== 'home') return;
  const delivered = deliverRewardInbox();
  save(); render();
  toast(delivered ? delivered + ' reward dragons delivered. Remaining rewards stay saved.' : 'Make room on the board; your rewards remain saved.');
}

function buyEgg() {
  if (state.mode === "stage") {
    toast("Buy eggs at the nest");
    return;
  }
  
  const cost = eggPrice();
  const reserve = state.saveForDecor ? nextDecorGoal() : null;
  if (reserve && state.coins - cost < reserve.cost) {
    toast(`Saving ${reserve.cost} coins for ${reserve.name}. Turn savings off in Nest to spend freely.`);
    return;
  }
  if (state.coins < cost) { 
    toast(`Need ${cost} 🪙 for an egg`); 
    return; 
  }
  
  const boughtLevel = shopEggLevel();
  if (!spawn(boughtLevel, 1)) return;
  
  state.coins -= cost;
  state.eggsBought = (state.eggsBought || 0) + 1;
  state.dailyEggsBought = (state.dailyEggsBought || 0) + 1;
  sfx("buy");
  toast(`${CHAIN[boughtLevel].name} bought for ${cost} 🪙`);
  
  save(); 
  render();
}
// --- DECOR & EXPANSION ---

function buyDecor(id) {
  const d = DECOR.find(x => x.id === id);
  if (!d || state.decor[id]) return;
  if (highestOwned() < d.needStage) { toast(`Discover ${CHAIN[d.needStage].name} to unlock ${d.name}.`); return; }
  
  if (state.coins < d.cost) { 
    toast("Need more ember coins"); 
    return; 
  }
  
  state.coins -= d.cost;
  state.decor[id] = true;
  toast(`${d.name} placed • merge bonus +${Math.round(d.bonus * 100)}%`);
  sfx("buy");
  
  const room = ROOMS.find(r => r.need === id);
  if (room) {
    openFogFree(1);
    sfx("room");
    toast(`${room.name} opened on the mountain`);
  }
  
  save(); 
  render();
}

function unlockCost() {
  const lockedCount = state.locked.filter(Boolean).length;
  // Calculate how many of the 5 fog tiles have already been opened
  const opened = 5 - lockedCount; 
  const costs = LAND_COSTS;
  
  return costs[opened] || 999999;
}

function unlock(i) {
  if (!state.locked[i]) return;
  const cost = unlockCost();
  
  if (state.coins < cost) { 
    toast(`Land costs ${cost} 🪙`); 
    return; 
  }
  
  state.coins -= cost;
  state.locked[i] = false;
  toast("Land opened");
  
  save(); 
  render();
}
// --- ROOST ASSIGNMENT ---

function selectDragonForRoost(boardIndex) {
  if (state.mode !== 'home' || !Number.isInteger(boardIndex) || !perchOpen(roostTargetSlot) || state.perch[roostTargetSlot]) {
    toast('Choose an empty unlocked perch. Existing dragons have not been replaced.'); return;
  }
  if (roostTargetSlot < 0 || roostTargetSlot > 2) return;
  
  const cells = board();
  const draggedItem = cells[boardIndex];
  if (!draggedItem) return;
  
  const itemElement = draggedItem.element || "neutral";

  if (draggedItem.count > 1) {
    state.perch[roostTargetSlot] = { ...draggedItem, count: 1, element: itemElement };
    draggedItem.count -= 1;
  } else {
    state.perch[roostTargetSlot] = { ...draggedItem, count: 1, element: itemElement };
    cells[boardIndex] = null; 
  }
  
  sfx("buy");
  toast(`Sent ${CHAIN[draggedItem.level].name} to the Roost!`);
  closePickerModal();
  save(); 
  render();
}
// ==========================================
// MODULE 11: SPRITE & SVG GENERATION
// ==========================================

function oneSprite(level, hi, lo) {
  if (level === 0) {
    // Ceramic Lotus Egg using custom image asset (works perfectly with stackLayout)
    return `
      <g style="animation: breathe 2s infinite ease-in-out; transform-origin: 16px 16px;">
        <image href="${IMG_DIR}egg-art.png" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="-webkit-user-drag: none; user-select: none; pointer-events: none;" />
      </g>
    `;
  }
  
  // Levels 1-4 are handled natively in dragonSvg, this is the dynamic fallback
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

function dragonSvg(level, size = 42, count = 1, shiny = false, element = 'neutral') {
  const pal = [
    ["#d99b66", "#8a4f28"], ["#ffb554", "#d45817"], ["#ff8a36", "#a82e05"],
    ["#ff6a20", "#b32000"], ["#ff8a47", "#d9381e"], ["#ffc83b", "#e04e1b"],
  ][level] || ["#ffb554", "#d45817"];
  
  const hi = shiny ? "#ffea75" : pal[0];
  const lo = shiny ? "#e5a100" : pal[1];
  const n = Math.max(1, Math.min(4, count || 1));
  const filterStyle = shiny ? 'style="filter: drop-shadow(0 0 4px #ffcf40);"' : '';
  const art = Object.prototype.hasOwnProperty.call(ELEMENT_DRAGON_ART, element) ? ELEMENT_DRAGON_ART[element] : null;
  if (ELEMENTAL_ASSETS_READY && art && level >= 2 && level <= 5) {
    const stage = ['wyrmling','young','hearth','elder'][level - 2];
    const suffix = level === 5 ? 1 : n;
    return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" role="img" aria-label="${element} ${CHAIN[level].name}, ${count || 1}${shiny ? ', shiny' : ''}" ${filterStyle}>
      <g class="dragon-motion dragon-motion--${element}${level === 5 ? ' dragon-motion--elder' : ''}">
      <image href="${IMG_DIR}elements/${art}-${stage}-${suffix}.png" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="pointer-events:none;user-select:none" />
      </g>
      </svg>`;
  }

  // Clean mapping for Levels 1-5 to replace the massive if/else chains
  const spriteMap = {
    1: { base: "hatchling" },
    2: { base: "wyrmling" },
    3: { base: "young" },
    4: { base: "hearth" },
    5: { base: "elder", singleImg: true }
  };

  const config = spriteMap[level];

  // If it's Level 1-5, render using the mapped configurations
  if (config) {
    const suffix = config.singleImg ? 1 : n; // Elder only uses elder-1.png
    const currentImg = `${IMG_DIR}${config.base}-${suffix}.png`;
    
    return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" role="img" aria-label="${CHAIN[level].name}, ${count || 1}${shiny ? ', shiny' : ''}" ${filterStyle}>
      <g class="dragon-motion dragon-motion--neutral${level === 5 ? ' dragon-motion--elder' : ''}">
        <image href="${currentImg}" x="0" y="0" width="32" height="32" preserveAspectRatio="xMidYMid meet" style="-webkit-user-drag: none; user-select: none; pointer-events: none;" />
      </g>
    </svg>`;
  }

  // Fallback for Egg (Tier 0) using stackLayout, and any missing configurations
  const body = oneSprite(level, hi, lo);
  const bits = stackLayout(n).map(([x, y, s]) =>
    `<g transform="translate(${x},${y}) scale(${s}) translate(-16,-16)">${body}</g>`
  ).join("");
  
  return `<svg viewBox="0 0 32 32" width="${size}" height="${size}" ${filterStyle}>${bits}</svg>`;
}
function ashSvg() {
  return `<svg viewBox="0 0 32 32" width="42" height="42" aria-hidden="true" style="max-width: 100%; height: auto; display: block; margin: 0 auto;">
    <path d="M4 6 L9 14 L6 18 L12 22 L8 28" fill="none" stroke="#6a3520" stroke-width="1.8"/>
    <path d="M16 3 L14 10 L18 16 L15 24 L20 30" fill="none" stroke="#994726" stroke-width="1.5"/>
    <path d="M26 5 L22 12 L28 17 L24 26" fill="none" stroke="#7a341d" stroke-width="1.8"/>
    <path d="M2 20 L10 18 L16 21 L30 16" fill="none" stroke="#ff4d00" stroke-width="1.2" opacity="0.6"/>
    <circle cx="12" cy="11" r="1.5" fill="#ff6a20"/>
    <circle cx="19" cy="22" r="1" fill="#ff9900"/>
  </svg>`;
}
// --- CORE ACTIONS ---

function gather() {
  if (trialInputLocked()) return;
  if (state.mode === "stage") {
    if ((state.trailGathers || 0) <= 0) {
      toast("Trail pouch is empty • merge what you have");
      return;
    }
    if (!spawn(0, 1)) {
      toast("No space left on the board!");
      return;
    }
    
    state.trailGathers -= 1;
    sfx("gather");
    save(); 
    render();
    return;
  }

  // Safety check: force energy to be a number
  if (typeof state.energy !== 'number') state.energy = 5;

  if (state.energy <= 0) {
    toast("Energy empty • wait a moment");
    return;
  }

  if (!spawn(gatherLevel(), 1)) {
    toast("No space left on the board");
    return;
  }

  state.energy -= 1;
  contractEvent('gather');

  // Bulletproof Gather Particles
  const gBtn = document.getElementById("gather");
  if (gBtn) {
    const rect = gBtn.getBoundingClientRect();
    spawnParticles(rect.left + (rect.width / 2), rect.top + (rect.height / 2), 8, '#ff8033'); 
  }

  sfx("gather");
  save(); 
  render();
}
function triggerAutoMerge() {
  if (state.mode === 'stage') { showTrialHint(); return; }
  if (state.mode !== 'home') return;
  if ((state.level || 1) < 5) {
    toast("Auto Merge unlocks at Level 5!");
    return;
  }

  let mergedSomething = false;
  let keepChecking = true;
  const cells = board(); // Get the state array

  // --- PHASE 1: MERGE ---
  while (keepChecking) {
    keepChecking = false;

    for (let i = 0; i < cells.length; i++) {
      if (!cells[i] || cells[i].training || isLocked(i) || isAsh(i)) continue;
      
      let matchIdx = -1;

      for (let j = i + 1; j < cells.length; j++) {
        if (!cells[j] || cells[j].training || isLocked(j) || isAsh(j)) continue;

        if (cells[i].level === cells[j].level) {
          matchIdx = j;
          if (cells[i].shiny || cells[j].shiny) break; 
        }
      }

      if (matchIdx !== -1) {
        let fromI = i;
        let toI = matchIdx;

        if (cells[matchIdx].shiny && !cells[i].shiny) {
          fromI = matchIdx;
          toI = i;
        }

        const success = mergeInto(fromI, toI);
        
        if (success) {
          mergedSomething = true;
          keepChecking = true; 
          break; 
        }
      }
    }
  }

  // --- PHASE 2: TIDY & SORT ---
  let items = [];
  let openSlots = [];

  // Extract all movable items and record which slots are safe to use
  for (let i = 0; i < cells.length; i++) {
    if (isLocked(i) || isAsh(i)) continue; // Ignore blockers
    
    openSlots.push(i); // Log this slot as available for placement
    
    if (cells[i]) {
      items.push(cells[i]); // Store the item data
      cells[i] = null;      // Clear the slot temporarily
    }
  }

  // Sort the extracted items (Highest level first)
  items.sort((a, b) => b.level - a.level);

  // Place the sorted items back into the safe slots, filling from the top-left
  for (let k = 0; k < items.length; k++) {
    let targetSlot = openSlots[k];
    cells[targetSlot] = items[k];
  }

  // Save and render regardless of merging, so the button doubles as a "Tidy" button
  save(); 
  render();

  if (!mergedSomething) {
    toast("The nest has been tidied!");
  }
}
// ==========================================
// MODULE 14: TRAIL & ASH MECHANICS
// ==========================================


function checkTrailStuck() {
  if (state.mode !== "stage" || trialInputLocked() || (state.ashBurned || 0) >= trialRules().goal) return;
  if ((state.trailGathers || 0) > 0 || canFiveMerge()) return;
  
  sfx("fail");
  showTrailFail("The pouch is empty and nothing can 5-merge. The nest is still safe.");
}

function enterStage(kind = 'ash') {
  selectedCell = -1; drag = null; ghost?.remove(); ghost = null;
  hideTrailFail(); hideTrailWin();
  if (state.mode === "stage") {
    state.mode = "home";
    resetTrail();
    toast("Returned to the nest");
  } else {
    kind = kind === 'surge' ? 'surge' : 'ash';
    if (kind === 'surge' && !state.ashTrialCompleted) { toast('Complete the Ash Trial to unlock Ember Surge.'); return; }
    state.trialKind = kind;
    state.mode = "stage";
    generateTrail();
    toast(`${trialRules().name} • burn ${trialRules().goal} ash to finish`);
    if (!state.seenGuide) showGuide();
    
    // Explicit scroll lock on stage entry
    document.documentElement.classList.add("lock-scroll");
    document.body.classList.add("lock-scroll");
  }
  
  // Force UI back to the Board view regardless of exit/entry
  document.querySelectorAll(".tab-btn, .view").forEach(el => el.classList.remove("active"));
  document.querySelector('[data-tab="view-board"]')?.classList.add("active");
  document.getElementById("view-board")?.classList.add("active");
  
  save(); 
  render();
}

function restartTrail() {
  selectedCell = -1; drag = null; ghost?.remove(); ghost = null;
  if (state.mode !== 'stage') { enterStage(state.lastTrialKind || 'ash'); return; }
  hideTrailFail();
  state.mode = "stage";
  resetTrail();
  generateTrail();
  toast(`${trialRules().name} • burn ${trialRules().goal} ash to finish`);
  save(); 
  render();
}

function winStage() {
  if (state.mode !== "stage" || state.trialFailed) return;
  state.lastTrialKind = state.trialKind === 'surge' ? 'surge' : 'ash';
  if (state.trialKind === 'surge') { winSurge(); return; }
  
  rollDaily();
  const first = !state.ashCleared;
  const paid = dailyLeft() > 0;
  const pay = nextPay();
  const gift = paid ? trailGiftLevel() : -1;
  
  state.ashCleared = true;
  contractEvent('trial');
  state.ashWins = (state.ashWins || 0) + 1;
  if (paid) state.ashDayWins = (state.ashDayWins || 0) + 1;
  state.lastAshWinAt = 0;
  
  state.mode = "home";
  resetTrail();
  
  const lines = [];
  if (paid) {
    state.coins += pay;
    grantDragonReward(gift);
    if (first) grantDragonReward(0);
    if (rewardInboxCount()) lines.push('Undelivered dragons are saved in Goals → Reward inbox.');
    lines.push(`${dragonSvg(gift, 24)} ${CHAIN[gift].name} ➔ nest`);
    lines.push(`🪙 ${pay} ember coins`);
    if (first) lines.push("🥚 Egg ➔ nest (first clear bonus)");
  } else {
    lines.push("No nest gift: daily rewards spent");
    lines.push(`Resets at midnight: ${midnightLabel()}`);
  }
  
const left = dailyLeft();
  lines.push(`Daily clears left: ${left}/${DAILY_CLEARS}`);
  
  // Check if they have conquered the trial at least once
  if (state.ashTrialCompleted) {
    // Inject the Completed badge and the Blitz button
    lines.push(`<div class="trial-completed-badge">Completed</div>`);
    lines.push("Ash burned • trail complete");
    lines.push(`<button class="blitz-btn" onclick="blitzAshTrial()" style="margin-top: 8px; width: 100%;">⚡ Blitz Trial</button>`);
  } else {
    // Standard text for first-time challengers
    lines.push("Ash burned • trail complete");
  }
  
  const sub = paid
    ? (left ? `Reward ${DAILY_CLEARS - left} of ${DAILY_CLEARS} today.` : "That was the last paid clear today.")
    : "Come back after midnight for nest gifts.";
    
  hideTrailFail();
  if (paid) addXp(40);
  sfx("win");
  showTrailWin(lines, sub);
  
  save(); 
  render();
}

function winSurge() {
  if (state.mode !== 'stage' || state.trialKind !== 'surge' || !state.trailWon || state.ashBurned < 12) return false;
  state.lastTrialKind = 'surge';
  const first = !state.surgeCleared;
  state.surgeCleared = true;
  state.surgeWins = (state.surgeWins || 0) + 1;
  if (first) { state.stash.element_prism = (state.stash.element_prism || 0) + 1; }
  state.mode = 'home'; resetTrail(); state.trialKind = 'ash';
  hideTrailFail();
  showTrailWin(first ? ['Ember Surge cleared!','1 Element Prism added to The Stash.','Keeper of the Surge title is ready in Nest → Collection.'] : ['Ember Surge cleared again.','Practice clear — no repeat rewards.'], 'Main board and energy preserved. No coin or XP payout.');
  save(); render(); return true;
}
function trialHint() {
  if (state.mode !== 'stage' || trialInputLocked()) return null;
  const cells = state.stageCells;
  let best = null;
  for (let from=0;from<cells.length;from++) for(let to=0;to<cells.length;to++) {
    const a=cells[from],b=cells[to];
    if(from===to||!a||!b||a.level!==b.level||a.level>=5||isAsh(from)||isAsh(to)) continue;
    const promotes=a.count+b.count>=5;
    const clears=promotes ? warmthTargets(to,a.level+1).filter(i=>state.ash[i]).length : 0;
    const dangerous=promotes && state.stageMerges>=trialRules().grace && ashCount()-clears+ASH_PER_MERGE>=trialRules().limit;
    const score=clears*100+(promotes?20:0)+a.count+b.count-(dangerous?1000:0);
    if(!best||score>best.score) best={from,to,clears,promotes,dangerous,score};
  }
  if(best) return {...best,text:`Tile ${best.from+1} → tile ${best.to+1}: ${best.promotes ? 'promote and clear '+best.clears+' ash' : 'combine these stacks; fewer than five does not clear ash'}${best.dangerous ? '. Warning: spawning ash may end this run.' : '.'} One-move suggestion, not a guaranteed solution.`};
  return {text:emptyOpen().length && state.trailGathers>0 ? 'No matching pair yet. Gather an egg, then look for five of the same stage.' : 'No merge available. Try Again starts a fresh free run; your main board is safe.'};
}
function showTrialHint() {
  const hint=trialHint();
  if(!hint)return;
  updateBoardFeedback(hint.from ?? -1);
  if(Number.isInteger(hint.to))document.querySelector('#board .cell[data-i="'+hint.to+'"]')?.classList.add('trial-hint-target');
  setSafeText('boardStatus',hint.text);
}
function failStage() {
  if (state.mode !== "stage" || trialInputLocked() || (state.ashBurned || 0) >= trialRules().goal) return;
  sfx("fail");
  showTrailFail("Ash covered the path. The nest is still safe.");
}

function showTrailFail(why) {
  if (state.mode !== 'stage' || state.trailWon || state.trialFailed) return;
  state.trialFailed = true;
  save();
  document.getElementById("failWhy") && (document.getElementById("failWhy").textContent = why);
  document.getElementById("trailFail")?.classList.add("open");
  document.getElementById('restartTrail')?.focus();
}

function hideTrailFail() {
  document.getElementById("trailFail")?.classList.remove("open");
}

function showTrailWin(lines, sub) {
  document.getElementById("winSub") && (document.getElementById("winSub").textContent = sub);
  document.getElementById("winLoot") && (document.getElementById("winLoot").innerHTML = lines.map(t => `<div>${t}</div>`).join(""));
  document.getElementById("trailWin")?.classList.add("open");
  document.getElementById('winHome')?.focus();
}

function hideTrailWin() {
  document.getElementById("trailWin")?.classList.remove("open");
}

window.blitzAshTrial = function() {
  if (!state.ashTrialCompleted || state.mode !== 'home') {
    toast('Complete the Ash Trial first, then Blitz from the nest.');
    return;
  }
  if (dailyLeft() <= 0) {
    toast("No daily clears left!");
    return;
  }

  // Trick the game into thinking we are in the trial so winStage doesn't block us
  state.mode = "stage"; 
  
  // Run the exact same victory sequence!
  winStage(); 

  toast("Trial Blitzed! Rewards sent to nest.");
  save();
  render();
};
// ==========================================
// MODULE 15: DRAGON BOOK & DISCOVERY
// ==========================================

function bookKnown() {
  return Object.values(state.book || { 0: true }).filter(Boolean).length;
}

function rareBookKnown() {
  return Object.values(state.rareBook || {}).filter(Boolean).length;
}

function discover(level) {
  if (state.mode === 'stage' && state.trialKind === 'surge') return;
  state.book = state.book || { 0: true };
  state.highestDiscovered = Math.max(highestOwned(), level);
  if (state.book[level]) return;
  
  state.book[level] = true;
  const pay = 120 + level * 80;
  state.coins += pay;
  toast(`Book unlocked: ${CHAIN[level].name} • +${pay} 🪙`);
}

function discoverRare(level) {
  if (state.mode === 'stage' && state.trialKind === 'surge') return;
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

// Element discoveries never replay stage-based coin rewards.
function recordElementDiscovery(item) {
  if (state.mode === 'stage' && state.trialKind === 'surge') return;
  if (!item || !Number.isInteger(item.level) || item.level < 2 || item.level > 5 ||
      !Object.prototype.hasOwnProperty.call(ELEMENT_BOOK, item.element)) return;
  for (const key of item.shiny ? ['elementBook','rareElementBook'] : ['elementBook']) {
    if (!state[key] || typeof state[key] !== 'object' || Array.isArray(state[key])) state[key] = {};
    if (!state[key][item.element] || typeof state[key][item.element] !== 'object') state[key][item.element] = {};
    state[key][item.element][item.level] = true;
  }
}

function recoverElementDiscoveries() {
  // Old saves have no element history: recover verified owned dragons only.
  [...(state.cells || []), ...(state.perch || []), ...(state.elderReserve || []).map(entry => entry.dragon),
    ...(state.battleRoster || []),
    ...(state.mode === 'stage' ? state.stageCells || [] : [])].forEach(recordElementDiscovery);
}

function bookChapterCount(rare = false) {
  const records = currentBookElement === 'growth'
    ? (rare ? state.rareBook : state.book)
    : (rare ? state.rareElementBook : state.elementBook)?.[currentBookElement];
  const first = currentBookElement === 'growth' ? 0 : 2;
  return CHAIN.slice(first, currentBookElement === 'growth' ? 2 : CHAIN.length).filter((_, i) => records?.[i + first]).length;
}

window.switchBookElement = (element) => {
  if (element !== 'growth' && !Object.prototype.hasOwnProperty.call(ELEMENT_BOOK, element)) return;
  currentBookElement = element;
  currentBookPage = Math.min(element === 'growth' ? 1 : CHAIN.length-1, Math.max(element === 'growth' ? 0 : 2, currentBookPage));
  renderBook();
};

window.switchBookTab = (tabIndex) => {
  if (tabIndex !== 0 && tabIndex !== 1) return;
  currentBookTab = tabIndex;
  document.getElementById("tabMain")?.classList.toggle("active", tabIndex === 0);
  document.getElementById("tabRare")?.classList.toggle("active", tabIndex === 1);
  renderBook();
};

document.getElementById("prevPageBtn")?.addEventListener("click", () => {
  if (currentBookPage > (currentBookElement === 'growth' ? 0 : 2)) {
    currentBookPage--;
    renderBook();
    sfx("click");
  }
});
document.getElementById("nextPageBtn")?.addEventListener("click", () => {
  if (currentBookPage < (currentBookElement === 'growth' ? 1 : CHAIN.length - 1)) {
    currentBookPage++;
    renderBook();
    sfx("click");
  }
});

function renderBook() {
  const spread = document.getElementById("bookSpread");
  if (!spread) return;
  state.book = state.book || {0:true};
  state.rareBook = state.rareBook || {};
  const isRare = currentBookTab === 1;
  const chapter = ELEMENT_BOOK[currentBookElement];
  const last = chapter ? CHAIN.length - 1 : 1;
  currentBookPage = Math.max(chapter ? 2 : 0, Math.min(last, currentBookPage));
  const records = chapter ? (isRare ? state.rareElementBook : state.elementBook)?.[currentBookElement]
    : (isRare ? state.rareBook : state.book);
  const known = !!records?.[currentBookPage];
  const spec = CHAIN[currentBookPage];
  const entryName = chapter ? chapter.name + ' ' + spec.name : spec.name;
  const lore = chapter ? chapter.lore[currentBookPage - 2] : (currentBookPage === 1
    ? 'Five Hatchlings become a Wyrmling of Fire, Water, or Nature. Follow its element in the other chapters.'
    : 'Every dragon begins here. Merge five Eggs into a Hatchling; its element emerges at Wyrmling.');
  const first = chapter ? 2 : 0;
  const picker = document.getElementById('bookElement');
  if (picker) picker.value = currentBookElement;
  const total = last-first+1;
  setSafeText('bookPageLabel', (chapter ? chapter.name : 'Beginnings') + ' · ' + (currentBookPage-first+1) + ' / ' + total);
  const prev = document.getElementById("prevPageBtn");
  const next = document.getElementById("nextPageBtn");
  if (prev) prev.disabled = currentBookPage === first;
  if (next) next.disabled = currentBookPage === last;
  const art = known ? '<div class="book-portrait">' + dragonSvg(currentBookPage, 120, 1, isRare, chapter ? currentBookElement : 'neutral') + '</div>'
    : '<div class="book-unknown" aria-label="Undiscovered dragon">?</div>';
  const hint = chapter ? 'Discover ' + (isRare ? 'a shiny ' : 'a ') + entryName + ' to reveal this page.'
    : (isRare ? 'Discover a shiny dragon of this stage.' : 'Not yet hatched.');
  spread.innerHTML = '<div class="page-left">' + art + '</div><div class="page-right"><h3>' +
    (known ? (isRare ? '✨ ' : '') + entryName : 'Unknown') + '</h3><p>' +
    (known ? (isRare ? '<strong>Perch Bonus:</strong> 1.5x base coin rate.<br><br>' : '') + lore : hint) +
    '</p></div>';
  setSafeText('countMain', bookChapterCount() + ' / ' + total);
  setSafeText('countRare', bookChapterCount(true) + ' / ' + total);
  const ready = Object.keys(MASTERY_REWARDS).filter(id => masteryProgress(id) === 4 && !state.masteryClaims?.[id]).length;
  setSafeText('masteryOpen', 'Elemental mastery' + (ready ? ' · ' + ready + ' ready' : ''));
}

function masteryProgress(id) {
  if (!Object.prototype.hasOwnProperty.call(MASTERY_REWARDS,id)) return 0;
  const reward = MASTERY_REWARDS[id];
  const records = (reward.rare ? state.rareElementBook : state.elementBook)?.[reward.element];
  return [2,3,4,5].filter(level => records?.[level] === true).length;
}

function activeMasteryTitle() {
  const battleTitle=DragonBattle.regions.find(r=>r.id===state.battleTitle&&r.ids.every(id=>state.battleClears?.[id]));
  if(battleTitle)return battleTitle.title;
  const collectionTitle = SANCTUARY_COLLECTION[state.keeper?.collectionTitle];
  if (collectionTitle?.kind === 'title' && state.collectionOwned?.[state.keeper.collectionTitle] === true) return collectionTitle.name;
  const id = state.keeper?.masteryTitle;
  return Object.prototype.hasOwnProperty.call(MASTERY_REWARDS,id) && state.masteryClaims?.[id] === true
    ? MASTERY_REWARDS[id].title : '';
}

function claimMastery(id) {
  if (state.mode !== 'home' || !Object.prototype.hasOwnProperty.call(MASTERY_REWARDS,id) || state.masteryClaims?.[id] === true) return;
  recoverElementDiscoveries();
  if (masteryProgress(id) !== 4) return;
  const reward = MASTERY_REWARDS[id];
  if (!state.masteryClaims || typeof state.masteryClaims !== 'object' || Array.isArray(state.masteryClaims)) state.masteryClaims = {};
  state.masteryClaims[id] = true;
  state.contractTokens = (state.contractTokens || 0) + reward.tokens;
  save(); renderMastery(); renderBook(); renderProgressionGoals();
  toast(reward.title + ' unlocked! +' + reward.tokens + ' cosmetic token' + (reward.tokens === 1 ? '' : 's'));
}

function equipMasteryTitle(id) {
  if (state.mode !== 'home') return;
  if (id && (!Object.prototype.hasOwnProperty.call(MASTERY_REWARDS,id) || state.masteryClaims?.[id] !== true)) return;
  state.keeper = state.keeper || {title:'Novice Breeder'};
  state.keeper.masteryTitle = id || null;
  state.battleTitle = null;
  state.keeper.collectionTitle = null;
  save(); renderKeeperQuarters(); renderMastery();
}

function renderMastery() {
  const target = document.getElementById('masteryList');
  if (!target) return;
  setSafeText('masterySummary', 'Cosmetic tokens: ' + (state.contractTokens || 0) + ' · Title: ' + (activeMasteryTitle() || state.keeper?.title || 'Novice Breeder'));
  target.innerHTML = Object.entries(MASTERY_REWARDS).map(([id,reward]) => {
    const progress = masteryProgress(id);
    const claimed = state.masteryClaims?.[id] === true;
    const equipped = state.keeper?.masteryTitle === id && claimed;
    const disabled = state.mode !== 'home';
    return `<section class="mastery-card"><h3>${reward.title}</h3>
      <p>${reward.rare ? 'Shiny ' : ''}${ELEMENT_BOOK[reward.element].name}: ${progress}/4 stages discovered</p>
      <progress max="4" value="${progress}" aria-label="${reward.title} discovery progress"></progress>
      <p class="mastery-stages">${[2,3,4,5].map(level => {
        const found = (reward.rare ? state.rareElementBook : state.elementBook)?.[reward.element]?.[level] === true;
        return `${found ? '✓' : '○'} ${CHAIN[level].name}`;
      }).join(' · ')}</p>
      <p>Reward: title + ${reward.tokens} cosmetic token${reward.tokens === 1 ? '' : 's'} · one-time</p>
      ${claimed ? `<button onclick="equipMasteryTitle('${equipped ? '' : id}')" ${disabled ? 'disabled' : ''}>${equipped ? 'Remove title' : 'Equip title'}</button><span class="mastery-claimed"> Claimed ✓</span>`
        : `<button onclick="claimMastery('${id}')" ${disabled || progress < 4 ? 'disabled' : ''}>${progress === 4 ? 'Claim reward' : 'Discover all four'}</button>`}
      </section>`;
  }).join('');
}

function openMastery() {
  recoverElementDiscoveries(); save(); renderMastery();
  document.getElementById('book')?.classList.remove('open');
  document.getElementById('masteryModal')?.classList.add('open');
  document.getElementById('masteryModal')?.focus();
}

function closeMastery() {
  document.getElementById('masteryModal')?.classList.remove('open');
  document.getElementById('book')?.classList.add('open');
  renderBook(); document.getElementById('masteryOpen')?.focus();
}

// ==========================================
// MODULE 16: DAILY TIMERS & REWARDS
// ==========================================

function dayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function rollDaily() {
  const k = dayKey();
  if (state.ashDayKey !== k) {
    state.ashDayKey = k;
    state.ashDayWins = 0;
    state.sleepyDone = false;
    state.dailyEggsBought = 0;
    state.dailyPouchBonus = 0;
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
  if (h <= 0) return `${m}m`;
  return `${h}h ${m === 60 ? 0 : m}m`;
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
  if (left > 0) return `Ash Trail (${DAILY_CLEARS - left + 1}/${DAILY_CLEARS})`;
  return `Trail: ${midnightLabel()}`;
}
// --- LIVE TICK MECHANICS ---

function tickEnergy() {
  if (rollContracts()) { save(); renderContractsPanel(); renderQuest(); }
  const before = state.energy;
  replenishEnergy();
  if (state.energy !== before) save();
  const cap = state.maxEnergy || MAX_ENERGY;
  const count = document.getElementById("energyCount");
  if (count) count.innerText = `${state.energy}/${cap}`;
  const timer = document.getElementById("energyTimer");
  if (timer) {
    timer.innerText = state.energy >= cap ? "FULL" : `0:${String(Math.ceil(Math.max(0, state.nextEnergyAt - Date.now()) / 1000)).padStart(2, '0')}`;
    timer.style.color = state.energy >= cap ? "#d4af37" : "#a0a0b5";
  }
}
function tickPerch() {
  const pBtn = document.getElementById("collectPerchBtn");
  const pLabel = document.getElementById("perchLabel");
  
  if (pBtn) {
    pBtn.style.display = (state.perchBank || 0) > 0 ? "block" : "none";
    const amtEl = document.getElementById("perchBankAmt");
    if (amtEl) amtEl.innerText = state.perchBank;
  }

  if (pLabel) {
    const inc = perchIncome();
    if (!inc) {
      pLabel.innerText = "Perch: park a dragon";
    } else {
      const wait = Math.max(0, state.perchAt + Math.floor(3600000) - Date.now()); // Fallback for PERCH_MS
      pLabel.innerText = `Perch: ${Math.ceil(wait / 1000)}s • +${inc}`;
    }
  }
}

// ==========================================
// MODULE 17: QUESTS & OFFERINGS
// ==========================================

// Weekly contracts use local calendar weeks, not a fixed 7-day millisecond span.
function contractWeek(now = Date.now()) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  const key = [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-');
  const next = new Date(date); next.setDate(next.getDate() + 7);
  return { key, next: next.getTime() };
}
function rollContracts() {
  awardElementPrisms();
  rememberWardrobeContract();
  rememberCompletedWeek();
  const week = contractWeek();
  if (state.contracts?.week === week.key) { ensureBonusContracts(); return false; }
  const tier = highestOwned();
  const make = (kind, target, want = null) => {
    const effort = {gather:1,merge:1.25,roost:.75,nurture:1.25,trial:1.5,donate:1.5,earn:1};
    return {kind, target, want, progress:0, claimed:false, reward:Math.round((200 + tier * 100) * effort[kind])};
  };
  const rotation = Math.abs(Math.floor(new Date(week.next).getTime() / 86400000)) % 3;
  state.contracts = {version:2, week: week.key, replaced: false, completed: false, selectedTier: tier, items: [
    make('gather', 60 + tier * 16 + rotation * 5),
    make('merge', 15 + tier * 5),
    make('roost', 150 + tier * tier * 150),
    state.ashTrialCompleted ? make('trial', 2 + rotation % 2) : make('nurture', 3 + tier, Math.max(1,Math.min(3,tier))),
    tier > 0 ? make('donate', 1, tier - 1) : make('earn', 1000),
  ]};
  save();
  return true;
}
function contractEvent(kind, count = 1, level = null) {
  rollContracts();
  if (kind !== 'trial' && state.mode !== 'home') return;
  if (!Number.isFinite(count) || count <= 0) return;
  for (const item of state.contracts.items) if (!item.claimed && item.kind === kind && (kind !== 'nurture' || item.want === level))
    item.progress = Math.min(item.target, item.progress + count);
  for (const item of state.contracts.bonus || []) {
    if (item.claimed || item.kind !== kind) continue;
    item.progress = Math.min(item.target, item.progress + count);
    if (item.progress >= item.target) {
      item.claimed = true;
      state.contractTokens = (state.contractTokens || 0) + 1;
      state.bonusSeals = (state.bonusSeals || 0) + 1;
      awardElementPrisms();
      toast('Bonus complete! +1 cosmetic token and 1 permanent collection seal.' + (state.contracts.bonus.every(item => item.claimed) ? ' Element Prism added to The Stash.' : ''));
    }
  }
  save();
}
function ensureBonusContracts() {
  if (!state.contracts?.completed || !state.contracts.items.every(item => item.claimed) || state.contracts.bonus) return;
  const tier = Math.max(0, Math.min(5, Number(state.contracts.selectedTier) || 0));
  state.contracts.bonus = [
    {kind:'gather',target:60+tier*10,progress:0,claimed:false},
    {kind:'merge',target:15+tier*3,progress:0,claimed:false},
  ];
}
function bonusSealCount() { return Math.max(0, Math.floor(Number(state.bonusSeals) || 0)); }
function contractTitle(item) {
  if (item.kind === 'roost') return 'Collect coins from the Roost';
  if (item.kind === 'earn') return 'Earn coins by promoting dragons';
  if (item.kind === 'nurture') return 'Raise ' + CHAIN[item.want].name + ' dragons';
  if (item.kind === 'donate') return 'Donate one ' + CHAIN[item.want].name;
  if (item.kind === 'trial') return 'Clear Ash Trials';
  if (item.kind === 'merge') return 'Promote dragons at the nest';
  return 'Gather at the nest';
}
function claimContract(index, week) {
  rollContracts();
  const item = state.contracts.items[index];
  if (state.mode !== 'home' || week !== state.contracts.week || !item || item.claimed) return;
  if (item.kind === 'donate') {
    // Never request a player's highest tier, even on old or unusual saves.
    if (item.want >= highestOwned() || !consumeOne(item.want)) return;
    item.progress = item.target;
  }
  if (item.progress < item.target) return;
  item.claimed = true;
  state.coins += item.reward;
  if (state.contracts.items.every(c => c.claimed) && !state.contracts.completed) {
    state.contracts.completed = true;
    rememberCompletedWeek();
    state.coins += 500;
    state.contractTokens = (state.contractTokens || 0) + 1;
    ensureBonusContracts();
    toast('Week complete! +500 coins and 1 cosmetic token saved for cosmetic rewards.');
  } else toast('Contract complete! +' + item.reward + ' coins');
  save(); render(); renderContractsPanel();
}
function replaceContract(index, week) {
  rollContracts();
  const item = state.contracts.items[index];
  if (state.mode !== 'home' || week !== state.contracts.week || !item || item.claimed || state.contracts.replaced) return;
  state.contracts.replaced = true;
  const kind = item.kind === 'gather' ? 'merge' : 'gather';
  state.contracts.items[index] = {kind, target: kind === 'merge' ? 12 + state.contracts.selectedTier * 2 : 35 + state.contracts.selectedTier * 10,
    want: null, progress: 0, claimed: false, reward: item.reward};
  save(); render(); renderContractsPanel();
}
function renderContractsPanel() {
  const panel = document.getElementById('contractsList');
  if (!panel) return;
  rollContracts();
  const weekly = state.contracts;
  panel.innerHTML = weekly.items.map((item, i) => {
    const ready = item.kind === 'donate' ? findLevel(item.want) >= 0 && item.want < highestOwned() : item.progress >= item.target;
    return `<section class="contract-row"><strong>${contractTitle(item)}</strong>
      <p>${item.kind === 'donate' ? 'Spends one dragon from your board' : item.progress + '/' + item.target} · ${item.reward} 🪙</p>
      <button ${item.claimed || !ready || state.mode !== 'home' ? 'disabled' : ''} onclick="claimContract(${i}, '${weekly.week}')">${item.claimed ? 'Claimed ✓' : item.kind === 'donate' ? 'Donate & claim' : 'Claim'}</button>
      <button ${item.claimed || weekly.replaced || state.mode !== 'home' ? 'disabled' : ''} onclick="replaceContract(${i}, '${weekly.week}')">Replace</button></section>`;
  }).join('');
  panel.innerHTML += '<section class="savings-panel contract-bonus"><strong>Optional weekly bonuses</strong><p>After all five claims: two extra goals, one cosmetic token and one permanent collection seal each. Complete both for one Element Prism in The Stash. Rewards bank automatically. Unfinished bonus progress resets Monday; earned rewards never expire. No daily streak.</p>' +
    (weekly.bonus ? weekly.bonus.map(item => '<p>' + contractTitle(item) + ' · ' + item.progress + '/' + item.target + (item.claimed ? ' · Reward banked ✓' : ' · +1 token / +1 seal') + '</p>').join('') : '<p>Complete and claim the five contracts to unlock.</p>') + '</section>';
  const resetLabel = document.getElementById('contractsReset');
  if (resetLabel) resetLabel.textContent = 'Resets Monday: ' + new Date(contractWeek().next).toLocaleString() + ' · ' +
    (weekly.replaced ? 'Replacement used' : '1 free replacement; replaces current progress') +
    ' · Cosmetic tokens: ' + (state.contractTokens || 0);
  renderCosmeticShop();
}
function ownsCosmeticReward(id) {
  const item = STASH_CATALOG[id];
  return !!item && (!!state.redeemedCosmetics?.[id] || (state.stash?.[id] || 0) > 0 ||
    (!!item.img && state.keeper?.equipment?.[item.slot]?.split('/').pop() === item.img.split('/').pop()));
}
function redeemCosmetic(id) {
  if (!ELEMENTAL_ASSETS_READY) return;
  const item = STASH_CATALOG[id];
  if (state.mode !== 'home' || !item || !Number.isInteger(item.tokenCost) || ownsCosmeticReward(id)) return;
  if (!masteryGateMet(item.mastery)) { toast('Claim the required elemental mastery first.'); return; }
  const tokens = state.contractTokens || 0;
  if (tokens < item.tokenCost) { toast('Earn cosmetic tokens by completing weekly contracts.'); return; }
  if (state.coins < (item.coinCost || 0)) { toast('More coins are needed for this frame.'); return; }
  state.contractTokens = tokens - item.tokenCost;
  state.coins -= item.coinCost || 0;
  state.redeemedCosmetics = state.redeemedCosmetics || {};
  state.redeemedCosmetics[id] = true;
  state.stash = state.stash || {};
  state.stash[id] = (state.stash[id] || 0) + 1;
  save(); render(); renderContractsPanel();
  toast(item.name + ' added to The Stash. Select it there to equip.');
}
function renderCosmeticShop() {
  const target = document.getElementById('cosmeticRewards');
  if (!target) return;
  if (!ELEMENTAL_ASSETS_READY) { target.innerHTML = '<p>Elemental frames are being prepared. Your tokens remain saved.</p>'; return; }
  target.innerHTML = Object.entries(STASH_CATALOG).filter(([,item]) => Number.isInteger(item.tokenCost)).map(([id,item]) =>
    `<section class="cosmetic-reward"><img src="${item.img}" alt="${item.name} portrait frame"><strong>${item.name}</strong>
      ${item.mastery ? '<p>Requires all three Main mastery rewards claimed.</p>' : ''}
      <button onclick="redeemCosmetic('${id}')" ${ownsCosmeticReward(id) || state.mode !== 'home' || !masteryGateMet(item.mastery) || state.coins < (item.coinCost || 0) || (state.contractTokens || 0) < item.tokenCost ? 'disabled' : ''}>
      ${ownsCosmeticReward(id) ? 'Owned ✓' : item.tokenCost ? item.tokenCost + ' cosmetic tokens' + (item.coinCost ? ' + ' + item.coinCost.toLocaleString() + ' coins' : '') : 'Claim free'}</button></section>`).join('');
}

function rememberCompletedWeek() {
  if (!state.contracts?.completed || !/^\d{4}-\d{1,2}-\d{1,2}$/.test(state.contracts.week)) return;
  if (!state.completedContractWeeks || typeof state.completedContractWeeks !== 'object' || Array.isArray(state.completedContractWeeks)) state.completedContractWeeks = {};
  state.completedContractWeeks[state.contracts.week] = true;
}
function completedWeeksCount() {
  return Object.entries(state.completedContractWeeks || {}).filter(([week,done]) => /^\d{4}-\d{1,2}-\d{1,2}$/.test(week) && done === true).length;
}
function masteryGateMet(gate) {
  return !gate || (gate === 'all' ? ['fire','water','nature'].every(e => state.masteryClaims?.[e] === true) : state.masteryClaims?.[gate] === true);
}
function collectionAvailable(item) {
  return masteryGateMet(item.mastery) && completedWeeksCount() >= (item.weeks || 0) &&
    (!item.surge || state.surgeCleared === true) &&
    bonusSealCount() >= (item.seals || 0) &&
    (!item.expedition || expeditionStamps(item.expedition) >= item.stamps) &&
    sanctuaryProjectRank() >= (item.projectRank || 0);
}
let pendingExpedition = null;
function expeditionStamps(route) {
  const count = state.expeditionJournal?.[route];
  return Number.isSafeInteger(count) && count >= 0 ? count : 0;
}
function expeditionReady() {
  const trip = state.expedition;
  return !!trip && Object.prototype.hasOwnProperty.call(EXPEDITION_ROUTES,trip.route) &&
    Object.prototype.hasOwnProperty.call(EXPEDITION_PACKAGES,trip.package) && Number.isFinite(trip.readyAt) && Date.now() >= trip.readyAt;
}
function previewExpedition(route, packageId) {
  if (state.mode !== 'home' || state.expedition || !sanctuaryProjectOpen() ||
      !Object.prototype.hasOwnProperty.call(EXPEDITION_ROUTES,route) || !Object.prototype.hasOwnProperty.call(EXPEDITION_PACKAGES,packageId)) return;
  pendingExpedition = {route,package:packageId};
  renderExpeditions();
}
function cancelExpeditionPreview() { pendingExpedition = null; renderExpeditions(); }
function confirmExpedition() {
  const quote = pendingExpedition;
  if (!quote || state.mode !== 'home' || state.expedition || !sanctuaryProjectOpen()) return false;
  const offer = EXPEDITION_PACKAGES[quote.package];
  if (!offer || state.coins < offer.coins) return false;
  const trip = {...quote,id:Date.now(),startedAt:Date.now(),readyAt:Date.now()+offer.hours*3600000};
  state.coins -= offer.coins; state.expedition = trip;
  if (!save()) { state.coins += offer.coins; delete state.expedition; return false; }
  pendingExpedition = null; render(); toast('Expedition funded. Your journal reward will wait until you return.'); return true;
}
function claimExpedition(id) {
  if (state.mode !== 'home' || !expeditionReady() || state.expedition.id !== id) return false;
  const trip = state.expedition, previous = state.expeditionJournal;
  state.expeditionJournal = {...previous,[trip.route]:expeditionStamps(trip.route)+EXPEDITION_PACKAGES[trip.package].stamps};
  delete state.expedition;
  if (!save()) { state.expedition = trip; state.expeditionJournal = previous; return false; }
  render(); toast('Journal updated! Permanent route titles unlock at 12 stamps.'); return true;
}
function renderExpeditions() {
  const target = document.getElementById('expeditionContent');
  if (!target) return;
  const disabled = state.mode !== 'home' ? 'disabled' : '';
  const journal = Object.entries(EXPEDITION_ROUTES).map(([id,name]) => name + ': ' + expeditionStamps(id) + ' stamps').join(' · ');
  let html = '<p>' + journal + '</p><p>Each route unlocks a permanent title at 12 stamps. Further trips continue your journal total; no additional rewards are promised beyond that milestone.</p>';
  if (!sanctuaryProjectOpen()) html += '<p>Discover Elder and complete all five decor upgrades to unlock expeditions.</p>';
  else if (state.expedition) {
    const trip = state.expedition;
    const route = EXPEDITION_ROUTES[trip.route];
    if (!route || !EXPEDITION_PACKAGES[trip.package] || !Number.isFinite(trip.readyAt)) html += '<p>Saved expedition needs recovery. It has not been replaced or charged again.</p>';
    else html += '<p>' + route + ' · ' + (expeditionReady() ? 'Ready to collect. No expiry.' : Math.max(1,Math.ceil((trip.readyAt-Date.now())/60000)) + ' minutes remaining · progresses offline') + '</p><button ' + (expeditionReady() ? disabled : 'disabled') + ' onclick="claimExpedition(' + Number(trip.id) + ')">Collect journal stamps</button>';
  } else if (pendingExpedition) {
    const offer = EXPEDITION_PACKAGES[pendingExpedition.package];
    html += '<p>Confirm ' + EXPEDITION_ROUTES[pendingExpedition.route] + ' · ' + offer.name + ': ' + offer.coins.toLocaleString() + ' coins for ' + offer.stamps + ' stamps in ' + offer.hours + ' hours. Coins are spent on departure, with no refund. Dragons and Roost income are unchanged.</p><p>Balance after departure: ' + Math.max(0,state.coins-offer.coins).toLocaleString() + ' coins. This optional spending can delay your collection goals; upgrade savings does not protect expedition spending.</p><button onclick="confirmExpedition()" ' + (state.coins >= offer.coins ? disabled : 'disabled') + '>Confirm · spend ' + offer.coins.toLocaleString() + '</button><button onclick="cancelExpeditionPreview()">Cancel · spend nothing</button>';
  } else html += Object.entries(EXPEDITION_ROUTES).map(([route,name]) => '<section class="expedition-route"><h4>' + name + '</h4>' + Object.entries(EXPEDITION_PACKAGES).map(([id,offer]) => '<button ' + (state.coins >= offer.coins ? disabled : 'disabled') + ' onclick="previewExpedition(\'' + route + '\',\'' + id + '\')">' + offer.name + ' · ' + offer.coins.toLocaleString() + ' coins · ' + offer.hours + 'h · ' + offer.stamps + ' stamps</button>').join('') + '</section>').join('');
  if (target._expeditionHtml !== html) { target.innerHTML = html; target._expeditionHtml = html; }
}
function trackCollection(id) {
  if (state.mode !== 'home' || !Object.prototype.hasOwnProperty.call(SANCTUARY_COLLECTION,id)) return;
  state.collectionGoal = state.collectionGoal === id ? null : id;
  save(); render();
}
function sanctuaryProjectRank() {
  return Math.max(0, Math.min(10, Math.floor(Number(state.sanctuaryRank) || 0)));
}
function sanctuaryProjectCost() { return 50000 * (sanctuaryProjectRank() + 1); }
function sanctuaryProjectOpen() {
  return highestOwned() >= 5 && DECOR.every(d => state.decor?.[d.id]);
}
function contributeSanctuary() {
  if (state.mode !== 'home' || !sanctuaryProjectOpen() || sanctuaryProjectRank() >= 10) return;
  const cost = sanctuaryProjectCost();
  if (state.coins < cost) { toast('Keep saving for the next Sanctuary project.'); return; }
  state.coins -= cost;
  state.sanctuaryRank = sanctuaryProjectRank() + 1;
  save(); render();
  toast('Sanctuary project ' + state.sanctuaryRank + '/10 complete. Titles unlock at 1, 5 and 10.');
}
let elderReservePage = 0;
function storeElder(index) {
  if (state.mode !== 'home' || !Number.isInteger(index) || state.locked[index]) return false;
  const dragon = state.cells[index];
  if (!dragon || dragon.level !== 5 || !Number.isSafeInteger(dragon.count) || dragon.count < 1) return false;
  highestOwned();
  state.elderReserve.push({id: state.elderReserveNextId++, dragon: {...dragon}});
  state.cells[index] = null;
  selectedCell = -1;
  save(); render();
  toast('Elder safely stored. Return it from Nest whenever a board tile is free.');
  return true;
}
function restoreElder(id) {
  if (state.mode !== 'home') return false;
  const index = state.elderReserve.findIndex(entry => entry.id === id);
  if (index < 0) return false;
  const free = emptyOpen();
  if (!free.length) { toast('Free one board tile before returning this Elder.'); return false; }
  state.cells[free[0]] = {...state.elderReserve[index].dragon};
  state.elderReserve.splice(index, 1);
  save(); render();
  toast('Elder returned to the Board.');
  return true;
}
function reserveDragonLabel(dragon) {
  const element = ({fire:'Fire',water:'Water',nature:'Nature'})[dragon.element] || 'Neutral';
  return (dragon.shiny ? 'Shiny ' : '') + element + ' Elder' + (dragon.count > 1 ? ' ×' + dragon.count : '');
}
function changeReservePage(delta) {
  elderReservePage += delta;
  renderElderReserve();
}
function renderElderReserve() {
  const target = document.getElementById('elderReserveList');
  if (!target) return;
  const pages = Math.max(1, Math.ceil(state.elderReserve.length / 8));
  elderReservePage = Math.max(0, Math.min(pages - 1, elderReservePage));
  const blocked = state.mode !== 'home';
  const rows = state.cells.map((dragon,index) => dragon?.level === 5 && !state.locked[index] ?
    '<div class="reserve-row"><span>' + reserveDragonLabel(dragon) + ' · tile ' + (index+1) + '</span><button onclick="storeElder(' + index + ')" ' + (blocked ? 'disabled' : '') + '>Store</button></div>' : '').join('');
  const html = '<h4>On the Board</h4>' + (rows || '<p>No Elders on the Board.</p>') + '<h4>In reserve · ' + state.elderReserve.length + ' stacks</h4>' +
    (state.elderReserve.slice(elderReservePage*8, elderReservePage*8+8).map(entry =>
      '<div class="reserve-row"><span>' + reserveDragonLabel(entry.dragon) + '</span><button onclick="restoreElder(' + entry.id + ')" ' + (blocked || !emptyOpen().length ? 'disabled' : '') + '>Return</button></div>').join('') || '<p>Your reserve is empty.</p>') +
    (pages > 1 ? '<div class="reserve-pages"><button onclick="changeReservePage(-1)" ' + (!elderReservePage ? 'disabled' : '') + '>Previous</button><span>' + (elderReservePage+1) + '/' + pages + '</span><button onclick="changeReservePage(1)" ' + (elderReservePage+1 >= pages ? 'disabled' : '') + '>Next</button></div>' : '');
  if (target._reserveHtml !== html) { target.innerHTML = html; target._reserveHtml = html; }
}
function nextProgressionGoal() {
  if (state.mode !== 'home') return null;
  if (expeditionReady()) return {text:'Your expedition journal reward is ready; no expiry.',target:'expedition'};
  const free = emptyOpen().length;
  if (free < 3 && state.cells.some(dragon => dragon?.level === 5))
    return {text:'Make room: safely store an Elder.', target:'reserve'};
  if (rewardInboxCount()) return {text:rewardInboxCount() + ' rewards waiting' + (free ? ' — collect in Goals.' : ' — merge to free a tile.'), target:free ? 'inbox' : 'book'};
  if (Object.keys(MASTERY_REWARDS).some(id => masteryProgress(id) === 4 && !state.masteryClaims?.[id]))
    return {text:'A mastery reward is ready to claim.', target:'mastery'};
  if (state.contracts?.items?.some(item => !item.claimed && item.progress >= item.target))
    return {text:'A weekly contract reward is ready.', target:'contracts'};
  const decor = nextDecorGoal();
  const tracked = SANCTUARY_COLLECTION[state.collectionGoal];
  if (tracked && !state.collectionOwned?.[state.collectionGoal]) return {text:'Collect ' + tracked.name + ' · ' + (collectionAvailable(tracked) ? Math.max(0,tracked.coins-state.coins).toLocaleString() + ' coins / ' + Math.max(0,tracked.tokens-(state.contractTokens||0)) + ' tokens left.' : tracked.seals ? bonusSealCount() + '/' + tracked.seals + ' collection seals.' : 'View unlock requirements.'), target:'collection'};
  if (decor) return {text:decor.name + (state.coins >= decor.cost ? ' is ready to unlock.' : ' · ' + (decor.cost-state.coins).toLocaleString() + ' coins to go.'), target:'decor'};
  if (sanctuaryProjectOpen() && sanctuaryProjectRank() < 10)
    return {text:'Sanctuary project ' + (sanctuaryProjectRank()+1) + '/10 · ' + Math.max(0,sanctuaryProjectCost()-state.coins).toLocaleString() + ' coins to go.', target:'collection'};
  if (highestOwned() < 5) return {text:'Discover your next dragon stage in the Dragon Book.', target:'book'};
  if (Object.keys(MASTERY_REWARDS).some(id => !state.masteryClaims?.[id]))
    return {text:'Complete elemental and shiny mastery collections.', target:'mastery'};
  if (state.contracts?.bonus?.some(item => !item.claimed)) return {text:'Optional weekly bonuses earn cosmetic tokens and collection seals.', target:'contracts'};
  return {text:'Grow your cosmetic collection and weekly rewards.', target:'collection'};
}
function openNextGoal() {
  const goal = nextProgressionGoal();
  if (!goal) return;
  if (goal.target === 'mastery') { openMastery(); return; }
  if (goal.target === 'contracts') { openContracts(); return; }
  if (goal.target === 'book') { document.getElementById('bookBtn')?.click(); return; }
  if (goal.target === 'inbox') { document.querySelector('[data-tab="view-goals"]')?.click();document.getElementById('collectRewardInbox')?.focus();return; }
  document.querySelector('[data-tab="view-nest"]')?.click();
  const subtab = goal.target === 'decor' ? 'sub-decor' : 'sub-collection';
  if (goal.target === 'expedition') document.querySelector('[data-subtab="sub-collection"]')?.click();
  if (goal.target === 'decor' || goal.target === 'collection') document.querySelector('[data-subtab="' + subtab + '"]')?.click();
  const target = document.getElementById(goal.target === 'expedition' ? 'expeditionPanel' : goal.target === 'reserve' ? 'elderReservePanel' : goal.target === 'inbox' ? 'collectRewardInbox' : subtab);
  if (goal.target === 'reserve' && target) target.open = true;
  target?.scrollIntoView?.({block:'nearest'});
  target?.focus?.();
}
function renderProgressionGoals() {
  renderExpeditions();
  renderElderReserve();
  const goal = nextProgressionGoal();
  setSafeText('goalsNextStatus',goal?'Next: '+goal.text:'Finish your current Trial to manage goals.');
  setSafeText('goalsSleepyStatus',state.level<3?'Daily offering unlocks at Keeper level 3.':state.sleepyDone?'Offering complete for today. Streak: '+(state.sleepyStreak||0)+'/7.':'Offer one untrained Young dragon · Streak '+(state.sleepyStreak||0)+'/7.');
  const sleepyOffer=document.getElementById('goalsSleepyOffer');
  if(sleepyOffer)sleepyOffer.disabled=state.mode!=='home'||state.level<3||state.sleepyDone||findLevel(3)<0;
  const prompt = document.getElementById('savingsBoardHint');
  if (prompt) { prompt.hidden = !goal; prompt.textContent = goal ? 'Next goal: ' + goal.text + ' ›' : ''; }
  const pending = rewardInboxCount();
  setSafeText('rewardInboxStatus', pending ? pending + ' dragon rewards saved. Make board space, then collect; nothing expires.' : 'No waiting rewards. Full-board chest and Trial gifts are saved here.');
  const inbox = document.getElementById('collectRewardInbox');
  if (inbox) { inbox.disabled = state.mode !== 'home' || !pending || !emptyOpen().length; inbox.textContent = 'Collect saved dragons (' + pending + ')'; }
  const rank = sanctuaryProjectRank();
  const cost = sanctuaryProjectCost();
  setSafeText('sanctuaryProjectStatus', rank >= 10 ? '10/10 Sanctuary projects complete. All project titles unlocked.' :
    !sanctuaryProjectOpen() ? 'Discover Elder and complete all five decor upgrades to unlock optional Sanctuary projects.' :
    'Project ' + (rank + 1) + '/10 · ' + Math.min(state.coins,cost).toLocaleString() + '/' + cost.toLocaleString() + ' coins · ' + Math.max(0,cost-state.coins).toLocaleString() + ' left. Permanent titles at 1, 5 and 10; no power bonuses or deadlines.');
  const project = document.getElementById('sanctuaryProjectBtn');
  if (project) { project.disabled = state.mode !== 'home' || rank >= 10 || !sanctuaryProjectOpen() || state.coins < cost; project.textContent = rank >= 10 ? 'Projects complete' : 'Fund next project · ' + cost.toLocaleString() + ' coins'; }
}
function claimCollection(id) {
  if (state.mode !== 'home' || !Object.prototype.hasOwnProperty.call(SANCTUARY_COLLECTION,id)) return;
  rememberCompletedWeek();
  const item = SANCTUARY_COLLECTION[id];
  if (state.collectionOwned?.[id] === true || !collectionAvailable(item)) return;
  if (state.coins < item.coins || (state.contractTokens || 0) < item.tokens) { toast('Earn more coins or cosmetic tokens first.'); return; }
  if (!state.collectionOwned || typeof state.collectionOwned !== 'object' || Array.isArray(state.collectionOwned)) state.collectionOwned = {};
  state.coins -= item.coins;
  state.contractTokens = (state.contractTokens || 0) - item.tokens;
  state.collectionOwned[id] = true;
  save(); render(); toast(item.name + ' unlocked permanently. Select Equip to use it.');
}
function equipCollection(id) {
  if (state.mode !== 'home' || !Object.prototype.hasOwnProperty.call(SANCTUARY_COLLECTION,id) || state.collectionOwned?.[id] !== true) return;
  const item = SANCTUARY_COLLECTION[id];
  state.keeper = state.keeper || {title:'Novice Breeder'};
  if (item.kind === 'title') {
    state.battleTitle = null;
    state.keeper.collectionTitle = state.keeper.collectionTitle === id ? null : id;
    state.keeper.masteryTitle = null;
  } else state.sanctuaryStyle = state.sanctuaryStyle === id ? null : id;
  save(); render();
}
function collectionRewardDetails(item) {
  if (item.kind === 'title') return 'Displays this title beneath your Keeper name on Home. One title at a time; your Sanctuary style stays equipped. Cosmetic only — no income or power bonus.';
  const looks = {fire:'Warm ember glows',water:'Blue water ripples',nature:'Green canopy shading'};
  return `${looks[item.element] || 'Elemental accents'} on the Board and Home Keeper panel, plus ${item.icon} beside your header name. One Sanctuary style at a time; your room and clothing stay unchanged. Cosmetic only — no income or power bonus.`;
}
function renderCollection() {
  rememberCompletedWeek();
  const equipped = SANCTUARY_COLLECTION[state.sanctuaryStyle];
  const element = equipped?.kind === 'sanctuary' && state.collectionOwned?.[state.sanctuaryStyle] === true ? equipped.element : '';
  document.getElementById('app')?.setAttribute('data-sanctuary', element);
  setSafeText('sanctuaryBadge', element ? equipped.icon + ' ' + equipped.name : '');
  const sanctuaryIcon = document.getElementById('headerSanctuaryIcon');
  if (sanctuaryIcon) {
    sanctuaryIcon.textContent = element ? equipped.icon : '';
    sanctuaryIcon.hidden = !element;
    sanctuaryIcon.setAttribute('aria-label', element ? equipped.name + ' Sanctuary style equipped' : '');
    sanctuaryIcon.title = element ? equipped.name : '';
  }
  setSafeText('collectionSummary', `${Object.keys(SANCTUARY_COLLECTION).filter(id => state.collectionOwned?.[id] === true).length}/${Object.keys(SANCTUARY_COLLECTION).length} collected · ${completedWeeksCount()} completed weeks · ${state.contractTokens || 0} tokens · ${bonusSealCount()} permanent seals. Track a reward to guide your next goal. Seals are milestones, not spent currency.`);
  const target = document.getElementById('sanctuaryCollection');
  if (!target) return;
  target.innerHTML = Object.entries(SANCTUARY_COLLECTION).map(([id,item]) => {
    const owned = state.collectionOwned?.[id] === true;
    const active = item.kind === 'title' ? state.keeper?.collectionTitle === id : state.sanctuaryStyle === id;
    const ready = collectionAvailable(item);
    const details = collectionRewardDetails(item);
    const ownership = owned ? 'Permanently owned · switching or removing is free' : (item.coins || item.tokens) ? 'One-time unlock · equip afterward' : 'Free reward · unlock, then equip';
    const requirement = item.surge ? 'Complete Ember Surge in Trials' : item.expedition ? `${EXPEDITION_ROUTES[item.expedition]} journal: ${expeditionStamps(item.expedition)}/${item.stamps} stamps` : item.seals ? `Earn ${item.seals} bonus seals (${bonusSealCount()}/${item.seals}); at most two per week, no consecutive-week requirement` : item.projectRank ? `Complete ${item.projectRank} Sanctuary projects (${sanctuaryProjectRank()}/${item.projectRank})` : item.weeks ? `Complete ${item.weeks} weekly sets (${completedWeeksCount()}/${item.weeks})` : item.mastery === 'all' ? 'Claim all three Main mastery rewards' : `Claim ${ELEMENT_BOOK[item.mastery].name} Main mastery`;
    return `<section class="collection-card"><div class="collection-emblem ${item.element || ''}" aria-hidden="true">${item.icon}</div><h3>${item.name}</h3>
      <p>${details}</p><p>${item.kind === 'title' ? 'Keeper title' : 'Sanctuary style'} · ${requirement}</p>
      <p>${ownership}${owned ? '' : `<br>${item.coins.toLocaleString()} coins${item.tokens ? ' + '+item.tokens+' cosmetic tokens' : ''}`}</p>
      <button onclick="${owned ? 'equipCollection' : 'claimCollection'}('${id}')" ${state.mode !== 'home' || !owned && (!ready || state.coins < item.coins || (state.contractTokens || 0) < item.tokens) ? 'disabled' : ''}>${owned ? active ? 'Equipped · remove' : 'Equip' : !ready ? 'Locked' : 'Unlock'}</button>${!owned ? `<button onclick="trackCollection('${id}')" aria-pressed="${state.collectionGoal === id}" ${state.mode !== 'home' ? 'disabled' : ''}>${state.collectionGoal === id ? 'Tracking · stop' : 'Track goal'}</button>` : ''}</section>`;
  }).join('');
}
function openContracts() {
  rollContracts(); save(); renderContractsPanel();
  const goalsTab=document.querySelector('[data-tab="view-goals"]');
  if(goalsTab){goalsTab.click();return;}
  document.getElementById('contractsModal')?.classList.add('open');
  document.getElementById('contractsModal')?.focus();
}
function openNestCollection(){
  if(state.mode!=='home')return;
  document.querySelector('[data-tab="view-nest"]')?.click();
  document.querySelector('[data-subtab="sub-collection"]')?.click();
  document.getElementById('expeditionPanel')?.scrollIntoView?.({block:'start'});
}
function closeContracts() {
  document.getElementById('contractsModal')?.classList.remove('open');
  document.getElementById('contractsOpen')?.focus();
}

function fulfillSleepy() {
  if (state.sleepyDone) return;
  if (!consumeOne(3)) { 
    toast("Need a Young dragon on the board"); 
    return; 
  }
  
  state.sleepyDone = true;
  state.sleepyStreak = (state.sleepyStreak || 0) + 1;
  state.coins += 3000;
  state.dailyPouchBonus = 5;
  
  const cap = state.maxEnergy || 5;
  state.energy += 10; 

  let extra = "Dream Hoard! +3000 🪙 • +10 Energy • +5 Pouch today";
  
  // 7-Day Streak Milestone
  if (state.sleepyStreak % 7 === 0) {
    state.maxEnergy = cap + 1;
    extra += " • Max Energy +1!";
  }

  sfx("win");
  toast(extra);
  
  state.questTab = 0;
  save(); 
  render();
}

// ==========================================
// MODULE 18: BOARD UI RENDERING
// ==========================================

function itemHtml(item) {
  const spec = CHAIN[item.level];
  
  // Tier-coded border colors matching progression power
  const tierBorders = ["#4a2c17", "#6b4a32", "#d45817", "#ff6a20", "#ffcf40", "#ffe08a"];
  const borderColor = tierBorders[item.level] || "#4a2c17";

  // --- Elemental Badge Setup ---
  const iconMap = { fire: "ember", water: "water", nature: "leaf" };
  const elementIcon = iconMap[item.element] ? `${IMG_DIR}${iconMap[item.element]}.png` : "";
  
  const badgeHTML = elementIcon ? `
    <img src="${elementIcon}" alt="${item.element}" style="
      position: absolute; 
      top: -4px; 
      right: -4px; 
      width: 22px; 
      height: 22px; 
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

    ${dragonSvg(item.level, 42, item.count, item.shiny, item.element)}
    
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
      <!-- Stack Count Badge -->
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

// ==========================================
// MODULE 19: QUEST UI RENDERING
// ==========================================

function renderQuest() {
  const box = document.getElementById("questBox");
  const topBox = document.getElementById("topQuestBox"); 
  if (!box || !topBox) return; 
  
  const stageBg = `linear-gradient(rgba(11, 22, 51, 0.75), rgba(11, 22, 51, 0.9)), url('${IMG_DIR}Mountains%20View.jpg')`;
  const homeBg = `linear-gradient(rgba(11, 22, 51, 0.43), rgb(11, 22, 51)), url('${IMG_DIR}Mountains%20View.jpg')`;

  // 1. STAGE MODE (Only 1 Quest)
  if (state.mode === "stage") {
    const have = board().some(c => c && c.level >= STAGE_GOAL);
    box.className = "quest quest-card";
    box.style.cssText = `display: block; background-image: ${stageBg}; background-size: cover; background-position: center; border: 1px solid #778da9;`;
    
    box.innerHTML = `
      <div class="art">${dragonSvg(STAGE_GOAL, 42)}</div>
      <p>${trialRules().name} • Burn <b>${trialRules().goal} ash</b> • ${state.ashBurned || 0}/${trialRules().goal} cleared<br>
      <span style="font-size:0.7rem; color:#deb781;">Live ash limits: ${ashCount()}/${trialRules().limit}</span></p>
      <button id="giveBtnStage" disabled>${have ? "Done" : "Goal"}</button>
    `;
    
    topBox.style.display = "none"; 
    if (typeof updateCarouselDots === "function") updateCarouselDots();
    return;
  }

  // 2. HOME MODE (1 or 2 Quests)
  [box, topBox].forEach(el => {
    el.className = "quest sleepy quest-card";
    el.style.cssText = `background-image: ${homeBg}; background-size: cover; background-position: center;`;
  });

  const hasSleepy = !state.sleepyDone && state.level >= 3;
  rollContracts();
  const done = state.contracts.items.filter(item => item.claimed).length;
  const normalQuestHTML = `<div class="board-contract-summary" style="flex:1"><strong>Weekly contracts · ${done}/5</strong>
    <p style="font-size:0.75rem;margin:4px 0">Five goals · Monday reset · Complete all for a cosmetic token</p>
    <button id="contractsOpen" onclick="openContracts()">View contracts</button></div>`;

  // --- RENDER LOGIC ---
  if (hasSleepy) {
    box.style.display = "block";
    topBox.style.display = "block"; 
    
    if (box.parentElement) box.parentElement.style.overflowX = "auto";
    
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

    document.getElementById("giveBtnSleepy")?.addEventListener("click", fulfillSleepy);
    document.getElementById("sleepyInfoBtn")?.addEventListener("click", () => document.getElementById("sleepyGuide")?.classList.add("open"));
    
  } else {
    box.style.display = "block";
    topBox.style.display = "none";
    topBox.innerHTML = "";
    
    box.innerHTML = normalQuestHTML;
    
    if (box.parentElement) {
      box.parentElement.style.overflowX = "hidden"; 
      box.parentElement.scrollLeft = 0; 
    }
  }
  

  if (typeof updateCarouselDots === "function") updateCarouselDots();
}

// --- TRIAL BANNER UI ---

function renderTrialBanner() {
  const surgeButton = document.getElementById('surgeEnter');
  if (surgeButton) { surgeButton.disabled = !state.ashTrialCompleted || state.mode === 'stage'; surgeButton.textContent = !state.ashTrialCompleted ? 'Complete Ash Trial first' : state.surgeCleared ? 'Replay Ember Surge' : 'Enter Ember Surge'; }
  setSafeText('surgeStatus',state.surgeCleared ? 'First-clear reward earned. Replays are free practice; no repeat rewards.' : 'First clear: 1 Element Prism and the Keeper of the Surge title in Collection.');
  const box = document.getElementById("trialBox");
  if (!box) return;
  
  const have = board().some(c => c && c.level >= STAGE_GOAL);
  
  box.className = "quest sleepy";
  box.style.cssText = "width: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between;";
  
  box.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
      <div class="art" style="flex-shrink: 0; background: none; border: none; padding: 0; min-width: auto; min-height: auto; margin-left: 0px;">
        ${dragonSvg(STAGE_GOAL, 100)}
      </div>
      
      <div style="flex: 1; margin-left: 10px;">
        <p style="margin: 0; font-size: 0.9rem; color: #ffffff;">Ash Trial • Mountain Embers<br>
        <span style="font-size: 0.75rem; color: #deb781;">${state.ashBurned || 0}/${ASH_GOAL} cleared • Limits: ${ashCount()}/${ASH_FAIL}</span></p>
      </div>
      
      <button id="trialBtn" style="background: linear-gradient(to bottom, #415a77, #1b263b); border: 1px solid #778da9; color: #e0e1dd; font-weight: 700; padding: 8px 14px; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 0 #0d1b2a; flex-shrink: 0; margin-left: auto;">
        ${state.mode === "stage" ? "Leave" : "Enter"}
      </button>
    </div>
  `;
  
  document.getElementById("trialBtn")?.addEventListener("click", enterStage);
}
// --- CAROUSEL PAGINATION ---

function updateCarouselDots() {
  const carousel = document.getElementById("quest-carousel");
  const dotsContainer = document.getElementById("quest-dots");
  
  if (!carousel || !dotsContainer) return;

  const questCards = Array.from(carousel.querySelectorAll(".quest-card"))
    .filter(card => card.innerHTML.trim() !== "" && card.style.display !== "none");

  if (questCards.length <= 1) {
    dotsContainer.innerHTML = "";
    return;
  }

  const scrollIndex = Math.round(carousel.scrollLeft / carousel.offsetWidth) || 0;

  // Instantly map and build the dots HTML
  dotsContainer.innerHTML = questCards.map((_, index) => 
    `<div class="dot ${index === scrollIndex ? 'active' : ''}"></div>`
  ).join("");

  // Safely assign the scroll listener without stacking them
  carousel.onscroll = () => {
    const currentIdx = Math.round(carousel.scrollLeft / carousel.offsetWidth);
    dotsContainer.querySelectorAll(".dot").forEach((dot, i) => {
      dot.classList.toggle("active", i === currentIdx);
    });
  };
}
// ==========================================
// MODULE 20: ROOST & PICKER UI
// ==========================================

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
      
      const iconMap = { fire: "ember", water: "water", nature: "leaf" };
      const elementIcon = iconMap[p.element] ? `${IMG_DIR}${iconMap[p.element]}.png` : "";
      
      const badgeHTML = elementIcon ? `
        <img src="${elementIcon}" alt="${p.element}" style="
          position: absolute; top: 0px; right: 0px; width: 22px; height: 22px; 
          border-radius: 50%; aspect-ratio: 1; object-fit: cover;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.9)); z-index: 10;
        ">` : "";
      
      return `<div style="position: relative; background: linear-gradient(to bottom, rgba(15,20,35,0.85), rgba(10,15,25,0.95)), url('${IMG_DIR}Mountains%20View.jpg'); background-size: cover; background-position: center; border: 1px solid ${hasSynergy ? t.border : (p.shiny ? '#ffea75' : '#415a77')}; padding: 18px; border-radius: 16px; display: flex; align-items: center; gap: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.6), inset 0 0 40px ${hasSynergy ? t.glow : 'rgba(0,0,0,0)'};">
        
        <div style="position: relative; background: radial-gradient(circle, ${hasSynergy ? t.glow : 'rgba(255,255,255,0.05)'} 0%, rgba(0,0,0,0.8) 80%); border-radius: 50%; width: 72px; height: 72px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: inset 0 4px 10px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5);">
          ${badgeHTML}
          ${dragonSvg(p.level, 68, 1, p.shiny, p.element)}
        </div>
        
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
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
  
  const vaultIncomeEl = document.getElementById("bankRate");
  if (vaultIncomeEl) vaultIncomeEl.innerText = `+${grandTotalIncome}/m`;
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
  
  const cells = board();
  let eligibleDragons = cells.map((cell, index) => ({ cell, index }))
    .filter(item => item.cell && !isLocked(item.index) && !isAsh(item.index));
    
  eligibleDragons.sort((a, b) => {
    if (b.cell.level !== a.cell.level) return b.cell.level - a.cell.level; 
    return (b.cell.shiny ? 1 : 0) - (a.cell.shiny ? 1 : 0); 
  });
  
  if (eligibleDragons.length === 0) {
    grid.innerHTML = `<div style="grid-column: span 3; color: #deb781; font-size: 0.85rem; padding: 20px;">No dragons available on the board. Gather some eggs!</div>`;
  } else {
    eligibleDragons.forEach(item => {
      const cell = item.cell;
      const originalIndex = item.index; 
      
      const card = document.createElement("div");
      card.style.cssText = `background: linear-gradient(to bottom, #1b263b, #0d1b2a); border: 1px solid ${cell.shiny ? '#ffcf40' : '#415a77'}; border-radius: 8px; padding: 10px 4px; cursor: pointer; display: flex; flex-direction: column; align-items: center;`;
      
      let el = (cell.element || "neutral").toLowerCase();
      if (el === "fire") el = "ember";
      if (el === "nature") el = "leaf";

      card.innerHTML = `
        ${dragonSvg(cell.level, 64, 1, cell.shiny, cell.element)}
        <div style="display: flex; align-items: center; justify-content: center; gap: 4px; background: rgba(0,0,0,0.5); border: 1px solid #415a77; padding: 2px 6px; border-radius: 4px; margin-top: 6px;">
           <img src="${IMG_DIR}${el}.png" style="width: 14px; height: 14px; flex-shrink: 0; object-fit: cover; border-radius: 50%;" onerror="this.style.display='none'">
           <span style="font-size: 0.6rem; color: #deb781; text-transform: capitalize;">${el}</span>
        </div>
        <span style="font-size: 0.65rem; font-weight: 700; color: ${cell.shiny ? '#ffcf40' : '#e0e1dd'}; margin-top: 6px; text-align: center;">
          ${cell.shiny ? '✨ ' : ''}${CHAIN[cell.level].name}
        </span>
        ${cell.count > 1 ? `<span style="font-size: 0.6rem; color: #ff8033; font-weight: 700; margin-top: 2px;">(x${cell.count})</span>` : ''}
      `;
      
      card.addEventListener("click", () => selectDragonForRoost(originalIndex));
      grid.appendChild(card);
    });
  }
  
  modal.style.display = "flex";
}

function closePickerModal() {
  roostTargetSlot = -1;
  document.getElementById("roostPickerModal").style.display = "none";
}

document.getElementById("closePickerBtn")?.addEventListener("click", closePickerModal);

// ==========================================
// MODULE 21: MASTER RENDER LOOP
// ==========================================

function renderCoinDetails() {
  setSafeText('coinExactBalance',Math.max(0,Math.floor(Number(state.coins)||0)).toLocaleString('en-US') + ' coins');
  const goal=nextDecorGoal();
  const description=!state.saveForDecor ? 'Upgrade savings is Off. Dragon purchases can use your available coins.' : goal
    ? `Upgrade savings is On: dragon purchases must leave ${goal.cost.toLocaleString('en-US')} coins for ${goal.name}. You still need ${Math.max(0,goal.cost-state.coins).toLocaleString('en-US')} coins to afford it. This does not block other spending.`
    : 'Upgrade savings is On, but no eligible unowned décor upgrade is available to reserve coins for.';
  setSafeText('coinSavingsDetails',description);
}
function compactCoinBalance(value) {
  const coins = Math.max(0, Math.floor(Number(value) || 0));
  if (coins < 10000) return String(coins);
  for (const [scale, suffix] of [[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'K']]) {
    if (coins >= scale) {
      const amount = coins / scale;
      return String(amount >= 100 ? Math.floor(amount) : Math.floor(amount * 10) / 10) + suffix;
    }
  }
}
function renderStableMarkup(target, html) {
  if (!target || target._renderedMarkup === html) return;
  target.innerHTML = html;
  target._renderedMarkup = html;
}
function renderBoardCells(target, cells) {
  // Keep tile nodes (and unchanged animated SVGs) alive across game renders.
  if (target.children.length !== cells.length) {
    target.innerHTML = '';
    for (let i=0;i<cells.length;i++) target.appendChild(document.createElement('div'));
  }
  for (let i=0;i<cells.length;i++) {
    const cell=target.children[i], locked=isLocked(i), ash=isAsh(i);
    const flashed=!!state._flash?.includes(i);
    cell.classList.add('cell');
    cell.classList.toggle('locked',locked);
    cell.classList.toggle('ash',ash);
    cell.classList.toggle('flash',flashed);
    cell.dataset.i=i;
    cell.setAttribute('aria-label',locked ? `Locked tile. Open for ${unlockCost()} coins` : ash ? 'Ash tile. Clear with a nearby promotion' : cells[i] ? `${CHAIN[cells[i].level].name}, ${cells[i].count} dragons${cells[i].shiny ? ', shiny' : ''}` : 'Empty tile');
    const html=locked ? `🔒 Open<br>${unlockCost()} 🪙` : ash ? ashSvg() : cells[i] ? itemHtml(cells[i]) : '';
    renderStableMarkup(cell,html);
  }
}
function render() {
  rollDaily();

  // --- Safe patch to assign elements to existing board items ---
  const activeCells = board();
  if (Array.isArray(activeCells)) {
    activeCells.forEach(cell => {
      if (cell && !cell.element) {
        const elements = ["fire", "water", "nature"];
        cell.element = elements[Math.floor(Math.random() * elements.length)];
      }
    });
  }

  // --- 1. CORE UI TEXT UPDATES ---
  const setText = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const setHTML = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };

  setHTML("title", state.mode === "stage" ? state.trialKind === 'surge' ? "Ember <span>Surge</span>" : "Ash <span>Trial</span>" : "Ember <span>Nest</span>");
  setText("hint", state.mode === "stage" ? "Leave trial" : trailWaitLabel());
  setText("muteBtn", state.muted ? "🔇" : "🔊");
  setText("lvlChip", `Lv ${state.level || 1} • ${state.xp || 0}/${xpNeed(state.level || 1)}`);
  setText("coinCount", compactCoinBalance(state.coins));
  renderCoinDetails();
  const coinLabel = document.getElementById('coinCount');
  if (coinLabel) {
    const exact = Math.floor(state.coins).toLocaleString('en-US') + ' coins';
    coinLabel.setAttribute('aria-label', exact);
    coinLabel.title = exact;
  }
  setText('headerLevel', state.level || 1);
  const xpBar = document.getElementById('headerXp');
  if (xpBar) { xpBar.max=xpNeed(state.level || 1); xpBar.value=state.xp || 0; xpBar.title=`${state.xp || 0}/${xpBar.max} XP`; }
  setText("bonus", bonus());
  setText("roomCount", roomsOpen());
  setText("tributeBtn", `Mountain Tribute: ${tributeCost()} 🪙 (+5% bonus, max 10)`);
  setText("helpText", state.mode === "stage" 
    ? "Merge next to ash to clear it • Wyrmlings clear 4 directions" 
    : "5-merge to grow • tap fogged tiles to open land • quests use one dragon"
  );
  
  const nl = document.getElementById("nameLine");
  if (nl) nl.textContent = state.playerName || "Keeper";

  // --- 2. BUTTON TOGGLES & STATES ---
  const exitBtn = document.getElementById("exitTrialBtn");
  if (exitBtn) {
    exitBtn.style.setProperty("display", state.mode === "stage" ? "block" : "none", "important");
    if (state.mode === "stage") exitBtn.onclick = enterStage;
  }

  const autoBtn = document.getElementById("autoMergeBtn");
  if (autoBtn) {
    if (state.mode === "stage") {
      autoBtn.style.setProperty("display", "inline-flex", "important");
      autoBtn.textContent = 'Show hint'; autoBtn.disabled = trialInputLocked();
      autoBtn.classList.remove('locked-btn'); autoBtn.style.opacity='1'; autoBtn.style.pointerEvents='auto';
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

  const gatherBtn = document.getElementById("gather");
  if (gatherBtn) {
    gatherBtn.disabled = trialInputLocked();
    gatherBtn.textContent = state.mode === "stage" 
      ? `Gather egg • ${state.trailGathers || 0} left` 
    : (highestOwned() >= 4 ? 'Gather dragon 🐉' : 'Gather egg 🥚');
  }

  const buy = document.getElementById("buyEgg");
  if (buy) {
    buy.innerHTML = `Buy ${CHAIN[shopEggLevel()].name} • ${eggPrice()} 🪙`;
    if (state.mode === "stage") {
      buy.style.setProperty("display", "none", "important");
      buy.disabled = true;
      buy.style.opacity = ".45";
    } else {
      buy.style.setProperty("display", "inline-flex", "important");
      buy.disabled = false;
      buy.style.opacity = "1";
    }
  }

  // --- 3. MODULAR RENDERS ---
  const savingsGoal = nextDecorGoal();
  renderProgressionGoals();
  setText('savingsStatus', savingsGoal ? `Next upgrade: ${savingsGoal.name} · ${Math.min(state.coins, savingsGoal.cost)}/${savingsGoal.cost} coins. Savings protects this amount from dragon purchases only.` : DECOR.every(d => state.decor?.[d.id]) ? 'Decor complete! Explore Collection for mastery rewards and optional Sanctuary projects.' : 'Discover more dragons to unlock the next Nest upgrade.');
  setText('savingsToggle', state.saveForDecor ? 'Upgrade savings: On' : 'Upgrade savings: Off');
  document.getElementById('savingsToggle')?.setAttribute('aria-pressed', String(!!state.saveForDecor));
  setText('hatcheryHint', state.mode === 'stage' ? `Safe opening promotions: ${trialRules().grace} • ${trialPouchSize()} starting gathers`
    : highestOwned() >= 4 ? 'Hatchery: 80% Hatchling / 20% Wyrmling • 1 energy per gather'
    : highestOwned() >= 3 ? 'Hatchery: 80% Egg / 20% Hatchling • discover Hearth for the next upgrade'
    : 'Hatchery: Eggs • discover Young to improve gathers');
  renderQuest();
  renderTrialBanner();
  renderBook();
  renderRoost();
  renderKeeperQuarters();
  tickEnergy();
  renderCollection();

  // --- 4. DECOR & MOUNTAIN ROOMS ---
  const nestEl = document.getElementById("nest");
  if (nestEl) {
    nestEl.innerHTML = DECOR.map(d => {
      const owned = !!state.decor[d.id];
      return `<div class="decor ${owned ? "owned" : ""}" data-decor="${d.id}">
        <div class="ico">${d.art}</div>
        <div>${d.name}</div>
        <div>${owned ? 'Placed' : highestOwned() < d.needStage ? `Discover ${CHAIN[d.needStage].name}` : d.cost + ' 🪙'}</div>
        <small>+${Math.round(d.bonus * 100)}% merge coins</small>
      </div>`;
    }).join("");
  }
  
  const mt = document.getElementById("mountain");
  if (mt) {
    const roomImages = {
      "hatchery": `${IMG_DIR}Hatchery.jpg`,
      "alcove": `${IMG_DIR}moss alcove.jpg`,
      "lamp": `${IMG_DIR}lamp walk.jpg`,
      "spring": `${IMG_DIR}spring hall.jpg`,
      "vault": `${IMG_DIR}tea vault.jpg`,
    };

    mt.innerHTML = `<div style="display: flex; flex-direction: column; gap: 10px;">
      ${ROOMS.map(r => {
        const open = !r.need || !!state.decor[r.need];
        const isSelected = state.theme === r.id;
        const decorItem = r.need ? DECOR.find(d => d.id === r.need) : null;
        const costText = decorItem ? `${decorItem.cost} 🪙` : "";
        
        let bgStyle = open ? 'rgba(27, 38, 59, 0.4)' : 'rgba(15, 23, 42, 0.7)';
        if (roomImages[r.id]) {
           bgStyle = `linear-gradient(rgba(11, 0, 172, 0.27), rgba(18, 12, 10, 0.9)), url('${roomImages[r.id]}')`;
        }

        return `
          <div class="room ${open ? "open" : ""} ${isSelected ? "now" : ""}" data-room="${r.id}"
               style="border: 1px solid #778da9; border-radius: 8px; padding: 12px 100px; min-height: 48px; background: ${bgStyle}; background-size: cover; background-position: center; opacity:${open ? '1' : '0.75'}; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s ease;">
            
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.5rem; filter: ${open ? 'none' : 'grayscale(100\%)'};">${r.art}</span>
              <div>
                <h4 style="margin: 0; color: #e0e1dd; font-size: 0.95rem;">${open ? r.name : "🔒 " + r.name}</h4>
                <small style="color: #deb781;">${open ? (r.need ? "Unlocked via " + r.need : "Starting Room") : "Locked"}</small>
              </div>
            </div>

            <div>
              ${!open && costText ? `
                <button onclick="event.stopPropagation(); buyDecor('${r.need}')" 
                        style="background: linear-gradient(to bottom, #415a77, #1b263b); border: 1px solid #778da9; color: #ffcf40; font-weight: 700; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; box-shadow: 0 2px 0 #0d1b2a;">
                  ${highestOwned() < decorItem.needStage ? `Discover ${CHAIN[decorItem.needStage].name}` : `Unlock: ${costText}`}
                </button>
              ` : `<span class="room-status" style="color: ${isSelected ? '#ffcf40' : '#76c893'};">${isSelected ? 'Active' : (open ? 'Ready' : '')}</span>`}
            </div>
          </div>
        `;
      }).join("")}
    </div>`;
  }
  
  applyTheme(state.theme || "hatchery");
  
  // --- 5. PERCH ROW HTML ---
  const perchRow = document.getElementById("perchRow");
  if (perchRow) perchRow.style.display = (state.mode === "stage") ? "none" : "";

  const pr = document.getElementById("perchRow");
  const prNest = document.getElementById("perchRowNest");
  
  if (pr || prNest) {
    state.perch = state.perch || [null, null, null];
    const perchHTML = [0, 1, 2].map(i => {
      const open = perchOpen(i);
      const p = state.perch[i];
      const armed = perchArmed === i;
      
      if (!open) return `<div class="perch lock" data-perch="${i}"><span>Locked</span></div>`;
      if (p) {
        return `<div class="perch on ${armed ? "armed" : ""}" data-perch="${i}">
                  <div style="transform: translateY(-5px); z-index: 1;">${dragonSvg(p.level, 48, 1, p.shiny, p.element)}</div>
                  <div style="position: absolute; bottom: 4px; font-size: 0.55rem; font-weight: 700; letter-spacing: 0.5px; background: rgba(10, 5, 3, 0.8); border: 1px solid ${p.shiny ? '#ffcf40' : 'rgba(222, 183, 129, 0.3)'}; color: ${p.shiny ? '#ffea75' : '#e0e1dd'}; padding: 2px 6px; border-radius: 6px; white-space: nowrap; z-index: 2; box-shadow: 0 2px 4px rgba(0,0,0,0.6);">
                    ${p.shiny ? '✨ ' : ''}${CHAIN[p.level].name}
                  </div>
                </div>`;
      }
      return `<div class="perch ${armed ? "armed" : ""}" data-perch="${i}"><span style="font-size: 0.65rem; font-weight: 700;">Empty Perch</span></div>`;
    }).join("");

    renderStableMarkup(pr,perchHTML);
    renderStableMarkup(prNest,perchHTML);
  }
  
  // --- 6. RENDER THE BOARD ---
  const cells = board();
  const boardEl = document.getElementById("board");
  if (boardEl) {
    renderBoardCells(boardEl,cells);
    updateBoardFeedback();
  }
  
  if (state.mode === "stage") checkTrailStuck();
  if (state._flash && state._flash.length) {
    setTimeout(() => { state._flash = []; }, 280);
  }
  // --- ASH TRIAL MENU OVERRIDE ---
  const trialBox = document.getElementById("trialBox");
  if (trialBox) {
    const left = typeof dailyLeft === "function" ? dailyLeft() : 0;
    
    let badgeHTML = "";
    let blitzHTML = "";

    if (state.ashTrialCompleted) {
      // Pulled inside the container to avoid being clipped by scroll bounds
      badgeHTML = `<div class="trial-completed-badge" style="position: absolute; top: 8px; right: 6px; transform: rotate(8deg); font-size: 0.65rem; padding: 3px 8px; z-index: 20;">Completed</div>`;
      
      // Blitz button with forced styling to stay slim and inline
      blitzHTML = `<button class="blitz-btn" onclick="blitzAshTrial()" style="height: 44px !important; min-height: 44px !important; padding: 0 16px !important; font-size: 0.85rem !important; display: inline-flex !important; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; margin: 0 !important; border-radius: 8px !important;">⚡ Blitz</button>`;
    }

    // Wrap everything in a Flex container to force a clean left/right layout
    trialBox.innerHTML = `
      ${badgeHTML}
      
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%;">
        
        <!-- Text Container (Left) -->
        <div style="display: flex; flex-direction: column; justify-content: center; min-width: 0;">
          <h3 style="color: var(--gold); margin: 0 0 4px 0; font-family: 'Playfair Display', serif; font-size: 1.1rem; line-height: 1;">The Ash Trial</h3>
          <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0; white-space: nowrap;">Daily clears: ${left}</p>
        </div>
        
        <!-- Buttons Container (Right) -->
        <div class="action-buttons" style="display: flex; align-items: center; gap: 8px; margin: 0 !important; margin-top: 0 !important;">
          <!-- Simplified text to 'Enter' to save space -->
          <button class="room-btn" onclick="enterStage()" style="height: 44px !important; min-height: 44px !important; padding: 0 16px !important; font-size: 0.85rem !important; display: inline-flex !important; align-items: center; justify-content: center; white-space: nowrap; margin: 0 !important; border-radius: 8px !important;">Enter</button>
          ${blitzHTML}
        </div>
        
      </div>
    `;
    
    trialBox.style.position = "relative";
    trialBox.style.padding = "16px 20px"; // Normalizes the padding so the flexbox fits
  }
}

// ==========================================
// MODULE 22: EVENT LISTENERS & INTERACTIONS
// ==========================================

function handlePerchClick(e) {
  const el = e.target.closest("[data-perch]");
  if (!el) return;
  
  const i = +el.dataset.perch;
  if (!perchOpen(i) || state.mode === "stage") return;
  
  if (state.perch[i] && perchArmed !== i) { 
    emptyPerch(i); 
    return; 
  }
  
  perchArmed = perchArmed === i ? -1 : i;
  render();
  if (perchArmed >= 0) toast("Tap a nest dragon to perch it");
}

function cellFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const cell = el.closest(".cell");
  return cell ? +cell.dataset.i : null;
}

let selectedCell = -1;
function boardFeedback(index = selectedCell) {
  if (state.mode === 'stage' && trialInputLocked()) return state.trialFailed ? 'Run ended. Retry or return safely to the main board.' : 'Trial complete. Preparing your result…';
  const cells = board();
  const item = cells[index];
  if(item?.training)return `${item.training.name} - trained companion. Enlist in the Battle Lodge to battle or grow. Protected from merging and donation.`;
  const free = cells.filter((c,i) => !c && !isLocked(i) && !isAsh(i)).length;
  if (state.mode === 'stage' && !item) return `${trialRules().name} · ${state.ashBurned||0}/${trialRules().goal} cleared · ${state.trailGathers||0} gathers left. Promote beside ash; Show hint suggests a move.`;
  if (!item) return free ? `${free} open tiles · drag matching stages together; five grow into one.`
    : 'Board full · combine stacks, perch a dragon, or open land to gather again.';
  if (item.level === 5) return 'Elder selected · final stage. Move it or place it in the Roost.';
  const total = cells.reduce((n,c,i) => n + (c?.level === item.level && !isLocked(i) && !isAsh(i) ? c.count : 0), 0);
  return `${CHAIN[item.level].name} ×${item.count} selected · ${total}/5 on board${total >= 5 ? ' · ready to grow!' : ` · need ${5-total} more`}`;
}
function updateBoardFeedback(index = selectedCell) {
  selectedCell = board()[index] && !isLocked(index) && !isAsh(index) ? index : -1;
  const item = board()[selectedCell];
  document.querySelectorAll('#board .cell').forEach(cell => {
    cell.classList.remove('trial-hint-target');
    const i = +cell.dataset.i;
    cell.classList.toggle('selected-dragon', i === selectedCell);
    cell.classList.toggle('matching-dragon', !!item && item.level < 5 && i !== selectedCell && board()[i]?.level === item.level && !isLocked(i) && !isAsh(i));
  });
  setSafeText('boardStatus', boardFeedback());
}

// --- DRAG START ---
boardEl?.addEventListener("pointerdown", (e) => {
  if (trialInputLocked()) return;
  const cell = e.target.closest(".cell");
  if (!cell) return;
  
  const i = +cell.dataset.i;
  const currentBoard = board();
  
  // 1. Handle Fog Unlocking
  if (isLocked(i)) { 
    unlock(i); 
    return; 
  }
  
  // 2. Handle Overflow Arm (Perch or Dismiss)
  if (overflowArm && currentBoard[i] && state.mode !== "stage") {
    if (overflowArm === "perch") {
      const slot = freePerchSlot();
      if (slot < 0) { 
        toast("No open perch"); 
        overflowArm = null; 
        return; 
      }
      seatPerch(slot, i);
    } else if (overflowArm === "dismiss") {
      const it = currentBoard[i];
      if(it.training){toast('Trained dragons are protected. Return them to the Battle Lodge.');overflowArm=null;return;}
      const pay = dismissPay(it.level, it.shiny);
      
      if (it.count > 1) it.count -= 1;
      else currentBoard[i] = null;
      
      state.coins += pay;
      toast(`Dismissed ${it.shiny ? '✨ Shiny ' : ''}${CHAIN[it.level].name} • +${pay} 🪙`);
      sfx("gather");
      save(); 
      render();
    }
    overflowArm = null;
    return;
  }
  
  // 3. Handle Arming a Perch via tap
  if (perchArmed >= 0 && currentBoard[i] && state.mode !== "stage") {
    seatPerch(perchArmed, i);
    return;
  }
  
  // 4. Initiate Drag
  if (!currentBoard[i]) return;
  
  drag = { from: i };
  updateBoardFeedback(i);
  
  ghost = document.createElement("div");
  ghost.className = "ghost";
  const dragArtSize = (cell.getBoundingClientRect()?.width || 76) * 0.9;
  ghost.innerHTML = dragonSvg(currentBoard[i].level, dragArtSize, currentBoard[i].count, currentBoard[i].shiny, currentBoard[i].element);
  
  document.body.appendChild(ghost);
  ghost.style.left = `${e.clientX}px`;
  ghost.style.top = `${e.clientY}px`;
  
  boardEl.setPointerCapture(e.pointerId);
});

// --- DRAG MOVE ---
boardEl?.addEventListener("pointermove", (e) => {
  if (!drag || !ghost) return;
  
  ghost.style.left = `${e.clientX}px`;
  ghost.style.top = `${e.clientY}px`;
  
  // Clean up previous highlights efficiently
  document.querySelectorAll(".valid").forEach(c => c.classList.remove("valid"));
  
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const cell = el ? el.closest(".cell") : null;
  const perch = el ? el.closest("[data-perch]") : null;

  if (perch && state.mode !== "stage") {
    if (perchOpen(+perch.dataset.perch)) {
      perch.classList.add("valid");
    }
  } else if (cell) {
    const over = +cell.dataset.i;
    
    // Ignore locked fog, ash, or invalid targets
    if (isNaN(over) || isLocked(over) || isAsh(over)) return;
    
    const a = board()[drag.from];
    const b = board()[over];
    
    // Highlight if dropping on a valid matching dragon or an empty cell
    if (over !== drag.from && a && ((b && a.level === b.level && a.level < 5) || !b)) {
      cell.classList.add("valid");
    }
  }
});

function endDrag(e) {
  if (!drag) return;
  const from = drag.from;
  
  if (ghost) {
    ghost.remove();
    ghost = null;
  }
  
  // Clean up highlights efficiently
  document.querySelectorAll(".valid").forEach(c => c.classList.remove("valid"));
  
  // 1. MOBILE SAFETY: Lock in touch coordinates even as the finger lifts
  if (e.type === 'pointercancel' || trialInputLocked()) { drag = null; return; }
  const x = e.clientX || (e.changedTouches ? e.changedTouches[0].clientX : 0);
  const y = e.clientY || (e.changedTouches ? e.changedTouches[0].clientY : 0);
  
  const el = document.elementFromPoint(x, y);
  const cellEl = el ? el.closest(".cell") : null;
  const perchEl = el ? el.closest("[data-perch]") : null;

  const cells = board();

  // --- 1. DROPPING ONTO A PERCH ---
  // --- 1. DROPPING ONTO A PERCH ---
  if (perchEl && state.mode !== "stage") {
    const slot = +perchEl.dataset.perch;
    
    // Ensure we are dragging FROM the board
    if (cells[from] && perchOpen(slot)) {
      if (!state.perch[slot]) {
        seatPerch(slot, from);
      } else {
        // Preserve both dragons when replacing an occupied perch.
        const temp = state.perch[slot];
        state.perch[slot] = cells[from];
        cells[from] = temp;
      }
    }
  }
  // --- 2. DROPPING ONTO THE BOARD ---
  else if (cellEl) {
    const to = parseInt(cellEl.dataset.i, 10);
    
    // Safety check: ensure they aren't dropping on locked fog, ash, or themselves
    if (from !== to && !isNaN(to) && !isLocked(to) && !isAsh(to)) {
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
  selectedCell = cellEl ? +cellEl.dataset.i : -1;
  
  // Release the pointer capture cleanly
  if (typeof boardEl !== 'undefined' && e.pointerId) {
    try { boardEl.releasePointerCapture(e.pointerId); } catch(err) {}
  }
  
  save(); 
  render();
}

// ==========================================
// MODULE 23: INITIALIZATION & BINDINGS
// ==========================================

function initGame() {
  
  // --- DRAG & DROP LISTENERS ---
  // Bound to window to catch drops even if the mouse leaves the game board area
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  // --- MOUNTAIN & NEST LISTENERS ---
  document.getElementById("nest")?.addEventListener("click", (e) => {
    const el = e.target.closest("[data-decor]");
    if (el) buyDecor(el.dataset.decor);
  });

  document.getElementById("mountain")?.addEventListener("click", (e) => {
    const el = e.target.closest("[data-room]");
    if (!el) return;
    const id = el.dataset.room;
    const room = ROOMS.find(r => r.id === id);
    if (!room) return;
    
    if (room.need && !state.decor[room.need]) { 
      toast("That room is still sealed"); 
      return; 
    }
    
    applyTheme(id);
    save(); 
    render();
  });

  // Cleanly bound to the hoisted function from Module 22
  document.getElementById("perchRow")?.addEventListener("click", handlePerchClick);

  // --- CORE GAME BUTTONS ---
  const gatherBtn = document.getElementById("gather");
  if (gatherBtn) gatherBtn.addEventListener("click", gather);
  
  document.getElementById("hint")?.addEventListener("click", enterStage);
  document.getElementById("autoMergeBtn")?.addEventListener("click", triggerAutoMerge);
  document.getElementById("muteBtn")?.addEventListener("click", () => {
    state.muted = !state.muted;
    sfx("click"); // Add a subtle click for feedback
    save(); 
    render();
    toast(state.muted ? "Sound off" : "Sound on");
  });

  document.getElementById("dragonBank")?.addEventListener("click", () => {
    const bankValue = state.perchBank || 0;
    if (bankValue > 0) {
      state.coins += bankValue;
      toast(`Collected ${bankValue} 🪙 from the Dragon Bank!`);
      
      state.perchBank = 0;
      contractEvent('roost', bankValue);
      // Collecting does not discard progress toward the next income tick.
      
      sfx("gather");
      document.getElementById("dragonBank").classList.remove("is-maxed");
      save(); 
      render();
    } else {
      toast("The perches are still gathering coins...");
    }
  });

  // --- MODAL CLOSE HELPER (DRY PRINCIPLE) ---
  const bindClose = (btnId, modalId, extraLogic = null) => {
    document.getElementById(btnId)?.addEventListener("click", () => {
      document.getElementById(modalId)?.classList.remove("open");
      if (extraLogic) extraLogic();
    });
  };

  // --- CHESTS & LOOT ---
  document.getElementById("chestBox")?.addEventListener("click", revealChest);
  bindClose("chestOk", "chest", () => { levelShowing = false; showLevelEvent(); });
  bindClose("lootOk", "lootModal", () => { levelShowing = false; showLevelEvent(); });

  // --- ASH TRAIL OVERLAYS ---
  for(const [id,closeId] of [['trailFail','homeTrail'],['trailWin','winHome']]) {
    document.getElementById(id)?.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();document.getElementById(closeId)?.click();}
      if(event.key==='Tab') {
        const buttons=[...document.getElementById(id).querySelectorAll('button:not(:disabled)')];
        const index=buttons.indexOf(document.activeElement);
        if(buttons.length){event.preventDefault();buttons[(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}
      }
    });
  }
  document.getElementById("restartTrail")?.addEventListener("click", restartTrail);
  bindClose("winHome", "trailWin");
  
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
    document.getElementById("nameHint").textContent = free ? "First change is free." : `Rename costs ${RENAME_COST} 🪙.`;
    document.getElementById("nameInput").value = state.playerName || "";
    document.getElementById("nameBox")?.classList.add("open");
  });
  
  bindClose("nameNo", "nameBox");
  
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
      // Note: Assuming RENAME_COST is defined up in Module 1: Config
      if (state.coins < RENAME_COST) { toast(`Need ${RENAME_COST} 🪙`); return; }
      state.coins -= RENAME_COST;
    }
    
    state.playerName = raw;
    state.nameChanges = (state.nameChanges || 0) + 1;
    document.getElementById("nameBox").classList.remove("open");
    toast(free ? `Welcome, ${raw}` : `Renamed for ${RENAME_COST} 🪙`);
    
    save(); 
    render();
  });

  // --- DRAGON BOOK ---
  document.getElementById("bookBtn")?.addEventListener("click", () => {
    recoverElementDiscoveries();
    save();
    sfx("click"); 
    renderBook();
    document.getElementById("book")?.classList.add("open");
  });
  
  bindClose("bookClose", "book", () => switchBookTab(0));
  
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
      state.elementBook = {};
      state.rareElementBook = {};
      save();
      renderBook();
      toast("Dragon Book reset.");
    }
  });

  // --- HARD RESET / WIPE ---
  const setupWipe = () => {
    document.getElementById("book")?.classList.remove("open");
    document.getElementById("wipe")?.classList.add("open");
    const inp = document.getElementById("wipeInput");
    if (inp) { 
      inp.value = ""; 
      document.getElementById("wipeGo").disabled = true; 
      inp.focus(); 
    }
  };
  
  document.getElementById("resetBookGameBtn")?.addEventListener("click", setupWipe);
  document.getElementById("resetAll")?.addEventListener("click", setupWipe);
  
  document.getElementById("wipeInput")?.addEventListener("input", (e) => {
    const goBtn = document.getElementById("wipeGo");
    if (goBtn) goBtn.disabled = e.target.value.trim() !== "Delete";
  });
  
  document.getElementById("wipeGo")?.addEventListener("click", () => {
    if (document.getElementById("wipeInput").value.trim() !== "Delete") return;
    localStorage.removeItem(SAVE);
    for (let v = 1; v <= 10; v++) localStorage.removeItem(`ember-nest-v${v}`);
    location.reload();
  });
  
  bindClose("wipeNo", "wipe");

  // --- OVERFLOW MODAL ---
  bindClose("overClose", "overflow", () => { overflowArm = null; });
  
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
  document.getElementById("guideClose")?.addEventListener("click", closeGuide);
  document.getElementById("guide")?.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeGuide();
    } else if (event.key === "Tab") {
      event.preventDefault();
      document.getElementById("guideClose")?.focus();
    }
  });
  document.getElementById('contractsModal')?.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeContracts(); }
  });
  document.getElementById('masteryModal')?.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeMastery(); }
  });
  bindClose("sleepyGuideClose", "sleepyGuide");

  // Level is informational; production UI must not award XP on a stat click.

  // --- TAB SWITCHING (NEST) ---
  document.querySelectorAll(".nest-tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      // Clear active states
      document.querySelectorAll(".nest-tab-btn").forEach(b => {
        b.classList.remove("active");
        b.style.background = "#1b263b"; 
      });
      document.querySelectorAll(".nest-sub-view").forEach(v => {
        v.style.display = "none";
      });
      
      // Set new active state
      const targetSubTab = e.currentTarget;
      targetSubTab.classList.add("active");
      targetSubTab.style.background = "#415a77"; 
      
      const subViewId = targetSubTab.dataset.subtab;
      const activeSubView = document.getElementById(subViewId);
      if (activeSubView) activeSubView.style.display = "block";
    });
  });
}

// ==========================================
// MODULE 24: NAVIGATION & MODALS
// ==========================================

function executeTabSwitch(targetTab, viewId) {
  selectedCell = -1;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  
  targetTab?.classList.add("active");
  document.getElementById(viewId)?.classList.add("active");
  if(viewId==='view-trials'&&typeof renderBattleLodge==='function')renderBattleLodge();
  if(viewId==='view-goals')renderContractsPanel();
  if (viewId === 'view-home' && !wardrobeDialogKind && pendingWardrobeRewards().length &&
      !document.querySelector('.modal.open, .modal[style*="display: flex"]')) openWardrobeReward();

  // Dynamic Scroll Lock (locking both html and body)
  if (viewId === "view-board") {
    document.documentElement.classList.add("lock-scroll");
    document.body.classList.add("lock-scroll");
  } else {
    document.documentElement.classList.remove("lock-scroll");
    document.body.classList.remove("lock-scroll");
  }
}

// The page shell is locked by CSS. Nested board and modal scrollers must
// retain native wheel scrolling; cancelling it here strands offscreen tiles.

// 1. Intercepting the Tab Click
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn?.addEventListener("click", (e) => {
    const targetTab = e.currentTarget;
    const viewId = targetTab.dataset.tab;

    // Trigger Warning if leaving the board during the Stage mode
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

// 2. Forfeit Warning: "Cancel"
document.getElementById("cancelWarningBtn")?.addEventListener("click", () => {
  const modal = document.getElementById("forfeitModal");
  if (modal) modal.style.display = "none";
  pendingTab = null;
  pendingViewId = null;
});

// 3. Forfeit Warning: "Leave"
document.getElementById("confirmWarningBtn")?.addEventListener("click", () => {
  const modal = document.getElementById("forfeitModal");
  if (modal) modal.style.display = "none";
  
  state.mode = "home";
  resetTrail();
  save();
  render();
  
  if (pendingTab && pendingViewId) {
    executeTabSwitch(pendingTab, pendingViewId);
  }
  
  pendingTab = null;
  pendingViewId = null;
});

// ==========================================
// MODULE 25: MASTER GAME LOOP & BOOT
// ==========================================

// --- BACKGROUND TICK LOOP (Energy & Bank) ---
document.addEventListener?.('visibilitychange', () => {
  document.body.classList.toggle('page-hidden',document.hidden);
});
setInterval(() => {
  // Energy regeneration is shared with render/load through tickEnergy below.

  // 2. Handle Perch / Dragon Bank Accumulation Math
  if (state.mode === "home" && (state.perch || []).some(Boolean)) {
    if (!state.perchAt) state.perchAt = Date.now();
    
    if (Date.now() >= state.perchAt + PERCH_MS) {
      const ticks = Math.floor((Date.now() - state.perchAt) / PERCH_MS);
      if (ticks > 0) {
        const inc = perchIncome() * ticks;
        const maxBank = perchIncome() * 480; // 8 hours of capacity        
        const bank = state.perchBank || 0;
        state.perchBank = Math.max(bank, Math.min(maxBank, bank + inc));
        state.perchAt += ticks * PERCH_MS;
        save();
      }
    }
  }

  // 3. Refresh UI Elements Live Every Second
  tickEnergy(); 
  tickPerch(); 
  
  if (!document.hidden) {
    renderExpeditions();
    const goal = nextProgressionGoal();
    const prompt = document.getElementById('savingsBoardHint');
    if (prompt) { prompt.hidden = !goal; const text = goal ? 'Next goal: ' + goal.text + ' ›' : ''; if (prompt.textContent !== text) prompt.textContent = text; }
  }
  const currentInc = perchIncome();
  const maxBankLimit = currentInc * 480;

  const bankCountEl = document.getElementById("bankCount");
  const dragonBankBtn = document.getElementById("dragonBank"); 
  const bankTimerDisplay = document.getElementById("bankTimer"); 
  const bankRateEl = document.getElementById("bankRate");

  if (bankCountEl) {
    const newVal = (state.perchBank || 0);

    // --- ROOST TAB NOTIFICATION DOT ---
    const roostTabBtn = document.querySelector('[data-tab="view-roost"]');
    if (roostTabBtn && maxBankLimit > 0) {
      if (newVal >= maxBankLimit) {
        roostTabBtn.classList.add("notify-dot");
      } else {
        roostTabBtn.classList.remove("notify-dot");
      }
    }
    // ----------------------------------

    if (dragonBankBtn && maxBankLimit > 0) {
      if (newVal >= maxBankLimit) {
        dragonBankBtn.classList.add("is-maxed");
        if (bankTimerDisplay) bankTimerDisplay.textContent = "MAX";
      } else {
        dragonBankBtn.classList.remove("is-maxed");
      }
    }
    if (bankCountEl._lastBankValue !== newVal) {
      bankCountEl.innerHTML = `${newVal} <span class="spinning-coin">🪙</span>`;
      bankCountEl._lastBankValue = newVal;
    }
  }
  
  if (bankRateEl) {
    bankRateEl.textContent = currentInc > 0 ? `+${currentInc}/m` : "";
  }
  
  if (bankTimerDisplay) {
    if (state.perchAt && (state.perch || []).some(Boolean) && (state.perchBank || 0) < maxBankLimit) {
      const elapsed = Date.now() - state.perchAt;
      const left = Math.max(0, PERCH_MS - (elapsed % PERCH_MS));
      bankTimerDisplay.textContent = `Next: ${Math.ceil(left / 1000)}s`;
    } else if (!dragonBankBtn?.classList.contains("is-maxed")) {
      bankTimerDisplay.textContent = "Perch a dragon";
    }
  }
}, 1000);

// --- BOOT SEQUENCE ---

// Force scroll lock on initial page load
document.documentElement.classList.add("lock-scroll");
document.body.classList.add("lock-scroll");

// Load save data, bind events, and render the board!
load();
recoverElementDiscoveries();
initGame();
render();
renderStash();
renderDragonKingPortrait();
if (!state.seenGuide) showGuide();
