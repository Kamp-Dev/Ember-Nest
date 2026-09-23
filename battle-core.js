// Pure PvE rules: no DOM, timers, storage, or permanent-state mutations.
const DragonBattle = (() => {
  const elements = ['neutral','fire','water','nature'];
  const caps = [0,3,5,7,9,12];
  const encounters = [
    {id:'meadow',name:'Mossling',area:'Meadow path',stage:1,rank:1,element:'nature',hp:52,attack:8,speed:8,xp:22,coins:35,kind:'moss'},
    {id:'brook',name:'Brook Wisp',area:'Moonlit brook',stage:2,rank:1,element:'water',hp:96,attack:15,speed:13,xp:32,coins:60,kind:'wisp'},
    {id:'cinder',name:'Cinderling',area:'Cinder hollow',stage:3,rank:2,element:'fire',hp:165,attack:24,speed:16,xp:44,coins:90,kind:'cinder'},
    {id:'thicket',name:'Thorn Guardian',area:'Ancient thicket',stage:4,rank:3,element:'nature',hp:246,attack:34,speed:18,xp:56,coins:140,kind:'moss'},
    {id:'sentinel',name:'Stone Sentinel',area:'Elder proving ground',stage:5,rank:1,element:'neutral',hp:290,attack:35,speed:17,xp:76,coins:220,kind:'stone'},
    {id:'tempest',name:'Tempest Warden',area:'Storm summit',stage:5,rank:6,element:'water',hp:470,attack:57,speed:22,xp:96,coins:320,kind:'wisp'},
    {id:'heartwood',name:'Heartwood Ancient',area:'Heart of the grove',stage:5,rank:9,element:'nature',hp:555,attack:62,speed:24,xp:116,coins:450,kind:'moss'},
    {id:'inferno',name:'Inferno Sovereign',area:'The last ember',stage:5,rank:12,element:'fire',hp:650,attack:62,speed:27,xp:140,coins:600,kind:'cinder'},
  ];
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
    if(dragon.level===5 && rank>=3 && dragon.training?.special==='mend')
      result.push({id:'special',name:'Renewal',cost:3,heal:true,detail:'Heal 28% HP · 3-turn cooldown'});
    else result.push({id:'special',name:dragon.level===5?'Elder awakening':'Brave pounce',cost:3,power:dragon.level===5?2.2:1.75,element,
      detail:'Heavy hit · 3-turn cooldown'});
    return result;
  }
  function advantage(attacker,defender) {
    if(({fire:'nature',nature:'water',water:'fire'})[attacker]===defender)return 1.2;
    if(({fire:'nature',nature:'water',water:'fire'})[defender]===attacker)return .85;
    return 1;
  }
  function create(dragon,encounterId) {
    const encounter=encounters.find(e=>e.id===encounterId);
    if(!encounter || !Number.isInteger(dragon?.level) || dragon.level<encounter.stage || dragon.level>5 || !elements.includes(dragon.element||'neutral'))return null;
    const d=JSON.parse(JSON.stringify(dragon)), s=stats(d);
    return {phase:'active',round:1,encounter,dragon:d,player:{...s,hp:s.maxHp,element:d.element||'neutral',stamina:5,cooldown:0,guard:false,burn:0,weak:0,root:0},
      enemy:{...encounter,maxHp:encounter.hp,guard:false,burn:0,weak:0,root:0},events:[],log:['Choose a skill. Your dragon heals fully after every encounter.']};
  }
  function intent(battle) {
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
    const move=moves(battle.dragon).find(m=>m.id===id);
    return battle.phase==='active' && !!move && battle.player.stamina>=move.cost && !(id==='special'&&battle.player.cooldown>0);
  }
  function resolve(battle,id) {
    if(!legal(battle,id))return false;
    battle.events=[];
    const move=moves(battle.dragon).find(m=>m.id===id), enemyMove=intent(battle);
    const player=battle.player, enemy=battle.enemy;
    const emit=(actor,kind,message,element='neutral',extra={})=>{battle.events.push({actor,kind,message,element,playerHp:player.hp,enemyHp:enemy.hp,player:{...player},enemy:{...enemy},...extra});battle.log.push(message);};
    const end=()=>{
      if(player.hp<=0||enemy.hp<=0){battle.phase=enemy.hp<=0&&player.hp>0?'won':'lost';return true;}
      return false;
    };
    function hit(actor,target,power,element,side){
      const guarded=target.guard, before=target.hp;
      const damage=Math.max(1,Math.round(actor.attack*power*advantage(element,target.element)*(actor.weak?.75:1)*(target.guard?.35:1)));
      target.hp=Math.max(0,target.hp-damage);target.guard=false;actor.weak=0;
      emit(side,'hit',`${side==='player'?move.name:enemyMove.name}: ${damage} damage.${guarded?' Shield absorbed 65%.':''}`,element,{amount:before-target.hp,blocked:guarded,skill:side==='player'?move.id:'enemy',effective:advantage(element,target.element)});
    }
    function playerTurn(){
      player.stamina-=move.cost;
      if(move.id==='guard'){player.guard=true;player.stamina=Math.min(5,player.stamina+2);emit('player','guard','Guard raised. +2 stamina.');}
      else if(move.heal){const old=player.hp;player.hp=Math.min(player.maxHp,player.hp+Math.round(player.maxHp*.28));emit('player','heal',`Renewal restores ${player.hp-old} HP.`,'nature',{amount:player.hp-old});}
      else {
        hit(player,enemy,move.power,move.element,'player');
        if(id==='strike')player.stamina=Math.min(5,player.stamina+1);
        if(id==='element'&&enemy.hp>0){
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
    function enemyTurn(){
      if(enemyMove.guard){enemy.guard=true;emit('enemy','guard',`${enemy.name} braces for the next hit.`);}
      else hit(enemy,player,enemyMove.power,enemy.element,'enemy');
    }
    // Guard resolves first; otherwise speed determines order. Ties favor the player.
    const first=move.priority || (!enemyMove.guard && player.speed>=(enemy.speed-(enemy.root?8:0)));
    if(!enemyMove.guard)enemy.root=0;
    for(const action of first?[playerTurn,enemyTurn]:[enemyTurn,playerTurn]){action();if(end())break;}
    if(battle.phase==='active' && enemy.burn){enemy.burn--;const damage=Math.max(2,Math.round(player.attack*.16));enemy.hp=Math.max(0,enemy.hp-damage);emit('player','burn',`Burn deals ${damage} damage.`,'fire',{amount:damage});end();}
    player.cooldown=Math.max(0,player.cooldown-1);
    if(battle.phase==='active' && battle.round>=40){battle.phase='draw';emit('player','draw','The encounter ends in a draw. Retry free.');}
    battle.round++;battle.log=battle.log.slice(-8);
    return true;
  }
  function reward(dragon,encounter,cleared) {
    const gap=Math.max(0,dragon.level-encounter.stage);
    const xp=trainingLevel(dragon)>=caps[dragon.level]?0:Math.max(1,Math.round(encounter.xp/(1+gap*2)));
    return {xp:Math.min(xp,Math.max(0,threshold(caps[dragon.level])-dragon.training.xp)),coins:cleared?0:encounter.coins};
  }
  return {elements,caps,encounters,threshold,trainingLevel,stats,moves,advantage,create,intent,legal,resolve,reward};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=DragonBattle;
