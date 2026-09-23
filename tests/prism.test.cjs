const {test}=require('node:test');
const {game}=require('./support/game-harness.cjs');
function fixture(){
 const g=game();g.nodes.set('wardrobeDialog',{innerHTML:'',hidden:true});
 g.run(`state.stash.element_prism=2;state.cells[0]={level:3,count:4,element:'fire',shiny:true,custom:'kept'};
 state.rareElementBook={water:{3:true}};state.elementBook={water:{3:true}};`);
 return g;
}
test('Prism requires preview, preserves all traits and spends exactly once',()=>{
 const g=fixture();g.run(`assert.equal(confirmElementPrism(),false);
 const coins=state.coins,energy=state.energy,xp=state.xp,discoveries=JSON.stringify(state.rareElementBook);
 previewElementPrism(0,'water');assert.equal(state.cells[0].element,'fire');
 assert.equal(confirmElementPrism(),true);assert.equal(confirmElementPrism(),false);
 assert.equal(state.stash.element_prism,1);assert.equal(state.cells[0].count,4);
 assert.equal(state.cells[0].shiny,true);assert.equal(state.cells[0].custom,'kept');assert.equal(state.cells[0].element,'water');
 assert.equal(state.coins,coins);assert.equal(state.energy,energy);assert.equal(state.xp,xp);
 assert.equal(JSON.stringify(state.rareElementBook),discoveries);save();`);
 game(Object.fromEntries(g.storage)).run(`assert.equal(state.stash.element_prism,1);assert.equal(state.cells[0].element,'water');assert.equal(state.cells[0].count,4);`);
});
test('cancel and stale previews never spend a Prism',()=>{
 const g=fixture();g.run(`previewElementPrism(0,'water');closeWardrobeDialog();assert.equal(confirmElementPrism(),false);
 previewElementPrism(0,'water');state.cells[0]={...state.cells[0]};assert.equal(confirmElementPrism(),false);
 previewElementPrism(0,'water');state.cells[0].count=3;assert.equal(confirmElementPrism(),false);
 assert.equal(state.stash.element_prism,2);assert.equal(state.cells[0].element,'fire');`);
});
test('Prism blocks Trials, locked cells, unknown targets, shiny shortcuts and low stages',()=>{
 fixture().run(`state.rareElementBook={};assert.equal(prismTargets(state.cells[0]).length,0);
 previewElementPrism(0,'water');assert.equal(confirmElementPrism(),false);
 state.rareElementBook={water:{3:true}};state.mode='stage';previewElementPrism(0,'water');assert.equal(confirmElementPrism(),false);
 state.mode='home';state.locked[0]=true;previewElementPrism(0,'water');assert.equal(confirmElementPrism(),false);
 state.locked[0]=false;previewElementPrism(0,'nature');assert.equal(confirmElementPrism(),false);
 previewElementPrism(0,'__proto__');assert.equal(confirmElementPrism(),false);
 state.cells[0].level=1;assert.equal(prismTargets(state.cells[0]).length,0);
 assert.equal(state.stash.element_prism,2);`);
});
test('intro and weekly awards persist, never duplicate, and survive rollover',()=>{
 const g=game();g.run(`state.level=10;awardElementPrisms();awardElementPrisms();assert.equal(state.stash.element_prism,1);
 state.contracts.items.forEach(c=>c.claimed=true);state.contracts.completed=true;ensureBonusContracts();
 contractEvent('gather',10000);assert.equal(state.stash.element_prism,1);
 contractEvent('merge',10000);assert.equal(state.stash.element_prism,2);awardElementPrisms();assert.equal(state.stash.element_prism,2);save();`);
 const r=game(Object.fromEntries(g.storage));r.run(`awardElementPrisms();assert.equal(state.stash.element_prism,2);`);
 r.advance(8*86400000);r.run(`rollContracts();assert.equal(state.stash.element_prism,2);assert.equal(state.contracts.prismClaimed,undefined);`);
});
test('Prism works on a full board without allocating or consuming dragons',()=>{
 fixture().run(`state.locked.fill(false);for(let i=1;i<25;i++)state.cells[i]={level:5,count:1,element:'fire'};
 previewElementPrism(0,'water');assert.equal(confirmElementPrism(),true);
 assert.equal(state.cells.filter(Boolean).length,25);assert.equal(emptyOpen().length,0);`);
});
