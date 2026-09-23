const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { game } = require('./support/game-harness.cjs');
const root = path.resolve(__dirname, '..');

test('four actual weekly claim cycles unlock the return title without duplicate week credit', () => {
  const g=game();
  for (let week=0;week<4;week++) {
    g.run(`rollContracts();for(const c of state.contracts.items)c.progress=c.target;
      for(let i=0;i<5;i++)claimContract(i,state.contracts.week);
      claimContract(4,state.contracts.week);rememberCompletedWeek();`);
    g.run(`assert.equal(completedWeeksCount(),${week+1})`);
    g.advance(14*24*60*60*1000);
  }
  g.run(`state.coins=50000;claimCollection('steadfast_title');assert.equal(state.collectionOwned.steadfast_title,true);assert.equal(state.coins,0);`);
});
test('collection rejects unaffordable, unknown, unowned and trial actions', () => {
  const g=game();g.run(`state.masteryClaims={fire:true,water:true,nature:true};state.coins=24999;state.contractTokens=10;
    claimCollection('ember_garden');assert.equal(state.coins,24999);assert.equal(state.contractTokens,10);
    state.coins=100000;state.contractTokens=1;claimCollection('ember_garden');assert.equal(state.coins,100000);
    equipCollection('ember_garden');assert.equal(state.sanctuaryStyle,undefined);
    claimCollection('__proto__');equipCollection('missing');assert.equal(state.coins,100000);
    state.mode='stage';state.contractTokens=10;claimCollection('guardian_title');assert.equal(state.coins,100000);`);
});

test('collection unlocks charge once, require mastery and never change income', () => {
  const g=game();g.run(`state.coins=200000;state.contractTokens=10;const originalBonus=bonus();
    claimCollection('ember_garden');assert.equal(state.coins,200000);
    state.masteryClaims.fire=true;claimCollection('ember_garden');assert.equal(state.coins,175000);assert.equal(state.contractTokens,8);
    claimCollection('ember_garden');assert.equal(state.coins,175000);
    equipCollection('ember_garden');assert.equal(state.sanctuaryStyle,'ember_garden');assert.equal(bonus(),originalBonus);
    equipCollection('ember_garden');assert.equal(state.sanctuaryStyle,null);
    state.mode='stage';claimCollection('moon_pool');equipCollection('ember_garden');assert.equal(state.sanctuaryStyle,null);
    state.mode='home';state.masteryClaims.water=true;state.masteryClaims.nature=true;
    claimCollection('guardian_title');equipCollection('guardian_title');assert.equal(activeMasteryTitle(),'Sanctuary Guardian');
    equipMasteryTitle('fire');assert.equal(activeMasteryTitle(),'Fire Keeper');
    equipCollection('guardian_title');save();load();assert.equal(activeMasteryTitle(),'Sanctuary Guardian');
    assert.equal(state.collectionOwned.ember_garden,true);`);
});
test('weekly collection history is idempotent, nonconsecutive and survives reset', () => {
  const g=game();g.run(`state.completedContractWeeks={};state.contracts.completed=true;const firstWeek=state.contracts.week;
    rememberCompletedWeek();rememberCompletedWeek();assert.equal(completedWeeksCount(),1);
    state.contracts.week='2026-9-7';rollContracts();assert.equal(completedWeeksCount(),2);
    state.completedContractWeeks['2026-8-3']=true;state.completedContractWeeks['2026-7-6']=true;
    assert.equal(completedWeeksCount(),4);state.coins=50000;claimCollection('steadfast_title');assert.equal(state.coins,0);
    claimCollection('steadfast_title');assert.equal(state.coins,0);save();load();assert.equal(completedWeeksCount(),4);`);
});
test('Obsidian frame costs coins and tokens after all Main masteries; existing ownership is preserved', () => {
  const g=game();g.run(`state.coins=100000;state.contractTokens=8;redeemCosmetic('border_obsidian');assert.equal(state.coins,100000);
    state.masteryClaims={fire:true,water:true,nature:true};redeemCosmetic('border_obsidian');
    assert.equal(state.coins,25000);assert.equal(state.contractTokens,4);assert.equal(state.stash.border_obsidian,1);
    redeemCosmetic('border_obsidian');assert.equal(state.coins,25000);assert.equal(state.stash.border_obsidian,1);`);
});

test('optional decor savings protects upgrades without changing default shop behavior', () => {
  const g=game();g.run(`state.book={0:true,1:true};state.coins=700;state.saveForDecor=true;
    assert.equal(nextDecorGoal().id,'moss');buyEgg();assert.equal(state.coins,700);
    state.saveForDecor=false;buyEgg();assert.equal(state.coins,450);
    state.saveForDecor=true;save();load();assert.equal(state.saveForDecor,true);
    state.decor=Object.fromEntries(DECOR.map(d=>[d.id,true]));assert.equal(nextDecorGoal(),null);`);
});

test('board feedback explains matching stacks, final Elders and full boards', () => {
  const g=game();g.run(`state.cells=Array(25).fill(null);state.cells[0]={level:2,count:3};state.cells[1]={level:2,count:2};
    assert.match(boardFeedback(0), /ready to grow/);state.cells[1]=null;assert.match(boardFeedback(0), /need 2 more/);
    state.cells[0]={level:5,count:1};assert.match(boardFeedback(0), /final stage/);
    state.cells=Array.from({length:25},()=>({level:5,count:1}));assert.match(boardFeedback(-1), /Board full/);`);
});
test('consolidating a stack never loses a shiny target', () => {
  const g=game();g.run(`state.cells[0]={level:1,count:1,shiny:false};state.cells[1]={level:1,count:1,shiny:true};
    assert.equal(mergeInto(0,1),true);assert.equal(state.cells[1].shiny,true);assert.equal(state.cells[1].count,2);`);
});

