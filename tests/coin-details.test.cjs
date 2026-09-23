const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./support/game-harness.cjs');
test('coin details show exact balance and savings without changing state or storage',()=>{
 const g=game();
 for(const id of ['coinExactBalance','coinSavingsDetails'])g.nodes.set(id,{textContent:''});
 g.run(`state.coins=250123;state.saveForDecor=false`);
 const state=g.run('JSON.stringify(state)'),storage=[...g.storage];
 g.run('renderCoinDetails()');
 assert.equal(g.nodes.get('coinExactBalance').textContent,'250,123 coins');
 assert.match(g.nodes.get('coinSavingsDetails').textContent,/Off/);
 assert.equal(g.run('JSON.stringify(state)'),state);assert.deepEqual([...g.storage],storage);
 g.run(`state.coins=100;state.highestDiscovered=1;state.decor={};state.saveForDecor=true;renderCoinDetails()`);
 assert.match(g.nodes.get('coinSavingsDetails').textContent,/600 coins for Moss bed/);
 assert.match(g.nodes.get('coinSavingsDetails').textContent,/need 500 coins/);
 assert.match(g.nodes.get('coinSavingsDetails').textContent,/does not block other spending/);
 g.run(`DECOR.forEach(d=>state.decor[d.id]=true);renderCoinDetails()`);
 assert.match(g.nodes.get('coinSavingsDetails').textContent,/no eligible/);
});
