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
  border_obsidian: { name: "Obsidian Frame", rarity: "epic", icon: "🔳", type: "cosmetic", slot: "border", img: "assets/avatar/border_obsidian.png" },
};

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

const DECOR = [
  { id: "moss", name: "Moss bed", art: "🌿", cost: 600, bonus: 0.1, needStage: 1 },
  { id: "lamp", name: "Ember lamp", art: "🏮", cost: 2200, bonus: 0.15, needStage: 2 },
  { id: "pool", name: "Hot spring", art: "♨️", cost: 6500, bonus: 0.2, needStage: 3 },
  { id: "hoard", name: "Tea hoard", art: "🫖", cost: 14000, bonus: 0.25, needStage: 3 },
  { id: "roost", name: "Star roost", art: "✨", cost: 28000, bonus: 0.3, needStage: 4 },
];