test('appearance toggles, persists and stays independent of room and game progression', () => {
  const g = game();
  const button = g.nodes.get('appearanceBtn');
  assert.equal(button.attributes['aria-pressed'], 'false');
  g.run('globalThis.beforeAppearance = JSON.stringify(state)');
  button.click();
  assert.equal(button.attributes['aria-label'], 'Switch to light theme');
  assert.equal(g.storage.get('ember-nest-appearance'), 'dark');
  g.run("assert.equal(document.documentElement.dataset.appearance, 'dark'); assert.equal(JSON.stringify(state), beforeAppearance)");
  const restored = game(Object.fromEntries(g.storage));
  assert.equal(restored.nodes.get('appearanceBtn').attributes['aria-pressed'], 'true');
  restored.nodes.get('appearanceBtn').click();
  assert.equal(restored.storage.get('ember-nest-appearance'), 'light');
  g.run("localStorage.setItem = () => { throw new Error('blocked') }; setAppearance('light'); assert.equal(document.documentElement.dataset.appearance, 'light')");
  assert.equal(game({'ember-nest-appearance':'invalid'}).nodes.get('appearanceBtn').attributes['aria-pressed'], 'false');
});

test('board action dock stays outside its scroller and header tools have their own row', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'storybook.css'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(html, /class="board-playfield"[^>]*tabindex="0"/);
  assert.match(html, /<div id="board"><\/div>\s*<\/div>\s*<!-- ACTION BUTTONS -->/);
  assert.match(html, /class="header-tools"[\s\S]*id="guideBtn"[\s\S]*class="header-right"/);
  for (const id of ['bookBtn', 'muteBtn', 'guideBtn', 'gather', 'buyEgg', 'autoMergeBtn']) {
    assert.equal(html.split(`id="${id}"`).length - 1, 1, `${id} must remain unique`);
  }
  assert.match(css, /\.board-playfield\s*\{[^}]*overflow-y: auto/);
  assert.match(css, /#view-board > \.action-buttons\s*\{[^}]*flex: 0 0 auto/);
  assert.doesNotMatch(app, /window\.addEventListener\("wheel"/);
});

test('Board perches share the board width cap and horizontal centerline', () => {
  const css = fs.readFileSync(path.join(root, 'storybook.css'), 'utf8');
  assert.match(css, /#view-board #perchRow\s*\{[^}]*width:100%;[^}]*max-width:480px!important;[^}]*margin:0 auto 6px!important/);
  assert.match(css, /#board\s*\{[^}]*max-width: 480px !important/);
});

test('header abbreviates large coin balances without rounding up spendable coins', () => {
  const g=game();
  for(const [coins,label] of [[0,'0'],[9999,'9999'],[10000,'10K'],[25999,'25.9K'],[250000,'250K'],[999999,'999K'],[1250000,'1.2M'],[1000000000,'1B']]) {
    assert.equal(g.run(`compactCoinBalance(${coins})`),label);
  }
  const node={setAttribute(name,value){this[name]=value;}};
  g.nodes.set('coinCount',node);
  g.run('state.coins=250123;render()');
  assert.equal(node.title,'250,123 coins');
  assert.equal(node['aria-label'],'250,123 coins');
  assert.equal(g.run('state.coins'),250123);
});

test('Collection explains reward effects and distinguishes ownership from purchase', () => {
  const g=game();
  g.nodes.set('sanctuaryCollection',{innerHTML:''});
  g.run('renderCollection()');
  let html=g.nodes.get('sanctuaryCollection').innerHTML;
  for(const text of ['Blue water ripples','Green canopy shading','Warm ember glows','beneath your Keeper name','no income or power bonus','One-time unlock','Free reward']) assert.ok(html.includes(text),text);
  const before=g.run('JSON.stringify(state.collectionOwned)');
  g.run('renderCollection()');
  assert.equal(g.run('JSON.stringify(state.collectionOwned)'),before);
  g.run('state.collectionOwned={};for(const id of Object.keys(SANCTUARY_COLLECTION))state.collectionOwned[id]=true;renderCollection()');
  html=g.nodes.get('sanctuaryCollection').innerHTML;
  assert.ok(html.includes('Permanently owned · switching or removing is free'));
  assert.ok(!html.includes('One-time unlock'));
  assert.ok(!html.includes('25,000 coins'));
});

test('Sanctuary name icon follows owned equipped styles and clears on removal', () => {
  const g = game();
  const icon = {textContent:'', hidden:true, setAttribute(name,value){this[name]=value;}};
  g.nodes.set('headerSanctuaryIcon', icon);
  for (const [id, symbol, name] of [['moon_pool','💧','Moon Pool'],['grove_canopy','🌿','Grove Canopy'],['ember_garden','🔥','Ember Garden']]) {
    g.run(`state.collectionOwned={${id}:true};state.sanctuaryStyle='${id}';renderCollection()`);
    assert.equal(icon.textContent,symbol);
    assert.equal(icon.hidden,false);
    assert.equal(icon.title,name);
    assert.match(icon['aria-label'],/equipped/);
  }
  g.run(`state.sanctuaryStyle=null;renderCollection()`);
  assert.equal(icon.hidden,true);assert.equal(icon.textContent,'');
  g.run(`state.sanctuaryStyle='moon_pool';state.collectionOwned={};renderCollection()`);
  assert.equal(icon.hidden,true);
});

test('Nest highlights only the active room, not the newest unlocked room', () => {
  const g = game();
  g.nodes.set('mountain', { innerHTML: '' });
  for (const theme of ['hatchery', 'alcove']) {
    g.run(`state.decor.moss=true;state.theme=${JSON.stringify(theme)};render()`);
    const html = g.nodes.get('mountain').innerHTML;
    const highlighted = [...html.matchAll(/class="room ([^"]*)" data-room="([^"]*)"/g)]
      .filter(match => match[1].split(/\s+/).includes('now'));
    assert.deepEqual(highlighted.map(match => match[2]), [theme]);
    assert.equal((html.match(/>Active<\/span>/g) || []).length, 1);
    assert.equal((html.match(/>Ready<\/span>/g) || []).length, 1);
  }
});

test('Beginnings ends at Hatchling while legacy tier discoveries remain intact', () => {
  const g=game();g.run(`state.book={0:true,1:true,2:true,3:true,4:true,5:true};currentBookElement='fire';currentBookPage=5;switchBookElement('growth');assert.equal(currentBookPage,1);assert.equal(state.book[5],true);`);
  assert.equal(g.nodes.get('nextPageBtn').disabled,true);
  g.nodes.get('nextPageBtn').click();
  g.run(`assert.equal(currentBookPage,1);assert.equal(bookChapterCount(),2);`);
  assert.match(g.nodes.get('bookSpread').innerHTML,/hatchling-1.png/);
  assert.doesNotMatch(g.nodes.get('bookSpread').innerHTML,/elder-1.png/);
  assert.match(g.nodes.get('bookSpread').innerHTML,/Fire, Water, or Nature/);
  g.nodes.get('prevPageBtn').click();assert.equal(g.nodes.get('prevPageBtn').disabled,true);
  g.run(`switchBookElement('nature');assert.equal(currentBookPage,2);`);
});

test('mastery rewards are one-time, cosmetic-only and permanent across reloads', () => {
  const g=game();g.run(`const startCoins=state.coins;const startEnergy=state.energy;
    state.keeper.title='Original title';
    claimMastery('fire');assert.equal(state.contractTokens,undefined);
    for(let level=2;level<=5;level++)recordElementDiscovery({level,element:'fire'});
    claimMastery('fire');claimMastery('fire');assert.equal(state.contractTokens,1);
    claimMastery('fire_rare');assert.equal(state.contractTokens,1);
    equipMasteryTitle('fire');assert.equal(activeMasteryTitle(),'Fire Keeper');
    equipMasteryTitle('water');assert.equal(activeMasteryTitle(),'Fire Keeper');
    assert.equal(state.coins,startCoins);assert.equal(state.energy,startEnergy);save();`);
  const loaded=game(Object.fromEntries(g.storage));loaded.run(`claimMastery('fire');assert.equal(state.contractTokens,1);
    assert.equal(activeMasteryTitle(),'Fire Keeper');equipMasteryTitle('');assert.equal(activeMasteryTitle(),'');
    assert.equal(state.keeper.title,'Original title');`);
  assert.equal(loaded.nodes.get('keeper-title-display').innerText,'Original title');
});

test('all six mastery awards require four exact stages and cannot be claimed in Trials', () => {
  game().run(`for(const element of ['fire','water','nature'])for(let level=2;level<=5;level++)recordElementDiscovery({level,element,shiny:true});
    state.mode='stage';for(const id of Object.keys(MASTERY_REWARDS))claimMastery(id);
    assert.equal(state.contractTokens,undefined);state.mode='home';
    for(const id of Object.keys(MASTERY_REWARDS)){assert.equal(masteryProgress(id),4);claimMastery(id);claimMastery(id);}
    assert.equal(state.contractTokens,9);assert.equal(Object.keys(state.masteryClaims).length,6);
    equipMasteryTitle('nature_rare');assert.equal(activeMasteryTitle(),'Radiant Nature Keeper');
    state.mode='stage';equipMasteryTitle('fire');assert.equal(activeMasteryTitle(),'Radiant Nature Keeper');
    state.mode='home';claimMastery('__proto__');equipMasteryTitle('__proto__');assert.equal(state.contractTokens,9);`);
});

test('mastery counts discoveries rather than stack size and keeps claims through book resets', () => {
  game().run(`recordElementDiscovery({level:5,element:'water',count:99});assert.equal(masteryProgress('water'),1);
    claimMastery('water');assert.equal(state.contractTokens,undefined);
    for(let level=2;level<=4;level++)recordElementDiscovery({level,element:'water'});
    claimMastery('water');state.elementBook={};state.rareElementBook={};
    for(let level=2;level<=5;level++)recordElementDiscovery({level,element:'water'});
    claimMastery('water');assert.equal(state.contractTokens,1);`);
});

test('mastery panel shows progress and returns to the same book chapter with Escape', () => {
  const g=game();g.run(`switchBookElement('water');currentBookPage=4;recordElementDiscovery({level:4,element:'water'});openMastery();`);
  assert.ok(g.nodes.get('masteryModal').classList.contains('open'));
  assert.match(g.nodes.get('masteryList').innerHTML,/Water: 1\/4/);
  assert.match(g.nodes.get('masteryList').innerHTML,/✓ Hearth/);
  g.nodes.get('masteryModal').key('Escape');
  assert.ok(!g.nodes.get('masteryModal').classList.contains('open'));
  assert.ok(g.nodes.get('book').classList.contains('open'));
  g.run(`assert.equal(currentBookElement,'water');assert.equal(currentBookPage,4);`);
});

test('element book tracks each stage and rarity permanently without paying coins', () => {
  const g=game();g.run(`const initialCoins=state.coins;
    recordElementDiscovery({level:2,element:'fire'});
    recordElementDiscovery({level:2,element:'fire'});
    recordElementDiscovery({level:5,element:'nature',shiny:true});
    recordElementDiscovery({level:1,element:'water'});
    recordElementDiscovery({level:3,element:'neutral'});
    assert.equal(state.coins,initialCoins);
    assert.equal(state.elementBook.fire[2],true);
    assert.equal(state.rareElementBook.fire,undefined);
    assert.equal(state.elementBook.nature[5],true);
    assert.equal(state.rareElementBook.nature[5],true);
    assert.equal(state.elementBook.water,undefined);save();`);
  game(Object.fromEntries(g.storage)).run(`assert.equal(state.elementBook.fire[2],true);assert.equal(state.rareElementBook.nature[5],true);`);
});

test('every elemental book page uses matching large art and stage-specific lore', () => {
  const g=game();
  for(const element of ['fire','water','nature'])for(let level=2;level<=5;level++){
    g.run(`recordElementDiscovery({level:${level},element:'${element}',shiny:true});switchBookElement('${element}');currentBookPage=${level};switchBookTab(1);`);
    const html=g.nodes.get('bookSpread').innerHTML;
    assert.ok(html.includes(element+'-'+['wyrmling','young','hearth','elder'][level-2]+'-1.png'));
    assert.ok(html.includes('width="120"'));
    assert.ok(html.includes(g.run(`ELEMENT_BOOK['${element}'].lore[${level-2}]`)));
    assert.ok(html.includes('1.5x base coin rate'));
  }
});

test('legacy element discovery recovers board and perches but never guesses lost elements', () => {
  const g=game();g.run(`state.book={0:true,1:true,2:true,3:true,4:true,5:true};state.coins=1234;
    state.cells[0]={level:3,count:1,element:'water'};
    state.perch[0]={level:5,count:1,element:'fire',shiny:true};
    state.stageCells[0]={level:4,count:1,element:'nature'};
    delete state.elementBook;delete state.rareElementBook;save();`);
  game(Object.fromEntries(g.storage)).run(`assert.equal(state.coins,1234);
    assert.equal(state.book[5],true);assert.equal(state.elementBook.water[3],true);
    assert.equal(state.rareElementBook.fire[5],true);
    assert.equal(state.elementBook.nature,undefined);assert.equal(state.elementBook.fire[2],undefined);`);
});

test('spawn and promotion register the actual element without unlocking other chapters', () => {
  game().run(`Math.random=()=>0.5;spawn(2,1,0);assert.equal(state.elementBook.water[2],true);
    state.cells[0]={level:2,count:3,element:'fire',shiny:false};
    state.cells[1]={level:2,count:2,element:'fire',shiny:false};mergeInto(0,1);
    assert.equal(state.elementBook.fire[3],true);assert.equal(state.elementBook.water[3],undefined);`);
});

test('element book preserves arrows, hidden entries, chapter counts and rarity selection', () => {
  const g=game();g.run(`recordElementDiscovery({level:2,element:'fire'});switchBookElement('fire');`);
  assert.equal(g.nodes.get('prevPageBtn').disabled,true);
  assert.match(g.nodes.get('bookSpread').innerHTML,/fire-wyrmling-1.png/);
  assert.equal(g.nodes.get('countMain').textContent,'1 / 4');
  g.nodes.get('nextPageBtn').click();
  assert.match(g.nodes.get('bookSpread').innerHTML,/Discover a Fire Young/);
  assert.doesNotMatch(g.nodes.get('bookSpread').innerHTML,/<image/);
  g.run(`switchBookTab(1);assert.equal(currentBookPage,3);switchBookElement('water');`);
  assert.equal(g.nodes.get('countRare').textContent,'0 / 4');
  g.run(`currentBookPage=5;renderBook();`);
  assert.equal(g.nodes.get('nextPageBtn').disabled,true);
  g.run(`switchBookElement('growth');switchBookTab(0);currentBookPage=0;renderBook();`);
  assert.equal(g.nodes.get('countMain').textContent,'1 / 2');
  g.run(`switchBookElement('__proto__');assert.equal(currentBookElement,'growth');`);
});

test('all 39 elemental sprites and three frames ship as 512px RGBA PNGs', () => {
  const files=[];
  for(const element of ['fire','water','nature'])for(const stage of ['wyrmling','young','hearth','elder']){
    for(let count=1;count<=(stage==='elder'?1:4);count++)files.push('Images/elements/'+element+'-'+stage+'-'+count+'.png');
    if(stage==='elder')for(let count=2;count<=4;count++)assert.equal(fs.existsSync(path.join(root,'Images/elements/'+element+'-elder-'+count+'.png')),false);
  }
  for(const name of ['ember','tide','grove'])files.push('assets/avatar/border_'+name+'_v1.png');
  assert.equal(files.length,42);
  for(const file of files){
    const png=fs.readFileSync(path.join(root,file));
    assert.equal(png.subarray(1,4).toString(),'PNG',file);
    assert.equal(png.readUInt32BE(16),512,file);
    assert.equal(png.readUInt32BE(20),512,file);
    assert.equal(png[25],6,file+' must contain alpha');
  }
});

test('elemental art supports all four growth stages and stack counts without changing neutral art', () => {
  game({}, {ELEMENTAL_ASSETS_READY:true}).run(`for(const element of ['fire','water','nature'])for(let level=2;level<=5;level++)for(let count=1;count<=4;count++){
    const html=dragonSvg(level,42,count,false,element);
    const file=element+'-'+['wyrmling','young','hearth','elder'][level-2]+'-'+(level===5?1:count)+'.png';
    assert.ok(html.includes(file));
    assert.ok(html.includes(element+' '+CHAIN[level].name));
    assert.ok(itemHtml({level,count,element}).includes(file));
  }
  assert.ok(dragonSvg(2,42,2,false,'neutral').includes('wyrmling-2.png'));
  assert.ok(dragonSvg(1,42,2,false,'fire').includes('hatchling-2.png'));
  assert.ok(dragonSvg(3,42,1,true,'water').includes('drop-shadow'));
  assert.ok(dragonSvg(3,42,1,false,'unknown').includes('young-1.png'));`);
});

test('elemental rewards are one-time, charge the right tokens, and equip through the Stash', () => {
  const g=game({}, {ELEMENTAL_ASSETS_READY:true});g.run(`redeemCosmetic('border_ember');assert.equal(state.stash.border_ember,1);
    redeemCosmetic('border_ember');assert.equal(state.stash.border_ember,1);
    redeemCosmetic('border_tide');assert.equal(state.stash.border_tide,undefined);
    state.contractTokens=2;redeemCosmetic('border_tide');redeemCosmetic('border_grove');
    assert.equal(state.contractTokens,0);assert.equal(state.stash.border_tide,1);
    useFromStash('border_tide');assert.equal(state.keeper.equipment.border,'border_tide_v1.png');
    redeemCosmetic('border_tide');assert.equal(state.contractTokens,0);
    useFromStash('border_tide');assert.equal(state.stash.border_tide,1);save();`);
  game(Object.fromEntries(g.storage)).run(`assert.ok(ownsCosmeticReward('border_ember'));
    const qty=state.stash.border_ember;redeemCosmetic('border_ember');assert.equal(state.stash.border_ember,qty);`);
});

test('Hatchery upgrades follow discoveries', () => {
  game().run(`assert.equal(gatherLevel(), 0);
    state.book[3] = true; Math.random = () => 0.1; assert.equal(gatherLevel(), 1);
    Math.random = () => 0.5; assert.equal(gatherLevel(), 0);
    state.book[4] = true; assert.equal(gatherLevel(), 1);
    Math.random = () => 0.1; assert.equal(gatherLevel(), 2);
    gather(); assert.equal(state.cells.find(Boolean).level, 2);
    assert.equal(state.energy, 4);`);
});

test('weekly contracts scale safely and snapshot difficulty', () => {
  for(let tier=0;tier<6;tier++)game().run(`state.book[${tier}]=true;state.contracts=null;rollContracts();
    assert.equal(state.contracts.items.length,5);
    assert.ok(state.contracts.items.every(c=>c.kind!=='donate'||c.want<highestOwned()));
    assert.ok(state.contracts.items.every(c=>c.kind!=='trial'));
    const targets=JSON.stringify(state.contracts.items);state.book[5]=true;rollContracts();
    assert.equal(JSON.stringify(state.contracts.items),targets);`);
});

test('contracts track successful home actions but not failed gathers or trial merges', () => {
  game().run(`gather();assert.equal(state.contracts.items[0].progress,1);
    state.energy=0;gather();assert.equal(state.contracts.items[0].progress,1);
    state.cells[0]={level:0,count:3};state.cells[1]={level:0,count:2};mergeInto(0,1);
    assert.equal(state.contracts.items[1].progress,1);
    state.mode='stage';resetTrail();gather();assert.equal(state.contracts.items[0].progress,1);`);
});

test('weekly claims and completion token pay only once across reload', () => {
  const g=game();g.run(`for(let i=0;i<5;i++){state.contracts.items[i].progress=state.contracts.items[i].target;
    claimContract(i,state.contracts.week);}
    assert.equal(state.contractTokens,1);const coins=state.coins;
    claimContract(4,state.contracts.week);assert.equal(state.coins,coins);save();`);
  game(Object.fromEntries(g.storage)).run(`const coins=state.coins;
    claimContract(4,state.contracts.week);assert.equal(state.coins,coins);assert.equal(state.contractTokens,1);`);
});

test('one replacement per week resets progress and cannot replace claimed contracts', () => {
  game().run(`const week=state.contracts.week;state.contracts.items[0].progress=5;
    replaceContract(0,week);assert.equal(state.contracts.items[0].kind,'merge');
    assert.equal(state.contracts.items[0].progress,0);const before=JSON.stringify(state.contracts.items);
    replaceContract(1,week);assert.equal(JSON.stringify(state.contracts.items),before);`);
});

test('Monday local calendar reset rejects stale claims and preserves tokens', () => {
  const g=game();g.run(`state.contractTokens=3;
    state.contracts.items[0].progress=state.contracts.items[0].target;
    var oldWeek=state.contracts.week;var nextMonday=contractWeek().next;
    assert.equal(new Date(nextMonday).getDay(),1);assert.equal(new Date(nextMonday).getHours(),0);`);
  const delta=g.run('nextMonday-Date.now()');g.advance(delta-1);
  g.run('assert.equal(contractWeek().key,oldWeek)');
  g.advance(1);g.run(`claimContract(0,oldWeek);
    assert.notEqual(state.contracts.week,oldWeek);assert.equal(state.contracts.items[0].progress,0);
    assert.equal(state.contractTokens,3);assert.equal(state.contracts.replaced,false);assert.equal(state.coins,20);`);
});

test('donations consume one lower-tier dragon and reject trial-mode claims', () => {
  game().run(`state.book[4]=true;state.contracts=null;rollContracts();
    state.cells[0]={level:3,count:2};const week=state.contracts.week;
    state.mode='stage';claimContract(4,week);assert.equal(state.cells[0].count,2);
    state.mode='home';claimContract(4,week);assert.equal(state.cells[0].count,1);
    claimContract(4,week);assert.equal(state.cells[0].count,1);`);
});

test('décor requires discoveries and grants gradual percentage bonuses', () => {
  game().run(`state.coins = 100000; buyDecor('roost'); assert.equal(state.decor.roost, undefined);
    state.book[5] = true;
    for (const item of DECOR) buyDecor(item.id);
    assert.equal(bonus(), 2); assert.equal(state.coins, 48700);
    const before = state.coins; buyDecor('roost'); assert.equal(state.coins, before);
    state.tributes = 100; assert.equal(bonus(), 2.5);`);
});

test('percentage payouts remain integer coins', () => {
  game().run(`state.decor.moss = true; state.book[1] = true;
    state.cells[0] = {level:0,count:3}; state.cells[1] = {level:0,count:2};
    mergeInto(0,1); assert.equal(state.coins, 158); assert.ok(Number.isInteger(state.coins));`);
});

test('shop prices cap per day and the next day resets only the daily count', () => {
  game().run(`assert.equal(eggPrice(), 250); state.dailyEggsBought = 999;
    assert.equal(eggPrice(), 500); state.book[3] = true; assert.equal(shopEggLevel(), 1);
    assert.equal(eggPrice(), 650); state.book[4] = true; assert.equal(eggPrice(), 800);
    state.eggsBought = 500; state.ashDayKey = '2000-01-01'; rollDaily();
    assert.equal(eggPrice(), 550); assert.equal(state.eggsBought, 500);`);
});

test('shop grants the advertised dragon and charges once', () => {
  game().run(`state.saveForDecor=false;state.book[4] = true; state.coins = 1000; buyEgg();
    assert.equal(state.cells.find(Boolean).level, 2); assert.equal(state.coins, 450);
    assert.equal(state.dailyEggsBought, 1);`);
});

test('offline energy preserves partial ticks, capacity and bonus energy', () => {
  const g = game();
  g.run('state.energy = 0; state.nextEnergyAt = Date.now() + REGEN_MS; save()');
  g.advance(20500);
  g.run('load(); tickEnergy(); assert.equal(state.energy, 2); assert.equal(state.nextEnergyAt - Date.now(), 3500)');
  g.advance(3500); g.run('tickEnergy(); assert.equal(state.energy, 3)');
  g.advance(1000000); g.run('tickEnergy(); assert.equal(state.energy, MAX_ENERGY)');
  g.run('state.energy = 35; tickEnergy(); assert.equal(state.energy, 35)');
});

test('older saves retain possessions and get the appropriate energy capacity', () => {
  const g = game({'ember-nest-save': JSON.stringify({maxEnergy:6,energy:6,level:10,hearthDone:true,coins:87654,decor:{roost:true},stash:{rare_egg:2},book:{4:true}})});
  g.run('assert.equal(state.maxEnergy, 30); assert.equal(state.coins, 87654); assert.ok(state.decor.roost); assert.equal(state.stash.rare_egg, 2)');
});

test('Sleepy pouch bonus applies to subsequent trials and expires the next day', () => {
  game().run(`state.cells[0] = {level:3,count:1}; fulfillSleepy(); resetTrail();
    assert.equal(state.trailGathers, TRAIL_GATHERS + 5);
    state.ashDayKey = '2000-01-01'; rollDaily(); resetTrail();
    assert.equal(state.trailGathers, TRAIL_GATHERS);`);
});

test('legacy quest saves migrate without replaying the old reward', () => {
  const g = game({'ember-nest-save':JSON.stringify({questDone:true,quest:0,coins:1234})});
  g.run('assert.equal(state.questDone, false); assert.equal(state.coins, 1234); assert.equal(state.contracts.items.length, 5)');
});

test('weekly panel opens with five rows and closes with Escape', () => {
  const g=game();g.run('openContracts()');
  assert.ok(g.nodes.get('contractsModal').classList.contains('open'));
  assert.equal((g.nodes.get('contractsList').innerHTML.match(/class="contract-row"/g)||[]).length,5);
  g.nodes.get('contractsModal').key('Escape');
  assert.equal(g.nodes.get('contractsModal').classList.contains('open'),false);
});

test('weekly Trial progress includes Blitz and replacement use persists after reload', () => {
  const g=game();g.run(`state.ashTrialCompleted=true;state.contracts=null;rollContracts();
    assert.equal(state.contracts.items[3].kind,'trial');blitzAshTrial();
    assert.equal(state.contracts.items[3].progress,1);
    replaceContract(0,state.contracts.week);save();`);
  game(Object.fromEntries(g.storage)).run(`assert.equal(state.contracts.replaced,true);
    assert.equal(state.contracts.items[3].progress,1);`);
});

test('new players have the full trial pouch and land prices remain bounded', () => {
  game().run(`resetTrail(); assert.equal(state.trailGathers, 13);
    assert.equal(ASH_GRACE, 2); assert.equal(unlockCost(), 250);
    state.coins = 10000; unlock(20); assert.equal(state.coins, 9750);
    assert.equal(unlockCost(), 500);`);
});


test('buttons with event listeners have no duplicate inline action', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const id of ['autoMergeBtn', 'chestOk', 'lootOk']) {
    const tag = html.match(new RegExp('<button[^>]*id="' + id + '"[^>]*>'))[0];
    assert.ok(!tag.includes('onclick'));
  }
  const g = game();
  g.run('state.level = 5; let calls = 0; toast = () => { calls++; }');
  g.nodes.get('autoMergeBtn').click();
  g.run('assert.equal(calls, 1)');
});

test('rare eggs create a shiny egg and cannot be used without inventory or space', () => {
  game().run(`state.stash.rare_egg = 1; useFromStash('rare_egg');
    assert.equal(state.cells.filter(Boolean).length, 1);
    assert.equal(state.cells.find(Boolean).shiny, true); assert.equal(state.stash.rare_egg, undefined);
    useFromStash('rare_egg'); assert.equal(state.cells.filter(Boolean).length, 1);
    state.stash.rare_egg = 1; state.cells.fill({level: 0, count: 1});
    useFromStash('rare_egg'); assert.equal(state.stash.rare_egg, 1);`);
});

test('time skips require income, add one hour, and respect bank capacity', () => {
  game().run(`state.stash.time_skip_1h = 2;
    useFromStash('time_skip_1h'); assert.equal(state.stash.time_skip_1h, 2);
    state.perch[0] = {level: 0, count: 1, shiny: false, element: 'neutral'};
    const rate = perchIncome(); useFromStash('time_skip_1h');
    assert.equal(state.perchBank, rate * 60); assert.equal(state.stash.time_skip_1h, 1);
    state.perchBank = rate * 480 - 1; useFromStash('time_skip_1h');
    assert.equal(state.perchBank, rate * 480);
    state.stash.time_skip_1h = 1; useFromStash('time_skip_1h');
    assert.equal(state.stash.time_skip_1h, 1);`);
});

test('consumables cannot modify a running trial', () => {
  game().run(`state.mode = 'stage'; state.stash.rare_egg = 1; useFromStash('rare_egg');
    assert.equal(state.stash.rare_egg, 1); assert.equal(state.stageCells.filter(Boolean).length, 0);`);
});

test('perch taps preserve stack remainder and locked perches reject dragons', () => {
  game().run(`state.cells[0] = {level: 2, count: 3, element: 'fire', shiny: true};
    seatPerch(1, 0); assert.equal(state.cells[0].count, 3);
    seatPerch(0, 0); assert.equal(state.cells[0].count, 2);
    assert.equal(state.perch[0].count, 1); assert.equal(state.perch[0].shiny, true);
    seatPerch(0, 0); assert.equal(state.cells[0].count, 2);`);
});

test('dragging onto occupied or locked perches never loses dragons', () => {
  game().run(`state.cells[0] = {level: 2, count: 3}; state.perch[0] = {level: 1, count: 1};
    let slot = 0; document.elementFromPoint = () => ({closest: selector => selector === '[data-perch]' ? {dataset: {perch: slot}} : null});
    drag = {from: 0}; endDrag({clientX: 1, clientY: 1});
    assert.equal(state.cells[0].level, 1); assert.equal(state.perch[0].count, 3);
    slot = 1; drag = {from: 0}; endDrag({clientX: 1, clientY: 1});
    assert.equal(state.cells[0].level, 1); assert.equal(state.perch[1], null);
    drag = {from: 0}; endDrag({type: 'pointercancel'});
    assert.equal(drag, null); assert.equal(state.cells[0].level, 1);`);
});

test('trial generation terminates even with a constant random source', () => {
  game().run(`state.mode = 'stage'; generateTrail(); assert.equal(ashCount(), 8);
    state.stageCells.fill(null); state.stageCells[0] = {level: CHAIN.length - 1, count: 5};
    assert.equal(canFiveMerge(), false);`);
});

test('spawn rejects ash and out-of-bounds target cells', () => {
  game().run(`state.mode = 'stage'; state.ash[0] = true;
    spawn(0, 1, 0); assert.equal(state.stageCells[0], null);
    spawn(0, 1, 100); assert.equal(state.stageCells.length, 25);`);
});

test('Blitz requires a prior trial victory and home mode', () => {
  game().run(`blitzAshTrial(); assert.equal(state.ashDayWins, 0);
    state.ashTrialCompleted = true; state.mode = 'stage'; blitzAshTrial(); assert.equal(state.ashDayWins, 0);
    state.mode = 'home'; blitzAshTrial(); assert.equal(state.ashDayWins, 1);`);
});

test('equipping and unequipping preserves cosmetic quantity through saves', () => {
  game().run(`state.stash.border_obsidian = 1;
    useFromStash('border_obsidian'); assert.equal(state.stash.border_obsidian, undefined);
    assert.equal(state.keeper.equipment.border, 'border_obsidian.png');
    save(); load(); useFromStash('border_obsidian');
    assert.equal(state.stash.border_obsidian, 1); assert.equal(state.keeper.equipment.border, null);`);
});


test('onboarding opens once, closes by keyboard, and reopens from Help', () => {
  const g = game();
  assert.ok(g.nodes.get('guide').classList.contains('open'));
  g.nodes.get('guide').key('Escape');
  assert.equal(g.run('state.seenGuide'), true);
  assert.equal(g.nodes.get('guide').classList.contains('open'), false);
  const returning = game(Object.fromEntries(g.storage));
  assert.equal(returning.nodes.get('guide').classList.contains('open'), false);
  returning.nodes.get('guideBtn').click();
  assert.ok(returning.nodes.get('guide').classList.contains('open'));
});

test('five-merge promotes dragons, preserves leftovers, and pays rewards', () => {
  const g = game();
  g.run(`state.cells[0] = {level: 0, count: 4, shiny: false, element: 'neutral'};
    state.cells[1] = {level: 0, count: 3, shiny: false, element: 'neutral'};
    assert.equal(mergeInto(0, 1), true);
    assert.equal(state.cells[0].count, 2);
    assert.equal(state.cells[1].level, 1);
    assert.equal(state.cells[1].count, 1);
    assert.equal(state.coins, 345);
    assert.equal(state.xp, 25);`);
});

test('invalid merges leave the board untouched; stacking does not promote early', () => {
  game().run(`state.cells[0] = {level: 0, count: 1}; state.cells[1] = {level: 1, count: 1};
    const before = JSON.stringify(state.cells);
    assert.equal(mergeInto(0, 1), false); assert.equal(mergeInto(0, 0), false);
    assert.equal(JSON.stringify(state.cells), before);
    state.cells[1].level = 0; mergeInto(0, 1);
    assert.equal(state.cells[1].count, 2); assert.equal(state.cells[1].level, 0);
    assert.equal(state.coins, 20);`);
});

test('save round trip preserves dragons, inventory, equipment and coins', () => {
  game().run(`state.coins = 987; state.cells[0] = {level: 2, count: 3, shiny: true, element: 'fire'};
    state.stash = {rare_tunic: 2}; state.keeper.equipment.border = 'border_obsidian.png';
    save(); state = defaultState(); load();
    assert.equal(state.coins, 987); assert.equal(state.cells[0].count, 3);
    assert.equal(state.cells[0].shiny, true); assert.equal(state.stash.rare_tunic, 2);
    assert.equal(state.keeper.equipment.border, 'border_obsidian.png');`);
});

test('legacy saves migrate while trial boards reset safely', () => {
  const g = game({ 'ember-nest-v10': JSON.stringify({ coins: 456, mode: 'stage', cells: Array(30).fill(null), stageMerges: 5 }) });
  g.run(`assert.equal(state.coins, 456); assert.equal(state.cells.length, 25);
    assert.equal(state.mode, 'home'); assert.equal(state.stageMerges, 0);
    assert.ok(state.keeper.equipment); assert.ok(state.stash);`);
});

test('gather spends one energy only when an egg can spawn', () => {
  game().run(`gather(); assert.equal(state.energy, 4); assert.equal(state.cells.filter(Boolean).length, 1);
    state.energy = 0; gather(); assert.equal(state.cells.filter(Boolean).length, 1);
    state.energy = 3; state.cells.fill({level: 0, count: 1}); gather(); assert.equal(state.energy, 3);`);
});

test('energy regenerates on the timer and never exceeds its cap', () => {
  const g = game();
  g.run('gather()'); g.advance(8000); g.run('tickEnergy(); assert.equal(state.energy, 5)');
  g.advance(80000); g.run('tickEnergy(); assert.equal(state.energy, 15)');
  g.advance(80000); g.run('tickEnergy(); assert.equal(state.energy, MAX_ENERGY)');
});

test('trial pouch replaces energy and reset preserves home inventory', () => {
  game().run(`state.cells[0] = {level: 2, count: 1}; state.stash = {rare_tunic: 1};
    state.mode = 'stage'; resetTrail(); const pouch = state.trailGathers;
    gather(); assert.equal(state.trailGathers, pouch - 1); assert.equal(state.energy, 5);
    state.trailGathers = 0; gather(); assert.equal(state.stageCells.filter(Boolean).length, 1);
    resetTrail(); assert.equal(state.cells[0].level, 2); assert.equal(state.stash.rare_tunic, 1);`);
});

test('100 generated trials have eight ash tiles and no occupied ash cells', () => {
  game().run(`let seed = 123; Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
    state.mode = 'stage';
    for (let n = 0; n < 100; n++) {
      generateTrail(); assert.equal(ashCount(), 8);
      assert.equal(state.stageCells.filter(Boolean).length, TRAIL_BAG.length + 1);
      assert.ok(state.stageCells.every((c, i) => !c || !state.ash[i]));
    }`);
});

test('ash clearing follows tier patterns and cannot count a tile twice', () => {
  game().run(`for (const [tier, count] of [[1,4], [2,4], [3,5], [4,5], [5,9]]) {
    state.ash.fill(true); state.ashBurned = 0; applyWarmth(12, tier);
    assert.equal(state.ashBurned, count); applyWarmth(12, tier); assert.equal(state.ashBurned, count);
  }`);
});

test('trial rewards are limited to three daily clears', () => {
  game().run(`state.book = {0:true,1:true,2:true,3:true,4:true,5:true};
    for (let n = 0; n < 3; n++) { state.mode = 'stage'; winStage(); }
    assert.equal(dailyLeft(), 0); const coins = state.coins;
    const xp = state.xp, level = state.level;
    state.mode = 'stage'; winStage(); assert.equal(state.coins, coins);
    assert.equal(state.xp, xp); assert.equal(state.level, level);
    assert.equal(state.mode, 'home');`);
});

test('chests pay once per earned level, persist claims, and cap late-game coins', () => {
  const g = game();
  g.run(`state.level=105; const box=document.getElementById('chestBox');
    box.dataset.level='5'; revealChest(); assert.equal(state.coins,3020);
    revealChest(); assert.equal(state.coins,3020);
    box.disabled=false; revealChest(); assert.equal(state.coins,3020);
    box.dataset.level='110'; revealChest(); assert.equal(state.coins,3020);
    box.dataset.level='105'; revealChest(); assert.equal(state.coins,12020);
    save();`);
  game(Object.fromEntries(g.storage)).run(`const box=document.getElementById('chestBox');
    box.dataset.level='105';box.disabled=false;const coins=state.coins;
    revealChest();assert.equal(state.coins,coins);`);
});

test('collecting the Roost bank preserves partial income ticks and eight-hour capacity', () => {
  const g = game();
  g.run(`state.perch[0]={level:1,count:1,element:'neutral'};state.perchAt=Date.now();`);
  g.advance(90000);g.tick();
  g.run(`assert.equal(state.perchBank,perchIncome());document.getElementById('dragonBank').click();
    assert.equal(state.perchBank,0);assert.equal(state.perchAt,160000);`);
  g.advance(30000);g.tick();
  g.run(`assert.equal(state.perchBank,perchIncome());`);
  g.advance(24*60*60*1000);g.tick();
  g.run(`assert.equal(state.perchBank,perchIncome()*480);`);
});

test('Roost tuning preserves starter income, rewards upgrades, and never removes banked coins', () => {
  const g=game();
  g.run(`assert.equal(getPerchYield({level:0,element:'neutral'},0).total,22);
    let last=0;for(let level=0;level<6;level++){
      const ordinary=getPerchYield({level,element:'fire'},0).total;
      const shiny=getPerchYield({level,element:'fire',shiny:true},0).total;
      assert.ok(ordinary>last);assert.ok(shiny>ordinary);last=ordinary;
    }
    state.perch[0]={level:0,element:'neutral'};state.perchAt=Date.now();state.perchBank=1000000;`);
  g.advance(60000);g.tick();g.run(`assert.equal(state.perchBank,1000000);`);
});

test('trial failure opens its message without losing home dragons', () => {
  const g = game();
  g.run(`state.cells[0] = {level: 3, count: 1}; state.mode = 'stage'; resetTrail(); failStage();
    assert.equal(state.cells[0].level, 3);`);
  assert.ok(g.nodes.get('trailFail').classList.contains('open'));
});

test('a new day restores daily trial rewards and the Sleepy Dragon request', () => {
  game().run(`state.ashDayKey = '2000-01-01'; state.ashDayWins = 3; state.sleepyDone = true;
    rollDaily(); assert.equal(dailyLeft(), 3); assert.equal(state.sleepyDone, false);
    state.ashDayWins = 1; rollDaily(); assert.equal(dailyLeft(), 2);`);
});
