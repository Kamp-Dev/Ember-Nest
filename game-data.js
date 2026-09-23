// Immutable game configuration and content definitions.
// This file must load before app.js.

const COLS = 5, ROWS = 5, MAX_ENERGY = 20;
const SAVE = "ember-nest-save";
const REGEN_MS = 8000;
const PERCH_MS = 60000;
const OPEN_START = 20;
const STAGE_GOAL = 3;
const ASH_GRACE = 2;
const ASH_PER_MERGE = 2;
const ASH_FAIL = 10;
const ASH_GOAL = 8;
const TRAIL_GATHERS = 13;
const DAILY_PAYS = [1200, 800, 400];
const DAILY_CLEARS = 3;
const RENAME_COST = 2000;
const IMG_DIR = "Images/";
const GATHER_UPGRADE_CHANCE = 0.2;
const LAND_COSTS = [250, 500, 1000, 2000, 3500];
const CHEST_BASE_COINS = 3000;
const CHEST_COIN_STEP = 1500;
const CHEST_MAX_COINS = 9000;
const PERCH_INCOME_BY_LEVEL = [15, 40, 70, 110, 160, 240];
const PERCH_SHINY_MULTIPLIER = 1.5;
// Numbered transparent sprites retain the one/two/three/four-dragon stack pattern.
// Elder is the final tier and uses only its single-dragon sprite.
// Enable only after every elemental asset passes transparency and crop QA.
const ELEMENTAL_ASSETS_READY = true;
const ELEMENT_DRAGON_ART = {
  fire: 'fire',
  water: 'water',
  nature: 'nature',
};

const TRAIL_BAG = [2, 2, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];

const STASH_CATALOG = {
  border_ember: { name:'Ember Crown', rarity:'rare', icon:'🔥', type:'cosmetic', slot:'border', img:'assets/avatar/border_ember_v1.png', tokenCost:0 },
  border_tide: { name:'Tide Crown', rarity:'epic', icon:'💧', type:'cosmetic', slot:'border', img:'assets/avatar/border_tide_v1.png', tokenCost:1 },
  border_grove: { name:'Grove Crown', rarity:'epic', icon:'🌿', type:'cosmetic', slot:'border', img:'assets/avatar/border_grove_v1.png', tokenCost:1 },
  rare_egg: { name: "Rare Egg", rarity: "rare", icon: "🥚", type: "consumable" },
  time_skip_1h: { name: "1h Time Skip", rarity: "epic", icon: "⏳", type: "consumable" },
  breeder_tunic: { name: "Apprentice Tunic", rarity: "uncommon", icon: "🧥", type: "cosmetic", slot: "torso", img: "assets/avatar/torso_tunic.png" },
  rare_tunic: { name: "Adept Tunic", rarity: "rare", icon: "🧥", type: "cosmetic", slot: "torso", img: "assets/avatar/torso_tunic_rare.png" },
  epic_tunic: { name: "Master Tunic", rarity: "epic", icon: "🧥", type: "cosmetic", slot: "torso", img: "assets/avatar/torso_tunic_epic.png" },
  border_obsidian: { name: "Obsidian Frame", rarity: "epic", icon: "🔳", type: "cosmetic", slot: "border", img: "assets/avatar/border_obsidian.png", tokenCost:4, coinCost:75000, mastery:'all' },
};

