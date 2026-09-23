const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./support/game-harness.cjs');

test('Elder reserve conserves traits, stacks, economy and progression across reload',()=>{
 const g=game();g.run(`state.locked.fill(false);state.cells.fill(null);
 state.cells[0]={level:5,count:2,element:'water',shiny:true,customTrait:'kept'};
 const before={coins:state.coins,energy:state.energy,perch:JSON.stringify(state.perch),bank:state.perchBank};
 assert.equal(storeElder(0),true);assert.equal(storeElder(0),false);
 assert.equal(state.elderReserve.length,1);assert.equal(state.cells[0],null);
 assert.equal(state.coins,before.coins);assert.equal(state.energy,before.energy);
 assert.equal(JSON.stringify(state.perch),before.perch);assert.equal(state.perchBank,before.bank);save();`);
 game(Object.fromEntries(g.storage)).run(`assert.equal(state.elderReserve.length,1);
 state.highestDiscovered=0;state.book={};state.rareBook={};assert.equal(highestOwned(),5);
 recoverElementDiscoveries();assert.equal(state.rareElementBook.water[5],true);
 const id=state.elderReserve[0].id;assert.equal(restoreElder(id),true);assert.equal(restoreElder(id),false);
 assert.equal(state.cells[0].count,2);assert.equal(state.cells[0].element,'water');
 assert.equal(state.cells[0].shiny,true);assert.equal(state.cells[0].customTrait,'kept');`);
});

test('full Elder board can free space; blocked returns and Trial actions lose nothing',()=>{
 game().run(`state.locked.fill(false);state.cells=Array.from({length:25},()=>({level:5,count:1}));
 assert.equal(nextProgressionGoal().target,'reserve');assert.equal(storeElder(0),true);
 const id=state.elderReserve[0].id;state.cells[0]={level:0,count:1};
 assert.equal(restoreElder(id),false);assert.equal(state.elderReserve.length,1);
 state.mode='stage';assert.equal(storeElder(1),false);assert.equal(restoreElder(id),false);
 assert.equal(nextProgressionGoal(),null);state.mode='home';state.cells[0]=null;
 assert.equal(restoreElder(id),true);assert.equal(state.elderReserve.length,0);
 assert.equal(state.cells.filter(d=>d?.level===5).length,25);
 assert.equal(storeElder(-1),false);assert.equal(storeElder(25),false);`);
});

test('reserve handles legacy saves and repairs duplicate entry IDs without losing Elders',()=>{
 game({'ember-nest-save':JSON.stringify({elderReserve:[{id:1,dragon:{level:5,count:1}},{id:1,dragon:{level:5,count:1,element:'fire'}}]})})
 .run(`assert.equal(state.elderReserve.length,2);assert.notEqual(state.elderReserve[0].id,state.elderReserve[1].id);
 assert.equal(state.elderReserveNextId,3);`);
 game({'ember-nest-save':JSON.stringify({coins:10})}).run('assert.equal(state.elderReserve.length,0)');
});

test('next goals prioritize waiting rewards and progress beyond completed decor',()=>{
 game().run(`state.cells.fill(null);state.rewardInbox=[{level:0,quantity:2}];
 assert.equal(nextProgressionGoal().target,'inbox');state.rewardInbox=[];
 state.contracts.items.forEach(item=>item.claimed=true);
 state.highestDiscovered=5;DECOR.forEach(d=>state.decor[d.id]=true);
 assert.equal(nextProgressionGoal().target,'collection');state.sanctuaryRank=10;
 assert.equal(nextProgressionGoal().target,'mastery');
 Object.keys(MASTERY_REWARDS).forEach(id=>state.masteryClaims[id]=true);
 assert.equal(nextProgressionGoal().target,'collection');`);
});

