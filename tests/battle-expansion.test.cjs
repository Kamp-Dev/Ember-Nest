const {test}=require('node:test');
const assert=require('node:assert/strict');
const B=require('../battle-core.js');
const {game}=require('./support/game-harness.cjs');
const d=(id=1,element='neutral',rank=4,stage=5)=>({level:stage,count:1,element,training:{id,name:'Dragon '+id,xp:B.threshold(rank),special:'burst'}});
test('roles unlock alternative techniques without replacing safe core actions',()=>{
  for(const el of B.elements){const dragon=d(1,el);for(const technique of B.techniques){dragon.training.technique=technique;const moves=B.moves(dragon);assert.equal(moves.length,4);assert.equal(moves[0].id,'strike');assert.equal(moves[2].id,'guard');assert.ok(B.roles[el]);}}
  const early=d(1,'fire',1);early.training.technique='precision';assert.equal(B.moves(early)[1].pierce,undefined);
});
test('precision bypasses Guard; support has real element-specific effects',()=>{
  const dragon=d(1,'neutral');dragon.training.technique='precision';const b=B.create(dragon,'sentinel');b.round=2;B.resolve(b,'element');const hit=b.events.find(e=>e.actor==='player'&&e.kind==='hit');assert.equal(hit.blocked,false);
  for(const el of B.elements){const fighter=d(1,el);fighter.training.technique='support';const run=B.create(fighter,'sentinel');run.player.hp-=50;run.round=2;B.resolve(run,'element');if(el==='fire')assert.equal(run.player.focus,1);if(el==='nature')assert.ok(run.player.hp>run.player.maxHp-50);if(['water','neutral'].includes(el))assert.equal(run.player.guard,true);}
});
test('switch costs a turn, takes enemy action, preserves each dragon and rejects duplicates',()=>{
  assert.equal(B.create(d(),'sentinel',[d()]),null);const b=B.create(d(),'sentinel',[d(2,'water'),d(3,'nature')]);b.player.stamina=2;b.player.cooldown=3;B.resolve(b,'swap:1');assert.equal(b.activeIndex,1);assert.ok(b.player.hp<b.player.maxHp);assert.equal(b.round,2);assert.equal(b.party[0].player.stamina,2);assert.equal(b.party[0].player.cooldown,2);assert.equal(B.legal(b,'swap:1'),false);B.resolve(b,'swap:0');assert.equal(b.player.stamina,2);
});
test('knockout offers a free living replacement and loss only occurs when team is down',()=>{
  const b=B.create(d(),'sentinel',[d(2,'water')]);b.player.hp=1;b.enemy.speed=999;B.resolve(b,'strike');assert.equal(b.phase,'switch');assert.equal(B.legal(b,'strike'),false);const round=b.round,hp=b.party[1].player.hp;B.resolve(b,'swap:1');assert.equal(b.round,round);assert.equal(b.player.hp,hp);assert.equal(b.phase,'active');b.player.hp=1;b.round=3;B.resolve(b,'strike');assert.equal(b.phase,'lost');
});
test('Rally heals living reserves but never revives defeated dragons',()=>{
  const leader=d();leader.training.special='rally';const b=B.create(leader,'sentinel',[d(2),d(3)]);b.round=2;b.player.hp-=100;b.party[1].player.hp-=80;b.party[2].player.hp=0;const old=b.party[1].player.hp;B.resolve(b,'special');assert.ok(b.party[1].player.hp>old);assert.equal(b.party[2].player.hp,0);assert.equal(b.player.cooldown,3);
});
test('team choices persist and return removes references; XP does not triple',()=>{
  const g=game();g.run(`state.cells[0]={level:5,count:3,element:'water'};enlistBattleDragon(0);enlistBattleDragon(0);enlistBattleDragon(0);assert.equal(toggleBattleReserve(2),true);assert.equal(toggleBattleReserve(3),true);assert.equal(toggleBattleReserve(1),false);let run=DragonBattle.create(state.battleRoster[0],'sentinel',state.battleRoster.slice(1));run.party.forEach(m=>m.participated=true);run.phase='won';assert.equal(settleBattleReward(run),true);assert.equal(run.reward.xp,75);assert.equal(run.reward.coins,220);assert.ok(state.battleRoster.every(d=>d.training.xp===25));assert.equal(returnBattleDragon(2),true);assert.deepEqual(state.battleTeam,[3]);`);
});
test('shared XP applies the stage cap after splitting so final XP can still be earned',()=>{
  const dragon=d(1,'fire',12);dragon.training.xp=B.threshold(12)-1;
  assert.equal(B.reward(dragon,B.encounters.find(e=>e.id==='sentinel'),true,3).xp,1);
});
test('campaign gates advance in order and legacy clears remain replayable',()=>{
  assert.equal(B.unlocked('meadow',{}),true);assert.equal(B.unlocked('brook',{}),false);assert.equal(B.unlocked('brook',{meadow:true}),true);assert.equal(B.unlocked('inferno',{inferno:true}),true);assert.equal(B.unlocked('eclipse',{briar:true}),true);assert.equal(B.regions.length,4);
});
test('boss mechanics expose breakable wards and interruptible charges',()=>{
  const dragon=d(1,'neutral',8);dragon.training.technique='precision';const b=B.create(dragon,'torrent');b.round=3;B.resolve(b,'element');assert.ok(b.events.some(e=>e.message.includes('interrupted')));const wards=B.create(dragon,'briar');B.resolve(wards,'element');assert.equal(wards.enemy.adds,0);const eclipse=B.create(dragon,'eclipse');B.resolve(eclipse,'guard');assert.equal(eclipse.enemy.element,'water');
});
test('thorn wards block secondary status application as well as damage',()=>{
  const b=B.create(d(1,'fire',11),'briar');B.resolve(b,'element');assert.equal(b.enemy.hp,b.enemy.maxHp);assert.equal(b.enemy.burn,0);assert.ok(b.events.some(e=>e.label==='WARD BROKEN'));
});
test('locked builds and malformed expanded save fields are rejected',()=>{
  const g=game();g.run(`state.cells[0]={level:5,count:1,element:'fire'};enlistBattleDragon(0);assert.equal(updateBattleTraining(1,'Ember','rally','element'),false);assert.equal(updateBattleTraining(1,'Ember','burst','support'),false);state.battleRoster[0].training.xp=DragonBattle.threshold(4);assert.equal(updateBattleTraining(1,'Ember','rally','support'),true);assert.ok(validateBattleState(state));const good=JSON.stringify(state);for(const patch of [{battleTeam:[1,1]},{battleTeam:[99]},{battleSupplies:-1},{battleSupplyClaims:{eclipse:true}},{battleTitle:'crown'},{battleWeekly:{start:0,claims:{fake:true}}}])assert.throws(()=>validateBattleState({...JSON.parse(good),...patch}));delete state.battleRoster[0].training.technique;assert.ok(validateBattleState(state));`);
});
test('failed supply and trophy writes preserve inventory, XP and equipped title',()=>{
  const g=game();g.run(`state.cells[0]={level:1,count:1};enlistBattleDragon(0);state.battleClears={meadow:true,brook:true,cinder:true};collectBattleSupplies();const before=JSON.stringify(state);localStorage.setItem=()=>{throw Error('quota')};assert.equal(useBattleSupply(1),false);assert.equal(JSON.stringify(state),before);assert.equal(equipBattleTitle('trail'),false);assert.equal(JSON.stringify(state),before);`);
});
test('replacement selection cannot be discarded through replay or menu',()=>{
  const g=game();g.run(`state.cells[0]={level:5,count:2,element:'fire'};enlistBattleDragon(0);enlistBattleDragon(0);pveRun=DragonBattle.create(state.battleRoster[0],'sentinel',[state.battleRoster[1]]);pveRun.phase='switch';const original=pveRun;pveReplay('sentinel');assert.equal(pveRun,original);battleMenu();assert.equal(pveRun,original);`);
});
test('all team pose assets are preloaded and forced swaps retain displayed round',()=>{
  const g=game();g.run(`renderBattleLodge=()=>{};state.cells[0]={level:5,count:1,element:'fire'};state.cells[1]={level:5,count:1,element:'water'};state.cells[2]={level:5,count:1,element:'nature'};for(let i=0;i<3;i++)enlistBattleDragon(i);state.battleTeam=[2,3];state.battleClears.thicket=true;pveSelected=1;let images=[];Image=function(){images.push(this)};startPve('sentinel');assert.equal(images.length,4);pveLoading=false;pveBusy=false;pveRun.phase='switch';pveRun.round=7;pveMove('swap:1');assert.equal(pveAnimationRound,7);assert.equal(pveRun.round,7);`);
});
test('four campaign bosses can be cleared by a trained three-dragon team',()=>{
  for(const e of B.encounters.filter(e=>e.boss)){
    const team=['fire','water','nature'].map((el,i)=>{const dragon=d(i+1,el,e.rank);dragon.training.technique='precision';return dragon;});
    const b=B.create(team[0],e.id,team.slice(1));
    while(['active','switch'].includes(b.phase)){
      if(b.phase==='switch'){B.resolve(b,'swap:'+b.party.findIndex(m=>m.player.hp>0));continue;}
      const tell=B.intent(b);const move=tell.power>1?'guard':B.legal(b,'special')?'special':B.legal(b,'element')?'element':'strike';B.resolve(b,move);
    }
    assert.equal(b.phase,'won',e.id+' ended '+b.phase+' at '+b.enemy.hp+' HP');
  }
});
test('supplies and cosmetic titles are earned once and survive backup validation',()=>{
  const g=game();g.run(`state.battleClears={meadow:true,brook:true,cinder:true};assert.equal(collectBattleSupplies(),true);assert.equal(state.battleSupplies,3);assert.equal(collectBattleSupplies(),false);assert.equal(equipBattleTitle('trail'),true);assert.equal(activeMasteryTitle(),'Trailblazer');assert.equal(equipBattleTitle('crown'),false);state.cells[0]={level:1,count:1};enlistBattleDragon(0);assert.equal(useBattleSupply(1),true);assert.equal(state.battleRoster[0].training.xp,30);assert.equal(state.battleSupplies,2);assert.ok(validateBackup(JSON.stringify(backupPayload())));`);
});
test('weekly brackets reject overgrown dragons and rotate deterministic modifiers',()=>{
  assert.equal(B.create(d(),'weekly-scout',[],{tier:'scout',rotation:0}),null);assert.equal(B.create(d(),'weekly-invalid',[],{tier:'invalid',rotation:0}),null);
  for(let r=0;r<4;r++){const e=B.weeklyEncounter('scout',r);assert.ok(e.rule);assert.equal(e.coins,0);const run=B.create(d(1,'neutral',3,1),e.id,[],{tier:'scout',rotation:r});assert.ok(run);}
});
test('weekly payouts are capped, reset next week, and cannot repeat by rolling the clock back',()=>{
  const g=game();g.run(`state.cells[0]={level:5,count:1,element:'fire'};enlistBattleDragon(0);const start=battleWeek(new Date(2026,8,23).getTime()).start;function winWeekly(when){const b=DragonBattle.create(state.battleRoster[0],'weekly-elder',[],{tier:'elder',rotation:0});b.phase='won';b.weekStart=when;assert.equal(settleBattleReward(b),true);return b;}const coins=state.coins;winWeekly(start);assert.equal(state.battleSupplies,3);assert.equal(state.contractTokens,1);winWeekly(start);assert.equal(state.battleSupplies,3);winWeekly(start+7*86400000);assert.equal(state.battleSupplies,6);assert.equal(state.contractTokens,2);winWeekly(start);assert.equal(state.battleSupplies,6);assert.equal(state.coins,coins);assert.deepEqual(state.battleClears,{});`);
});
test('weekly reward storage failures roll back claims, supplies, XP and tokens together',()=>{
  const g=game();g.run(`state.cells[0]={level:5,count:1,element:'fire'};enlistBattleDragon(0);const b=DragonBattle.create(state.battleRoster[0],'weekly-elder',[],{tier:'elder',rotation:0});b.phase='won';b.weekStart=battleWeek(new Date(2026,8,23).getTime()).start;const before=JSON.stringify(state);localStorage.setItem=()=>{throw Error('quota')};assert.equal(settleBattleReward(b),false);assert.equal(JSON.stringify(state),before);assert.ok(!b.claimed);`);
});
test('each weekly rotation is beatable within its bracket with an appropriate trained team',()=>{
  for(const tier of Object.keys(B.challengeTiers))for(let rotation=0;rotation<4;rotation++){
    const e=B.weeklyEncounter(tier,rotation),stage=e.stage;
    const outcomes=B.elements.map(element=>{
      const leader=d(1,element,e.rank,stage);leader.training.technique=e.rank>=2?'precision':'element';
      const reserves=tier==='scout'?[]:[d(2,'water',e.rank,stage),d(3,'nature',e.rank,stage)];
      const b=B.create(leader,e.id,reserves,{tier,rotation});
      while(['active','switch'].includes(b.phase)){
        if(b.phase==='switch'){B.resolve(b,'swap:'+b.party.findIndex(m=>m.player.hp>0));continue;}
        const tell=B.intent(b);B.resolve(b,tell.power>1?'guard':B.legal(b,'special')?'special':B.legal(b,'element')?'element':'strike');
      }
      return b.phase;
    });assert.ok(outcomes.includes('won'),tier+' rotation '+rotation+' must be beatable');
  }
});
