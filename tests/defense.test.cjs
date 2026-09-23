const {test}=require('node:test');
const assert=require('node:assert/strict');
const D=require('../defense-core.js');
const {game}=require('./support/game-harness.cjs');
function enemy(overrides={}){return {id:1,kind:'scout',hp:100,maxHp:100,speed:10,distance:20,armor:0,energy:4,leak:1,slow:0,root:0,...overrides};}
function finishWave(s){for(let i=0;i<2000&&s.phase==='wave';i++)D.tick(s,.1);}
test('Defense validates spending, slots, upgrades and full between-wave refunds',()=>{
 const s=D.create();assert.equal(D.startWave(s),false);
 for(const i of [-1,6,NaN,'map'])assert.equal(D.deploy(s,i,'fire'),false);
 assert.equal(D.deploy(s,0,'__proto__'),false);
 assert.equal(D.deploy(s,0,'fire'),true);assert.equal(s.energy,40);
 assert.equal(D.deploy(s,0,'water'),false);assert.equal(D.upgrade(s,0),true);assert.equal(s.energy,15);
 assert.equal(D.upgrade(s,0),false);assert.equal(D.recall(s,0),true);assert.equal(s.energy,60);
 assert.equal(D.recall(s,0),false);assert.equal(D.recall(s,'map'),false);
 D.deploy(s,0,'nature');D.startWave(s);assert.equal(D.recall(s,0),false);
});
test('pause freezes simulation and blocks deployment/upgrades; resume is explicit',()=>{
 const s=D.create();D.deploy(s,0,'fire');D.startWave(s);D.tick(s,.1);D.pause(s);
 const before=JSON.stringify(s);D.tick(s,30);assert.equal(JSON.stringify(s),before);
 assert.equal(D.deploy(s,1,'fire'),false);assert.equal(D.upgrade(s,0),false);
 assert.equal(D.startWave(s),false);D.resume(s);D.tick(s,.1);assert.notEqual(JSON.stringify(s),before);
});
test('Fire splashes, Water slows, Nature roots and provides a nonstacking support bonus',()=>{
 const fire=D.create();D.deploy(fire,0,'fire');fire.phase='wave';fire.queue=['scout'];fire.spawnIn=50;
 fire.enemies=[enemy(),enemy({id:2,distance:25})];D.tick(fire,.1);
 assert.equal(fire.enemies[0].hp,91);assert.equal(fire.enemies[1].hp,91);
 const water=D.create();D.deploy(water,0,'water');water.phase='wave';water.spawnIn=50;water.queue=['scout'];water.enemies=[enemy()];D.tick(water,.1);
 assert.ok(water.enemies[0].slow>0);assert.equal(water.enemies[0].distance,20.55);
 const nature=D.create();D.deploy(nature,0,'nature');nature.phase='wave';nature.spawnIn=50;nature.queue=['scout'];nature.enemies=[enemy()];D.tick(nature,.1);
 assert.ok(nature.enemies[0].root>0);assert.equal(nature.enemies[0].distance,20);
 const supported=D.create();D.deploy(supported,0,'fire');D.deploy(supported,1,'nature');D.deploy(supported,3,'nature');supported.towers[1].cooldown=10;supported.towers[3].cooldown=10;
 supported.phase='wave';supported.spawnIn=50;supported.queue=['scout'];supported.enemies=[enemy()];D.tick(supported,.1);
 assert.equal(supported.enemies[0].hp,88.75);
});
test('boss leakage loses immediately and ended battles cannot farm energy',()=>{
 const s=D.create();s.phase='wave';s.enemies=[enemy({kind:'boss',distance:D.length-.1,leak:12})];
 D.tick(s,.1);assert.equal(s.phase,'lost');assert.equal(s.health,0);
 const frozen=JSON.stringify(s);D.tick(s,.1);assert.equal(JSON.stringify(s),frozen);
 assert.equal(D.deploy(s,0,'fire'),false);assert.equal(D.startWave(s),false);
});
test('mixed squad can win all five production waves with earned energy and investments',()=>{
 const s=D.create();['fire','water','nature'].forEach((r,i)=>D.deploy(s,i,r));
 for(let wave=0;wave<5;wave++){
  if(wave){for(const [i,r]of [[4,'fire'],[5,'water'],[3,'nature']])D.deploy(s,i,r);for(const i of [4,1,2,0,5,3])D.upgrade(s,i);}
  assert.equal(D.startWave(s),true);finishWave(s);
  assert.equal(s.phase,wave===4?'won':'build');assert.ok(s.energy>=0);
 }
 assert.equal(s.kills,29);assert.ok(s.health>0);
 const before=JSON.stringify(s);D.tick(s,.1);assert.equal(JSON.stringify(s),before);
 const retry=D.create();assert.equal(retry.wave,0);assert.equal(retry.energy,60);assert.equal(retry.enemies.length,0);
});
test('without reinvestment, a lone defender cannot clear the campaign',()=>{
 const s=D.create();D.deploy(s,0,'fire');
 for(let i=0;i<5&&s.phase==='build';i++){D.startWave(s);finishWave(s);}
 assert.equal(s.phase,'lost');
});
test('Defense unlock, exit and retry preserve permanent game state and save storage',()=>{
 // Shelved prototype is no longer loaded by the production page.
 const g=game();for(const file of ['defense-core.js','defense.js'])g.run(require('node:fs').readFileSync(require('node:path').join(__dirname,'..',file),'utf8'));
 const dialog={showModal(){this.open=true;},close(){this.open=false;}};g.nodes.set('defenseDialog',dialog);
 g.run('renderDefense=()=>{};openDefense();assert.equal(defenseBattle,null)');
 g.run('state.highestDiscovered=2;state.seenGuide=true;save()');
 const before=g.run('JSON.stringify(state)'),saved=[...g.storage];
 g.run(`openDefense();assert.ok(defenseBattle);defenseAction('deploy');defenseAction('wave');SanctuaryDefense.tick(defenseBattle,.1);defenseAction('pause');assert.equal(defenseBattle.phase,'paused');closeDefense();assert.equal(defenseBattle,null);openDefense();assert.equal(defenseBattle.energy,60);defenseBattle.phase='lost';defenseAction('retry');assert.equal(defenseBattle.phase,'build');closeDefense()`);
 assert.equal(g.run('JSON.stringify(state)'),before);assert.deepEqual([...g.storage],saved);
 g.run(`state.mode='stage';openDefense();assert.equal(defenseBattle,null)`);
});
