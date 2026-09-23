// Presentation only: one local run, cancellable animation callbacks, explicit results.
let pveRun=null, pveSelected=0, pveBusy=false, pveTimer=null, pveGeneration=0, pveEvent=null, pveExitPrompt=false;
let pveLoading=false, pveLoadProgress=0, pveSection='campaign', pveSpeed=1, pveWindup=false, pveAnimationRound=1;
const pveRegions=DragonBattle.regions.map((r,index)=>({...r,note:['Learn the basics · solo Hatchling fights first','Build your team · break the guardian’s barrier','Read charged attacks · bring an interrupt','Clear summoned wards · master elemental swaps'][index]}));
const pveArenaAsset='assets/battle/moonlit-arena-v1.png';
const pveAssetFailures=new Set();
const pveEsc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pveElement=element=>({fire:'🔥 Fire',water:'💧 Water',nature:'🌿 Nature',neutral:'✦ Neutral'})[element||'neutral'];
function openBattleLodge(){
  if(state.mode!=='home'){toast('Return from your Ash Trial first.');return;}
  const dialog=document.getElementById('battleDialog');
  if(!dialog)return;
  pveSelected=state.battleRoster.find(d=>d.training.id===pveSelected)?.training.id||state.battleRoster[0]?.training.id||0;
  document.querySelector('[data-tab="view-trials"]')?.click();
  renderBattleLodge();
}
function closeBattleLodge(force=false){
  if(pveLoading)force=true;
  if(pveRun && (!pveRun.claimed&&pveRun.phase==='won'||['active','switch'].includes(pveRun.phase)||pveBusy) && !force){pveExitPrompt=true;renderBattleLodge();return;}
  clearTimeout(pveTimer);pveGeneration++;pveRun=null;pveBusy=false;pveEvent=null;pveExitPrompt=false;pveLoading=false;pveWindup=false;
  document.getElementById('battleDialog')?.close();render();
  if(!levelShowing)showLevelEvent();
  document.getElementById('battleEnter')?.focus();
  renderBattleLodge();
}
function battleMenu(){
  if(pveBusy || ['active','switch'].includes(pveRun?.phase) || pveRun?.phase==='won'&&!pveRun.claimed)return;
  pveRun=null;pveEvent=null;pveExitPrompt=false;pveLoading=false;pveGeneration++;
  document.getElementById('battleDialog')?.close();render();renderBattleLodge();
}
function pveSetSection(section){if(!pveRun&&['campaign','companions','weekly'].includes(section)){pveSection=section;renderBattleLodge();}}
function openWeeklyWilds(){if(pveRun)return;openBattleLodge();pveSetSection('weekly');}
function pveSetSpeed(){pveSpeed=pveSpeed===1?2:1;renderBattleLodge();}
function pveEnlist(index){if(enlistBattleDragon(index)){pveSelected=state.battleRoster.at(-1).training.id;render();}renderBattleLodge();}
function pveReturn(id){if(returnBattleDragon(id)){pveSelected=state.battleRoster[0]?.training.id||0;render();}renderBattleLodge();}
function pveSelect(id){if(!pveRun&&state.battleRoster.some(d=>d.training.id===id)){if((state.battleTeam||[]).includes(id)&&!toggleBattleReserve(id))return;pveSelected=id;renderBattleLodge();}}
function pveToggleReserve(id){if(!toggleBattleReserve(id))toast('Choose up to two reserves.');renderBattleLodge();}
function pveUseSupply(id){if(useBattleSupply(id))toast('Training supply used · up to 30 XP.');renderBattleLodge();}
function pveCollectSupplies(){if(collectBattleSupplies())toast('First-clear training supplies collected.');renderBattleLodge();}
function pveEquipTrophy(id){if(equipBattleTitle(id))render();renderBattleLodge();}
function pveTrain(id){
  const name=document.getElementById('pveName')?.value, special=document.getElementById('pveSpecial')?.value;
  if(updateBattleTraining(id,name,special,document.getElementById('pveTechnique')?.value))toast('Training profile saved.');else toast('Check your name and skill unlock requirements.');
  renderBattleLodge();
}
function pveGrow(id){if(growBattleDragon(id)){toast('Your companion grew. Name and training kept!');render();if(!levelShowing)showLevelEvent();}renderBattleLodge();}
function startPve(id){
  if(pveRun||state.mode!=='home'||saveBlocked)return;
  const dragon=state.battleRoster.find(d=>d.training.id===pveSelected);
  if(!dragon)return;
  const week=battleWeek(),challenge=id.startsWith('weekly-')?{tier:id.slice(7),rotation:week.rotation}:null;
  const encounter=challenge?DragonBattle.weeklyEncounter(challenge.tier,challenge.rotation):DragonBattle.encounters.find(e=>e.id===id);
  if(!encounter)return;
  if(!challenge&&!DragonBattle.unlocked(id,state.battleClears)){toast('Clear the preceding campaign encounter first.');return;}
  const reserves=encounter?.stage===1?[]:state.battleRoster.filter(d=>d.training.id!==pveSelected&&(state.battleTeam||[]).includes(d.training.id));
  if(reserves.some(d=>d.level<(encounter?.stage||1))){toast('Every team member must meet this encounter’s stage requirement. Adjust your reserves.');return;}
  pveRun=DragonBattle.create(dragon,id,reserves,challenge);pveEvent=null;pveExitPrompt=false;
  if(!pveRun){toast('Your team must fit this encounter’s stage bracket.');return;}
  if(challenge)pveRun.weekStart=week.start;
  pveLoading=true;pveLoadProgress=0;pveBusy=true;
  const generation=++pveGeneration, run=pveRun;
  const dialog=document.getElementById('battleDialog');if(dialog&&!dialog.open)dialog.showModal();
  renderBattleLodge();
  if(dialog)dialog.scrollTop=0;
  // Decode actual scenery, with a bounded fallback; stale loads cannot reopen a battle.
  let completed=false;
  const ready=()=>{
    if(completed||generation!==pveGeneration||run!==pveRun)return;
    completed=true;pveLoadProgress=100;renderBattleLodge();
    clearTimeout(pveTimer);
    pveTimer=setTimeout(()=>{
      if(generation!==pveGeneration||run!==pveRun)return;
      pveLoading=false;pveBusy=false;renderBattleLodge();
      document.getElementById('pveFightHeading')?.focus({preventScroll:true});
    },document.documentElement.dataset.tileMotion==='on'?900:150);
  };
  pveTimer=setTimeout(ready,4000);
  if(typeof Image==='undefined'){ready();return;}
  const assets=[...new Set([pveArenaAsset,...run.party.map(member=>pvePoseAsset(member.dragon)?.src).filter(Boolean)])];
  let loaded=0;
  assets.forEach(src=>{const art=new Image();let done=false;const finish=()=>{if(done)return;done=true;loaded++;if(generation!==pveGeneration||run!==pveRun||completed)return;pveLoadProgress=Math.round(loaded/assets.length*100);if(loaded===assets.length)ready();else renderBattleLodge();};art.onload=()=>{if(done)return;pveAssetFailures.delete(src);finish();};art.onerror=()=>{if(done)return;pveAssetFailures.add(src);finish();};art.src=src;});
}
function pveMove(id){
  if(!pveRun||pveLoading||pveBusy||pveExitPrompt||saveBlocked||!DragonBattle.legal(pveRun,id))return;
  const initial={player:{...pveRun.player},enemy:{...pveRun.enemy},dragon:pveRun.dragon};
  pveAnimationRound=pveRun.round;
  if(!DragonBattle.resolve(pveRun,id))return;
  pveBusy=true;
  const run=pveRun, generation=++pveGeneration;
  const animated=document.documentElement.dataset.tileMotion==='on';
  let cursor=0;
  function next(){
    if(generation!==pveGeneration||pveRun!==run)return;
    if(cursor<run.events.length){
      const event=run.events[cursor++], previous=cursor===1?initial:run.events[cursor-2];
      if(animated&&event.kind==='hit'){
        pveWindup=true;pveEvent={...event,player:{...previous.player},enemy:{...previous.enemy},dragon:previous.dragon,message:(event.actor==='player'?DragonBattle.moves(event.dragon).find(m=>m.id===event.skill)?.name:DragonBattle.intent({...run,round:run.round-1}).name)+' · preparing…'};
        renderBattleLodge();pveTimer=setTimeout(()=>{
          if(generation!==pveGeneration||pveRun!==run)return;
          pveWindup=false;pveEvent=event;renderBattleLodge();pveTimer=setTimeout(next,950/pveSpeed);
        },350/pveSpeed);
      }else{pveWindup=false;pveEvent=event;renderBattleLodge();pveTimer=setTimeout(next,animated?850/pveSpeed:150);}
      return;
    }
    pveBusy=false;pveEvent=null;
    if(run.phase==='won')settleBattleReward(run);
    renderBattleLodge();
    document.getElementById(run.phase==='active'?'pveMove-strike':'pveResult')?.focus({preventScroll:run.phase==='active'});
  }
  next();
}
function retryPveReward(){if(!pveBusy&&pveRun?.phase==='won'){settleBattleReward(pveRun);renderBattleLodge();}}
function pveReplay(id){
  if(!pveRun||pveBusy||['active','switch'].includes(pveRun.phase)||pveRun.phase==='won'&&!pveRun.claimed)return;
  pveRun=null;pveEvent=null;pveExitPrompt=false;startPve(id);
}
function pvePoseAsset(dragon){
  if(dragon.level===1)return {src:'assets/battle/hatchling-poses-v1.png',width:1774,height:887,attack:'0 0 925 887',recoil:'935 0 839 887'};
  if(!dragon.element||dragon.element==='neutral'){
    const index=dragon.level-2;
    return {src:'assets/battle/neutral-attack-poses-v1.png',width:1254,height:1254,attack:`${index%2*627} ${Math.floor(index/2)*627} 627 627`};
  }
  if(dragon.level===5)return {src:`assets/battle/${dragon.element}-elder-${dragon.element==='nature'?'poses':'attack'}-v1.png`};
  return null;
}
function pveArt(dragon,large=false){
  const pose=pvePoseAsset(dragon);
  if(large&&pose?.attack&&!pveAssetFailures.has(pose.src))return `<div class="pve-attack-poses ${pose.recoil?'has-recoil':''}"><div class="pve-idle-pose">${dragonSvg(dragon.level,220,1,dragon.shiny,dragon.element)}</div>${['attack','recoil'].filter(key=>pose[key]).map(key=>`<svg class="pve-${key}-pose" viewBox="${pose[key]}" role="img" aria-label="${pveEsc(dragon.training.name)} ${key}"><image href="${pose.src}" width="${pose.width}" height="${pose.height}"/></svg>`).join('')}</div>`;
  if(large&&dragon.level===5&&['fire','water'].includes(dragon.element)&&!pveAssetFailures.has(`assets/battle/${dragon.element}-elder-attack-v1.png`))return `<div class="pve-attack-poses"><div class="pve-idle-pose">${dragonSvg(dragon.level,220,1,dragon.shiny,dragon.element)}</div><img class="pve-attack-pose" src="assets/battle/${dragon.element}-elder-attack-v1.png" alt="${pveEsc(dragon.training.name)} casting ${dragon.element}" width="1254" height="1254"></div>`;
  if(large && dragon.level===5 && dragon.element==='nature'&&!pveAssetFailures.has('assets/battle/nature-elder-poses-v1.png'))
    return `<div class="pve-pose-set" role="img" aria-label="${pveEsc(dragon.training.name)}">${['0 0 627 627','627 0 627 627','0 627 680 627','680 627 574 627'].map((box,i)=>`<svg class="pve-pose-frame frame-${i}" viewBox="${box}" aria-hidden="true"><image href="assets/battle/nature-elder-poses-v1.png" width="1254" height="1254"/></svg>`).join('')}</div>`;
  return dragonSvg(dragon.level,large?220:70,1,dragon.shiny,dragon.element);
}
function pveMonster(e){
  // Original code-native spirit silhouettes; their limbs and details move independently.
  const colors={moss:['#567e47','#a5c469'],wisp:['#287f9a','#a9edee'],cinder:['#9e4936','#ffc96c'],stone:['#777c84','#c7cfbd']}[e.kind];
  if(e.kind==='stone')return `<svg viewBox="0 0 220 220" class="pve-monster" role="img" aria-label="${e.name}"><defs><linearGradient id="stoneBody" x2="80%" y2="100%"><stop stop-color="#b6c0bd"/><stop offset="1" stop-color="#465d64"/></linearGradient></defs><g stroke="#293e49" stroke-width="3" stroke-linejoin="round"><g fill="url(#stoneBody)"><path d="M65 151L57 193 87 200 101 159M128 154L135 200 164 193 151 149"/><g class="monster-arm arm-left"><path d="M67 83L38 75 19 106 27 155 48 168 70 140Z"/><path d="M22 115L50 120 46 148 27 151"/></g><g class="monster-arm arm-right"><path d="M153 83L179 75 199 106 190 158 167 170 150 136Z"/><path d="M176 116L197 114 190 149 173 149"/></g><path d="M64 68L98 53 142 62 164 108 150 163 108 179 67 154 56 110Z"/><path d="M75 51L89 22 132 23 146 54 135 85 87 85Z"/></g><g fill="none" stroke="#526c71"><path d="M69 81L94 104 70 135M145 84L124 115 149 142M98 54L109 81M96 154L109 179M90 24L102 43 81 55"/></g><path fill="#213d4e" d="M88 51L105 56 101 64 87 61M134 51L117 56 119 64 135 61"/><g fill="#a6f5df" stroke="#65cbbd" stroke-width="2"><path d="M99 117L110 103 121 117 110 141Z"/><path d="M90 56L101 59M122 59L133 56"/></g><g fill="#759866" stroke="#486a50"><path d="M39 77Q28 48 51 59L71 81Z"/><path d="M149 81Q164 56 176 72L185 83Z"/></g></g></svg>`;
  if(e.kind==='wisp')return `<svg viewBox="0 0 220 220" class="pve-monster" role="img" aria-label="${e.name}"><defs><radialGradient id="wispBody"><stop stop-color="#e7fffd"/><stop offset=".5" stop-color="#89ddec"/><stop offset="1" stop-color="#386eaa"/></radialGradient></defs><g stroke="#305878" stroke-width="2.5" fill="url(#wispBody)"><path class="monster-crown" d="M96 54Q53 26 82 15Q93 40 114 24Q139 2 143 21Q143 49 122 62"/><path d="M59 121Q39 55 101 48Q166 37 170 99Q185 147 150 163Q164 182 145 194Q114 172 108 197Q95 169 73 182Q48 175 64 151Z"/><g class="monster-arm arm-left"><path d="M65 102Q16 84 26 127Q35 146 65 136Q36 127 65 119Z"/></g><g class="monster-arm arm-right"><path d="M156 100Q204 78 198 123Q189 145 159 135Q191 125 156 119Z"/></g><path fill="#284866" d="M79 91L100 103 84 112ZM146 91L124 103 139 112Z"/><path fill="none" d="M101 126Q112 132 126 124"/><g fill="#defcfb" stroke="#8bdded"><circle cx="44" cy="54" r="7"/><circle cx="173" cy="43" r="5"/><circle cx="178" cy="174" r="8"/></g><path fill="none" stroke="#d6fffc" d="M78 72Q105 48 139 68M76 150Q110 173 147 147"/></g></svg>`;
  return `<svg viewBox="0 0 220 220" class="pve-monster" role="img" aria-label="${e.name}"><g fill="${colors[0]}" stroke="#20393c" stroke-width="4" stroke-linejoin="round">
    <g class="monster-arm arm-left"><path d="M70 110Q25 90 25 154L48 167 75 144Z"/></g><g class="monster-arm arm-right"><path d="M150 110Q195 90 195 154L174 166 147 144Z"/></g>
    <path d="M47 179Q32 141 64 91L78 45 110 71 145 39 161 87Q191 138 169 182Q143 205 110 193Q77 205 47 179Z"/>
    <path fill="${colors[1]}" d="M73 107Q110 85 150 104L156 162Q114 191 67 161Z"/>
    <path fill="#1b3039" stroke="none" d="M77 117L98 125 81 135Z M143 117L123 125 140 135Z"/><path fill="none" d="M94 154Q110 164 126 152"/>
    <g class="monster-crown" fill="${colors[1]}"><path d="M97 72Q59 23 74 17Q111 22 111 69Q120 22 147 17Q162 41 125 76Z"/></g>
  </g></svg>`;
}
function renderBattleLodge(){
  const container=document.getElementById(pveRun?'battleContent':'battleHubContent');if(!container)return;
  document.getElementById('battleDialog').dataset.fighting=String(!!pveRun);
  const exit=document.getElementById('battleExit');if(exit)exit.textContent=pveRun?'Leave battle':'Close';
  if(pveLoading){
    container.innerHTML=`<section class="pve-loading" aria-label="Loading battle"><small>ENTERING THE WILDS</small><h2>${pveRun.encounter.area}</h2><div class="pve-arrival">${pveArt(pveRun.dragon,true)}<span>VS</span>${pveMonster(pveRun.encounter)}</div><h3>${pveEsc(pveRun.dragon.training.name)} &amp; ${pveRun.encounter.name}</h3><progress max="100" value="${pveLoadProgress}" aria-label="Battle scenery loaded"></progress><p role="status">${pveLoadProgress?'Ready · entering the clearing…':'Preparing the clearing…'}</p><p>Watch the enemy intent. Guard before a heavy attack; strike to recover stamina.</p><button onclick="closeBattleLodge(true)">Cancel entry</button></section>`;return;
  }
  if(pveRun){renderPveFight(container);return;}
  const roster=state.battleRoster;
  if(!roster.some(d=>d.training.id===pveSelected))pveSelected=roster.find(d=>!(state.battleTeam||[]).includes(d.training.id))?.training.id||roster[0]?.training.id||0;
  const selected=roster.find(d=>d.training.id===pveSelected);
  const available=state.cells.map((d,index)=>({d,index})).filter(({d,index})=>d&&d.level>=1&&!state.locked[index]);
  let profile='';
  if(selected){
    const d=selected,t=d.training,level=DragonBattle.trainingLevel(d),cap=DragonBattle.caps[d.level],s=DragonBattle.stats(d);
    const donors=battleGrowthDonors(d).reduce((n,{d})=>n+d.count,0);
    profile=`<details class="pve-profile" ${pveSection==='companions'?'open':''}><summary>Train &amp; manage ${pveEsc(t.name)}</summary><div class="pve-profile-top">${pveArt(d)}<div><h3>${pveEsc(t.name)}</h3><p>${pveElement(d.element)} ${CHAIN[d.level].name}${d.shiny?' · Shiny':''}<br>Training ${level}/${cap} · ${s.maxHp} HP · ${s.attack} ATK</p></div></div>
      <p>${level>=cap?'Training cap reached. '+(d.level<5?'Grow to unlock higher training levels.':'Elder fully trained.'):`${t.xp}/${DragonBattle.threshold(level+1)} total XP · ${DragonBattle.threshold(level+1)-t.xp} to next level`}</p>
      <button onclick="pveUseSupply(${t.id})" ${!(state.battleSupplies>0)||level>=cap?'disabled':''}>Use training supply · +${Math.max(0,Math.min(30,DragonBattle.threshold(cap)-t.xp))} XP · ${state.battleSupplies||0} owned</button>
      <label>Name <input id="pveName" maxlength="24" value="${pveEsc(t.name)}" autocomplete="off"></label>
      <p><strong>${DragonBattle.roles[d.element||'neutral']}</strong></p><p>Four equipped skills: Claw strike and Guard stay available; choose your technique and fourth skill below. Changing builds is free.</p>
      <label>Technique <select id="pveTechnique">${DragonBattle.techniqueOptions(d).map(x=>`<option value="${x.id}" ${(t.technique||'element')===x.id?'selected':''} ${level<x.rank?'disabled':''}>${x.name} · training ${x.rank}</option>`).join('')}</select></label>
      <label>Fourth skill <select id="pveSpecial"><option value="burst" ${t.special==='burst'?'selected':''}>${d.level===5?'Elder awakening':'Brave pounce'} · damage</option><option value="mend" ${t.special==='mend'?'selected':''} ${d.level<5||level<3?'disabled':''}>Renewal · Elder training 3 · heal</option><option value="rally" ${t.special==='rally'?'selected':''} ${level<4?'disabled':''}>Rallying call · training 4 · team heal</option></select></label>
      <div class="pve-actions"><button onclick="pveTrain(${t.id})">Save profile</button><button onclick="pveReturn(${t.id})">Return to Board</button></div>
      ${d.level<5?`<p>Grow with 4 untrained ${pveElement(d.element)} ${CHAIN[d.level].name}s from your Board (${Math.min(4,donors)}/4). They are consumed, as in a five-dragon merge. Your companion keeps its identity and XP.${d.level===1?' A random element awakens at Wyrmling.':''}</p><button onclick="pveGrow(${t.id})" ${donors<4?'disabled':''}>Merge & grow into ${CHAIN[d.level+1].name}</button>`:''}
      </details>`;
  }
  container.innerHTML=`<p class="pve-intro">Merge to grow. Battle to train. Your first adventure can begin with a Hatchling.</p>
    <div class="pve-actions" aria-label="Battle sections"><button aria-pressed="${pveSection==='campaign'}" onclick="pveSetSection('campaign')">Campaign · ${Object.keys(state.battleClears).length}/${DragonBattle.encounters.length}</button><button aria-pressed="${pveSection==='companions'}" onclick="pveSetSection('companions')">Companions &amp; training</button><button aria-pressed="${pveSection==='weekly'}" onclick="pveSetSection('weekly')">Weekly wilds</button></div>
    ${saveBlocked?'<p role="alert">Saving is paused. Resolve the save warning before training or battling.</p>':''}
    ${pveSection==='weekly'?pveWeeklyPanel(selected):''}
    <h3>Your companions <small>${roster.length}/12</small></h3><div class="pve-roster">${roster.map(d=>`<button aria-pressed="${d.training.id===pveSelected}" onclick="pveSelect(${d.training.id})">${pveArt(d)}<strong>${pveEsc(d.training.name)}</strong><small>${pveElement(d.element)} · Training ${DragonBattle.trainingLevel(d)}</small></button>`).join('')||'<p>No companions yet. Enlist one dragon from your Board below.</p>'}</div>
    ${roster.length>1?`<details class="pve-team-setup"><summary>Reserve team · ${(state.battleTeam||[]).filter(id=>id!==pveSelected).length}/2 selected</summary><p>Your selected companion leads. Switching costs a turn; a replacement after a knockout is free. Each dragon keeps its HP, stamina and cooldowns. XP is shared only among participants. Hatchling encounters stay solo.</p><div class="pve-actions">${roster.filter(d=>d.training.id!==pveSelected).map(d=>`<button aria-pressed="${(state.battleTeam||[]).includes(d.training.id)}" onclick="pveToggleReserve(${d.training.id})">${pveEsc(d.training.name)} · ${pveElement(d.element)}</button>`).join('')}</div></details>`:''}
    <details ${!roster.length?'open':''}><summary>Enlist from Board · moves one dragon, never copies</summary><p>Training, name and skills stay with a returned dragon. Trained dragons cannot be donated, dismissed, prism-changed or auto-merged. Re-enlist them here to grow. Return Roost/reserve dragons to the Board first.</p><div class="pve-enlist">${available.map(({d,index})=>`<button onclick="pveEnlist(${index})" ${roster.length>=12?'disabled':''}>${pveArt(d)}<span>${d.training?pveEsc(d.training.name):pveElement(d.element)+' '+CHAIN[d.level].name}<small>Tile ${index+1} · ${d.count} owned · Enlist one</small></span></button>`).join('')||'<p>Hatch an egg on the Board to get your first Hatchling.</p>'}</div></details>
    ${profile}<details><summary>Campaign trophies &amp; supplies</summary><p>First clear: 1 training supply, or 3 for a boss. Each supplies up to 30 XP without bypassing growth caps. Region completion unlocks a permanent cosmetic Keeper title.</p><button onclick="pveCollectSupplies()" ${!DragonBattle.encounters.some(e=>state.battleClears[e.id]&&!state.battleSupplyClaims?.[e.id])?'disabled':''}>Collect previously earned supplies</button><div class="pve-actions">${DragonBattle.regions.map(r=>`<button onclick="pveEquipTrophy('${r.id}')" ${!r.ids.every(id=>state.battleClears[id])?'disabled':''} aria-pressed="${state.battleTitle===r.id}">🏅 ${r.title} · ${r.ids.filter(id=>state.battleClears[id]).length}/${r.ids.length}</button>`).join('')}</div></details><section ${pveSection!=='campaign'?'hidden':''}><h3>Choose an encounter</h3><p>Free entry · full healing · no permanent loss. Coins are once per encounter, per save. Repeat XP is reduced for overgrown dragons; stage training caps apply.</p>
    ${pveRegions.map(region=>`<h3 class="pve-region">${region.name} <small>${region.ids.filter(id=>state.battleClears[id]).length}/${region.ids.length}</small></h3><p>${region.note}</p><div class="pve-encounters">${DragonBattle.encounters.filter(e=>region.ids.includes(e.id)).map(e=>{
      const open=DragonBattle.unlocked(e.id,state.battleClears),can=selected&&selected.level>=e.stage&&open, reward=selected?DragonBattle.reward(selected,e,!!state.battleClears[e.id]):{xp:e.xp,coins:state.battleClears[e.id]?0:e.coins};
      return `<button class="${e.boss?'pve-boss-card':''}" onclick="startPve('${e.id}')" ${!can||saveBlocked?'disabled':''}><small>${e.area}${state.battleClears[e.id]?' · ✓ Cleared':''}</small><strong>${e.boss?'♛ ':''}${e.name}</strong><span>${pveElement(e.element)} · ${e.boss?'Team boss':e.stage<3?'Short encounter':'Duel'}</span><span>${!open?'Clear '+DragonBattle.encounters.find(x=>x.id===e.requires).name+' first':`Requires ${CHAIN[e.stage].name}+ · Suggested training ${e.rank}`}</span>${e.hint?`<span>${e.hint}</span>`:''}<span>${reward.xp} shared training XP · ${reward.coins?reward.coins+' first-clear coins':'coins already claimed'}</span></button>`;
    }).join('')}</div>`).join('')}</section><details><summary>Battle guide</summary><p>Four skills share 5 stamina. Claw strike restores 1; Guard restores 2 and blocks 65% of the next hit. Heavy skills have cooldowns. Guard resolves first, otherwise faster combatants act first; ties favor you.</p><p>Fire beats Nature, Nature beats Water, Water beats Fire: +20% damage. Disadvantage is −15%. Fire burns for two turns, Water weakens the next attack, and Nature slows the next turn. Neutral is reliable against everything. The enemy's next action is shown before you choose.</p><p>Elders unlock Renewal at training 3. Growth and training levels are separate. No energy, coins, purchases or duplicate sacrifices are needed for training. Only growth uses the usual five-dragon merge. Leaving/reloading an unfinished battle grants no rewards. Fights end at 40 turns to prevent stalemates.</p></details>`;
}
function renderPveFight(container){
  const b=pveRun,p={...b.player},e={...b.enemy},active=['active','switch'].includes(b.phase)||pveBusy;
  const shownDragon=pveBusy&&pveEvent?.dragon?pveEvent.dragon:b.dragon;
  if(pveBusy&&pveEvent){Object.assign(p,pveEvent.player);Object.assign(e,pveEvent.enemy);}
  const intent=DragonBattle.intent(b), moveList=DragonBattle.moves(b.dragon);
  const nextEncounter=b.encounter.weekly?null:DragonBattle.encounters.find(e=>e.id===DragonBattle.campaignOrder[DragonBattle.campaignOrder.indexOf(b.encounter.id)+1]);
  container.innerHTML=`<div class="pve-fight-tools"><h3 id="pveFightHeading" tabindex="-1">${b.encounter.area} · Round ${pveBusy?pveAnimationRound:b.round}</h3><button onclick="pveSetSpeed()" ${pveBusy?'disabled':''} aria-label="Battle animation speed ${pveSpeed} times">${pveSpeed}×</button></div>
    <div class="pve-hud"><div><strong>${pveEsc(shownDragon.training.name)}</strong><span>${pveElement(p.element)} · Training ${DragonBattle.trainingLevel(shownDragon)}</span><progress max="${p.maxHp}" value="${p.hp}" aria-label="Your dragon HP"></progress><span>${p.hp}/${p.maxHp} HP · Stamina ${p.stamina}/5${p.guard?' · Guarded':''}</span></div><div><strong>${e.name}</strong><span>${pveElement(e.element)}</span><progress max="${e.maxHp}" value="${e.hp}" aria-label="Enemy HP"></progress><span>${e.hp}/${e.maxHp} HP${e.adds?' · '+e.adds+' wards':''}${e.burn?' · Burning':''}${e.weak?' · Weakened':''}${e.root?' · Rooted':''}${e.guard?' · Guarded':''}</span></div></div>
    <div class="pve-arena ${pveEvent?'event-'+pveEvent.actor+' event-'+pveEvent.kind:''} ${pveWindup?'is-windup':''} ${!active?'outcome-'+b.phase:''} ${b.encounter.boss?'is-boss':''} ${b.round===1&&!pveBusy?'is-arriving':''}" data-biome="${b.encounter.element}" data-element="${pveEvent?.element||'neutral'}" style="--pve-speed:${pveSpeed}" aria-label="Battlefield">
      <div class="pve-ambience" aria-hidden="true">${Array.from({length:9},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>
      <div class="pve-fighter">${pveArt(shownDragon,true)}${pveStatusArt(p,'player')}</div><div class="pve-foe">${b.encounter.boss?'<div class="pve-boss-halo" aria-hidden="true">✦</div>':''}${pveMonster(b.encounter)}${pveStatusArt(e,'enemy')}</div>
      ${pveCombatEffect(pveEvent)}
    </div><p class="pve-turn" role="status" aria-live="polite">${pveExitPrompt?'Leave this fight? Unclaimed rewards and current battle progress will be discarded; your dragon is safe.':pveBusy?pveEvent.message:active?'Enemy intent: '+intent.name+' · '+(intent.guard?'Prepare a strong next turn.':intent.power>1?'Guard can soften this hit.':'Choose your skill.'):'Encounter complete.'}</p>
    ${b.encounter.hint?`<p class="pve-boss-hint">♛ ${pveEsc(b.encounter.hint)}</p>`:''}
    ${pveExitPrompt?'<div class="pve-actions"><button onclick="closeBattleLodge(true)">Leave without rewards</button><button onclick="pveExitPrompt=false;renderBattleLodge()">Keep battling</button></div>':''}
    ${b.party?.length>1?`<div class="pve-team" aria-label="Battle team">${b.party.map((member,index)=>`<button onclick="pveMove('swap:${index}')" ${pveBusy||pveExitPrompt||saveBlocked||!DragonBattle.legal(b,'swap:'+index)?'disabled':''}><strong>${index===b.activeIndex?'◆ ':''}${pveEsc(member.dragon.training.name)}</strong><small>${pveElement(member.dragon.element)} · ${pveBusy?'Resolving…':member.player.hp+'/'+member.player.maxHp+' HP'}</small><span>${member.player.hp<=0?'Resting':index===b.activeIndex?'Active':b.phase==='switch'?'Send in · free':'Switch · uses turn'}</span></button>`).join('')}</div>`:''}
    ${b.phase==='switch'&&!pveBusy?'<p role="alert">Your active dragon needs rest. Choose a living reserve above; this replacement is free.</p>':''}
    <div class="pve-moves">${moveList.map(m=>`<button id="pveMove-${m.id}" onclick="pveMove('${m.id}')" ${pveBusy||pveExitPrompt||saveBlocked||!DragonBattle.legal(b,m.id)?'disabled':''}><strong>${m.name}</strong><span>${m.cost} stamina${m.id==='special'&&p.cooldown?' · Cooldown '+p.cooldown:''}</span><small>${m.detail}</small></button>`).join('')}</div>
    ${!active?`<section class="pve-result" id="pveResult" tabindex="-1"><h3>${b.phase==='won'?'Victory!':b.phase==='draw'?'A worthy stalemate':'A lesson, not a loss'}</h3><p>${b.phase==='won'?(b.claimed?pveRewardSummary(b.reward):'Rewards could not be saved. Keep this page open and retry after fixing storage.'):'Your companion is fully healed. No dragons, energy or coins were lost. Watch for the heavy-attack tell and Guard before it lands.'}</p>${b.phase==='won'&&!b.claimed?'<button onclick="retryPveReward()">Retry saving rewards</button>':`<div class="pve-actions"><button onclick="pveReplay('${b.encounter.id}')">${b.phase==='won'?'Train again':'Retry free'}</button>${b.phase==='won'&&nextEncounter&&b.dragon.level>=nextEncounter.stage?`<button onclick="pveReplay('${nextEncounter.id}')">Next: ${nextEncounter.name}</button>`:''}<button onclick="battleMenu()">Return to Lodge</button></div>`}</section>`:''}
    <details><summary>Recent battle log</summary><ol>${b.log.map(line=>'<li>'+pveEsc(line)+'</li>').join('')}</ol></details>`;
}
function pveStatusArt(combatant,side){
  return `<div class="pve-status-icons" aria-label="${side} effects">${combatant.guard?'<span title="Guard · blocks 65% of next hit">🛡</span>':''}${combatant.focus?'<span title="Next attack empowered">✦</span>':''}${combatant.adds?`<span title="Summoned wards absorb attacks">🌱${combatant.adds}</span>`:''}${combatant.burn?'<span title="Burning">🔥</span>':''}${combatant.weak?'<span title="Next attack weakened">💧</span>':''}${combatant.root?'<span title="Next attack slowed">🌿</span>':''}</div>${combatant.guard?'<div class="pve-shield-dome" aria-hidden="true"><svg viewBox="0 0 100 120"><path d="M50 5L90 22V60Q87 96 50 115Q13 96 10 60V22Z"/><path d="M50 25V90M27 54H73"/></svg></div>':''}`;
}
function pveRewardSummary(reward){
  const details=(reward.members||[]).map(m=>`${pveEsc(state.battleRoster.find(d=>d.training.id===m.id)?.training.name||'Companion')}: +${m.xp} XP`).join(' · ');
  return `Saved: +${reward.xp} shared training XP · +${reward.coins} coins${reward.supplies?' · +'+reward.supplies+' training supplies':''}${reward.tokens?' · +'+reward.tokens+' cosmetic token':''}.${details?'<br>'+details:''}`;
}
function pveWeeklyPanel(selected){
  const week=battleWeek(),clockBack=week.start<(state.battleWeekly?.start||0);
  return `<section class="pve-weekly"><h3>Weekly wilds</h3><p>Resets Monday: ${pveEsc(new Date(week.next).toLocaleString())}. Three optional brackets. First clear per bracket: supplies; Elder also grants one cosmetic token. Repeat victories grant training XP only. No coins or daily streak.</p>${clockBack?'<p role="alert">The clock is earlier than your last rewarded week. Practice remains available; weekly rewards resume when the calendar catches up.</p>':''}<div class="pve-encounters">${Object.keys(DragonBattle.challengeTiers).map(tier=>{const e=DragonBattle.weeklyEncounter(tier,week.rotation),claimed=state.battleWeekly?.start===week.start&&state.battleWeekly.claims[tier],can=selected&&selected.level>=e.stage&&selected.level<=e.maxStage;return `<button onclick="startPve('${e.id}')" ${!can||saveBlocked?'disabled':''}><strong>${e.name}</strong><span>${CHAIN[e.stage].name}–${CHAIN[e.maxStage].name} only · Suggested training ${e.rank}</span><span>${pveElement(e.element)} · ${e.rule}</span><span>${claimed||clockBack?'Practice · XP only':e.supplies+' supplies'+(tier==='elder'?' + 1 cosmetic token':'')}</span></button>`;}).join('')}</div></section>`;
}
function pveCombatEffect(event){
  if(!event||event.kind==='swap'||event.kind==='draw')return '';
  const self=event.self||event.kind==='heal'||event.kind==='guard',target=self?event.actor:event.actor==='player'?'enemy':'player';
  const label=event.label||(event.kind==='guard'?'GUARD':event.kind==='heal'?'+'+event.amount:event.kind==='status'?({fire:'BURN',water:'WEAKEN',nature:'ROOTED',neutral:'SPIRIT'})[event.element]:event.amount?('−'+event.amount):'');
  const roots=Array.from({length:5},(_,i)=>`<path class="pve-root" style="--i:${i}" d="M${65+i*13} 100 Q${25+i*19} 65 ${70+i*7} 25 Q${95+i*4} 5 ${85+i*9} 0"/>`).join('');
  return `<div class="pve-fx-layer fx-${event.element} fx-${event.kind} skill-${event.skill||event.kind} target-${target} ${event.blocked?'fx-blocked':''}" aria-hidden="true">
    <div class="pve-charge-ring"></div><div class="pve-projectile"><i></i><i></i><i></i></div>
    <svg class="pve-impact-art" viewBox="0 0 200 120">${event.element==='nature'?roots:event.element==='water'?'<ellipse cx="100" cy="75" rx="60" ry="25"/><ellipse cx="100" cy="75" rx="40" ry="15"/><path d="M35 85Q10 15 65 45T150 30Q192 60 160 90"/>':'<path d="M100 5L112 43 150 20 135 58 182 64 139 78 158 108 116 93 96 118 84 88 40 103 60 71 17 54 66 49 53 17 86 40Z"/>'}</svg>
    <div class="pve-sparks">${Array.from({length:12},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div>
    <strong class="pve-floating-number">${label}<small>${event.blocked?'SHIELDED':event.effective>1?'ELEMENT ADVANTAGE':''}</small></strong>
    ${event.blocked?'<div class="pve-shield-break">🛡</div>':''}
  </div>`;
}
document.getElementById('battleDialog')?.addEventListener('cancel',event=>{event.preventDefault();closeBattleLodge();});
renderBattleLodge();
