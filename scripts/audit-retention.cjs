// Production-rule benchmark, isolated in memory. Instant merges/claims are optimistic,
// not human timing. No fabricated Trial wins, purchases, mastery or bonus completions.
const {game}=require('../tests/support/game-harness.cjs');
const results=[];
const expeditionPolicy=process.argv.includes('--expeditions');
const saveFirst=process.argv.includes('--save-first');
for(const stage of ['fresh','late']) for(const cadence of ['casual','active']) {
 const runs=[];
 for(let seed=1;seed<=2;seed++) {
  const g=game();const start=Date.UTC(2026,8,28,16);g.advance(start-100000);
  g.run(`Date=class extends Date {constructor(...args){super(...(args.length?args:[Date.now()]));}};
   let rng=${seed};Math.random=()=>((rng=(1664525*rng+1013904223)>>>0)/4294967296);
   render=()=>{};renderContractsPanel=()=>{};toast=()=>{};sfx=()=>{};showLevelEvent=()=>{};
   let tasks=[];setTimeout=(fn,ms=0)=>{tasks.push({fn,at:Date.now()+ms});return tasks.length;};
   function flush(){const due=tasks.filter(t=>t.at<=Date.now());tasks=tasks.filter(t=>t.at>Date.now());due.forEach(t=>t.fn());}
   if('${stage}'==='late'){
    state.level=50;state.coins=50000;state.highestDiscovered=5;state.hearthDone=true;
    state.book={0:true,1:true,2:true,3:true,4:true,5:true};state.locked.fill(false);
    state.decor=Object.fromEntries(DECOR.map(d=>[d.id,true]));
    state.perch=[{level:5,count:1,element:'fire'},{level:4,count:1,element:'water'},{level:2,count:1,element:'nature'}];
    state.maxEnergy=30;
   }
   state.energy=state.maxEnergy;state.perchAt=Date.now();state.nextEnergyAt=Date.now()+REGEN_MS;
   state.contracts=null;rollContracts();state.saveForDecor=true;
   let blocked=0,gathers=0,waits=0,stored=0,expeditionSpent=0;const titleWeeks={};
   function mergeAll(){for(let n=0;n<100;n++){
    let pair=null;for(let i=0;i<25&&!pair;i++)for(let j=i+1;j<25;j++){
     const a=state.cells[i],b=state.cells[j];if(a&&b&&a.level===b.level&&a.level<5){pair=[i,j];break;}}
    if(!pair)break;mergeInto(...pair);
   }}
   function activities(week){
    flush();mergeAll();
    while(emptyOpen().length<3){const i=state.cells.findIndex(d=>d?.level===5);if(i<0)break;storeElder(i);stored++;}
    deliverRewardInbox();mergeAll();
    for(let n=0;levelQueue.length&&n<100;n++){const ev=levelQueue.shift();if(ev.chest){const b=document.getElementById('chestBox');b.dataset.level=String(ev.level);b.disabled=false;revealChest();}}
    rollContracts();
    for(let i=0;i<5;i++){const c=state.contracts.items[i];
     if(c.kind!=='donate'||state.cells.some(d=>d?.level===c.want))claimContract(i,state.contracts.week);}
    for(let s=0;s<3;s++)if(perchOpen(s)&&!state.perch[s]){
     const i=state.cells.findIndex(d=>d?.level===1&&d.count>=2);if(i>=0)seatPerch(s,i);}
    document.getElementById('dragonBank').click();
    for(const d of DECOR)if(!state.decor[d.id]&&highestOwned()>=d.needStage&&state.coins>=d.cost)buyDecor(d.id);
    for(const [id,item] of Object.entries(SANCTUARY_COLLECTION))if(!state.collectionOwned?.[id]&&collectionAvailable(item)){
     claimCollection(id);if(state.collectionOwned?.[id])titleWeeks[id]=week;}
    const savingForTitle=${saveFirst} && Object.entries(SANCTUARY_COLLECTION).some(([id,item])=>item.seals&&!state.collectionOwned?.[id]&&bonusSealCount()>=item.seals-2);
    if(!savingForTitle&&sanctuaryProjectOpen()&&sanctuaryProjectRank()<10&&state.coins>=sanctuaryProjectCost())contributeSanctuary();
    if(${expeditionPolicy}&&sanctuaryProjectOpen()){
     if(expeditionReady())claimExpedition(state.expedition.id);
     if(!state.expedition&&!savingForTitle){
      const reserve=50000;const offer=['voyage','survey','scout'].find(id=>state.coins>=EXPEDITION_PACKAGES[id].coins+reserve);
      const route=Object.keys(EXPEDITION_ROUTES).sort((a,b)=>expeditionStamps(a)-expeditionStamps(b))[0];
      if(offer){const before=state.coins;previewExpedition(route,offer);confirmExpedition();expeditionSpent+=before-state.coins;}
     }
    }
    if(highestOwned()>=3&&state.coins>5000+eggPrice())buyEgg();
    mergeAll();
   }
  `);
  const days=cadence==='casual'?[0,2,5]:[0,1,2,3,4,5,6];
  for(let week=1;week<=12;week++) for(const day of days){
   const target=start+((week-1)*7+day)*86400000;
   const now=Number(g.run('Date.now()'));g.advance(target-now);g.tick();
   for(let n=0;n<75;n++){
    g.advance(8000);g.tick();g.run(`activities(${week});if(!emptyOpen().length)blocked++;else if(state.energy<=0)waits++;else{gather();gathers++;}`);
   }
   g.run(`activities(${week})`);
  }
  runs.push(JSON.parse(g.run(`JSON.stringify({seals:bonusSealCount(),tokens:state.contractTokens||0,completedWeeks:completedWeeksCount(),coins:state.coins,projects:sanctuaryProjectRank(),reserve:state.elderReserve.length,blocked,gathers,waits,expeditionSpent,journal:state.expeditionJournal,titleWeeks})`)));
 }
 results.push({stage,cadence,expeditionPolicy,saveFirst,weeks:12,sessionsPerWeek:cadence==='casual'?3:7,minutesPerSession:10,seeds:2,runs});
}
console.log(JSON.stringify(results,null,2));
