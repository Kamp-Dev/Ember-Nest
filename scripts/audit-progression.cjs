// Read-only diagnostics: production functions, isolated in-memory saves.
const {game}=require('../tests/support/game-harness.cjs');
const g=game();
g.run(`render=()=>{};showOverflow=()=>{};state.level=25;state.coins=0;
state.cells=Array.from({length:25},()=>({level:5,count:1,element:'fire'}));state.locked.fill(false);`);
const box=g.nodes.get('chestBox');box.dataset.level='25';box.disabled=false;
g.run('revealChest()');
console.log('Full-board level-25 chest:',g.run('JSON.stringify({coins:state.coins,claimed:state.claimedChests[25],dragons:state.cells.reduce((n,c)=>n+c.count,0),savedRewards:rewardInboxCount()})'));
const w=game();
console.log('Weekly target snapshots:',w.run(`JSON.stringify([0,3,5].map(tier=>{
 state.cells.fill(null);state.book={0:true};state.highestDiscovered=tier;state.hearthDone=false;
 state.contracts=null;state.ashTrialCompleted=true;rollContracts();
 return {tier,items:state.contracts.items};
}))`));
const p=game();
console.log('Economy constants:',p.run(`JSON.stringify({
energySeconds:REGEN_MS/1000,energyCap:MAX_ENERGY,lateCap:30,
decorCost:DECOR.reduce((n,d)=>n+d.cost,0),
shinyElderMatchedPerMinute:getPerchYield({level:5,shiny:true,element:'fire'},0).total,
lateShopMaxPrice:250+2*150+10*25
})`));
const terminal=game();
console.log('Terminal Elder board:',terminal.run(`
 state.level=50;state.highestDiscovered=5;
 state.decor=Object.fromEntries(DECOR.map(d=>[d.id,true]));
 state.cells=Array.from({length:25},()=>({level:5,count:1,element:'fire'}));
 state.locked.fill(false);state.perch=Array.from({length:3},()=>({level:5,count:1,element:'fire'}));
 state.coins=100000;state.contracts=null;rollContracts();
 const energyBefore=state.energy;gather();buyEgg();triggerAutoMerge();
 JSON.stringify({open:emptyOpen().length,elders:state.cells.filter(c=>c?.level===5).length,
 energyBefore,energyAfter:state.energy,donationTier:state.contracts.items.find(c=>c.kind==='donate')?.want})
`));
