const {test}=require('node:test');
const {game}=require('./support/game-harness.cjs');

test('weekly target tuning preserves current targets and bonus progress',()=>{
 const g=game();g.run(`state.contracts.items[0].target=999;state.contracts.items[0].progress=45;save();`);
 const r=game(Object.fromEntries(g.storage));
 r.run(`rollContracts();assert.equal(state.contracts.items[0].target,999);assert.equal(state.contracts.items[0].progress,45);`);
 r.advance(8*86400000);r.run(`state.highestDiscovered=5;rollContracts();assert.ok(state.contracts.items[0].target<=150);`);
});

test('collection renders new seal milestones and tracking without missing mastery metadata',()=>{
 const g=game();g.nodes.set('sanctuaryCollection',{innerHTML:''});
 g.run(`renderCollection();assert.ok(document.getElementById('sanctuaryCollection').innerHTML.includes('Lantern Wayfarer'));
 assert.ok(document.getElementById('sanctuaryCollection').innerHTML.includes('Track goal'));`);
});

test('bonus goals start after five claims, cap rewards, and survive reload and rollover',()=>{
 const g=game();
 g.run(`contractEvent('gather',10000);assert.equal(state.contracts.bonus,undefined);
 state.contracts.items.forEach(c=>{c.progress=c.target;c.kind='gather'});
 const week=state.contracts.week;for(let i=0;i<5;i++)claimContract(i,week);
 assert.equal(state.contracts.bonus.length,2);assert.equal(state.contracts.bonus[0].progress,0);
 const tokens=state.contractTokens;contractEvent('gather',10000);contractEvent('merge',10000);
 assert.equal(state.contractTokens,tokens+2);assert.equal(bonusSealCount(),2);
 contractEvent('gather',10000);contractEvent('merge',10000);assert.equal(state.contractTokens,tokens+2);`);
 const r=game(Object.fromEntries(g.storage));
 r.run(`assert.equal(bonusSealCount(),2);assert.ok(state.contracts.bonus.every(c=>c.claimed));`);
 r.advance(8*86400000);r.run(`rollContracts();assert.equal(state.contracts.bonus,undefined);assert.equal(bonusSealCount(),2);`);
});
test('bonus progress rejects invalid events and Trials, and resets without losing seals',()=>{
 const g=game();g.run(`state.contracts.completed=true;state.contracts.items.forEach(c=>c.claimed=true);rollContracts();
 state.mode='stage';contractEvent('gather',100);assert.equal(state.contracts.bonus[0].progress,0);
 state.mode='home';contractEvent('gather',-1);contractEvent('gather',Infinity);assert.equal(state.contracts.bonus[0].progress,0);
 contractEvent('gather',10);assert.equal(state.contracts.bonus[0].progress,10);save();`);
 game(Object.fromEntries(g.storage)).run('assert.equal(state.contracts.bonus[0].progress,10)');
 g.advance(8*86400000);g.run('rollContracts();assert.equal(state.contracts.bonus,undefined);assert.equal(bonusSealCount(),0)');
});
test('seal milestones are permanent non-spending gates, with tracked cosmetic choices',()=>{
 const g=game();g.run(`state.coins=2000000;state.contractTokens=20;
 claimCollection('wayfarer_title');assert.equal(state.collectionOwned?.wayfarer_title,undefined);
 state.bonusSeals=4;trackCollection('wayfarer_title');assert.equal(state.collectionGoal,'wayfarer_title');
 assert.ok(nextProgressionGoal().text.includes('Lantern Wayfarer'));
 const income=perchIncome();claimCollection('wayfarer_title');assert.equal(state.collectionOwned.wayfarer_title,true);
 assert.equal(bonusSealCount(),4);assert.equal(state.coins,1850000);assert.equal(state.contractTokens,18);
 claimCollection('wayfarer_title');assert.equal(state.coins,1850000);assert.equal(perchIncome(),income);
 equipCollection('wayfarer_title');assert.equal(state.keeper.collectionTitle,'wayfarer_title');
 state.mode='stage';trackCollection('chronicler_title');assert.equal(state.collectionGoal,'wayfarer_title');save();`);
 game(Object.fromEntries(g.storage)).run(`assert.equal(bonusSealCount(),4);assert.equal(state.collectionOwned.wayfarer_title,true);`);
});
