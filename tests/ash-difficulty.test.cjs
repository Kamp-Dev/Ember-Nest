const {test}=require('node:test');
const {game}=require('./support/game-harness.cjs');

test('Ash pressure begins on the second promotion, not stack consolidation',()=>{
 game().run(`
  state.mode='stage';state.trialKind='ash';resetTrail();
  let spawned=0;spawnAsh=n=>{spawned+=n;return true;};
  state.stageCells[0]={level:0,count:2};state.stageCells[1]={level:0,count:2};
  mergeInto(0,1);assert.equal(spawned,0);assert.equal(state.stageMerges,0);
  state.stageCells[0]={level:0,count:1};mergeInto(0,1);
  assert.equal(spawned,0);assert.equal(state.stageMerges,1);
  state.stageCells[2]={level:0,count:4};state.stageCells[3]={level:0,count:1};mergeInto(2,3);
  assert.equal(spawned,2);assert.equal(state.stageMerges,2);
 `);
});

test('Ash uses the revised goal while preserving pouch bonuses, payouts, and Surge rules',()=>{
 game().run(`
  state.trialKind='ash';assert.equal(trialRules().goal,10);assert.equal(trialRules().limit,10);
  state.pouchBonus=6;state.dailyPouchBonus=5;assert.equal(trialPouchSize(),24);
  assert.deepEqual(DAILY_PAYS,[1200,800,400]);assert.equal(DAILY_CLEARS,3);
  state.trialKind='surge';assert.equal(trialRules().goal,12);assert.equal(trialRules().grace,1);
  assert.equal(trialRules().limit,12);assert.equal(trialPouchSize(),36);
 `);
});

test('Ash openings vary across retries, preserve the bag, and place ash across the whole board',()=>{
 game().run(`
  let seed=4521;Math.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  state.mode='stage';state.trialKind='ash';
  const layouts=new Set(),positions=new Set();
  const expected=[0,...TRAIL_BAG].sort((a,b)=>a-b);
  for(let run=0;run<100;run++){
    generateTrail();
    layouts.add(JSON.stringify(state.ash));
    state.ash.forEach((ash,i)=>{if(ash)positions.add(i);});
    assert.equal(ashCount(),ASH_START);
    assert.deepEqual(state.stageCells.filter(Boolean).map(c=>c.level).sort((a,b)=>a-b),expected);
    assert.ok(state.stageCells.every((c,i)=>!c||!state.ash[i]));
  }
  assert.ok(layouts.size>90);assert.equal(positions.size,25);
 `);
});

test('Ash win target includes newly spawned ash and does not finish at the old target',()=>{
 game().run(`
  state.mode='stage';state.trialKind='ash';resetTrail();state.ashBurned=7;
  state.stageCells[0]={level:0,count:4};state.stageCells[1]={level:0,count:1};state.ash[2]=true;
  mergeInto(0,1);assert.equal(state.ashBurned,8);assert.equal(state.trailWon,false);
  state.stageCells[10]={level:0,count:4};state.stageCells[11]={level:0,count:1};state.ash[12]=true;state.ash[16]=true;
  mergeInto(10,11);assert.equal(state.ashBurned,10);assert.equal(state.trailWon,true);
 `);
});
