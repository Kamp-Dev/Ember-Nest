const {test}=require('node:test');
const assert=require('node:assert/strict');
const B=require('../battle-core.js');
const {game}=require('./support/game-harness.cjs');
const dragon=(stage=1,element='neutral',rank=1,special='burst')=>({level:stage,count:1,element,training:{id:1,name:'Ember',xp:B.threshold(rank),special}});
function play(d,id,smart=true){
  const b=B.create(d,id);
  while(b.phase==='active'){
    const i=B.intent(b),p=b.player;
    const move=!smart?'strike':i.power>1?'guard':d.training.special==='mend'&&p.hp<p.maxHp*.72&&B.legal(b,'special')?'special':i.guard?'strike':d.training.special!=='mend'&&B.legal(b,'special')?'special':B.legal(b,'element')?'element':'strike';
    assert.equal(B.resolve(b,move),true);
  }
  return b;
}
test('PvE preserves eight encounters and adds four campaign bosses with stage gates and capped XP',()=>{
  assert.equal(B.encounters.length,12);assert.equal(B.encounters.filter(e=>!e.boss).length,8);
  assert.equal(B.create(dragon(1),'inferno'),null);
  assert.equal(B.create(dragon(0),'meadow'),null);
  assert.equal(B.create(dragon(),'__proto__'),null);
  assert.equal(B.trainingLevel(dragon(1,'neutral',12)),3);
  assert.equal(B.trainingLevel(dragon(5,'neutral',12)),12);
  assert.equal(B.reward(dragon(1,'neutral',3),B.encounters[0],false).xp,0);
  assert.ok(B.reward(dragon(5),B.encounters[0],false).xp<B.encounters[0].xp);
});
test('turns reject invalid skills, overspending, cooldown reuse and actions after completion',()=>{
  const b=B.create(dragon(),'meadow'),before=JSON.stringify(b);
  assert.equal(B.resolve(b,'__proto__'),false);assert.equal(JSON.stringify(b),before);
  assert.equal(B.resolve(b,'special'),true);assert.equal(b.player.stamina,2);assert.equal(b.player.cooldown,3);
  assert.equal(B.resolve(b,'special'),false);
  b.player.stamina=0;assert.equal(B.resolve(b,'element'),false);
  B.resolve(b,'guard');assert.equal(b.player.stamina,2);
  const win=play(dragon(),'meadow');assert.equal(win.phase,'won');const frozen=JSON.stringify(win);
  assert.equal(B.resolve(win,'strike'),false);assert.equal(JSON.stringify(win),frozen);
});
test('enemy intent is deterministic; Guard has priority and blocks heavy attacks',()=>{
  const guarded=B.create(dragon(),'meadow'),exposed=B.create(dragon(),'meadow');
  guarded.round=exposed.round=3;guarded.enemy.speed=exposed.enemy.speed=100;
  assert.equal(B.intent(guarded).name,'Heavy attack');
  B.resolve(guarded,'guard');B.resolve(exposed,'strike');
  assert.equal(guarded.events[0].kind,'guard');assert.ok(guarded.player.hp>exposed.player.hp);
});
test('elements have modest advantages and distinct burn, weaken and root effects',()=>{
  assert.equal(B.advantage('fire','nature'),1.2);assert.equal(B.advantage('nature','fire'),.85);assert.equal(B.advantage('neutral','fire'),1);
  for(const el of ['fire','water','nature']){
    const b=B.create(dragon(5,el),'sentinel');b.enemy.speed=1;
    B.resolve(b,'element');
    if(el==='fire'){assert.equal(b.enemy.burn,1);assert.ok(b.events.some(e=>e.kind==='burn'));}
    if(el==='water')assert.ok(b.player.hp>b.player.maxHp-b.enemy.attack);
    if(el==='nature')assert.equal(b.enemy.root,1);
  }
});
test('Elder Renewal unlocks at training 3, heals only to max and cannot be spammed',()=>{
  assert.equal(B.moves(dragon(5,'water',2,'mend'))[3].heal,undefined);
  assert.equal(B.moves(dragon(4,'water',3,'mend'))[3].heal,undefined);
  const b=B.create(dragon(5,'water',3,'mend'),'sentinel');b.player.hp=10;b.round=2;
  B.resolve(b,'special');assert.ok(b.player.hp>10);assert.ok(b.player.hp<=b.player.maxHp);assert.equal(B.legal(b,'special'),false);
});
test('all encounters are winnable at recommended training with an appropriate build',()=>{
  for(const e of B.encounters.filter(e=>!e.boss)){
    const outcomes=B.elements.flatMap(el=>['burst','mend'].map(s=>play(dragon(e.stage,el,e.rank,s),e.id)));
    assert.ok(outcomes.some(b=>b.phase==='won'),e.id+' must be beatable');
    assert.ok(outcomes.every(b=>b.round<=41));
  }
  assert.ok(play(dragon(),'meadow').round<=8);
  assert.notEqual(play(dragon(5,'nature',1),'inferno',false).phase,'won');
});
test('40-turn stalemate ends safely and battle simulation never mutates source dragons',()=>{
  const d=dragon(),before=JSON.stringify(d),b=B.create(d,'meadow');b.player.maxHp=b.player.hp=100000;
  while(b.phase==='active')B.resolve(b,'guard');
  assert.equal(b.phase,'draw');assert.equal(b.round,41);assert.equal(JSON.stringify(d),before);
});
test('every element can finish the final encounter at the training cap without a coin upgrade',()=>{
  for(const element of B.elements)assert.ok(['burst','mend'].some(s=>play(dragon(5,element,12,s),'inferno').phase==='won'),element);
});
test('enlist removes exactly one dragon, return preserves identity, reload and re-enlist preserve training',()=>{
  const g=game();g.run(`state.cells[0]={level:2,count:4,element:'water',shiny:true};assert.equal(enlistBattleDragon(0),true);assert.equal(state.cells[0].count,3);assert.equal(state.battleRoster.length,1);assert.equal(state.battleRoster[0].shiny,true);state.battleRoster[0].training.xp=60;assert.equal(updateBattleTraining(1,'Ripple','burst'),true);assert.equal(returnBattleDragon(1),true);assert.equal(state.cells[1].training.name,'Ripple');assert.equal(state.cells[1].training.xp,60);assert.equal(state.battleRoster.length,0);`);
  const reload=game(Object.fromEntries(g.storage));reload.run(`assert.equal(enlistBattleDragon(1),true);assert.equal(state.battleRoster[0].training.xp,60);assert.equal(state.battleRoster[0].training.id,1);assert.equal(state.battleNextId,2);`);
});
test('full Board, roster limits, locked cells, eggs and Trial mode do not lose dragons',()=>{
  const g=game();g.run(`assert.equal(enlistBattleDragon(-1),false);state.cells[20]={level:1,count:1};assert.equal(enlistBattleDragon(20),false);state.cells[0]={level:0,count:1};assert.equal(enlistBattleDragon(0),false);state.cells[0]={level:1,count:20};for(let i=0;i<12;i++)assert.equal(enlistBattleDragon(0),true);assert.equal(enlistBattleDragon(0),false);state.cells.fill({level:1,count:1});const before=JSON.stringify(state);assert.equal(returnBattleDragon(1),false);assert.equal(JSON.stringify(state),before);state.mode='stage';assert.equal(updateBattleTraining(1,'Unsafe','burst'),false);`);
});
test('trained dragons cannot be consumed, merged, auto-merged or prism changed; Roost preserves training',()=>{
  const g=game();g.run(`render=()=>{};state.level=10;state.cells[0]={level:2,count:1,element:'fire'};enlistBattleDragon(0);returnBattleDragon(1);state.cells[1]={level:2,count:4,element:'fire'};assert.equal(mergeInto(0,1),false);assert.equal(findLevel(2),1);assert.equal(prismTargets(state.cells[0]).length,0);seatPerch(0,0);assert.equal(state.perch[0].training.id,1);emptyPerch(0);assert.ok(state.cells.some(d=>d?.training?.id===1));triggerAutoMerge();assert.ok(state.cells.some(d=>d?.training?.id===1));consumeOne(2);assert.ok(state.cells.some(d=>d?.training?.id===1));`);
});
test('growth consumes exactly four matching untrained dragons and keeps the companion XP/name',()=>{
  const g=game();g.run(`state.cells[0]={level:2,count:1,element:'water'};enlistBattleDragon(0);state.battleRoster[0].training.xp=60;state.battleRoster[0].training.name='Ripple';state.cells[1]={level:2,count:6,element:'water'};state.cells[2]={level:2,count:4,element:'fire'};assert.equal(growBattleDragon(1),true);assert.equal(state.battleRoster[0].level,3);assert.equal(state.battleRoster[0].training.name,'Ripple');assert.equal(state.battleRoster[0].training.xp,60);assert.equal(state.cells[1].count,2);assert.equal(state.cells[2].count,4);assert.equal(growBattleDragon(1),false);`);
});
test('failed writes and cross-tab conflicts roll back transfers and rewards without duplicating',()=>{
  const g=game();g.run(`state.cells[0]={level:1,count:2};save();const before=JSON.stringify(state);const originalWrite=localStorage.setItem;localStorage.setItem=()=>{throw Error('quota')};assert.equal(enlistBattleDragon(0),false);assert.equal(JSON.stringify(state),before);localStorage.setItem=originalWrite;assert.equal(enlistBattleDragon(0),true);const run=DragonBattle.create(state.battleRoster[0],'meadow');run.phase='won';const beforeReward=JSON.stringify(state);localStorage.setItem=()=>{throw Error('quota')};assert.equal(settleBattleReward(run),false);assert.equal(JSON.stringify(state),beforeReward);assert.ok(!run.claimed);localStorage.setItem=originalWrite;assert.equal(settleBattleReward(run),true);assert.equal(settleBattleReward(run),false);assert.equal(state.battleRoster[0].training.xp,22);const after=JSON.stringify(state);localStorage.setItem(SAVE,'another tab');assert.equal(returnBattleDragon(1),false);assert.equal(JSON.stringify(state),after);assert.equal(saveBlocked,true);`);
});
test('first-clear coins are once per save, repeat XP is capped, losses give no rewards',()=>{
  const g=game();g.run(`state.cells[0]={level:1,count:1};enlistBattleDragon(0);let coins=state.coins;let run=DragonBattle.create(state.battleRoster[0],'meadow');assert.equal(settleBattleReward(run),false);run.phase='won';assert.equal(settleBattleReward(run),true);assert.equal(state.coins,coins+35);for(let i=0;i<10;i++){run=DragonBattle.create(state.battleRoster[0],'meadow');run.phase='won';settleBattleReward(run);}assert.equal(state.coins,coins+35);assert.equal(state.battleRoster[0].training.xp,DragonBattle.threshold(3));`);
});
test('growth grants normal merge coin/keeper XP credit and failed growth rolls back queued level rewards',()=>{
  const g=game();g.run(`state.cells[0]={level:3,count:1,element:'fire'};enlistBattleDragon(0);state.cells[1]={level:3,count:4,element:'fire'};save();const before=JSON.stringify(state),queueBefore=JSON.stringify(levelQueue),originalWrite=localStorage.setItem;localStorage.setItem=()=>{throw Error('quota')};assert.equal(growBattleDragon(1),false);assert.equal(JSON.stringify(state),before);assert.equal(JSON.stringify(levelQueue),queueBefore);localStorage.setItem=originalWrite;assert.equal(growBattleDragon(1),true);assert.equal(state.level,2);assert.equal(state.xp,5);assert.equal(state.hearthDone,true);assert.ok(state.coins>=5280);assert.equal(levelQueue.length,1);`);
});
test('Elder reserve and Roost transfers keep training IDs and cannot move dragons into temporary Trials',()=>{
  const g=game();g.run(`render=()=>{};state.cells[0]={level:5,count:1,element:'water'};enlistBattleDragon(0);returnBattleDragon(1);storeElder(0);assert.equal(state.elderReserve[0].dragon.training.id,1);restoreElder(state.elderReserve[0].id);seatPerch(0,0);state.mode='stage';emptyPerch(0);assert.equal(state.perch[0].training.id,1);assert.ok(state.stageCells.every(d=>!d));`);
});
test('backup round-trip protects training records and rejects duplicate or malformed roster identities',()=>{
  const g=game();g.run(`state.cells[0]={level:5,count:1,element:'nature'};enlistBattleDragon(0);const backup=backupPayload();assert.equal(validateBackup(JSON.stringify(backup)).battleRoster[0].training.id,1);backup.data.cells[0]=JSON.parse(JSON.stringify(backup.data.battleRoster[0]));assert.throws(()=>validateBackup(JSON.stringify(backup)));backup.data.cells[0]=null;backup.data.battleRoster[0].training.xp=-1;assert.throws(()=>validateBackup(JSON.stringify(backup)));backup.data.battleRoster=[null];assert.throws(()=>validateBackup(JSON.stringify(backup)));`);
});
test('busy turn inputs and stale animation callbacks cannot attack twice or grant abandoned rewards',()=>{
  const g=game();g.run(`render=()=>{};renderBattleLodge=()=>{};state.cells[0]={level:1,count:1};enlistBattleDragon(0);pveSelected=1;let callbacks=[];setTimeout=fn=>{callbacks.push(fn);return 1};startPve('meadow');callbacks.at(-1)();assert.equal(pveLoading,false);pveMove('strike');assert.equal(pveRun.round,2);const after=JSON.stringify(pveRun);pveMove('strike');assert.equal(JSON.stringify(pveRun),after);assert.equal(returnBattleDragon(1),false);closeBattleLodge(true);callbacks.forEach(fn=>fn());assert.equal(pveRun,null);assert.equal(state.battleRoster[0].training.xp,0);assert.deepEqual(state.battleClears,{});`);
});

