// Prints a save-independent visual fixture using the production renderers.
const { game } = require('../tests/support/game-harness.cjs');
const g = game();
for(const id of ['perchRow','roostPerchContainer','bookSpread'])g.nodes.set(id,{innerHTML:'',style:{}});
const boards = [];
for (const count of [1, 4]) {
  const cells = [];
  for (const element of ['fire', 'water', 'nature']) for (let level=1; level<=5; level++) {
    cells.push('<div class="cell">'+g.run(`itemHtml(${JSON.stringify({level,element,count:level===5?1:count})})`)+'</div>');
  }
  boards.push(`<h2>${count===1?'Single dragons':'Stacks'}: Hatchling → Elder</h2><div class="preview-board">${cells.join('')}</div>`);
}
g.run(`state.level=100;state.book={0:true,1:true,2:true,3:true,4:true,5:true};state.perch=[{level:2,count:1,element:'fire'},{level:3,count:1,element:'water'},{level:5,count:1,element:'nature'}];render();renderRoost();currentBookPage=2;renderBook();`);
console.log(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="../"><link rel="stylesheet" href="style.css"><title>Dragon scale QA</title>
<style>html,body{display:block;height:auto;overflow:auto}body{padding:16px;box-sizing:border-box}main{max-width:480px;margin:auto}h1,h2{text-align:center;font-size:16px;margin:20px 0}.preview-board{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:20px 0 36px}.qa-roost{display:grid;gap:12px}.custom-book-bg{width:100%;height:280px}.book-spread{margin:auto}</style></head><body><main><h1>Dragon scale QA</h1>${boards.join('')}<h2>Perches</h2><div class="perchRow">${g.nodes.get('perchRow').innerHTML}</div><h2>Roost</h2><div class="qa-roost">${g.nodes.get('roostPerchContainer').innerHTML}</div><h2>Dragon Book</h2><div class="custom-book-bg"><div class="book-spread">${g.nodes.get('bookSpread').innerHTML}</div></div></main></body></html>`);
