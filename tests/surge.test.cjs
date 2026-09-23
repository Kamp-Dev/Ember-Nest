const {test}=require('node:test');
const {game}=require('./support/game-harness.cjs');
test('Run Again preserves Surge after win and after a saved result',()=>{
 const g=game();g.run(`state.ashTrialCompleted=true;enterStage('surge');state.ashBurned=12;state.trailWon=true;winSurge();
 restartTrail();assert.equal(state.trialKind,'surge');assert.equal(state.trailGathers,25);
 state.ashBurned=12;state.trailWon=true;winSurge();save();`);
 game(Object.fromEntries(g.storage)).run(`restartTrail();assert.equal(state.trialKind,'surge');assert.equal(state.mode,'stage');`);
});
test('ended runs reject gathers, spawns and merges until restarted',()=>{
 game().run(`state.ashTrialCompleted=true;enterStage('surge');state.stageCells[0]={level:0,count:4};state.stageCells[1]={level:0,count:1};
 showTrailFail('Test failure');const cells=JSON.stringify(state.stageCells),pouch=state.trailGathers;
 gather();assert.equal(spawn(0),false);assert.equal(mergeInto(0,1),false);assert.equal(JSON.stringify(state.stageCells),cells);assert.equal(state.trailGathers,pouch);
 restartTrail();assert.equal(trialInputLocked(),false);state.trailWon=true;assert.equal(spawn(0),false);`);
});
test('hint is read-only and its ash prediction matches production warmth',()=>{
 game().run(`state.ashTrialCompleted=true;enterStage('surge');state.stageCells.fill(null);state.ash.fill(false);
 state.stageCells[0]={level:1,count:4};state.stageCells[1]={level:1,count:1};state.ash[2]=true;state.ash[6]=true;
 const before=JSON.stringify(state),hint=trialHint();assert.equal(JSON.stringify(state),before);
 assert.equal(hint.from,0);assert.equal(hint.to,1);assert.equal(hint.clears,2);
 const burned=state.ashBurned;mergeInto(hint.from,hint.to);assert.equal(state.ashBurned-burned,hint.clears);
 state.mode='home';assert.equal(trialHint(),null);`);
});
test('warmth preview matches clearing at edges and each growth stage',()=>{
 game().run(`for(const tile of [0,4,12,20,24])for(let level=1;level<=5;level++){
 state.ash.fill(true);state.ashBurned=0;const expected=warmthTargets(tile,level);applyWarmth(tile,level);
 assert.equal(state.ashBurned,expected.length);assert.ok(expected.every(i=>!state.ash[i]));}`);
});
test('seeded production-rule playthroughs include successful generated Surge boards',()=>{
 const {execFileSync}=require('node:child_process');const path=require('node:path');
 const report=JSON.parse(execFileSync(process.execPath,[path.resolve(__dirname,'../scripts/audit-surge.cjs')],{encoding:'utf8'}));
 if(report.wins<1||report.seeds!==100)throw new Error('No generated boards solved');
});
test('Surge requires Ash completion and preserves main-board state on entry and exit',()=>{
 game().run(`enterStage('surge');assert.equal(state.mode,'home');state.ashTrialCompleted=true;
 const cells=JSON.stringify(state.cells),coins=state.coins,energy=state.energy;
 enterStage('surge');assert.equal(state.mode,'stage');assert.equal(trialRules().goal,12);assert.equal(trialRules().grace,1);
 assert.equal(state.coins,coins);assert.equal(state.energy,energy);enterStage();
 assert.equal(state.mode,'home');assert.equal(JSON.stringify(state.cells),cells);`);
});
test('Surge first clear gives one Prism and cosmetic title, replays never farm rewards',()=>{
 const g=game();g.run(`state.ashTrialCompleted=true;const coins=state.coins,xp=state.xp;const contracts=JSON.stringify(state.contracts.items);
 enterStage('surge');assert.equal(winSurge(),false);state.ashBurned=12;state.trailWon=true;assert.equal(winSurge(),true);
 assert.equal(state.stash.element_prism,1);assert.equal(state.coins,coins);assert.equal(state.xp,xp);
 assert.equal(JSON.stringify(state.contracts.items),contracts);assert.equal(state.ashWins,0);
 claimCollection('surge_keeper');assert.equal(state.collectionOwned.surge_keeper,true);
 enterStage('surge');state.ashBurned=12;state.trailWon=true;assert.equal(winSurge(),true);
 assert.equal(state.stash.element_prism,1);assert.equal(state.surgeWins,2);save();`);
 game(Object.fromEntries(g.storage)).run(`assert.equal(state.surgeCleared,true);assert.equal(state.collectionOwned.surge_keeper,true);assert.equal(state.stash.element_prism,1);`);
});
test('Surge promotions do not award discovery coins or alter permanent books',()=>{
 game().run(`state.ashTrialCompleted=true;enterStage('surge');state.stageCells.fill(null);state.ash.fill(false);
 const coins=state.coins,book=JSON.stringify(state.book),rare=JSON.stringify(state.rareBook),elements=JSON.stringify(state.elementBook);
 state.stageCells[0]={level:2,count:4,element:'water',shiny:true};state.stageCells[1]={level:2,count:1,element:'water'};
 mergeInto(0,1);assert.equal(state.coins,coins);assert.equal(JSON.stringify(state.book),book);assert.equal(JSON.stringify(state.rareBook),rare);assert.equal(JSON.stringify(state.elementBook),elements);save();`);
});
test('reloading Surge abandons temporary board, without touching the home board',()=>{
 const g=game();g.run(`state.ashTrialCompleted=true;state.cells[0]={level:2,count:3,element:'nature'};enterStage('surge');save();`);
 game(Object.fromEntries(g.storage)).run(`assert.equal(state.mode,'home');assert.equal(state.trialKind,'ash');assert.ok(state.stageCells.every(c=>c===null));assert.equal(state.cells[0].count,3);`);
});
test('old delayed win callback cannot finish a restarted run',()=>{
 game().run(`state.ashTrialCompleted=true;enterStage('surge');let queued=[];setTimeout=fn=>queued.push(fn);
 state.stageCells.fill(null);state.ash.fill(false);state.ashBurned=11;state.ash[2]=true;
 state.stageCells[0]={level:0,count:4};state.stageCells[1]={level:0,count:1};mergeInto(0,1);assert.equal(state.trailWon,true);
 restartTrail();queued.forEach(fn=>fn());assert.equal(state.mode,'stage');assert.equal(state.surgeCleared,undefined);`);
});