test('combat snapshots retain shield and HP at each event rather than the resolved turn',()=>{
  const b=B.create(dragon(),'meadow');B.resolve(b,'guard');
  assert.equal(b.events[0].player.guard,true);assert.equal(b.player.guard,false);
  const hit=b.events.find(e=>e.kind==='hit');assert.equal(hit.blocked,true);assert.equal(hit.amount,3);
  assert.equal(b.events[0].player.hp,72);assert.equal(hit.player.hp,69);
  b.player.hp=1;assert.equal(hit.player.hp,69);
});
test('each enemy family has its own telegraphed rhythm and recovery',()=>{
  const signatures=['meadow','brook','cinder','thicket','sentinel'].map(id=>{
    const b=B.create(dragon(5),id);return [1,2,3,4].map(round=>{b.round=round;return B.intent(b).name;}).join('|');
  });assert.equal(new Set(signatures).size,5);
});
test('loading blocks attacks and late asset completion cannot resurrect a cancelled run',()=>{
  const g=game();g.run(`render=()=>{};renderBattleLodge=()=>{};state.cells[0]={level:1,count:1};enlistBattleDragon(0);pveSelected=1;let pending=[];Image=function(){pending.push(this)};let tasks=[];setTimeout=fn=>{tasks.push(fn);return tasks.length};startPve('meadow');assert.equal(pveLoading,true);pveMove('strike');assert.equal(pveRun.round,1);closeBattleLodge();assert.equal(pveRun,null);pending[0].onload();tasks.forEach(fn=>fn());assert.equal(pveRun,null);assert.equal(state.battleRoster[0].training.xp,0);`);
});
test('failed scenery and duplicate image events complete loading once with a fallback',()=>{
  const g=game();g.run(`renderBattleLodge=()=>{};state.cells[0]={level:1,count:1};enlistBattleDragon(0);pveSelected=1;let pending=[];Image=function(){pending.push(this)};let tasks=[];setTimeout=fn=>{tasks.push(fn);return tasks.length};startPve('meadow');assert.equal(pending.length,2);pending[0].onerror();pending[0].onload();assert.equal(tasks.length,1);pending[1].onerror();pending[1].onload();assert.equal(tasks.length,2);assert.ok(pveAssetFailures.has('assets/battle/hatchling-poses-v1.png'));tasks.at(-1)();assert.equal(pveLoading,false);assert.equal(pveBusy,false);assert.equal(pveRun.round,1);`);
});
test('all elemental status events carry independent snapshots and healing numbers',()=>{
  for(const element of ['fire','water','nature']){
    const b=B.create(dragon(5,element),'sentinel');b.player.hp-=30;B.resolve(b,'element');
    const status=b.events.find(e=>e.kind==='status');assert.ok(status);assert.notEqual(status.player,b.player);assert.notEqual(status.enemy,b.enemy);
    if(element==='nature')assert.ok(b.events.find(e=>e.kind==='heal').amount>0);
  }
});
test('navigation gives Goals unique reward targets and Battles an inline campaign',()=>{
  const fs=require('node:fs'),path=require('node:path');const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  for(const id of ['contractsList','contractsReset','cosmeticRewards','rewardInboxStatus','battleHubContent','view-goals'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  assert.match(html,/data-tab="view-goals"/);assert.match(html,/data-tab="view-trials"/);
});
test('replay cannot discard active or unclaimed victories and starts a fresh healed run',()=>{
  const g=game();g.run(`renderBattleLodge=()=>{};state.cells[0]={level:1,count:1};enlistBattleDragon(0);pveSelected=1;pveRun=DragonBattle.create(state.battleRoster[0],'meadow');const original=pveRun;pveReplay('meadow');assert.equal(pveRun,original);pveRun.phase='won';pveReplay('meadow');assert.equal(pveRun,original);settleBattleReward(pveRun);pveReplay('meadow');assert.notEqual(pveRun,original);assert.equal(pveLoading,true);assert.equal(pveRun.player.hp,pveRun.player.maxHp);assert.equal(state.battleRoster[0].training.xp,22);`);
});
test('failed Elder pose loading keeps the original sprite instead of showing a broken image',()=>{
  const g=game();g.run(`renderBattleLodge=()=>{};state.battleClears.thicket=true;state.cells[0]={level:5,count:1,element:'water'};enlistBattleDragon(0);pveSelected=1;let images=[];Image=function(){images.push(this)};startPve('sentinel');images.forEach(image=>image.onerror());assert.ok(pveAssetFailures.has('assets/battle/water-elder-attack-v1.png'));assert.ok(!pveArt(state.battleRoster[0],true).includes('pve-attack-pose'));`);
});
