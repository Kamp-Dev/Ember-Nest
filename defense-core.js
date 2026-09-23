// Pure, deterministic prototype simulation. No access to saves or game currency.
const SanctuaryDefense = (() => {
  const path=[[0,26],[84,26],[84,64],[16,64],[16,90],[100,90]];
  const pads=[[20,11],[49,11],[76,11],[32,46],[60,46],[92,48]];
  const roles={
    fire:{name:'Fire',damage:9,range:29,cooldown:1.2,description:'Splash damage within 13 tiles of the target.'},
    water:{name:'Water',damage:4,range:30,cooldown:1,description:'Slows enemies by 45% for 2 seconds.'},
    nature:{name:'Nature',damage:4,range:28,cooldown:1.5,description:'Roots for 0.65 seconds; nearby dragons deal 25% more damage.'}
  };
  const enemies={scout:{hp:22,speed:10,armor:0,energy:4,leak:1},runner:{hp:25,speed:17,armor:0,energy:4,leak:1},armored:{hp:65,speed:8,armor:2,energy:7,leak:2},boss:{hp:420,speed:6,armor:1,energy:0,leak:12}};
  const waves=[['scout','scout','scout','scout','scout'],['runner','runner','scout','runner','runner','scout'],['armored','scout','armored','scout','armored'],['runner','armored','runner','scout','armored','runner','runner'],['scout','runner','boss','armored','runner','scout']];
  const waveNames=['Forest scouts','Swift runners','Stonehide guards','Mixed assault','The Ashbound Guardian'];
  const length=path.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-path[i][0],p[1]-path[i][1]),0);
  function position(distance){
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if(distance<=len){const t=Math.max(0,distance)/len;return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}distance-=len;
    }return path[path.length-1].slice();
  }
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  function create(){return {phase:'build',wave:0,health:12,energy:60,towers:Array(6).fill(null),enemies:[],shots:[],queue:[],spawnIn:0,nextId:1,kills:0,time:0};}
  const editable=s=>s.phase==='build'||s.phase==='wave';
  function deploy(s,index,role){
    if(!editable(s)||!Number.isInteger(index)||index<0||index>=pads.length||s.towers[index]||!Object.hasOwn(roles,role)||s.energy<20)return false;
    s.energy-=20;s.towers[index]={role,rank:1,cooldown:0,spent:20};return true;
  }
  function upgradeCost(tower){return tower ? tower.rank===1?25:tower.rank===2?40:null:null;}
  function upgrade(s,index){
    if(!Number.isInteger(index)||index<0||index>=pads.length)return false;
    const t=s.towers[index],cost=upgradeCost(t);
    if(!editable(s)||cost===null||s.energy<cost)return false;
    s.energy-=cost;t.spent+=cost;t.rank++;return true;
  }
  function recall(s,index){
    if(!Number.isInteger(index)||index<0||index>=pads.length)return false;
    if(s.phase!=='build'||!s.towers[index])return false;
    s.energy+=s.towers[index].spent;s.towers[index]=null;return true;
  }
  function startWave(s){
    if(s.phase!=='build'||s.wave>=waves.length||!s.towers.some(Boolean))return false;
    s.queue=waves[s.wave].slice();s.wave++;s.phase='wave';s.spawnIn=0;return true;
  }
  function pause(s){if(s.phase==='wave'){s.phase='paused';return true;}return false;}
  function resume(s){if(s.phase==='paused'){s.phase='wave';return true;}return false;}
  function tick(s,dt){
    if(s.phase!=='wave'||!Number.isFinite(dt)||dt<=0)return;
    dt=Math.min(dt,.2);s.time+=dt;s.spawnIn-=dt;
    s.shots=s.shots.filter(shot=>(shot.life-=dt)>0);
    if(s.queue.length&&s.spawnIn<=0){
      const kind=s.queue.shift(),spec=enemies[kind];
      s.enemies.push({...spec,kind,id:s.nextId++,maxHp:spec.hp,distance:0,slow:0,root:0});s.spawnIn=1.65;
    }
    for(let i=0;i<s.towers.length;i++){
      const t=s.towers[i];if(!t)continue;t.cooldown-=dt;if(t.cooldown>0)continue;
      const spec=roles[t.role],range=spec.range+(t.rank-1)*2;
      const target=s.enemies.filter(e=>e.hp>0&&distance(pads[i],position(e.distance))<=range).sort((a,b)=>b.distance-a.distance)[0];
      if(!target)continue;
      t.cooldown=spec.cooldown;const at=position(target.distance);
      const supported=s.towers.some((ally,j)=>j!==i&&ally?.role==='nature'&&distance(pads[i],pads[j])<=34);
      const damage=spec.damage*(1+(t.rank-1)*.65)*(supported?1.25:1);
      const victims=t.role==='fire'?s.enemies.filter(e=>e.hp>0&&distance(position(e.distance),at)<=13):[target];
      for(const enemy of victims)enemy.hp-=Math.max(1,damage-enemy.armor);
      if(t.role==='water')target.slow=2;
      // Each enemy gets a recovery window; multiple Nature dragons cannot perma-root it.
      if(t.role==='nature'&&!target.rootGuard){target.root=.65;target.rootGuard=2.4;}
      s.shots.push({from:pads[i],to:at,role:t.role,life:.22});
    }
    const alive=[];
    for(const enemy of s.enemies){
      if(enemy.hp<=0){s.energy+=enemy.energy;s.kills++;continue;}
      enemy.distance+=enemy.speed*dt*(enemy.root>0?0:enemy.slow>0?.55:1);
      enemy.slow=Math.max(0,enemy.slow-dt);enemy.root=Math.max(0,enemy.root-dt);enemy.rootGuard=Math.max(0,(enemy.rootGuard||0)-dt);
      if(enemy.distance>=length)s.health=Math.max(0,s.health-enemy.leak);else alive.push(enemy);
    }
    s.enemies=alive;
    if(s.health<=0){s.phase='lost';s.shots=[];return;}
    if(!s.queue.length&&!s.enemies.length){s.shots=[];if(s.wave===waves.length)s.phase='won';else{s.phase='build';s.energy+=15;}}
  }
  return {path,pads,roles,waves,waveNames,length,position,create,deploy,upgrade,upgradeCost,recall,startWave,pause,resume,tick};
})();
if(typeof module!=='undefined')module.exports=SanctuaryDefense;
