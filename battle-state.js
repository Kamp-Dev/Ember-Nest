// Save-safe ownership and training. A roster entry is the actual dragon, not a copy.
function validateBattleState(data) {
  const roster=data.battleRoster===undefined?[]:data.battleRoster;
  const clears=data.battleClears===undefined?{}:data.battleClears;
  const next=data.battleNextId===undefined?1:data.battleNextId;
  const team=data.battleTeam===undefined?[]:data.battleTeam;
  const supplies=data.battleSupplies===undefined?0:data.battleSupplies,claims=data.battleSupplyClaims===undefined?{}:data.battleSupplyClaims;
  const weekly=data.battleWeekly===undefined?{start:0,claims:{}}:data.battleWeekly;
  if(!weekly||!Number.isSafeInteger(weekly.start)||weekly.start<0||weekly.start>8640000000000000||!weekly.claims||typeof weekly.claims!=='object'||Array.isArray(weekly.claims)||Object.entries(weekly.claims).some(([id,v])=>!Object.prototype.hasOwnProperty.call(DragonBattle.challengeTiers,id)||v!==true))throw new Error('Invalid weekly battle rewards.');
  if(!Number.isSafeInteger(supplies)||supplies<0||supplies>1000000||!claims||typeof claims!=='object'||Array.isArray(claims)||Object.entries(claims).some(([id,value])=>!DragonBattle.encounters.some(e=>e.id===id)||value!==true||clears[id]!==true))throw new Error('Invalid battle supplies.');
  if(data.battleTitle!=null&&!DragonBattle.regions.some(r=>r.id===data.battleTitle&&r.ids.every(id=>clears[id]===true)))throw new Error('Invalid battle trophy title.');
  if(!Array.isArray(team)||team.length>2||new Set(team).size!==team.length||team.some(id=>!Number.isSafeInteger(id)||!Array.isArray(roster)||!roster.some(d=>d?.training?.id===id)))throw new Error('Invalid battle reserve team.');
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
      !Number.isSafeInteger(t.xp)||t.xp<0||t.xp>DragonBattle.threshold(12)||!['burst','mend','rally'].includes(t.special)||
      t.technique!==undefined&&!DragonBattle.techniques.includes(t.technique))
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
  return battleTransaction(()=>{state.cells[free[0]]=state.battleRoster.splice(index,1)[0];state.battleTeam=(state.battleTeam||[]).filter(value=>value!==id);});
}
function toggleBattleReserve(id){
  if(typeof pveRun!=='undefined'&&pveRun||!state.battleRoster.some(d=>d.training.id===id))return false;
  const team=state.battleTeam||[];
  if(!team.includes(id)&&team.length>=2)return false;
  return battleTransaction(()=>{state.battleTeam=team.includes(id)?team.filter(value=>value!==id):[...team,id];});
}
function updateBattleTraining(id,name,special,technique) {
  if(typeof pveRun!=='undefined'&&pveRun)return false;
  const d=state.battleRoster.find(d=>d.training.id===id);
  if(!d||typeof name!=='string'||! /^[\p{L}\p{N} ._-]{1,24}$/u.test(name.trim())||!['burst','mend','rally'].includes(special))return false;
  if(special==='mend'&&(d.level!==5||DragonBattle.trainingLevel(d)<3))return false;
  if(special==='rally'&&DragonBattle.trainingLevel(d)<4)return false;
  technique=technique||d.training.technique||'element';
  const option=DragonBattle.techniqueOptions(d).find(x=>x.id===technique);
  if(!option||DragonBattle.trainingLevel(d)<option.rank)return false;
  return battleTransaction(()=>{d.training.name=name.trim();d.training.special=special;d.training.technique=technique;});
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
  const members=(run.party||[{dragon:run.dragon,participated:true}]).filter(m=>m.participated);
  const dragons=members.map(member=>state.battleRoster.find(d=>d.training.id===member.dragon.training.id));
  if(!dragons.length||dragons.some(d=>!d))return false;
  if(run.encounter.weekly&&(!Number.isSafeInteger(run.weekStart)||run.weekStart<0))return false;
  const grants=dragons.map(d=>({id:d.training.id,...DragonBattle.reward(d,run.encounter,run.encounter.weekly||!!state.battleClears[run.encounter.id],dragons.length)}));
  const reward={xp:grants.reduce((sum,r)=>sum+r.xp,0),coins:grants[0].coins,members:grants};
  const ok=battleTransaction(()=>{
    dragons.forEach((d,i)=>d.training.xp+=grants[i].xp);
    state.coins+=reward.coins;
    if(run.encounter.weekly){
      const weekly=state.battleWeekly||{start:0,claims:{}};
      if(run.weekStart>weekly.start)state.battleWeekly={start:run.weekStart,claims:{}};
      else state.battleWeekly=weekly;
      reward.supplies=0;reward.tokens=0;
      if(run.weekStart===state.battleWeekly.start&&!state.battleWeekly.claims[run.encounter.tier]){
        state.battleWeekly.claims[run.encounter.tier]=true;reward.supplies=run.encounter.supplies;state.battleSupplies=(state.battleSupplies||0)+reward.supplies;
        if(run.encounter.tier==='elder'){reward.tokens=1;state.contractTokens=(state.contractTokens||0)+1;}
      }
    }else{state.battleClears[run.encounter.id]=true;reward.supplies=grantBattleSupplies();}
  });
  if(ok){run.claimed=true;run.reward=reward;}
  return ok;
}
function grantBattleSupplies(){
  state.battleSupplyClaims=state.battleSupplyClaims||{};
  let added=0;
  for(const e of DragonBattle.encounters)if(state.battleClears[e.id]&&!state.battleSupplyClaims[e.id]){added+=e.boss?3:1;state.battleSupplyClaims[e.id]=true;}
  state.battleSupplies=(state.battleSupplies||0)+added;return added;
}
function collectBattleSupplies(){
  if(typeof pveRun!=='undefined'&&pveRun)return false;
  return battleTransaction(()=>{if(!grantBattleSupplies())return false;});
}
function useBattleSupply(id){
  if(typeof pveRun!=='undefined'&&pveRun)return false;
  const dragon=state.battleRoster.find(d=>d.training.id===id);
  if(!dragon||(state.battleSupplies||0)<1)return false;
  const xp=Math.min(30,DragonBattle.threshold(DragonBattle.caps[dragon.level])-dragon.training.xp);
  if(xp<=0)return false;
  return battleTransaction(()=>{state.battleSupplies--;dragon.training.xp+=xp;});
}
function equipBattleTitle(id){
  if(typeof pveRun!=='undefined'&&pveRun)return false;
  const region=DragonBattle.regions.find(r=>r.id===id);
  if(!region||!region.ids.every(key=>state.battleClears[key]))return false;
  return battleTransaction(()=>{state.battleTitle=state.battleTitle===id?null:id;state.keeper.masteryTitle=null;state.keeper.collectionTitle=null;});
}
function battleWeek(now=Date.now()){
  const week=contractWeek(now),parts=week.key.split('-').map(Number);
  const start=new Date(parts[0],parts[1]-1,parts[2]).getTime();
  // Calendar date in UTC keeps rotation stable across daylight-saving changes.
  const rotation=((Math.floor(Date.UTC(parts[0],parts[1]-1,parts[2])/604800000)%4)+4)%4;
  return {...week,start,rotation};
}
