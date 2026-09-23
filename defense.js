// Temporary battle controller. Does not write state, localStorage, or rewards.
let defenseBattle=null, defenseSelected=0, defenseRole='fire';
function defenseText(id,text){const el=document.getElementById(id);if(el&&el.textContent!==text)el.textContent=text;}
function openDefense(){
  if(state.mode!=='home'){toast('Leave the Ash Trial before entering Defense.');return;}
  if(highestOwned()<2){toast('Discover a Wyrmling to unlock Sanctuary Defense.');return;}
  defenseBattle=SanctuaryDefense.create();defenseSelected=0;defenseRole='fire';
  renderDefense();document.getElementById('defenseDialog').showModal();
}
function closeDefense(){defenseBattle=null;document.getElementById('defenseDialog').close();document.getElementById('defenseEnter')?.focus();}
function defenseAction(action,value){
  const s=defenseBattle;if(!s)return;
  if(action==='pad'&&Number.isInteger(value)&&value>=0&&value<6){defenseSelected=value;if(s.towers[value])defenseRole=s.towers[value].role;}
  if(action==='role'&&Object.hasOwn(SanctuaryDefense.roles,value))defenseRole=value;
  if(action==='deploy')SanctuaryDefense.deploy(s,defenseSelected,defenseRole);
  if(action==='upgrade')SanctuaryDefense.upgrade(s,defenseSelected);
  if(action==='recall')SanctuaryDefense.recall(s,defenseSelected);
  if(action==='wave')SanctuaryDefense.startWave(s);
  if(action==='pause')s.phase==='paused'?SanctuaryDefense.resume(s):SanctuaryDefense.pause(s);
  if(action==='retry'&&(s.phase==='won'||s.phase==='lost')){defenseBattle=SanctuaryDefense.create();defenseSelected=0;}
  renderDefense();
}
function renderDefense(){
  const s=defenseBattle;if(!s)return;
  const D=SanctuaryDefense,t=s.towers[defenseSelected],cost=D.upgradeCost(t),editable=s.phase==='build'||s.phase==='wave';
  defenseText('defenseStats',`Nest ${s.health}/12 · Battle energy ${s.energy} · Wave ${s.wave}/5`);
  const next=D.waveNames[s.wave]||'Final wave';
  const messages={build:`Prepare: ${next}. Place or upgrade dragons, then start the wave.`,wave:`Wave ${s.wave}: ${D.waveNames[s.wave-1]}. You can deploy and upgrade during battle.`,paused:'Paused. Resume when you are ready.',won:'Sanctuary defended! All five waves cleared. Free replay available.',lost:'The nest fell. Try different placements and upgrade priorities. Retry is free.'};
  defenseText('defenseMessage',messages[s.phase]);
  const padLayer=document.getElementById('defensePads');
  if(!padLayer.children.length)padLayer.innerHTML=D.pads.map((p,i)=>`<button class="defense-pad" style="left:${p[0]}%;top:${p[1]}%" onclick="defenseAction('pad',${i})"></button>`).join('');
  D.pads.forEach((p,i)=>{
    const node=padLayer.children[i],tower=s.towers[i];
    node.classList.toggle('selected',i===defenseSelected);node.setAttribute('aria-pressed',String(i===defenseSelected));
    node.setAttribute('aria-label',`Perch ${i+1}: ${tower?D.roles[tower.role].name+' rank '+tower.rank:'empty'}`);
    renderStableMarkup(node,`${tower?dragonSvg(2,44,1,false,tower.role):'<span>＋</span>'}<small>${i+1}${tower?' · '+tower.rank:''}</small>`);
  });
  for(const role of Object.keys(D.roles))document.getElementById('defenseRole-'+role)?.setAttribute('aria-pressed',String(role===defenseRole));
  defenseText('defenseRoleInfo',D.roles[defenseRole].description);
  defenseText('defenseSelection',`Perch ${defenseSelected+1}: ${t?D.roles[t.role].name+' · rank '+t.rank:'empty'}`);
  const range=document.getElementById('defenseRange');
  range.setAttribute('cx',D.pads[defenseSelected][0]);range.setAttribute('cy',D.pads[defenseSelected][1]);
  range.setAttribute('r',D.roles[t?.role||defenseRole].range+((t?.rank||1)-1)*2);
  const button=(id,label,disabled)=>{const el=document.getElementById(id);if(el){defenseText(id,label);el.disabled=disabled;}};
  button('defenseDeploy',`Deploy ${D.roles[defenseRole].name} · 20 energy`,!editable||!!t||s.energy<20);
  button('defenseUpgrade',!t?'Select a deployed dragon':cost===null?'Upgrade · maximum rank':`Upgrade · ${cost} energy`,!editable||!t||cost===null||s.energy<cost);
  button('defenseRecall',t?`Recall · refund ${t.spent}`:'Recall',s.phase!=='build'||!t);
  button('defenseWave',`Start wave ${Math.min(5,s.wave+1)}`,s.phase!=='build'||!s.towers.some(Boolean));
  button('defensePause',s.phase==='paused'?'Resume':'Pause',!['wave','paused'].includes(s.phase));
  document.getElementById('defenseRetry').hidden=!['won','lost'].includes(s.phase);
  const icons={scout:'●',runner:'◆',armored:'⬟',boss:'♛'};
  const layer=document.getElementById('defenseEnemies'),liveIds=new Set(s.enemies.map(e=>String(e.id)));
  for(const node of Array.from(layer.children))if(!liveIds.has(node.dataset.enemy))node.remove();
  for(const e of s.enemies){
    let node=layer.querySelector(`[data-enemy="${e.id}"]`);
    if(!node){node=document.createElement('span');node.dataset.enemy=String(e.id);node.innerHTML=`<span>${icons[e.kind]}</span><i></i>`;layer.appendChild(node);}
    const p=D.position(e.distance);node.className=`defense-enemy ${e.kind} ${e.slow>0?'slowed':''} ${e.root>0?'rooted':''}`;
    node.style.left=p[0]+'%';node.style.top=p[1]+'%';node.title=e.kind+': '+Math.ceil(e.hp)+' health';
    node.querySelector('i').style.setProperty('--health',Math.max(0,e.hp/e.maxHp)*100+'%');
  }
  document.getElementById('defenseShots').innerHTML=s.shots.map(shot=>`<line x1="${shot.from[0]}" y1="${shot.from[1]}" x2="${shot.to[0]}" y2="${shot.to[1]}" class="shot-${shot.role}"/>`).join('');
}
document.getElementById('defenseDialog')?.addEventListener('cancel',()=>{defenseBattle=null;});
document.getElementById('defenseDialog')?.addEventListener('close',()=>{defenseBattle=null;});
document.addEventListener?.('visibilitychange',()=>{if(defenseBattle&&document.hidden){SanctuaryDefense.pause(defenseBattle);renderDefense();}});
setInterval(()=>{
  if(!defenseBattle||document.hidden||defenseBattle.phase!=='wave')return;
  SanctuaryDefense.tick(defenseBattle,.1);renderDefense();
},100);
