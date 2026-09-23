const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {game}=require('./support/game-harness.cjs');

test('dragon motion wraps artwork across stages and elements without moving labels',()=>{
 const g=game();
 for(const element of ['neutral','fire','water','nature'])for(let level=1;level<=5;level++){
  const html=g.run(`dragonSvg(${level},42,3,true,'${element}')`);
  assert.match(html,/class="dragon-motion /);
  assert.match(html,/role="img" aria-label=/);
  assert.match(html,/<image [^>]*width="32" height="32"/);
  assert.equal((html.match(/class="dragon-motion /g)||[]).length,1);
  if(level===5)assert.match(html,/dragon-motion--elder/);
 }
 assert.doesNotMatch(g.run('dragonSvg(0)'),/dragon-motion/);
});

test('dragon motion has drag, offscreen, motion-off and reduced-motion safeguards',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../dragon-motion.css'),'utf8');
 for(const token of ['.ghost .dragon-motion','html[data-tile-motion="off"]','.view:not(.active)','body.page-hidden','prefers-reduced-motion:reduce','pointer-events:none','perspective(180px)']) assert.ok(css.includes(token),token);
 const g=game();
 g.run("setTileMotion('off')");
 assert.equal(g.run('document.documentElement.dataset.tileMotion'),'off');
});

test('explicit motion choices persist and override the device default',()=>{
 const g=game();
 // Exercise startup initialization again with a reduced-motion device.
 g.run(`window.matchMedia=()=>({matches:true});
   initialTileMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'off':'on';
   setTileMotion(initialTileMotion,false);`);
 assert.equal(g.run('document.documentElement.dataset.tileMotion'),'off');
 g.run("setTileMotion('on')");
 assert.equal(g.storage.get('ember-nest-tile-motion'),'on');
 const reloaded=game(Object.fromEntries(g.storage));
 assert.equal(reloaded.run('document.documentElement.dataset.tileMotion'),'on');
 const css=fs.readFileSync(path.join(__dirname,'../dragon-motion.css'),'utf8');
 assert.ok(css.includes('html:not([data-tile-motion="on"])'));
 assert.ok(css.includes('var(--dragon-delay,0s) infinite!important'));
});
