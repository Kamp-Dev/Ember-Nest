// Immutable game configuration and content definitions.
// This file must load before app.js.

const COLS = 5, ROWS = 5, MAX_ENERGY = 5;
const SAVE = "ember-nest-save";
const REGEN_MS = 8000;
const PERCH_MS = 60000;
const OPEN_START = 20;
const STAGE_GOAL = 3;
const ASH_GRACE = 1;
const ASH_PER_MERGE = 2;
const ASH_FAIL = 10;
const ASH_GOAL = 8;
const TRAIL_GATHERS = 4;
const DAILY_PAYS = [1200, 800, 400];
const DAILY_CLEARS = 3;
const RENAME_COST = 2000;
const IMG_DIR = "Images/";

const TRAIL_BAG = [2, 2, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];

const STASH_CATALOG = {
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

const ROOMS = [
  { id: "hatchery", name: "Hatchery", need: null, art: "🛖" },
  { id: "alcove", name: "Moss alcove", need: "moss", art: "🌿" },
  { id: "lamp", name: "Lamp walk", need: "lamp", art: "🏮" },
  { id: "spring", name: "Spring hall", need: "pool", art: "♨️" },
  { id: "vault", name: "Tea vault", need: "hoard", art: "🫖" },
];

const DECOR = [
  { id: "moss", name: "Moss bed", art: "🌿", cost: 800, bonus: 1 },
  { id: "lamp", name: "Ember lamp", art: "🏮", cost: 2500, bonus: 2 },
  { id: "pool", name: "Hot spring", art: "♨️", cost: 8000, bonus: 3 },
  { id: "hoard", name: "Tea hoard", art: "🫖", cost: 22000, bonus: 5 },
  { id: "roost", name: "Star roost", art: "✨", cost: 50000, bonus: 6 },
];

const QUESTS = [
  { want: 0, text: "A cold stone wants an egg to warm it.", reward: 180 },
  { want: 1, text: "A sleepy hatchling wants a sibling to pile with.", reward: 320 },
  { want: 2, text: "The spring is lonely. Bring a wyrmling.", reward: 520 },
  { want: 3, text: "A young ember wants a perch-mate.", reward: 860 },
  { want: 1, text: "Tuck a hatchling into the moss.", reward: 300 },
];