// Handcrafted permanent wardrobe rewards; no random rolls or gameplay bonuses.
const WARDROBE_SETS = [
  { rarity:'uncommon', name:'Woodland Apprentice', requirements:{head:['level',2], torso:['level',3], legs:['level',5]} },
  { rarity:'rare', name:'Spring Traveler', requirements:{head:['level',10], torso:['contract',1], legs:['level',15]} },
  { rarity:'epic', name:'Star Scholar', requirements:{head:['weeks',1], torso:['trial',1], legs:['level',30]} },
  { rarity:'legendary', name:'Ember Guardian', requirements:{head:['mastery','fire'], torso:['mastery','water'], legs:['mastery','nature']} },
  { rarity:'mythic', name:'Celestial Warden', requirements:{head:['level',75], torso:['radiant',3], legs:['weeks',8]} },
];
// Full image boxes compensate for transparent padding without modifying artwork.
const WARDROBE_OVERLAYS = {
  epic_head: [23.965,-6.045,51.904,45.473],
  epic_legs: [24.575,69.035,50.891,34.522],
  epic_torso: [28.476,44.192,43.013,40.345],
  legendary_head: [23.123,-6.497,53.498,50.627],
  legendary_legs: [27.572,74.018,44.891,27.020],
  legendary_torso: [28.923,44.727,42.088,39.634],
  mythic_head: [24.387,-4.935,51.225,43.941],
  mythic_legs: [25.208,71.945,49.743,30.630],
  mythic_torso: [28.208,44.559,43.549,39.716],
  rare_head: [23.788,-6.903,52.425,47.806],
  rare_legs: [26.731,70.302,46.537,31.757],
  rare_torso: [28.010,42.855,43.980,42.734],
  uncommon_head: [24.387,-6.882,51.225,45.792],
  uncommon_legs: [27.469,72.084,45.133,30.127],
  uncommon_torso: [27.851,43.775,44.299,40.559],
};
const WORN_HAT_OVERLAYS = {
  uncommon: [24.304,-7.973,51.351,48.590],
  rare: [24.261,-8.105,51.478,48.808],
  epic: [24.006,-5.942,51.947,44.847],
  legendary: [24.554,-5.940,50.852,46.511],
  mythic: [24.387,-5.943,51.225,46.181],
};
const WARDROBE_IDS = [];
const WORN_TORSO_OVERLAYS = {
  uncommon:[26.226,47.592,47.509,35.042],
  rare:[29.018,46.449,41.929,36.214],
  epic:[29.185,47.871,41.629,33.736],
  legendary:[29.692,49.017,41.009,32.302],
  mythic:[28.256,47.194,43.558,34.833],
};
STASH_CATALOG.breeder_tunic.wornImg='assets/avatar/torso_tunic_worn_v2.png';
STASH_CATALOG.breeder_tunic.wornOverlay=[22.825,42.534,54.35,44.615];
STASH_CATALOG.rare_tunic.wornImg='assets/avatar/torso_tunic_rare_worn_v2.png';
STASH_CATALOG.rare_tunic.wornOverlay=[24.086,41.835,51.829,44.558];
STASH_CATALOG.epic_tunic.wornImg='assets/avatar/torso_tunic_epic_worn_v2.png';
STASH_CATALOG.epic_tunic.wornOverlay=[22.754,42.852,54.579,44.446];
for (const set of WARDROBE_SETS) for (const slot of ['head','torso','legs']) {
  const id = `wardrobe_${set.rarity}_${slot}`;
  WARDROBE_IDS.push(id);
  STASH_CATALOG[id] = {name:`${set.name} ${slot === 'head' ? 'Cap' : slot === 'torso' ? 'Tunic' : 'Legwear'}`,
    rarity:set.rarity, slot, type:'cosmetic', img:`assets/avatar/clothing_${set.rarity}_${slot}_v1.png`,
    wardrobe:true, overlay:WARDROBE_OVERLAYS[`${set.rarity}_${slot}`], requirement:set.requirements[slot],
    ...(slot === 'head' ? {wornImg:`assets/avatar/clothing_${set.rarity}_head_worn_v2.png`, wornOverlay:WORN_HAT_OVERLAYS[set.rarity]} : {}),
    ...(slot === 'torso' && WORN_TORSO_OVERLAYS[set.rarity] ? {wornImg:`assets/avatar/clothing_${set.rarity}_torso_worn_v${set.rarity === 'rare' ? 3 : 2}.png`, wornOverlay:WORN_TORSO_OVERLAYS[set.rarity]} : {})};
}

const CHAIN = [
  { id: "egg", name: "Egg", color: "#6b4a32" },
  { id: "hatch", name: "Hatchling", color: "#8a5a30" },
  { id: "wyrm", name: "Wyrmling", color: "#a35a28" },
  { id: "young", name: "Young", color: "#c45c24" },
  { id: "adult", name: "Hearth", color: "#e37a3a" },
  { id: "elder", name: "Elder", color: "#f0a050" },
];

const LORE = [
  "Warm to the touch. Glowing veins pulse under the shell.",
  "Eats sparks. Sleeps in teacups if allowed.",
  "Learns the shape of the cave by gliding along the thermals.",
  "Armored scales harden. First real ember breath.",
  "Guards the hearth kettle. Radiates warmth across the caverns.",
  "The nest remembers this one. So does the ancient mountain.",
];

