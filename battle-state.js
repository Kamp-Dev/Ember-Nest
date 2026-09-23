// Save-safe ownership and training. A roster entry is the actual dragon, not a copy.
function validateBattleState(data) {
  const roster=data.battleRoster===undefined?[]:data.battleRoster;
  const clears=data.battleClears===undefined?{}:data.battleClears;
  const next=data.battleNextId===undefined?1:data.battleNextId;
  if(!Array.isArray(roster)||roster.length>12||!roster.every(d=>d&&typeof d==='object'&&d.training)||!clears||typeof clears!=='object'||Array.isArray(clears)||
    !Object.entries(clears).every(([id,value])=>DragonBattle.encounters.some(e=>e.id===id)&&value===true)||!Number.isSafeInteger(next)||next<1)
    throw new Error('Invalid battle roster or journal.');
  const ids=new Set();
  const all=[...roster,...(data.cells||[]),...(data.perch||[]),...(data.elderReserve||[]).map(e=>e.dragon)];
  for(const d of all){
    if(!d)continue;
    if(roster.includes(d)&&!d.training)throw new Error('Roster dragon is missing training.');
    if(d.training===undefined)continue;
    const t=d.training;
    if(!t||d.count!==1||!Number.isInteger(d.level)||d.level<1||d.level>5||!DragonBattle.elements.includes(d.element||'neutral')||
      !Number.isSafeInteger(t.id)||t.id<1||t.id>=next||ids.has(t.id)||
      typeof t.name!=='string'||! /^[\p{L}\p{N} ._-]{1,24}$/u.test(t.name)||
      !Number.isSafeInteger(t.xp)||t.xp<0||t.xp>DragonBattle.threshold(12)||!['burst','mend'].includes(t.special))
      throw new Error('Invalid or duplicated trained dragon.');
    ids.add(t.id);
  }
  return true;
}
function battleTransaction(change) {
  if(state.mode!=='home'||saveBlocked)return false;
  const before=JSON.stringify(state);
  const pendingLevels=levelQueue.slice();
  try {
    if(change()===false){state=JSON.parse(before);levelQueue.splice(0,levelQueue.length,...pendingLevels);return false;}
    validateBattleState(state);
    if(save())return true;
  } catch(error){console.error('Battle change was rolled back:',error);}
  state=JSON.parse(before);
  levelQueue.splice(0,levelQueue.length,...pendingLevels);
  toast('That change was not saved. Your dragon and rewards are safe; check the save warning.');
  return false;
}
function enlistBattleDragon(index) {
  if(typeof pveRun!=='undefined'&&pveRun)return false;
  if(!Number.isInteger(index)||state.locked[index]||state.battleRoster.length>=12)return false;
  const dragon=state.cells[index];
  if(!dragon||dragon.level<1||dragon.level>5||!Number.isSafeInteger(dragon.count)||dragon.count<1)return false;
  return battleTransaction(()=>{
    const fighter={...dragon,count:1};
    if(!fighter.training)fighter.training={id:state.battleNextId++,name:CHAIN[dragon.level].name,xp:0,special:'burst'};
    if(dragon.count>1)dragon.count--;else state.cells[index]=null;
    state.battleRoster.push(fighter);
    state.highestDiscovered=Math.max(state.highestDiscovered||0,dragon.level);
  });
}
function returnBattleDragon(id) {
  if(typeof pveRun!=='undefined'&&pveRun)return false;
  const index=state.battleRoster.findIndex(d=>d.training.id===id), free=emptyOpen();
  if(index<0||!free.length){toast('Make one empty Board tile before returning your dragon.');return false;}
  return battleTransaction(()=>{state.cells[free[0]]=state.battleRoster.splice(index,1)[0];});
}
function updateBattleTraining(id,name,special) {
  if(typeof pveRun!=='undefined'&&pveRun)return false;
  const d=state.battleRoster.find(d=>d.training.id===id);
  if(!d||typeof name!=='string'||! /^[\p{L}\p{N} ._-]{1,24}$/u.test(name.trim())||!['burst','mend'].includes(special))return false;
  if(special==='mend'&&(d.level!==5||DragonBattle.trainingLevel(d)<3))return false;
  return battleTransaction(()=>{d.training.name=name.trim();d.training.special=special;});
}
function battleGrowthDonors(dragon) {
  return state.cells.map((d,index)=>({d,index})).filter(({d,index})=>d&&!d.training&&!state.locked[index]&&d.level===dragon.level&&(d.element||'neutral')===(dragon.element||'neutral'));
}
function growBattleDragon(id) {
  if(typeof pveRun!=='undefined'&&pveRun)return false;
  const d=state.battleRoster.find(d=>d.training.id===id);
  if(!d||d.level>=5)return false;
  const donors=battleGrowthDonors(d);
  if(donors.reduce((sum,{d})=>sum+d.count,0)<4)return false;
  return battleTransaction(()=>{
    let remaining=4;
    for(const {d:donor,index}of donors){const used=Math.min(remaining,donor.count);donor.count-=used;remaining-=used;if(used&&donor.shiny)d.shiny=true;if(!donor.count)state.cells[index]=null;if(!remaining)break;}
    d.level++;
    if(d.level===2&&(!d.element||d.element==='neutral'))d.element=['fire','water','nature'][Math.floor(Math.random()*3)];
    state.highestDiscovered=Math.max(state.highestDiscovered||0,d.level);
    discover(d.level);
    if(d.shiny)discoverRare(d.level);
    if(d.level===4)completeHearthGoal();
    recordElementDiscovery(d);
    const payout=Math.round((80+d.level*45)*bonus()*(d.shiny?2:1));
    state.coins+=payout;
    addXp(15+d.level*10,true);
    contractEvent('earn',payout);
    contractEvent('merge',1);contractEvent('nurture',1,d.level);
  });
}
function settleBattleReward(run) {
  if(!run||run.phase!=='won'||run.claimed)return false;
  const dragon=state.battleRoster.find(d=>d.training.id===run.dragon.training.id);
  if(!dragon)return false;
  const reward=DragonBattle.reward(dragon,run.encounter,!!state.battleClears[run.encounter.id]);
  const ok=battleTransaction(()=>{
    dragon.training.xp+=reward.xp;
    state.coins+=reward.coins;
    state.battleClears[run.encounter.id]=true;
  });
  if(ok){run.claimed=true;run.reward=reward;}
  return ok;
}
