// Pure PvE rules: no DOM, timers, storage, or permanent-state mutations.
const DragonBattle = (() => {
  const elements = ['neutral','fire','water','nature'];
  const caps = [0,3,5,7,9,12];
  const roles={fire:'Pressure · burns and empowered strikes',water:'Protector · wards and weakened attacks',nature:'Warden · healing and control',neutral:'Vanguard · reliable damage and shield breaking'};
  const techniques=['element','precision','support'];
  function techniqueOptions(dragon){
    const element=dragon.element||'neutral';
    return [
      {id:'element',name:{fire:'Flame breath',water:'Tidal surge',nature:'Grasping roots',neutral:'Spirit pulse'}[element],rank:1},
      {id:'precision',name:{fire:'Searing lance',water:'Ice needle',nature:'Binding thorn',neutral:'Shattering pulse'}[element],rank:2},
      {id:'support',name:{fire:'Stoke the flame',water:'Tide veil',nature:'Regrowth',neutral:'Center spirit'}[element],rank:3},
    ];
  }
  const encounters = [
    {id:'meadow',name:'Mossling',area:'Meadow path',stage:1,rank:1,element:'nature',hp:52,attack:8,speed:8,xp:22,coins:35,kind:'moss'},
    {id:'brook',name:'Brook Wisp',area:'Moonlit brook',stage:2,rank:1,element:'water',hp:96,attack:15,speed:13,xp:32,coins:60,kind:'wisp'},
    {id:'cinder',name:'Cinderling',area:'Cinder hollow',stage:3,rank:2,element:'fire',hp:165,attack:24,speed:16,xp:44,coins:90,kind:'cinder'},
    {id:'thicket',name:'Thorn Guardian',area:'Ancient thicket',stage:4,rank:3,element:'nature',hp:246,attack:34,speed:18,xp:56,coins:140,kind:'moss'},
    {id:'sentinel',name:'Stone Sentinel',area:'Elder proving ground',stage:5,rank:1,element:'neutral',hp:290,attack:35,speed:17,xp:76,coins:220,kind:'stone'},
    {id:'tempest',name:'Tempest Warden',area:'Storm summit',stage:5,rank:6,element:'water',hp:470,attack:57,speed:22,xp:96,coins:320,kind:'wisp'},
    {id:'heartwood',name:'Heartwood Ancient',area:'Heart of the grove',stage:5,rank:9,element:'nature',hp:555,attack:62,speed:24,xp:116,coins:450,kind:'moss'},
    {id:'inferno',name:'Inferno Sovereign',area:'The last ember',stage:5,rank:12,element:'fire',hp:650,attack:62,speed:27,xp:140,coins:600,kind:'cinder'},
    {id:'bastion',name:'Runestone Bastion',area:'Gate of echoes',stage:5,rank:3,element:'neutral',hp:640,attack:48,speed:15,xp:90,coins:180,kind:'stone',boss:true,mechanic:'barrier',hint:'Use a precision technique to strike through the granite barrier.'},
    {id:'torrent',name:'Leviathan of the Pool',area:'Moonpool depths',stage:5,rank:9,element:'water',hp:980,attack:62,speed:19,xp:120,coins:240,kind:'wisp',boss:true,mechanic:'charge',hint:'The charged wave is slow: a precision hit interrupts it before impact.'},
    {id:'briar',name:'Briarheart Regent',area:'Throne of thorns',stage:5,rank:12,element:'nature',hp:1080,attack:67,speed:20,xp:135,coins:260,kind:'moss',boss:true,mechanic:'summons',hint:'Thorn wards absorb attacks. Precision or heavy skills clear both at once.'},
    {id:'eclipse',name:'Eclipse of the Wilds',area:'Crown of the mountain',stage:5,rank:12,element:'fire',hp:1380,attack:75,speed:22,xp:160,coins:360,kind:'cinder',boss:true,mechanic:'eclipse',hint:'Its element rotates each round. Swap to a counter; Guard the eclipse burst.'},
  ];
  const regions=[{name:'First footsteps',ids:['meadow','brook','cinder']},{name:'Ancient guardians',ids:['thicket','sentinel','bastion']},{name:'Moonpool depths',ids:['tempest','heartwood','torrent']},{name:'Crown of the mountain',ids:['inferno','briar','eclipse']}];
  const campaignOrder=regions.flatMap(r=>r.ids);
  regions.forEach((r,index)=>{r.id=['trail','guardian','moonpool','crown'][index];r.title=['Trailblazer','Runestone Keeper','Moonpool Champion','Crown of the Wilds'][index];});
  campaignOrder.forEach((id,index)=>{encounters.find(e=>e.id===id).requires=campaignOrder[index-1]||null;});
  function unlocked(id,clears={}){const e=encounters.find(e=>e.id===id);return !!e&&(!!clears[id]||!e.requires||!!clears[e.requires]);}
  const challengeTiers={scout:{name:'Little wings',stage:1,maxStage:2,rank:3,hp:105,attack:12,speed:10,xp:26,supplies:1},veteran:{name:'Rising guardians',stage:3,maxStage:4,rank:5,hp:430,attack:35,speed:16,xp:60,supplies:2},elder:{name:'Elder summit',stage:5,maxStage:5,rank:8,hp:900,attack:60,speed:19,xp:100,supplies:3}};
  function weeklyEncounter(tier,rotation){
    if(!Object.prototype.hasOwnProperty.call(challengeTiers,tier)||!Number.isInteger(rotation)||rotation<0||rotation>3)return null;
    const base=challengeTiers[tier],element=['nature','water','fire','neutral'][rotation],kind=['moss','wisp','cinder','stone'][rotation];
    return {...base,id:'weekly-'+tier,area:'Weekly wilds',element,kind,coins:0,weekly:true,tier,rotation,
      hp:Math.round(base.hp*(rotation===3?1.15:1)),attack:Math.round(base.attack*(rotation===2?1.1:1)),speed:base.speed+(rotation===1?4:0),
      openingGuard:rotation===0,rule:['Braced opening · break the first shield','Fleet foes · +4 enemy speed','Fierce foes · +10% attack','Sturdy foes · +15% HP'][rotation],
      mechanic:tier==='elder'?['barrier','charge','summons','eclipse'][rotation]:undefined};
  }
  const threshold = level => 10*(level-1)*(level+4);
  function trainingLevel(dragon) {
    const xp = dragon.training?.xp || 0;
    let level=1;
    while(level<caps[dragon.level] && xp>=threshold(level+1)) level++;
    return level;
  }
  function stats(dragon) {
    const rank=trainingLevel(dragon), stage=dragon.level;
    return {maxHp:Math.round([0,72,110,156,208,268][stage]*(1+(rank-1)*.075)),
      attack:Math.round([0,13,20,27,35,43][stage]*(1+(rank-1)*.06)),speed:10+stage+Math.floor(rank/2)};
  }
  function moves(dragon) {
    const element=dragon.element||'neutral', rank=trainingLevel(dragon);
    const elemental={neutral:'Spirit pulse',fire:'Flame breath',water:'Tidal surge',nature:'Grasping roots'}[element];
    const result=[
      {id:'strike',name:'Claw strike',cost:0,power:1,element:'neutral',detail:'Reliable hit · recover 1 stamina'},
      {id:'element',name:elemental,cost:2,power:1.5,element,detail:{neutral:'Focused hit',fire:'Burn: 2 turns',water:'Weaken next attack',nature:'Root: slow + restore 6% HP'}[element]},
      {id:'guard',name:'Guard & focus',cost:0,priority:true,detail:'Block 65% of the next hit · recover 2 stamina'},
    ];
    const technique=dragon.training?.technique||'element';
    if(technique==='precision'&&rank>=2)result[1]={id:'element',name:techniqueOptions(dragon)[1].name,cost:2,power:1.1,element,pierce:true,interrupt:true,detail:'Ignore shields · interrupt a charged attack · no elemental status'};
    if(technique==='support'&&rank>=3)result[1]={id:'element',name:techniqueOptions(dragon)[2].name,cost:2,element,support:true,priority:true,
      healPct:element==='nature'?.18:element==='water'?.08:0,ward:element==='water'||element==='neutral',focus:element==='fire',
      detail:{fire:'Empower your next hit by 35%',water:'Guard + heal 8% HP',nature:'Heal 18% HP',neutral:'Cleanse weakness and raise Guard'}[element]};
    if(dragon.level===5 && rank>=3 && dragon.training?.special==='mend')
      result.push({id:'special',name:'Renewal',cost:3,heal:true,detail:'Heal 28% HP · 3-turn cooldown'});
    else if(rank>=4&&dragon.training?.special==='rally')result.push({id:'special',name:'Rallying call',cost:3,rally:true,priority:true,element,detail:'Heal team 12% HP · 3-turn cooldown'});
    else result.push({id:'special',name:dragon.level===5?'Elder awakening':'Brave pounce',cost:3,power:dragon.level===5?2.2:1.75,element,
      detail:'Heavy hit · 3-turn cooldown'});
    return result;
  }
  function advantage(attacker,defender) {
    if(({fire:'nature',nature:'water',water:'fire'})[attacker]===defender)return 1.2;
    if(({fire:'nature',nature:'water',water:'fire'})[defender]===attacker)return .85;
    return 1;
  }
  function create(dragon,encounterId,reserves=[],challenge=null) {
    const encounter=challenge?weeklyEncounter(challenge.tier,challenge.rotation):encounters.find(e=>e.id===encounterId);
    if(challenge&&encounter?.id!==encounterId)return null;
    if(!encounter || !Number.isInteger(dragon?.level) || dragon.level<encounter.stage || dragon.level>5 || !elements.includes(dragon.element||'neutral'))return null;
    if(!Array.isArray(reserves)||reserves.length>2||encounter.stage===1&&reserves.length||reserves.some(d=>!d||d.level<encounter.stage||d.level>5||!elements.includes(d.element||'neutral'))||new Set([dragon,...reserves].map(d=>d.training?.id)).size!==reserves.length+1)return null;
    if(encounter.maxStage&&[dragon,...reserves].some(d=>d.level>encounter.maxStage))return null;
    const d=JSON.parse(JSON.stringify(dragon)), s=stats(d);
    const battle={phase:'active',round:1,encounter,dragon:d,player:{...s,hp:s.maxHp,element:d.element||'neutral',stamina:5,cooldown:0,guard:false,burn:0,weak:0,root:0},
      enemy:{...encounter,maxHp:encounter.hp,guard:encounter.mechanic==='barrier'||!!encounter.openingGuard,adds:encounter.mechanic==='summons'?2:0,burn:0,weak:0,root:0},events:[],log:['Choose a skill. Your dragon heals fully after every encounter.']};
    battle.activeIndex=0;
    battle.party=[{dragon:d,player:battle.player,participated:true},...reserves.map(original=>{const dragon=JSON.parse(JSON.stringify(original)),s=stats(dragon);return {dragon,player:{...s,hp:s.maxHp,element:dragon.element||'neutral',stamina:5,cooldown:0,guard:false,burn:0,weak:0,root:0},participated:false};})];
    return battle;
  }
  function intent(battle) {
    const mechanic=battle.encounter.mechanic,turn=(battle.round-1)%4;
    if(mechanic==='barrier')return [{name:'Rebuild granite barrier',guard:true},{name:'Runestone fist',power:1},{name:'Monolith crash',power:2},{name:'Fractured recovery',power:.6}][turn];
    if(mechanic==='charge')return [{name:'Gather moonwater',guard:true},{name:'Pressure jet',power:1},{name:'Charged tidal wave',power:2.6,slow:true},{name:'Spent current',power:.6}][turn];
    if(mechanic==='summons')return [{name:battle.round%8===1?'Summon two thorn wards':'Bark shield',guard:true,summon:battle.round%8===1},{name:'Thorn volley',power:1.1},{name:'Crown of thorns',power:1.9},{name:'Exposed roots',power:.65}][turn];
    if(mechanic==='eclipse')return [{name:'Eclipse claw',power:1},{name:'Celestial ward',guard:true},{name:'Eclipse burst',power:2.3,slow:true},{name:'Fading light',power:.7}][turn];
    // The first encounter teaches the basic rhythm; later families have tells.
    if(battle.encounter.id!=='meadow') {
      const turn=(battle.round-1)%4, kind=battle.encounter.kind;
      if(kind==='wisp')return [{name:'Gathering tide',guard:true},{name:'Tidal crash',power:1.8},{name:'Water dart',power:.8},{name:'Ripple strike',power:1.1}][turn];
      if(kind==='stone')return [{name:'Stone fist',power:1},{name:'Granite shell',guard:true},{name:'Seismic slam',power:1.9},{name:'Crumbling strike',power:.65}][turn];
      if(kind==='moss')return [{name:'Vine lash',power:1},{name:'Bark ward',guard:true},{name:'Root eruption',power:1.7},{name:'Thorn sweep',power:.85}][turn];
      if(kind==='cinder')return [{name:'Ember bite',power:.85},{name:'Stoking embers',guard:true},{name:'Inferno breath',power:1.9},{name:'Cooling embers',power:.65}][turn];
    }
    if(battle.round%3===0)return {name:'Heavy attack',power:1.9};
    if(battle.round%3===2)return {name:'Brace',guard:true};
    return {name:'Quick attack',power:1};
  }
  function legal(battle,id) {
    if(typeof id==='string'&&/^swap:[0-2]$/.test(id)){const index=Number(id.slice(5));return ['active','switch'].includes(battle.phase)&&index!==battle.activeIndex&&!!battle.party?.[index]&&battle.party[index].player.hp>0;}
    const move=moves(battle.dragon).find(m=>m.id===id);
    return battle.phase==='active' && !!move && battle.player.stamina>=move.cost && !(id==='special'&&battle.player.cooldown>0);
  }
  function resolve(battle,id) {
    if(!legal(battle,id))return false;
    battle.events=[];
    const switching=id.startsWith('swap:'),forced=battle.phase==='switch';
    const move=switching?{id:'swap',cost:0,priority:true}:moves(battle.dragon).find(m=>m.id===id), enemyMove={...intent(battle)};
    let player=battle.player;
    let enemyActed=false;
    const enemy=battle.enemy;
    const emit=(actor,kind,message,element='neutral',extra={})=>{battle.events.push({actor,kind,message,element,playerHp:player.hp,enemyHp:enemy.hp,player:{...player},enemy:{...enemy},dragon:JSON.parse(JSON.stringify(battle.dragon)),activeIndex:battle.activeIndex,...extra});battle.log.push(message);};
    const end=()=>{
      if(player.hp<=0||enemy.hp<=0){battle.phase=enemy.hp<=0&&player.hp>0?'won':battle.party.some(x=>x.player.hp>0)?'switch':'lost';return true;}
      return false;
    };
    function hit(actor,target,power,element,side){
      if(side==='player'&&enemy.adds>0){const removed=Math.min(enemy.adds,move.pierce||power>=1.7?2:1);enemy.adds-=removed;emit('player','hit',move.name+' clears '+removed+' thorn ward'+(removed>1?'s':'')+'.',element,{amount:0,skill:move.id,label:'WARD BROKEN'});return false;}
      const pierce=side==='player'&&move.pierce;
      const guarded=target.guard&&!pierce, before=target.hp;
      const damage=Math.max(1,Math.round(actor.attack*power*advantage(element,target.element)*(actor.weak?.75:1)*(actor.focus?1.35:1)*(target.guard&&!pierce?.35:1)));
      target.hp=Math.max(0,target.hp-damage);target.guard=false;actor.weak=0;actor.focus=0;
      emit(side,'hit',`${side==='player'?move.name:enemyMove.name}: ${damage} damage.${guarded?' Shield absorbed 65%.':''}`,element,{amount:before-target.hp,blocked:guarded,skill:side==='player'?move.id:'enemy',effective:advantage(element,target.element)});
      return true;
    }
    function playerTurn(){
      if(switching){battle.activeIndex=Number(id.slice(5));const member=battle.party[battle.activeIndex];member.participated=true;battle.dragon=member.dragon;player=battle.player=member.player;battle.phase='active';emit('player','swap',member.dragon.training.name+' enters the battle.',player.element);return;}
      player.stamina-=move.cost;
      if(move.id==='guard'){player.guard=true;player.stamina=Math.min(5,player.stamina+2);emit('player','guard','Guard raised. +2 stamina.');}
      else if(move.support){
        const amount=Math.min(player.maxHp-player.hp,Math.round(player.maxHp*move.healPct));player.hp+=amount;
        if(move.ward)player.guard=true;if(move.focus)player.focus=1;if(move.element==='neutral')player.weak=0;
        emit('player',amount?'heal':move.ward?'guard':'status',move.name+': '+move.detail,move.element,{amount,label:move.focus?'EMPOWERED':undefined,self:true});
      }
      else if(move.rally){let amount=0;for(const member of battle.party){if(member.player.hp<=0)continue;const healed=Math.min(member.player.maxHp-member.player.hp,Math.round(member.player.maxHp*.12));member.player.hp+=healed;amount+=healed;}emit('player','heal','Rallying call restores '+amount+' team HP.',elementOf(player),{amount});}
      else if(move.heal){const old=player.hp;player.hp=Math.min(player.maxHp,player.hp+Math.round(player.maxHp*.28));emit('player','heal',`Renewal restores ${player.hp-old} HP.`,'nature',{amount:player.hp-old});}
      else {
        const landed=hit(player,enemy,move.power,move.element,'player');
        if(landed&&move.interrupt&&!enemyActed&&enemyMove.power>1){enemyMove.power*=.45;emit('player','status','Charge interrupted · incoming attack weakened.',move.element,{label:'INTERRUPTED'});}
        if(id==='strike')player.stamina=Math.min(5,player.stamina+1);
        if(landed&&id==='element'&&!move.pierce&&enemy.hp>0){
          if(move.element==='fire')enemy.burn=2;
          if(move.element==='water')enemy.weak=1;
          if(move.element==='nature'){
            enemy.root=1;
            const healed=Math.min(player.maxHp-player.hp,Math.round(player.maxHp*.06));
            player.hp+=healed;
            if(healed)emit('player','heal',`Living roots restore ${healed} HP.`,'nature',{amount:healed});
          }
          emit('player','status',{fire:'Burn applied · 2 turns.',water:'Weaken applied · next attack reduced.',nature:'Roots applied · next attack slowed.',neutral:'Spirit pulse lands.'}[move.element],move.element);
        }
      }
      if(id==='special')player.cooldown=4;
    }
    if(forced){playerTurn();return true;}
    function enemyTurn(){
      enemyActed=true;
      if(enemyMove.guard){enemy.guard=true;if(enemyMove.summon)enemy.adds=2;emit('enemy','guard',enemyMove.summon?'Two thorn wards rise.':`${enemy.name} braces for the next hit.`);}
      else hit(enemy,player,enemyMove.power,enemy.element,'enemy');
    }
    // Guard resolves first; otherwise speed determines order. Ties favor the player.
    const first=move.priority || (!enemyMove.guard && player.speed>=(enemy.speed-(enemy.root?8:0)-(enemyMove.slow?20:0)));
    if(!enemyMove.guard)enemy.root=0;
    for(const action of first?[playerTurn,enemyTurn]:[enemyTurn,playerTurn]){action();if(end())break;}
    if(battle.phase==='active' && enemy.burn){enemy.burn--;const damage=Math.max(2,Math.round(player.attack*.16));enemy.hp=Math.max(0,enemy.hp-damage);emit('player','burn',`Burn deals ${damage} damage.`,'fire',{amount:damage});end();}
    for(const member of battle.party)member.player.cooldown=Math.max(0,member.player.cooldown-1);
    if(battle.phase==='active' && battle.round>=40){battle.phase='draw';emit('player','draw','The encounter ends in a draw. Retry free.');}
    battle.round++;
    if(battle.encounter.mechanic==='eclipse')enemy.element=['fire','water','nature'][(battle.round-1)%3];
    battle.log=battle.log.slice(-8);
    return true;
  }
  function reward(dragon,encounter,cleared,participants=1) {
    const gap=Math.max(0,dragon.level-encounter.stage);
    const xp=trainingLevel(dragon)>=caps[dragon.level]?0:Math.max(1,Math.round(encounter.xp/(1+gap*2)));
    return {xp:Math.min(Math.floor(xp/Math.max(1,participants)),Math.max(0,threshold(caps[dragon.level])-dragon.training.xp)),coins:cleared?0:encounter.coins};
  }
  const elementOf=actor=>actor.element||'neutral';
  return {elements,caps,roles,techniques,techniqueOptions,encounters,regions,campaignOrder,unlocked,challengeTiers,weeklyEncounter,threshold,trainingLevel,stats,moves,advantage,create,intent,legal,resolve,reward};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=DragonBattle;
