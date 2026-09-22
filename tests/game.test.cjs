const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

test('buttons with event listeners have no duplicate inline action', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const id of ['autoMergeBtn', 'chestOk', 'lootOk']) {
    const tag = html.match(new RegExp('<button[^>]*id="' + id + '"[^>]*>'))[0];
    assert.ok(!tag.includes('onclick'));
  }
  const g = game();
  g.run('state.level = 5; let calls = 0; toast = () => { calls++; }');
  g.nodes.get('autoMergeBtn').click();
  g.run('assert.equal(calls, 1)');
});

test('rare eggs create a shiny egg and cannot be used without inventory or space', () => {
  game().run(`state.stash.rare_egg = 1; useFromStash('rare_egg');
    assert.equal(state.cells.filter(Boolean).length, 1);
    assert.equal(state.cells.find(Boolean).shiny, true); assert.equal(state.stash.rare_egg, undefined);
    useFromStash('rare_egg'); assert.equal(state.cells.filter(Boolean).length, 1);
    state.stash.rare_egg = 1; state.cells.fill({level: 0, count: 1});
    useFromStash('rare_egg'); assert.equal(state.stash.rare_egg, 1);`);
});

test('time skips require income, add one hour, and respect bank capacity', () => {
  game().run(`state.stash.time_skip_1h = 2;
    useFromStash('time_skip_1h'); assert.equal(state.stash.time_skip_1h, 2);
    state.perch[0] = {level: 0, count: 1, shiny: false, element: 'neutral'};
    const rate = perchIncome(); useFromStash('time_skip_1h');
    assert.equal(state.perchBank, rate * 60); assert.equal(state.stash.time_skip_1h, 1);
    state.perchBank = rate * 480 - 1; useFromStash('time_skip_1h');
    assert.equal(state.perchBank, rate * 480);
    state.stash.time_skip_1h = 1; useFromStash('time_skip_1h');
    assert.equal(state.stash.time_skip_1h, 1);`);
});

test('consumables cannot modify a running trial', () => {
  game().run(`state.mode = 'stage'; state.stash.rare_egg = 1; useFromStash('rare_egg');
    assert.equal(state.stash.rare_egg, 1); assert.equal(state.stageCells.filter(Boolean).length, 0);`);
});

test('perch taps preserve stack remainder and locked perches reject dragons', () => {
  game().run(`state.cells[0] = {level: 2, count: 3, element: 'fire', shiny: true};
    seatPerch(1, 0); assert.equal(state.cells[0].count, 3);
    seatPerch(0, 0); assert.equal(state.cells[0].count, 2);
    assert.equal(state.perch[0].count, 1); assert.equal(state.perch[0].shiny, true);
    seatPerch(0, 0); assert.equal(state.cells[0].count, 2);`);
});

test('dragging onto occupied or locked perches never loses dragons', () => {
  game().run(`state.cells[0] = {level: 2, count: 3}; state.perch[0] = {level: 1, count: 1};
    let slot = 0; document.elementFromPoint = () => ({closest: selector => selector === '[data-perch]' ? {dataset: {perch: slot}} : null});
    drag = {from: 0}; endDrag({clientX: 1, clientY: 1});
    assert.equal(state.cells[0].level, 1); assert.equal(state.perch[0].count, 3);
    slot = 1; drag = {from: 0}; endDrag({clientX: 1, clientY: 1});
    assert.equal(state.cells[0].level, 1); assert.equal(state.perch[1], null);
    drag = {from: 0}; endDrag({type: 'pointercancel'});
    assert.equal(drag, null); assert.equal(state.cells[0].level, 1);`);
});

test('trial generation terminates even with a constant random source', () => {
  game().run(`state.mode = 'stage'; generateTrail(); assert.equal(ashCount(), 8);
    state.stageCells.fill(null); state.stageCells[0] = {level: CHAIN.length - 1, count: 5};
    assert.equal(canFiveMerge(), false);`);
});

test('spawn rejects ash and out-of-bounds target cells', () => {
  game().run(`state.mode = 'stage'; state.ash[0] = true;
    spawn(0, 1, 0); assert.equal(state.stageCells[0], null);
    spawn(0, 1, 100); assert.equal(state.stageCells.length, 25);`);
});

test('Blitz requires a prior trial victory and home mode', () => {
  game().run(`blitzAshTrial(); assert.equal(state.ashDayWins, 0);
    state.ashTrialCompleted = true; state.mode = 'stage'; blitzAshTrial(); assert.equal(state.ashDayWins, 0);
    state.mode = 'home'; blitzAshTrial(); assert.equal(state.ashDayWins, 1);`);
});

test('equipping and unequipping preserves cosmetic quantity through saves', () => {
  game().run(`state.stash.border_obsidian = 1;
    useFromStash('border_obsidian'); assert.equal(state.stash.border_obsidian, undefined);
    assert.equal(state.keeper.equipment.border, 'border_obsidian.png');
    save(); load(); useFromStash('border_obsidian');
    assert.equal(state.stash.border_obsidian, 1); assert.equal(state.keeper.equipment.border, null);`);
});


const { game } = require('./support/game-harness.cjs');
test('onboarding opens once, closes by keyboard, and reopens from Help', () => {
  const g = game();
  assert.ok(g.nodes.get('guide').classList.contains('open'));
  g.nodes.get('guide').key('Escape');
  assert.equal(g.run('state.seenGuide'), true);
  assert.equal(g.nodes.get('guide').classList.contains('open'), false);
  const returning = game(Object.fromEntries(g.storage));
  assert.equal(returning.nodes.get('guide').classList.contains('open'), false);
  returning.nodes.get('guideBtn').click();
  assert.ok(returning.nodes.get('guide').classList.contains('open'));
});

