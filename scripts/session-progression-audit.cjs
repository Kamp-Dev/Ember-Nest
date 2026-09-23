// Optimistic short-session benchmark; production rules, memory-only saves.
// No fabricated Trial wins. Instant merging/claiming is NOT human play timing.
const {game}=require('../tests/support/game-harness.cjs');
const output=[];
for(const scenario of ['fresh','mid','late']) {
  const runs=[];
  for(let seed=1;seed<=10;seed++) {
    const g=game();
    g.advance(Date.UTC(2026,8,22,12)-100000);
    g.run(`
      Date=class extends Date {constructor(...args){super(...(args.length?args:[Date.now()]));}};
      let rng=${seed};Math.random=()=>((rng=(1664525*rng+1013904223)>>>0)/4294967296);
      render=()=>{};toast=()=>{};sfx=()=>{};showLevelEvent=()=>{};
      let tasks=[];setTimeout=(fn,ms=0)=>{tasks.push({fn,at:Date.now()+ms});return tasks.length;};
      function flush(){const due=tasks.filter(t=>t.at<=Date.now());tasks=tasks.filter(t=>t.at>Date.now());due.forEach(t=>t.fn());}
      function consolidate(){for(let n=0;n<150;n++){
        let pair=null;for(let i=0;i<25&&!pair;i++)for(let j=i+1;j<25;j++){
          const a=state.cells[i],b=state.cells[j];if(a&&b&&a.level===b.level&&a.level<5){pair=[i,j];break;}}
        if(!pair)break;mergeInto(...pair);
      }}
      if('${scenario}'!=='fresh'){
        const late='${scenario}'==='late';state.level=late?50:10;state.coins=late?50000:5000;
        state.highestDiscovered=late?5:3;state.book=late?{0:true,1:true,2:true,3:true,4:true,5:true}:{0:true,1:true,2:true,3:true};
        state.decor=late?Object.fromEntries(DECOR.map(d=>[d.id,true])):{moss:true,lamp:true};
        state.hearthDone=late;state.maxEnergy=late?30:25;state.energy=state.maxEnergy;
        state.cells[0]={level:late?5:3,count:1,element:'fire'};
        state.perch=late?[{level:5,count:1,shiny:true,element:'fire'},{level:4,count:1,element:'water'},{level:2,count:1,element:'nature'}]:[{level:1,count:1,element:'neutral'},null,null];
      }
      state.energy=state.maxEnergy||MAX_ENERGY;
      state.perchAt=Date.now();state.nextEnergyAt=Date.now()+REGEN_MS;state.saveForDecor=true;
      state.contracts=null;rollContracts();
      let chests=0,gathers=0,energyWaits=0,fullBoard=0,shopSpent=0,roostCoins=0;
      let firstHearth=null,firstElder=null,firstAllDecor=null,activeMinutes=0;
      function activities(){
        flush();consolidate();deliverRewardInbox();consolidate();
        for(let n=0;levelQueue.length&&n<100;n++){
          const ev=levelQueue.shift();if(ev.chest){const box=document.getElementById('chestBox');box.dataset.level=String(ev.level);box.disabled=false;revealChest();chests++;consolidate();}}
        rollContracts();
        for(let i=0;i<state.contracts.items.length;i++){
          const c=state.contracts.items[i];const spare=state.cells.reduce((n,d)=>n+(d?.level===c.want?d.count:0),0);
          if(c.kind!=='donate'||spare>=2)claimContract(i,state.contracts.week);
        }
        for(let slot=0;slot<3;slot++)if(perchOpen(slot)&&!state.perch[slot]){
          const i=state.cells.findIndex(c=>c?.level===1&&c.count>=2);if(i>=0)seatPerch(slot,i);}
        const bankBefore=state.coins;document.getElementById('dragonBank').click();roostCoins+=state.coins-bankBefore;
        for(const d of DECOR)if(!state.decor[d.id]&&highestOwned()>=d.needStage&&state.coins>=d.cost)buyDecor(d.id);
        if(highestOwned()>=3&&state.coins>5000+eggPrice()) {const before=state.coins;buyEgg();shopSpent+=before-state.coins;}
        consolidate();
        if(firstHearth===null&&highestOwned()>=4)firstHearth=activeMinutes;
        if(firstElder===null&&highestOwned()>=5)firstElder=activeMinutes;
        if(firstAllDecor===null&&DECOR.every(d=>state.decor[d.id]))firstAllDecor=activeMinutes;
      }
    `);
    const sessions=[];
    for(let session=1;session<=12;session++){
      if(session>1){g.advance(6*3600000);g.tick();}
      g.run('activities()');
      for(let action=0;action<150;action++){
        g.advance(4000);g.tick();
        g.run(`activeMinutes+=4/60;activities();if(state.energy<=0)energyWaits++;else if(!emptyOpen().length)fullBoard++;else {gather();gathers++;consolidate();}`);
      }
      g.run('flush();activities();save()');
      sessions.push(JSON.parse(g.run(`JSON.stringify({session:${session},level:state.level,tier:highestOwned(),coins:state.coins,decor:DECOR.filter(d=>state.decor[d.id]).length,
        claimed:state.contracts.items.filter(c=>c.claimed).length,contracts:state.contracts.items.map(c=>({kind:c.kind,target:c.target,progress:c.progress,claimed:!!c.claimed})),pending:rewardInboxCount(),elders:state.cells.filter(c=>c?.level===5).length,open:emptyOpen().length})`)));
    }
    runs.push(JSON.parse(g.run(`JSON.stringify({firstHearth,firstElder,firstAllDecor,chests,gathers,energyWaits,fullBoard,shopSpent,roostCoins})`)));
    runs[runs.length-1].sessions=sessions;
  }
  const median=values=>{const n=values.filter(x=>x!==null).sort((a,b)=>a-b);return n.length?n[Math.floor(n.length/2)]:null;};
  output.push({scenario,seeds:10,sessions:12,minutesPerSession:10,hoursBetweenSessions:6,
    median:Object.fromEntries(['firstHearth','firstElder','firstAllDecor','chests','gathers','energyWaits','fullBoard','shopSpent','roostCoins'].map(k=>[k,median(runs.map(r=>r[k]))])),
    snapshots:[0,2,5,11].map(i=>({session:i+1,...Object.fromEntries(['level','tier','coins','decor','claimed','pending','elders','open'].map(k=>[k,median(runs.map(r=>r.sessions[i][k]))]))})),
    exampleFinalContracts:runs[0].sessions[11].contracts});
}
console.log(JSON.stringify(output,null,2));
