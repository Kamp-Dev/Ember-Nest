const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {game}=require('./support/game-harness.cjs');

test('rarity materials graduate from static surfaces to layered motion',()=>{
  const css=fs.readFileSync(path.resolve(__dirname,'../wardrobe.css'),'utf8');
  assert.ok(css.includes('.rarity-rare::before { content:none!important; animation:none!important; }'));
  for (const [tier,material] of [['common','pearl'],['uncommon','jade'],['rare','glass'],['epic','amethyst']]) {
    const asset = 'rarity-'+tier+'-'+material+'-v1.png';
    assert.ok(fs.existsSync(path.resolve(__dirname,'../assets/theme',asset)));
    assert.ok(css.includes("url('assets/theme/"+asset+"') center/cover; mask-image:none; border-radius:0; opacity:1;"));
  }
  assert.ok(css.includes('.rarity-common::after { animation:none!important; }'));
  assert.ok(css.includes('.rarity-rare::after { animation:glass-drift 18s'));
  assert.ok(css.includes('.rarity-epic::after { animation:amethyst-flow 13s'));
  for (const [tier,asset,motion] of [['legendary','rarity-legendary-flow-v1.png','gold-flow'],['mythic','rarity-mythic-energy-orange-v2.png','energy-drift']]) {
    assert.ok(fs.existsSync(path.resolve(__dirname,'../assets/theme',asset)));
    assert.ok(css.includes(`url('assets/theme/${asset}') center/cover; mask-image:none; border-radius:0; opacity:1;`));
    assert.ok(css.includes(`.rarity-${tier}::after { animation:${motion}`));
  }
});

test('active rarity accents match the supplied chart; future tiers remain unissued',()=>{
  const css=fs.readFileSync(path.resolve(__dirname,'../wardrobe.css'),'utf8');
  for(const [tier,color] of Object.entries({common:'#FDFEFE',uncommon:'#27AE60',rare:'#2471A3',epic:'#7D3C98',legendary:'#F1C40F',mythic:'#D35400'})) {
    assert.ok(css.includes(`.rarity-${tier} { --rarity:${color};`));
  }
  const g=game(); assert.equal(g.run("Object.values(STASH_CATALOG).some(item=>['relic','masterwork','eternal'].includes(item.rarity))"),false);
});

test('Uncommon stays static and dark Legendary tiles have an opaque gold foundation',()=>{
  const css=fs.readFileSync(path.resolve(__dirname,'../wardrobe.css'),'utf8');
  assert.ok(css.includes('.rarity-uncommon::before { content:none!important; animation:none!important; }'));
  assert.ok(css.includes('.rarity-uncommon::after { animation:none!important; }'));
  assert.ok(css.includes('#93642c 0%,#67451e 55%,#382b1c 100%'));
});

test('rarity layers use soft masks instead of a rotating Mythic inset rectangle',()=>{
  const css=fs.readFileSync(path.resolve(__dirname,'../wardrobe.css'),'utf8');
  assert.ok(css.includes('mask-image:radial-gradient(ellipse,#000 20%'));
  assert.ok(!css.includes('border:1px solid #86ddca'));
  assert.ok(css.includes('--fx-strength:.48'));
  assert.ok(css.includes('--fx-strength:.72'));
  assert.ok(css.includes('@keyframes mythic-tide'));
});

test('tile motion is independently toggleable and its preference survives reload',()=>{
  let g=game(); assert.equal(g.run('document.documentElement.dataset.tileMotion'),'on');
  g.run("setTileMotion('off')");
  assert.equal(g.storage.get('ember-nest-tile-motion'),'off');
  g=game(Object.fromEntries(g.storage)); assert.equal(g.run('document.documentElement.dataset.tileMotion'),'off');
  g.run("setTileMotion('on')"); assert.equal(g.run('document.documentElement.dataset.tileMotion'),'on');
});

