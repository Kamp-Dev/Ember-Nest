const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {game}=require('./support/game-harness.cjs');

test('wardrobe contains five complete three-slot sets with real transparent artwork',()=>{
  const g=game();
  assert.equal(g.run('WARDROBE_IDS.length'),15);
  for(const rarity of ['uncommon','rare','epic','legendary','mythic']) for(const slot of ['head','torso','legs']) {
    const item=g.run(`STASH_CATALOG['wardrobe_${rarity}_${slot}']`);
    assert.equal(item.rarity,rarity); assert.equal(item.slot,slot);
    assert.equal(item.overlay.length,4); assert.ok(item.overlay.every(Number.isFinite));
    const png=fs.readFileSync(path.resolve(__dirname,'..',item.img));
    assert.equal(png.subarray(1,4).toString(),'PNG'); assert.equal(png[25],6);
  }
});
test('level rewards arrive once, preserve equipment, and persist across reloads',()=>{
  const g=game();
  assert.equal(g.run('Object.keys(state.wardrobeClaims).length'),0);
  g.run('state.level=5;renderKeeperQuarters()');
  assert.equal(g.run('Object.keys(state.wardrobeClaims).length'),3);
  g.run(`useFromStash('wardrobe_uncommon_torso');awardWardrobeMilestones();renderKeeperQuarters();save()`);
  assert.equal(g.run(`state.keeper.equipment.torso`),'clothing_uncommon_torso_v1.png');
  assert.equal(g.run(`state.stash.wardrobe_uncommon_torso || 0`),0);
  const again=game(Object.fromEntries(g.storage));
  again.run(`useFromStash('wardrobe_uncommon_torso');awardWardrobeMilestones()`);
  assert.equal(again.run('state.stash.wardrobe_uncommon_torso'),1);
  assert.equal(again.run('state.keeper.equipment.torso'),null);
});
test('single contract credit is captured before weekly rollover including old saves',()=>{
  const g=game();
  g.run(`state.contracts={week:'2020-1-6',items:[{claimed:true}],completed:false};rollContracts();awardWardrobeMilestones()`);
  assert.equal(g.run('state.wardrobeFirstContract'),true);
  assert.equal(g.run('state.stash.wardrobe_rare_torso'),1);
  g.run('rollContracts();awardWardrobeMilestones();save()');
  assert.equal(game(Object.fromEntries(g.storage)).run('state.stash.wardrobe_rare_torso'),1);
});
test('actual contract claim awards tunic without altering the contract payout',()=>{
  const g=game();
  g.run('rollContracts();state.contracts.items[0].progress=state.contracts.items[0].target');
  const before=g.run('state.coins'), reward=g.run('state.contracts.items[0].reward');
  g.run('claimContract(0,state.contracts.week)');
  assert.equal(g.run('state.coins'),before+reward);
  assert.equal(g.run('state.stash.wardrobe_rare_torso'),1);
});
test('Trial, weekly and mastery clothing require their exact permanent achievements',()=>{
  const g=game();
  g.run(`state.ashTrialCompleted=true;state.completedContractWeeks={'2026-8-3':true};state.masteryClaims={fire:true,water:true,nature:true};awardWardrobeMilestones()`);
  for(const id of ['epic_torso','epic_head','legendary_head','legendary_torso','legendary_legs']) assert.equal(g.run(`state.stash.wardrobe_${id}`),1);
  assert.equal(g.run('state.stash.wardrobe_mythic_torso || 0'),0);
  assert.equal(g.run('state.stash.wardrobe_mythic_legs || 0'),0);
  g.run(`state.masteryClaims.fire_rare=true;state.masteryClaims.water_rare=true;awardWardrobeMilestones()`);
  assert.equal(g.run('state.stash.wardrobe_mythic_torso || 0'),0);
  g.run(`state.masteryClaims.nature_rare=true;state.level=75;state.completedContractWeeks=Object.fromEntries(Array.from({length:8},(_,i)=>['2026-7-'+(i+1),true]));awardWardrobeMilestones()`);
  assert.equal(g.run('Object.keys(state.wardrobeClaims).length'),15);
});
test('every outfit slot toggles, swaps and renders equipped once with no duplicate rewards',()=>{
  const g=game();
  g.run('state.level=75;awardWardrobeMilestones()');
  for(const slot of ['head','torso','legs']) {
    const id='wardrobe_uncommon_'+slot;
    g.run(`useFromStash('${id}');awardWardrobeMilestones()`);
    assert.equal(g.run(`stashInventory('${slot}').filter(x=>x.itemId==='${id}').length`),1);
    assert.equal(g.run(`stashInventory('${slot}').find(x=>x.itemId==='${id}').equipped`),true);
    g.run(`useFromStash('${id}');awardWardrobeMilestones()`);
    assert.equal(g.run(`state.stash['${id}']`),1);
    assert.equal(g.run(`state.keeper.equipment['${slot}']`),null);
  }
  g.run(`useFromStash('wardrobe_uncommon_head');useFromStash('wardrobe_rare_head');awardWardrobeMilestones()`);
  assert.equal(g.run('state.stash.wardrobe_uncommon_head'),1);
  assert.equal(g.run('state.stash.wardrobe_rare_head || 0'),0);
});
test('unearned clothing cannot be equipped and old owned clothing is not regranted',()=>{
  const g=game();
  g.run(`useFromStash('wardrobe_mythic_head')`);
  assert.equal(g.run('state.keeper.equipment.head'),null);
  g.run(`state.stash.wardrobe_rare_head=1;state.wardrobeClaims=[];awardWardrobeMilestones();state.level=75;awardWardrobeMilestones()`);
  assert.equal(g.run('state.stash.wardrobe_rare_head'),1);
});
test('base trousers mask is removed when legwear is unequipped and old tunics keep their fit',()=>{
  const g=game(), el={style:{}};g.nodes.set('fitTest',el);
  g.run(`state.keeper.equipment.legs='clothing_rare_legs_v1.png';fitKeeperLayer(document.getElementById('fitTest'),'body_base.png')`);
  assert.match(el.style.clipPath,/polygon/);
  g.run(`state.keeper.equipment.legs=null;fitKeeperLayer(document.getElementById('fitTest'),'body_base.png')`);
  assert.equal(el.style.clipPath,'none');
  g.run(`fitKeeperLayer(document.getElementById('fitTest'),'torso_tunic.png')`);
  assert.equal(el.style.left,'0%');assert.equal(el.style.width,'100%');
});
test('rarity tiles expose text and pressed state, with bounded effects and reduced motion CSS',()=>{
  const g=game();
  const html=g.run(`stashTileHtml({itemId:'wardrobe_mythic_head',quantity:1,equipped:true})`);
  assert.match(html,/aria-pressed="true"/);assert.match(html,/stash-rarity">mythic/);
  assert.equal((html.match(/class="rarity-mote /g)||[]).length,3);
  const css=fs.readFileSync(path.resolve(__dirname,'../wardrobe.css'),'utf8');
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(css,/animation:none!important/);
});
