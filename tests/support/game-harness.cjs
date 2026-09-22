const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
// Run production scripts in page order with isolated storage and no real timers.
// Minimal DOM doubles exercise bindings and modal state, not browser layout.
function game(saved = {}) {
  const storage = new Map(Object.entries(saved));
  const nodes = new Map();
  let now = 100000;
  const context = vm.createContext({ console, assert });
  function node(id) {
    const classes = new Set();
    const listeners = {};
    const el = {
      style: { setProperty(key, value) { this[key] = value; } }, innerHTML: '', textContent: '',
      classList: { add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x) },
      addEventListener: (type, fn) => (listeners[type] ||= []).push(fn),
      focus: () => { context.document.activeElement = el; },
      click: () => (listeners.click || []).forEach(fn => fn({ target: el })),
      key: key => (listeners.keydown || []).forEach(fn => fn({ key, preventDefault() {} })),
    };
    nodes.set(id, el);
    return el;
  }
  ['guide', 'guideBtn', 'guideClose', 'toast', 'trailFail', 'failWhy', 'autoMergeBtn', 'chestOk', 'lootOk'].forEach(node);
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
  context.setInterval = () => 1;
  context.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) };
  context.Date = class extends Date { static now() { return now; } };
  const run = code => vm.runInContext(code, context, { timeout: 2000 });
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="([^"?]+)(?:\?[^" ]*)?"><\/script>/g)].map(match => match[1]);
  assert.deepEqual(scripts, ['game-data.js', 'game-core.js', 'app.js']);
  for (const file of scripts) run(fs.readFileSync(path.join(root, file), 'utf8'));
  run('Math.random = () => 0.5');
  return { run, storage, nodes, advance: ms => { now += ms; } };
}

module.exports = { game };