test('five-merge promotes dragons, preserves leftovers, and pays rewards', () => {
  const g = game();
  g.run(`state.cells[0] = {level: 0, count: 4, shiny: false, element: 'neutral'};
    state.cells[1] = {level: 0, count: 3, shiny: false, element: 'neutral'};
    assert.equal(mergeInto(0, 1), true);
    assert.equal(state.cells[0].count, 2);
    assert.equal(state.cells[1].level, 1);
    assert.equal(state.cells[1].count, 1);
    assert.equal(state.coins, 345);
    assert.equal(state.xp, 25);`);
});

test('invalid merges leave the board untouched; stacking does not promote early', () => {
  game().run(`state.cells[0] = {level: 0, count: 1}; state.cells[1] = {level: 1, count: 1};
    const before = JSON.stringify(state.cells);
    assert.equal(mergeInto(0, 1), false); assert.equal(mergeInto(0, 0), false);
    assert.equal(JSON.stringify(state.cells), before);
    state.cells[1].level = 0; mergeInto(0, 1);
    assert.equal(state.cells[1].count, 2); assert.equal(state.cells[1].level, 0);
    assert.equal(state.coins, 20);`);
});

test('save round trip preserves dragons, inventory, equipment and coins', () => {
  game().run(`state.coins = 987; state.cells[0] = {level: 2, count: 3, shiny: true, element: 'fire'};
    state.stash = {rare_tunic: 2}; state.keeper.equipment.border = 'border_obsidian.png';
    save(); state = defaultState(); load();
    assert.equal(state.coins, 987); assert.equal(state.cells[0].count, 3);
    assert.equal(state.cells[0].shiny, true); assert.equal(state.stash.rare_tunic, 2);
    assert.equal(state.keeper.equipment.border, 'border_obsidian.png');`);
});

test('legacy saves migrate while trial boards reset safely', () => {
  const g = game({ 'ember-nest-v10': JSON.stringify({ coins: 456, mode: 'stage', cells: Array(30).fill(null), stageMerges: 5 }) });
  g.run(`assert.equal(state.coins, 456); assert.equal(state.cells.length, 25);
    assert.equal(state.mode, 'home'); assert.equal(state.stageMerges, 0);
    assert.ok(state.keeper.equipment); assert.ok(state.stash);`);
});

test('gather spends one energy only when an egg can spawn', () => {
  game().run(`gather(); assert.equal(state.energy, 4); assert.equal(state.cells.filter(Boolean).length, 1);
    state.energy = 0; gather(); assert.equal(state.cells.filter(Boolean).length, 1);
    state.energy = 3; state.cells.fill({level: 0, count: 1}); gather(); assert.equal(state.energy, 3);`);
});

test('energy regenerates on the timer and never exceeds its cap', () => {
  const g = game();
  g.run('gather()'); g.advance(8000); g.run('tickEnergy(); assert.equal(state.energy, 5)');
  g.advance(80000); g.run('tickEnergy(); assert.equal(state.energy, 5)');
});

test('trial pouch replaces energy and reset preserves home inventory', () => {
  game().run(`state.cells[0] = {level: 2, count: 1}; state.stash = {rare_tunic: 1};
    state.mode = 'stage'; resetTrail(); const pouch = state.trailGathers;
    gather(); assert.equal(state.trailGathers, pouch - 1); assert.equal(state.energy, 5);
    state.trailGathers = 0; gather(); assert.equal(state.stageCells.filter(Boolean).length, 1);
    resetTrail(); assert.equal(state.cells[0].level, 2); assert.equal(state.stash.rare_tunic, 1);`);
});

test('100 generated trials have eight ash tiles and no occupied ash cells', () => {
  game().run(`let seed = 123; Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
    state.mode = 'stage';
    for (let n = 0; n < 100; n++) {
      generateTrail(); assert.equal(ashCount(), 8);
      assert.equal(state.stageCells.filter(Boolean).length, TRAIL_BAG.length + 1);
      assert.ok(state.stageCells.every((c, i) => !c || !state.ash[i]));
    }`);
});

test('ash clearing follows tier patterns and cannot count a tile twice', () => {
  game().run(`for (const [tier, count] of [[1,4], [2,4], [3,5], [4,5], [5,9]]) {
    state.ash.fill(true); state.ashBurned = 0; applyWarmth(12, tier);
    assert.equal(state.ashBurned, count); applyWarmth(12, tier); assert.equal(state.ashBurned, count);
  }`);
});

test('trial rewards are limited to three daily clears', () => {
  game().run(`state.book = {0:true,1:true,2:true,3:true,4:true,5:true};
    for (let n = 0; n < 3; n++) { state.mode = 'stage'; winStage(); }
    assert.equal(dailyLeft(), 0); const coins = state.coins;
    state.mode = 'stage'; winStage(); assert.equal(state.coins, coins);
    assert.equal(state.mode, 'home');`);
});

test('trial failure opens its message without losing home dragons', () => {
  const g = game();
  g.run(`state.cells[0] = {level: 3, count: 1}; state.mode = 'stage'; resetTrail(); failStage();
    assert.equal(state.cells[0].level, 3);`);
  assert.ok(g.nodes.get('trailFail').classList.contains('open'));
});

test('a new day restores daily trial rewards and the Sleepy Dragon request', () => {
  game().run(`state.ashDayKey = '2000-01-01'; state.ashDayWins = 3; state.sleepyDone = true;
    rollDaily(); assert.equal(dailyLeft(), 3); assert.equal(state.sleepyDone, false);
    state.ashDayWins = 1; rollDaily(); assert.equal(dailyLeft(), 2);`);
});