test('full-board chest rewards persist and deliver once as space becomes available',()=>{
 const g=game();
 g.run(`state.level=25;state.locked.fill(false);state.cells=Array.from({length:25},()=>({level:5,count:1}));
 const box=document.getElementById('chestBox');box.dataset.level='25';revealChest();
 assert.equal(rewardInboxCount(),12);assert.equal(state.claimedChests[25],true);
 const coins=state.coins;box.disabled=false;revealChest();assert.equal(state.coins,coins);assert.equal(rewardInboxCount(),12);save();`);
 const reload=game(Object.fromEntries(g.storage));
 reload.run(`assert.equal(rewardInboxCount(),12);state.cells[0]=null;collectRewardInbox();
 assert.equal(rewardInboxCount(),11);assert.equal(state.cells[0].level,0);
 state.mode='stage';assert.equal(deliverRewardInbox(),0);assert.equal(rewardInboxCount(),11);
 state.mode='home';state.cells.fill(null);collectRewardInbox();assert.equal(rewardInboxCount(),0);
 assert.equal(state.cells.filter(Boolean).length,11);const count=state.cells.filter(Boolean).length;
 collectRewardInbox();assert.equal(state.cells.filter(Boolean).length,count);save();`);
 game(Object.fromEntries(reload.storage)).run('assert.equal(rewardInboxCount(),0)');
});
test('partial chest delivery and full-board Trial gifts conserve all rewards',()=>{
 const g=game();
 g.run(`state.level=5;state.cells=Array.from({length:25},(_,i)=>i<18?{level:0,count:1}:null);
 const box=document.getElementById('chestBox');box.dataset.level='5';revealChest();
 assert.equal(rewardInboxCount(),2);assert.equal(state.cells.filter(Boolean).length,20);
 state.ashTrialCompleted=true;state.mode='stage';winStage();
 assert.equal(rewardInboxCount(),4);assert.equal(state.mode,'home');save();`);
 game(Object.fromEntries(g.storage)).run('assert.equal(rewardInboxCount(),4)');
});
test('new saves protect decor while existing purchase preferences stay unchanged',()=>{
 const fresh=game();fresh.run('assert.equal(state.saveForDecor,true);save()');
 game(Object.fromEntries(fresh.storage)).run('assert.equal(state.saveForDecor,true)');
 game({'ember-nest-save':JSON.stringify({coins:700,book:{0:true,1:true}})}).run(`assert.equal(state.saveForDecor,false);buyEgg();assert.equal(state.coins,450)`);
 fresh.run(`state.coins=700;state.book[1]=true;buyEgg();assert.equal(state.coins,700);
 toggleDecorSavings();buyEgg();assert.equal(state.coins,450);`);
});
test('new weekly sets use five distinct activities across progression stages',()=>{
 for(let tier=0;tier<=5;tier++)for(const trial of [false,true]){
  game().run(`state.highestDiscovered=${tier};state.ashTrialCompleted=${trial};state.contracts=null;rollContracts();
  assert.equal(state.contracts.version,2);assert.equal(new Set(state.contracts.items.map(c=>c.kind)).size,5);
  assert.ok(state.contracts.items.every(c=>c.target>0&&c.reward>0));
  assert.ok(new Set(state.contracts.items.map(c=>c.reward)).size>1);`);
 }
});
test('current legacy weekly progress and rewards survive reload without forced migration',()=>{
 const g=game();g.run(`state.contracts.version=1;state.contracts.items[2]={kind:'gather',target:80,progress:37,reward:200,claimed:false};
 state.contracts.replaced=true;save();`);
 const r=game(Object.fromEntries(g.storage));
 r.run(`assert.equal(state.contracts.version,1);assert.equal(state.contracts.items[2].progress,37);
 assert.equal(state.contracts.items[2].reward,200);assert.equal(state.contracts.replaced,true);`);
 r.advance(7*24*3600000);r.run('rollContracts();assert.equal(state.contracts.version,2)');
});
test('Roost contract counts collected coins once, not balance or chest payouts',()=>{
 game().run(`state.perchBank=99;document.getElementById('dragonBank').click();
 assert.equal(state.contracts.items[2].progress,99);document.getElementById('dragonBank').click();
 assert.equal(state.contracts.items[2].progress,99);
 state.level=5;document.getElementById('chestBox').dataset.level='5';revealChest();
 assert.equal(state.contracts.items[2].progress,99);
 state.mode='stage';state.perchBank=50;document.getElementById('dragonBank').click();
 assert.equal(state.contracts.items[2].progress,99);`);
});
test('nurture and merge-income tasks count promotions only in Home',()=>{
 game().run(`state.cells[0]={level:0,count:3};state.cells[1]={level:0,count:1};mergeInto(0,1);
 assert.equal(state.contracts.items[3].progress,0);assert.equal(state.contracts.items[4].progress,0);
 state.cells[0]={level:0,count:1};mergeInto(0,1);
 assert.equal(state.contracts.items[3].progress,1);assert.equal(state.contracts.items[4].progress,125);
 state.mode='stage';state.stageCells[0]={level:0,count:3};state.stageCells[1]={level:0,count:2};
 mergeInto(0,1);assert.equal(state.contracts.items[3].progress,1);
 assert.equal(state.contracts.items[4].progress,125);`);
});
test('Sanctuary projects gate spending, preserve income, unlock permanent titles and cap at ten',()=>{
 const g=game();
 g.run(`state.coins=3000000;contributeSanctuary();assert.equal(state.coins,3000000);
 state.highestDiscovered=5;state.decor=Object.fromEntries(DECOR.map(d=>[d.id,true]));
 const before=bonus();const rate=perchIncome();state.mode='stage';contributeSanctuary();assert.equal(sanctuaryProjectRank(),0);
 state.mode='home';state.coins=49999;contributeSanctuary();assert.equal(sanctuaryProjectRank(),0);
 state.coins=3000000;for(let i=0;i<10;i++)contributeSanctuary();
 assert.equal(sanctuaryProjectRank(),10);assert.equal(state.coins,250000);
 contributeSanctuary();assert.equal(state.coins,250000);assert.equal(bonus(),before);assert.equal(perchIncome(),rate);
 claimCollection('benefactor_title');assert.equal(state.collectionOwned.benefactor_title,true);
 equipCollection('benefactor_title');assert.equal(state.keeper.collectionTitle,'benefactor_title');save();`);
 game(Object.fromEntries(g.storage)).run(`assert.equal(sanctuaryProjectRank(),10);assert.equal(state.collectionOwned.benefactor_title,true)`);
});
