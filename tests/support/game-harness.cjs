const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
// Run production scripts in page order with isolated storage and no real timers.
// Minimal DOM doubles exercise bindings and modal state, not browser layout.
function game(saved = {}, overrides = {}) {
  const storage = new Map(Object.entries(saved));
  const nodes = new Map();
  const intervals = [];
  let now = 100000;
  const context = vm.createContext({ console, assert });
  function node(id) {
    const classes = new Set();
    const listeners = {};
    const el = {
      dataset: {}, getBoundingClientRect: () => null,
      style: { setProperty(key, value) { this[key] = value; } }, innerHTML: '', textContent: '',
      classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x), toggle: (x,on) => on ? classes.add(x) : classes.delete(x) },
      addEventListener: (type, fn) => (listeners[type] ||= []).push(fn),
      focus: () => { context.document.activeElement = el; },
      click: () => (listeners.click || []).forEach(fn => fn({ target: el })),
      key: key => (listeners.keydown || []).forEach(fn => fn({ key, preventDefault() {} })),
    };
    nodes.set(id, el);
    return el;
  }
  ['guide', 'guideBtn', 'guideClose', 'toast', 'trailFail', 'failWhy', 'autoMergeBtn', 'chestOk', 'lootOk', 'chestBox', 'dragonBank', 'contractsModal', 'contractsList', 'contractsReset', 'bookSpread', 'bookElement', 'bookPageLabel', 'countMain', 'countRare', 'prevPageBtn', 'nextPageBtn', 'tabMain', 'tabRare', 'book', 'masteryModal', 'masteryList', 'masterySummary', 'masteryOpen', 'masteryClose', 'keeper-title-display'].forEach(node);
  context.document = {
    getElementById: id => nodes.get(id) || null,
    querySelector: () => null, querySelectorAll: () => [],
    documentElement: { classList: { add() {} } }, body: { classList: { add() {} } },
    activeElement: nodes.get('guideBtn'),
  };
  context.window = context;
  context.addEventListener = () => {};
  context.setTimeout = () => 1;
  context.clearTimeout = () => {};
  context.setInterval = fn => intervals.push(fn);
  context.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) };
  context.Date = class extends Date { static now() { return now; } };
  const run = code => vm.runInContext(code, context, { timeout: 2000 });
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"?]+)(?:\?[^" ]*)?"><\/script>/g)].map(match => match[1]);
  assert.deepEqual(scripts, ['game-data.js', 'game-core.js', 'app.js']);
  for (const file of scripts) {
    let source = fs.readFileSync(path.join(root, file), 'utf8');
    if (file === 'game-data.js') for (const [key, value] of Object.entries(overrides)) {
      if (!/^[A-Z_]+$/.test(key)) throw new Error('Invalid balance key');
      source = source.replace(new RegExp('const ' + key + ' = [^;]+;'), 'const ' + key + ' = ' + JSON.stringify(value) + ';');
    }
    run(source);
  }
  run('Math.random = () => 0.5');
  return { run, storage, nodes, advance: ms => { now += ms; }, tick: () => intervals.forEach(fn => fn()) };
}

module.exports = { game };
