const {test}=require('node:test');
const {game}=require('./support/game-harness.cjs');
function expeditionGame(){const g=game();g.run(`state.highestDiscovered=5;state.coins=2000000;DECOR.forEach(d=>state.decor[d.id]=true);`);return g;}
test('expeditions confirm once, charge fixed cost and preserve dragons and income',()=>{
 const g=expeditionGame();g.run(`const before=JSON.stringify(state.cells),income=perchIncome();
 previewExpedition('fire','survey');assert.equal(state.coins,2000000);cancelExpeditionPreview();assert.equal(confirmExpedition(),false);
 previewExpedition('fire','survey');assert.equal(confirmExpedition(),true);assert.equal(confirmExpedition(),false);
 assert.equal(state.coins,1700000);assert.equal(JSON.stringify(state.cells),before);assert.equal(perchIncome(),income);
 assert.equal(claimExpedition(state.expedition.id),false);save();`);
 const r=game(Object.fromEntries(g.storage));r.advance(30*24*3600000);
 r.run(`const id=state.expedition.id;assert.equal(expeditionReady(),true);assert.equal(nextProgressionGoal().target,'expedition');
 assert.equal(claimExpedition(id),true);assert.equal(claimExpedition(id),false);assert.equal(expeditionStamps('fire'),3);assert.equal(state.coins,1700000);`);
});
test('expeditions gate early progression, bad IDs, insufficient funds and Trials',()=>{
 game().run(`previewExpedition('fire','scout');assert.equal(confirmExpedition(),false);`);
 expeditionGame().run(`previewExpedition('__proto__','survey');assert.equal(confirmExpedition(),false);
 previewExpedition('fire','nope');assert.equal(confirmExpedition(),false);
 state.coins=10;previewExpedition('fire','survey');assert.equal(confirmExpedition(),false);
 state.coins=1000000;state.mode='stage';assert.equal(confirmExpedition(),false);state.mode='home';
 assert.equal(confirmExpedition(),true);const id=state.expedition.id;state.expedition.readyAt=Date.now();state.mode='stage';
 assert.equal(claimExpedition(id),false);assert.equal(expeditionStamps('fire'),0);`);
});
test('failed expedition saves roll back fees and claims without destroying the trip',()=>{
 expeditionGame().run(`const write=localStorage.setItem;localStorage.setItem=()=>{throw new Error('quota')};
 previewExpedition('water','voyage');assert.equal(confirmExpedition(),false);assert.equal(state.coins,2000000);assert.equal(state.expedition,undefined);
 localStorage.setItem=write;assert.equal(confirmExpedition(),true);state.expedition.readyAt=Date.now();const id=state.expedition.id;
 localStorage.setItem=()=>{throw new Error('quota')};assert.equal(claimExpedition(id),false);assert.equal(expeditionStamps('water'),0);assert.equal(state.expedition.id,id);
 localStorage.setItem=write;assert.equal(claimExpedition(id),true);assert.equal(expeditionStamps('water'),6);`);
});
test('expedition title gates are route-specific, free and permanent',()=>{
 expeditionGame().run(`state.expeditionJournal={fire:12,water:11};claimCollection('tide_explorer');assert.equal(state.collectionOwned?.tide_explorer,undefined);
 const coins=state.coins;claimCollection('ember_explorer');assert.equal(state.collectionOwned.ember_explorer,true);assert.equal(state.coins,coins);
 assert.equal(expeditionStamps('fire'),12);equipCollection('ember_explorer');assert.equal(state.keeper.collectionTitle,'ember_explorer');`);
});
test('unreadable save is not overwritten by boot or later autosaves',()=>{
 const g=game({'ember-nest-save':'{broken'});g.run('assert.equal(saveBlocked,true);assert.equal(save(),false)');
 if(g.storage.get('ember-nest-save')!=='{broken')throw new Error('Corrupt save overwritten');
});
test('storage failure is visible and a later successful save clears the warning',()=>{
 const g=game();g.nodes.set('saveWarning',{hidden:true,textContent:''});
 g.run(`const writer=localStorage.setItem;localStorage.setItem=()=>{throw new Error('quota')};assert.equal(save(),false);
 assert.equal(document.getElementById('saveWarning').hidden,false);localStorage.setItem=writer;assert.equal(save(),true);assert.equal(document.getElementById('saveWarning').hidden,true);`);
});
test('occupied Roost picker cannot erase an existing dragon',()=>{
 game().run(`state.cells[0]={level:5,count:1,element:'water'};state.perch[0]={level:3,count:1,element:'fire'};roostTargetSlot=0;
 selectDragonForRoost(0);assert.equal(state.cells[0].element,'water');assert.equal(state.perch[0].element,'fire');`);
});
test('hidden and reduced-motion particles do not create DOM work',()=>{
 game().run(`document.hidden=true;spawnParticles(0,0,100);spawnFloatingText(0,0,'test');assert.equal(activeParticleCount,0);
 document.hidden=false;window.matchMedia=()=>({matches:true});spawnParticles(0,0,100);assert.equal(activeParticleCount,0);`);
});
test('particle bursts stay within a fixed live-node budget',()=>{
 game().run(`let nodes=0;document.createElement=()=>({style:{},remove(){}});document.body.appendChild=()=>nodes++;
 spawnParticles(0,0,100);spawnParticles(0,0,100);spawnParticles(0,0,100);assert.equal(nodes,48);assert.equal(activeParticleCount,48);`);
});
test('unchanged expedition markup does not rebuild controls after DOM normalization',()=>{
 const g=expeditionGame();let writes=0;const node={};
 Object.defineProperty(node,'innerHTML',{get(){return 'browser-normalized markup'},set(){writes++}});
 g.nodes.set('expeditionContent',node);g.run('renderExpeditions();renderExpeditions();renderExpeditions()');
 if(writes!==1)throw new Error('Unchanged buttons were rebuilt');
});