const ELEMENT_BOOK = {
  fire: { name:'Fire', lore:[
    'Its first wingbeats scatter sparks. Warm stone is its favorite resting place.',
    'Copper scales darken as its ember breath grows steady. It practices above the glowing coals.',
    'Flame-bright wings shelter the nest. This guardian keeps the hearth alive through the coldest nights.',
    'An ancient keeper of the mountain flame. Its molten markings remember a thousand winters.'
  ] },
  water: { name:'Water', lore:[
    'Pearl scales shimmer as it skips across the spring. Tiny fins steer its first glides.',
    'Coral horns rise above sapphire scales. It follows underground streams back to the nest.',
    'Broad wings carry cool mist through the caverns. It guards the springs that sustain the nest.',
    'A quiet guardian of the deepest pools. The mountain waters grow still when it passes.'
  ] },
  nature: { name:'Nature', lore:[
    'Leaf-like wings rustle in the moss. Small green shoots follow its curious footsteps.',
    'Wooden antlers branch as it grows. It tends hidden gardens between the cavern stones.',
    'Emerald wings shelter seedlings and sleeping Hatchlings. Its presence turns bare stone into a refuge.',
    'An ancient guardian crowned with living branches. The oldest roots of the mountain know its name.'
  ] }
};

const MASTERY_REWARDS = Object.fromEntries(Object.entries(ELEMENT_BOOK).flatMap(([element, chapter]) => [
  [element, { element, rare:false, title:chapter.name + ' Keeper', tokens:1 }],
  [element + '_rare', { element, rare:true, title:'Radiant ' + chapter.name + ' Keeper', tokens:2 }]
]));

const ROOMS = [
  { id: "hatchery", name: "Hatchery", need: null, art: "🛖" },
  { id: "alcove", name: "Moss alcove", need: "moss", art: "🌿" },
  { id: "lamp", name: "Lamp walk", need: "lamp", art: "🏮" },
  { id: "spring", name: "Spring hall", need: "pool", art: "♨️" },
  { id: "vault", name: "Tea vault", need: "hoard", art: "🫖" },
];

// Permanent, purely visual endgame rewards. No timed exclusivity or power boosts.
const SANCTUARY_COLLECTION = {
  wayfarer_title: {name:'Lantern Wayfarer',kind:'title',icon:'🏮',tokens:2,coins:150000,seals:4},
  chronicler_title: {name:'Dragon Chronicler',kind:'title',icon:'📜',tokens:4,coins:500000,seals:12},
  starlight_title: {name:'Starlight Curator',kind:'title',icon:'🌠',tokens:6,coins:1000000,seals:24},
  ember_garden: {name:'Ember Garden', kind:'sanctuary', element:'fire', icon:'🔥', tokens:2, coins:25000, mastery:'fire'},
  moon_pool: {name:'Moon Pool', kind:'sanctuary', element:'water', icon:'💧', tokens:2, coins:25000, mastery:'water'},
  grove_canopy: {name:'Grove Canopy', kind:'sanctuary', element:'nature', icon:'🌿', tokens:2, coins:25000, mastery:'nature'},
  guardian_title: {name:'Sanctuary Guardian', kind:'title', icon:'🏵️', tokens:0, coins:100000, mastery:'all'},
  steadfast_title: {name:'Steadfast Keeper', kind:'title', icon:'🌙', tokens:0, coins:50000, weeks:4},
  patron_title: {name:'Sanctuary Patron', kind:'title', icon:'🌱', tokens:0, coins:0, projectRank:1},
  steward_title: {name:'Mountain Steward', kind:'title', icon:'🌲', tokens:0, coins:0, projectRank:5},
  benefactor_title: {name:'Eternal Benefactor', kind:'title', icon:'🏔️', tokens:0, coins:0, projectRank:10},
};

const DECOR = [
  { id: "moss", name: "Moss bed", art: "🌿", cost: 600, bonus: 0.1, needStage: 1 },
  { id: "lamp", name: "Ember lamp", art: "🏮", cost: 2200, bonus: 0.15, needStage: 2 },
  { id: "pool", name: "Hot spring", art: "♨️", cost: 6500, bonus: 0.2, needStage: 3 },
  { id: "hoard", name: "Tea hoard", art: "🫖", cost: 14000, bonus: 0.25, needStage: 3 },
  { id: "roost", name: "Star roost", art: "✨", cost: 28000, bonus: 0.3, needStage: 4 },
];