test('Clothing and Frames tabs remain separate and each rarity has a background animation',()=>{
  const g=game(); g.run("state.level=10;awardWardrobeMilestones();state.stash.border_ember=1;state.stash.rare_egg=2;setStashBrowse('filter','clothing')");
  assert.ok(g.run("browsedStash().length>0 && browsedStash().every(x=>['head','torso','legs'].includes(STASH_CATALOG[x.itemId].slot))"));
  g.run("setStashBrowse('filter','border')"); assert.equal(g.run('browsedStash()[0].itemId'),'border_ember');
  assert.equal(g.run('browsedStash().length'),1);
  const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
  assert.match(html,/popovertarget="keeperSettings"/);
  assert.ok(html.indexOf('id="bookBtn"')<html.indexOf('class="stat-pill coin-pill"'));
  const css=fs.readFileSync(path.resolve(__dirname,'../wardrobe.css'),'utf8');
  for(const name of ['breathe','leaves','ripple','nebula','sun','aurora']) assert.ok(css.includes('@keyframes rarity-'+name));
  assert.match(css,/prefers-reduced-motion:reduce\) \{ body.storybook .stash-slot.filled::after \{ animation:none!important/);
});

test('equipped borders target the header portrait and clear on unequip',()=>{
  const g=game(); const border={style:{}}; g.nodes.set('dk-border',border);
  g.run("state.stash.border_ember=1;useFromStash('border_ember');renderDragonKingPortrait()");
  assert.equal(border.src,'assets/avatar/border_ember_v1.png'); assert.equal(border.style.display,'block');
  g.run("useFromStash('border_ember');renderDragonKingPortrait()"); assert.equal(border.style.display,'none');
  const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
  assert.ok(html.indexOf('id="dk-border"')<html.indexOf('</header>'));
  assert.equal((html.match(/id="dk-border"/g)||[]).length,1);
});

test('header portrait follows equipment and keeps absent clothing hidden',()=>{
  const g=game(); const head={style:{},hidden:true}; g.nodes.set('header-head',head);
  g.run("state.level=2;awardWardrobeMilestones();useFromStash('wardrobe_uncommon_head');renderHeaderPortrait()");
  assert.equal(head.hidden,false);
  assert.equal(head.src,'assets/avatar/clothing_uncommon_head_worn_v2.png');
  g.run("useFromStash('wardrobe_uncommon_head');renderHeaderPortrait()"); assert.equal(head.hidden,true);
});

test('item inspection is default and replacement compares the current item without changing it',()=>{
  const g=game(); const modal={hidden:true,innerHTML:''}; g.nodes.set('wardrobeDialog',modal);
  g.run("state.level=10;awardWardrobeMilestones();useFromStash('wardrobe_uncommon_head');activateStashItem('wardrobe_rare_head')");
  assert.equal(g.run('stashInspect'),true);
  assert.match(modal.innerHTML,/Currently equipped · uncommon/);
  assert.match(modal.innerHTML,/>Replace</);
  assert.equal(g.run('state.keeper.equipment.head'),'clothing_uncommon_head_v1.png');
  g.run('useInspectedItem()');
  assert.equal(g.run('state.keeper.equipment.head'),'clothing_rare_head_v1.png');
  assert.equal(g.run('state.stash.wardrobe_uncommon_head'),1);
});

test('Home equipment cards expose only three clothing slots and inventory rows cannot collapse',()=>{
  const g=game(); const panel={innerHTML:''}; g.nodes.set('keeperEquipment',panel);
  g.run("state.level=2;awardWardrobeMilestones();useFromStash('wardrobe_uncommon_head');renderKeeperEquipment()");
  assert.equal((panel.innerHTML.match(/class="keeper-gear /g)||[]).length,3);
  assert.ok(!panel.innerHTML.includes('border:'));
  assert.match(panel.innerHTML,/head: Woodland Apprentice Cap, equipped/);
  assert.match(panel.innerHTML,/torso: Empty/);
  const css=fs.readFileSync(path.resolve(__dirname,'../wardrobe.css'),'utf8');
  assert.match(css,/#stash-grid \{ grid-auto-rows:clamp\(64px, 20vw, 104px\)!important/);
  g.run("setStashBrowse('filter','cosmetic')");
  assert.ok(g.run("browsedStash().every(entry=>STASH_CATALOG[entry.itemId].type==='cosmetic')"));
});

test('Home retains inline inventory while Board rows share available height',()=>{
  const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
  const css=fs.readFileSync(path.resolve(__dirname,'../storybook.css'),'utf8');
  assert.ok(!html.includes('homeStashPanel'));
  assert.ok(html.includes('id="stash-grid"'));
  assert.ok(css.includes('grid-template-rows:repeat(5,minmax(0,1fr))'));
  assert.ok(css.includes('#board .cell { aspect-ratio:auto; height:100%!important; }'));
});


test('all saved v1 hat identities resolve to corrected worn art without changing inventory',()=>{
  const g=game();const el={style:{}};g.nodes.set('hatFit',el);
  for(const tier of ['uncommon','rare','epic','legendary','mythic']) {
    g.run(`fitKeeperLayer(document.getElementById('hatFit'),'clothing_${tier}_head_v1.png')`);
    assert.equal(el.src,`assets/avatar/clothing_${tier}_head_worn_v2.png`);
    const png=fs.readFileSync(path.resolve(__dirname,'..',el.src));assert.equal(png[25],6);
  }
});

test('next reward advances, selects highest completion ratio and ends cleanly',()=>{
  const g=game();assert.equal(g.run('nextWardrobeReward().id'),'wardrobe_uncommon_head');
  g.run('state.level=2;awardWardrobeMilestones()');assert.equal(g.run('nextWardrobeReward().id'),'wardrobe_uncommon_torso');
  g.run(`state.level=5;awardWardrobeMilestones();state.completedContractWeeks=Object.fromEntries(Array.from({length:7},(_,i)=>['2026-7-'+(i+1),true]));awardWardrobeMilestones()`);
  assert.equal(g.run('nextWardrobeReward().id'),'wardrobe_mythic_legs');
  g.run('for(const id of WARDROBE_IDS)state.wardrobeClaims[id]=true');
  assert.equal(g.run('nextWardrobeReward()'),null);
});
test('empty consumables are not considered owned through undefined equipment slots',()=>{
  const g=game();assert.equal(g.run("ownsCosmeticReward('rare_egg')"),false);
  g.run('state.stash.rare_egg=1');assert.equal(g.run("ownsCosmeticReward('rare_egg')"),true);
});

test('Stash filters retain equipped items once and rarity sorting is deterministic',()=>{
  const g=game();
  g.run(`state.level=75;awardWardrobeMilestones();useFromStash('wardrobe_uncommon_head');setStashBrowse('filter','head');setStashBrowse('sort','rarity')`);
  assert.equal(g.run('browsedStash()[0].itemId'),'wardrobe_mythic_head');
  assert.equal(g.run(`browsedStash().filter(x=>x.itemId==='wardrobe_uncommon_head').length`),1);
  assert.equal(g.run(`browsedStash().every(x=>STASH_CATALOG[x.itemId].slot==='head')`),true);
  g.run(`setStashBrowse('filter','border')`);assert.equal(g.run('browsedStash().length'),0);
  g.run(`setStashBrowse('filter','invalid')`);assert.equal(g.run('stashFilter'),'border');
});
test('Inspect mode never equips on opening and its action uses existing quantity-safe equipment logic',()=>{
  const g=game();g.nodes.set('wardrobeDialog',{hidden:true,innerHTML:''});
  g.run(`state.level=3;awardWardrobeMilestones();setStashBrowse('inspect','inspect');activateStashItem('wardrobe_uncommon_head')`);
  assert.equal(g.run('state.keeper.equipment.head'),null);
  assert.equal(g.run('wardrobeDialogKind'),'details');
  g.run('useInspectedItem()');assert.equal(g.run('state.keeper.equipment.head'),'clothing_uncommon_head_v1.png');
  g.run(`activateStashItem('wardrobe_uncommon_head');useInspectedItem()`);
  assert.equal(g.run('state.keeper.equipment.head'),null);
  assert.equal(g.run('state.stash.wardrobe_uncommon_head'),1);
});

test('celebrations persist, never regrant, and equip now does not toggle worn rewards off',()=>{
  let g=game(); g.run('state.level=5;awardWardrobeMilestones();save()');
  assert.equal(g.run('pendingWardrobeRewards().length'),3);
  g=game(Object.fromEntries(g.storage));
  g.nodes.set('wardrobeDialog',{hidden:true,innerHTML:''});
  g.run(`useFromStash('wardrobe_uncommon_head');openWardrobeReward();finishWardrobeReward(true)`);
  assert.equal(g.run('state.keeper.equipment.head'),'clothing_uncommon_head_v1.png');
  assert.equal(g.run('pendingWardrobeRewards().length'),2);
  g.run('closeWardrobeDialog();awardWardrobeMilestones()');
  assert.equal(g.run('pendingWardrobeRewards().length'),2);
  g.run('openWardrobeReward();keepAllWardrobeRewards();awardWardrobeMilestones();save()');
  assert.equal(game(Object.fromEntries(g.storage)).run('pendingWardrobeRewards().length'),0);
});

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
test('base trousers mask is removed when legwear is unequipped and old tunics use fitted art',()=>{
  const g=game(), el={style:{}};g.nodes.set('fitTest',el);
  g.run(`state.keeper.equipment.legs='clothing_rare_legs_v1.png';fitKeeperLayer(document.getElementById('fitTest'),'body_base.png')`);
  assert.match(el.style.clipPath,/polygon/);
  g.run(`state.keeper.equipment.legs=null;fitKeeperLayer(document.getElementById('fitTest'),'body_base.png')`);
  assert.equal(el.style.clipPath,'none');
  g.run(`fitKeeperLayer(document.getElementById('fitTest'),'torso_tunic.png')`);
  assert.equal(el.src,'assets/avatar/torso_tunic_worn_v2.png');
  assert.equal(el.style.left,'22.825%');assert.equal(el.style.width,'54.35%');
});
test('all eight tunics have transparent worn art and preserve their saved inventory identities',()=>{
  const g=game(),el={style:{}};g.nodes.set('fitTest',el);
  const items=g.run(`Object.values(STASH_CATALOG).filter(item=>item.slot==='torso')`);
  assert.equal(items.length,8);
  for(const item of items){
    assert.ok(item.wornImg);assert.equal(item.wornOverlay.length,4);
    assert.notEqual(item.img,item.wornImg);
    const png=fs.readFileSync(path.resolve(__dirname,'..',item.wornImg));
    assert.equal(png.readUInt32BE(0),0x89504e47);assert.equal(png[25],6);
    g.run(`state.keeper.equipment.torso=${JSON.stringify(item.img.split('/').pop())};fitKeeperLayer(document.getElementById('fitTest'),state.keeper.equipment.torso)`);
    assert.equal(el.src,item.wornImg);
    assert.equal(el.style.width,item.wornOverlay[2]+'%');
    assert.equal(g.run('state.keeper.equipment.torso'),item.img.split('/').pop());
  }
});
test('shirt and trousers masks toggle independently and restore the base clothing',()=>{
  const g=game(),el={style:{}};g.nodes.set('fitTest',el);
  g.run(`state.keeper.equipment.torso='torso_tunic.png';state.keeper.equipment.legs='clothing_rare_legs_v1.png';fitKeeperLayer(document.getElementById('fitTest'),'body_base.png')`);
  assert.match(el.style.maskImage,/data:image\/svg\+xml/);assert.equal(el.style.maskMode,'luminance');
  assert.match(el.style.clipPath,/polygon/);
  g.run(`state.keeper.equipment.torso=null;fitKeeperLayer(document.getElementById('fitTest'),'body_base.png')`);
  assert.equal(el.style.maskImage,'none');assert.match(el.style.clipPath,/polygon/);
  g.run(`state.keeper.equipment.legs=null;fitKeeperLayer(document.getElementById('fitTest'),'body_base.png')`);
  assert.equal(el.style.clipPath,'none');assert.equal(el.style.maskImage,'none');
});
test('every shirt masks its rear collar in shared body coordinates without affecting other slots',()=>{
  const g=game(),el={style:{}};g.nodes.set('collarTest',el);
  const items=g.run(`Object.values(STASH_CATALOG).filter(item=>item.slot==='torso')`);
  assert.equal(items.length,8);
  for(const item of items){
    g.run(`fitKeeperLayer(document.getElementById('collarTest'),${JSON.stringify(item.img)})`);
    const svg=decodeURIComponent(el.style.maskImage);
    assert.ok(svg.includes(`viewBox="${item.wornOverlay.join(' ')}"`));
    assert.ok(svg.includes('M45.4 50 L54.6 50 L54.6 52.6 Q50 56.4 45.4 52.6 Z'));
    assert.equal(el.style.maskMode,'luminance');
    assert.equal(el.style.maskSize,'100% 100%');
  }
  for(const file of ['clothing_rare_head_v1.png','clothing_rare_legs_v1.png',null]){
    g.run(`fitKeeperLayer(document.getElementById('collarTest'),${JSON.stringify(file)})`);
    assert.equal(el.style.maskImage,'none');
  }
});
test('Home, Mirror and header share fitted shirt geometry and restore the body on unequip',()=>{
  const g=game();
  for(const prefix of ['layer','modal-layer','header'])for(const slot of ['body','torso'])g.nodes.set(`${prefix}-${slot}`,{style:{}});
  g.run(`state.keeper.equipment.torso='clothing_rare_torso_v1.png';renderKeeperQuarters();renderExpandedModalLayers()`);
  for(const prefix of ['layer','modal-layer','header']){
    const shirt=g.nodes.get(`${prefix}-torso`),body=g.nodes.get(`${prefix}-body`);
    assert.equal(shirt.src,'assets/avatar/clothing_rare_torso_worn_v3.png');
    assert.equal(shirt.style.top,'46.449%');
    assert.match(body.style.maskImage,/data:image\/svg\+xml/);
  }
  g.run(`state.keeper.equipment.torso=null;renderKeeperQuarters();renderExpandedModalLayers()`);
  for(const prefix of ['layer','modal-layer','header'])assert.equal(g.nodes.get(`${prefix}-body`).style.maskImage,'none');
  assert.equal(g.nodes.get('header-torso').hidden,true);
  assert.equal(g.nodes.get('layer-torso').style.display,'none');
  assert.equal(g.nodes.get('modal-layer-torso').style.display,'none');
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
