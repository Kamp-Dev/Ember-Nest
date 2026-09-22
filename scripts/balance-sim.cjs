// Read-only balance experiment; uses production rules and isolated in-memory saves.
const { game } = require('../tests/support/game-harness.cjs');
function setup(seed, overrides = {}) {
  const g = game({}, overrides);
  g.run(`let simSeed = ${seed}; Math.random = () => ((simSeed = (1664525 * simSeed + 1013904223) >>> 0) / 4294967296);
    const productionRender = render;
    render = () => {}; toast = () => {}; sfx = () => {}; showLevelEvent = () => {};
    let milestones = {}; let eggs = 0; let purchases = [];
    function consolidate() {
      for (;;) {
        let pair = null;
        for (let i = 0; i < 25 && !pair; i++) for (let j = i + 1; j < 25; j++) {
          const a = board()[i], b = board()[j];
          if (a && b && a.level === b.level && a.level < CHAIN.length - 1) { pair = [i,j]; break; }
        }
        if (!pair) break;
        mergeInto(...pair);
      }
      for (const cell of state.cells) if (cell && cell.level && !milestones[cell.level]) milestones[cell.level] = {eggs, seconds: (Date.now()-100000)/1000, coins: state.coins, level: state.level};
    }`);
  return g;
}
const progression = [];
for (const decor of (process.argv.includes('--trials-only') || process.argv.includes('--trial-candidates') ? [] : [false, true, 'shop'])) {
  const runs = [];
  for (let seed = 1; seed <= 30; seed++) {
    const g = setup(seed);
    g.run(`let simNow = Date.now(); Date.now = () => simNow;
      for (let action = 0; action < 5000 && !milestones[5]; action++) {
        if (state.energy <= 0) { simNow += REGEN_MS; tickEnergy(); }
        gather(); eggs++; consolidate();
        if (${!!decor}) for (const item of DECOR) if (!state.decor[item.id] && highestOwned() >= item.needStage && state.coins >= item.cost) {
          buyDecor(item.id); purchases.push({id:item.id, eggs, seconds:(Date.now()-100000)/1000});
        }
        if (${decor === 'shop'} && highestOwned() >= 3 && state.coins > 5000 + eggPrice()) {
          buyEgg(); consolidate();
        }
      }
      if (!milestones[5]) throw new Error('Progression did not reach Elder');
    `);
    runs.push(JSON.parse(g.run('JSON.stringify({milestones,purchases,coins:state.coins,level:state.level,bonus:bonus()})')));
  }
  progression.push({decor, runs});
}

const trials = [];
const variants = process.argv.includes('--trial-candidates') ? [
  { name: 'original trial baseline', overrides: { TRAIL_GATHERS: 4, ASH_GRACE: 1, ASH_PER_MERGE: 2 } },
  { name: 'current', overrides: {} },
  { name: '7 gathers, 2 grace, 2 ash', overrides: { TRAIL_GATHERS: 7, ASH_GRACE: 2 } },
  { name: '7 gathers, 1 grace, 1 ash', overrides: { TRAIL_GATHERS: 7, ASH_GRACE: 1, ASH_PER_MERGE: 1 } },
  { name: '7 gathers, 2 grace, 1 ash', overrides: { TRAIL_GATHERS: 7, ASH_GRACE: 2, ASH_PER_MERGE: 1 } },
] : [{name:'current',overrides:{}}];
for (const variant of variants) for (const pouchBonus of [0, 3, 6]) {
  let wins = 0, fails = 0, stalled = 0;
  for (let seed = 1; seed <= 500; seed++) {
    const g = setup(seed, variant.overrides);
    const result = g.run(`render = productionRender; state.mode = 'stage'; state.pouchBonus = ${pouchBonus}; generateTrail(); render();
      // Greedy strategy: choose the merge destination clearing most ash; otherwise
      // consolidate stacks near ash. No lookahead or repositioning on empty cells.
      let result = 'stalled', scheduledFailure = false;
      setTimeout = fn => { if (fn === failStage) scheduledFailure = true; return 1; };
      for (let step = 0; step < 100; step++) {
        if (state.trailWon) { result = 'win'; break; }
        if (scheduledFailure || ashCount() >= ASH_FAIL) { result = 'fail'; break; }
        let best = null, bestScore = -Infinity;
        for (let from = 0; from < 25; from++) for (let to = 0; to < 25; to++) {
          const a = board()[from], b = board()[to];
          if (from === to || !a || !b || a.level !== b.level || a.level >= 5) continue;
          const oldAsh = state.ash.slice(), oldBurned = state.ashBurned, oldFlash = state._flash;
          const promoted = a.count + b.count >= 5;
          if (promoted) applyWarmth(to, a.level + 1);
          const burns = state.ashBurned - oldBurned;
          state.ash = oldAsh; state.ashBurned = oldBurned; state._flash = oldFlash;
          const score = burns * 100 + (promoted ? 10 : 0) + neighbors(to).filter(i => state.ash[i]).length;
          if (score > bestScore) { bestScore = score; best = [from, to]; }
        }
        if (best) {
          mergeInto(...best);
          render();
        } else if (state.trailGathers > 0 && emptyOpen().length) gather();
        else { result = 'fail'; break; }
      }
      result;`);
    if (result === 'win') wins++; else if (result === 'fail') fails++; else stalled++;
  }
  trials.push({variant:variant.name,pouchBonus, wins, fails, stalled, samples: 500});
}
function median(values) { const sorted = values.slice().sort((a,b) => a-b); return sorted[Math.floor(sorted.length/2)]; }
const summary = progression.map(({decor,runs}) => ({
  strategy: decor === 'shop' ? 'decor + buy dragons with coins above 5000 reserve' : decor ? 'buy decor as soon as affordable' : 'save coins, no decor',
  stages: [1,2,3,4,5].map(tier => ({tier, gathers:median(runs.map(r => r.milestones[tier].eggs)),
    minimumGatherMinutes: median(runs.map(r => r.milestones[tier].seconds))/60,
    medianCoins: median(runs.map(r => r.milestones[tier].coins)),
    medianPlayerLevel: median(runs.map(r => r.milestones[tier].level))})),
  decorPurchases: ['moss','lamp','pool','hoard','roost'].map(id => ({id,minutes:median(runs.map(r=>r.purchases.find(p=>p.id===id)?.seconds / 60).filter(Number.isFinite)),purchasedRuns:runs.filter(r=>r.purchases.some(p=>p.id===id)).length})),
  samples:runs.length,
}));
console.log(JSON.stringify({progression:summary,trials},null,2));
