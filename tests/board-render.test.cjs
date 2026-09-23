const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./support/game-harness.cjs');
function tile(){
 const classes=new Set();let html='';
 return {dataset:{},writes:0,attributes:{},classList:{add:x=>classes.add(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x),contains:x=>classes.has(x)},
 setAttribute(k,v){this.attributes[k]=v;},get innerHTML(){return html;},set innerHTML(value){html=value;this.writes++;}};
}
test('Board keeps unchanged tiles and sprites across gathers and economy updates',()=>{
 const g=game(),target={children:Array.from({length:25},tile)};
 g.nodes.set('testBoard',target);
 g.run(`state.cells[0]={level:2,count:1,element:'fire'};renderBoardCells(document.getElementById('testBoard'),board())`);
 const original=target.children.slice(),writes=target.children.map(c=>c.writes);
 g.run(`state.coins+=50;renderBoardCells(document.getElementById('testBoard'),board())`);
 assert.deepEqual(target.children.map(c=>c.writes),writes);
 g.run(`state.cells[1]={level:1,count:1};renderBoardCells(document.getElementById('testBoard'),board())`);
 assert.equal(target.children[0],original[0]);assert.equal(target.children[0].writes,writes[0]);
 assert.equal(target.children[1].writes,writes[1]+1);
 g.run(`state.cells[0].element='water';renderBoardCells(document.getElementById('testBoard'),board())`);
 assert.match(target.children[0].innerHTML,/dragon-motion--water/);
 g.run(`state.cells[0]=null;renderBoardCells(document.getElementById('testBoard'),board())`);
 assert.equal(target.children[0].innerHTML,'');
});
test('reused tiles refresh locks, ash, flash and Trial transitions',()=>{
 const g=game(),target={children:Array.from({length:25},tile)};g.nodes.set('testBoard',target);
 g.run(`renderBoardCells(document.getElementById('testBoard'),board())`);
 assert.equal(target.children[24].classList.contains('locked'),true);
 g.run(`state.mode='stage';state.ash[24]=true;state._flash=[0];renderBoardCells(document.getElementById('testBoard'),board())`);
 assert.equal(target.children[24].classList.contains('locked'),false);
 assert.equal(target.children[24].classList.contains('ash'),true);
 assert.equal(target.children[0].classList.contains('flash'),true);
 g.run(`state.mode='home';state._flash=[];renderBoardCells(document.getElementById('testBoard'),board())`);
 assert.equal(target.children[24].classList.contains('ash'),false);
 assert.equal(target.children[24].classList.contains('locked'),true);
 assert.equal(target.children[0].classList.contains('flash'),false);
});
test('perch markup is retained until its visible contents change',()=>{
 const g=game(),node=tile();g.nodes.set('testPerch',node);
 g.run(`renderStableMarkup(document.getElementById('testPerch'),'dragon');renderStableMarkup(document.getElementById('testPerch'),'dragon')`);
 assert.equal(node.writes,1);
 g.run(`renderStableMarkup(document.getElementById('testPerch'),'empty')`);
 assert.equal(node.writes,2);
});
