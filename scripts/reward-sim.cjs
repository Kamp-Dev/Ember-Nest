// Reward-inclusive policy benchmarks. No real browser saves or human timing claims.
const { game } = require('../tests/support/game-harness.cjs');
const results = [];
for (const scenario of ['fresh', 'mid', 'advanced']) for (const shop of [false, true]) {
  const runs = [];
  for (let seed = 1; seed <= 30; seed++) {
    const g = game();
    g.run(`let rng = ${seed}; Math.random = () => ((rng = (1664525*rng+1013904223)>>>0)/4294967296);
      render=()=>{}; toast=()=>{}; sfx=()=>{}; showLevelEvent=()=>{};
      let tasks=[]; setTimeout=(fn,ms=0)=>{tasks.push({fn,at:Date.now()+ms});return tasks.length;};
      function flushTasks(){const due=tasks.filter(t=>t.at<=Date.now());tasks=tasks.filter(t=>t.at>Date.now());due.forEach(t=>t.fn());}
      let ledger={chests:0,contracts:0,sleepy:0,trials:0,roost:0,shop:0,decor:0};
      let chestCount=0, hearthAt=null, elderAt=null, decorAt=null;
      function measured(key,fn){const before=state.coins;fn();ledger[key]+=state.coins-before;}
      function total(tier){return state.cells.reduce((n,c)=>n+(c?.level===tier?c.count:0),0);}
      function consolidate(){for(let step=0;step<200;step++){
        let pair=null;for(let i=0;i<25&&!pair;i++)for(let j=i+1;j<25;j++){
          const a=state.cells[i],b=state.cells[j];if(a&&b&&a.level===b.level&&a.level<5){pair=[i,j];break;}}
        if(!pair)break;mergeInto(...pair);
      }}
      function claimChests(){for(let n=0;levelQueue.length&&n<100;n++){
        const ev=levelQueue.shift();if(ev.chest){const box=document.getElementById('chestBox');box.dataset.level=String(ev.level);box.disabled=false;
          measured('chests',revealChest);chestCount++;consolidate();}
      }}
      function rewards(){
        flushTasks(); claimChests();
        rollContracts();
        for(let i=0;i<state.contracts.items.length;i++){
          const c=state.contracts.items[i];
          if(c.kind!=='donate'||total(c.want)>=2)measured('contracts',()=>claimContract(i,state.contracts.week));
        }
        if(!state.sleepyDone && total(3)>=2)measured('sleepy',fulfillSleepy);
        // Reserve one spare Hatchling per available perch; no free fixture income.
        for(let slot=0;slot<3;slot++)if(perchOpen(slot)&&!state.perch[slot]&&total(1)>=2){
          const i=state.cells.findIndex(c=>c?.level===1);seatPerch(slot,i);
        }
        measured('roost',()=>document.getElementById('dragonBank').click());
        for(const d of DECOR)if(!state.decor[d.id]&&highestOwned()>=d.needStage&&state.coins>=d.cost)measured('decor',()=>buyDecor(d.id));
        if(${shop}&&highestOwned()>=3&&state.coins>5000+eggPrice())measured('shop',buyEgg);
        consolidate();claimChests();
      }
      if('${scenario}'!=='fresh'){
        state.level='${scenario}'==='mid'?10:50; state.coins='${scenario}'==='mid'?5000:50000;
        state.book='${scenario}'==='mid'?{0:true,1:true,2:true,3:true}:{0:true,1:true,2:true,3:true,4:true,5:true};
        state.decor='${scenario}'==='mid'?{moss:true,lamp:true}:Object.fromEntries(DECOR.map(d=>[d.id,true]));
        state.hearthDone='${scenario}'==='advanced';state.maxEnergy=state.hearthDone?30:25;state.energy=state.maxEnergy;
        state.cells[0]={level:'${scenario}'==='mid'?3:4,count:1,element:'fire'};
        state.pouchBonus=6;
        state.perch='${scenario}'==='mid'?[{level:1,count:1,element:'neutral'},null,null]:
          [{level:4,count:1,shiny:true,element:'fire'},{level:5,count:1,shiny:true,element:'fire'},{level:2,count:1,shiny:true,element:'water'}];
        state.perchAt=Date.now();
      }
      state.contracts=null;rollContracts();
      const startingCoins=state.coins;
      // Optimistic assumption: one earned Trial victory at minute five, then the
      // remaining daily rewards via production Blitz. Trial-solving is benchmarked separately.
      let trialPaid=false;
    `);
    const stepAction = g.run(`()=>{if(!trialPaid && Date.now()>=400000){
        state.mode='stage';state.ashTrialCompleted=true;measured('trials',winStage);
        while(dailyLeft()>0)measured('trials',blitzAshTrial);trialPaid=true;
      }
      rewards();gather();consolidate();
      const minutes=(Date.now()-100000)/60000;
      if(hearthAt===null&&state.cells.some(c=>c?.level===4))hearthAt=minutes;
      if(elderAt===null&&state.cells.some(c=>c?.level===5))elderAt=minutes;
      if(decorAt===null&&DECOR.every(d=>state.decor[d.id]))decorAt=minutes;}`);
    for (let step = 0; step < 1350; step++) {
      g.advance(8000); g.tick(); stepAction();
    }
    runs.push(JSON.parse(g.run(`JSON.stringify({hearthAt,elderAt,decorAt,coins:state.coins,startingCoins,level:state.level,chestCount,gifts:state.gives,ledger})`)));
  }
  const median = values => {const v=values.filter(x=>x!==null).sort((a,b)=>a-b);return v.length?v[Math.floor(v.length/2)]:null;};
  results.push({scenario,shop,samples:runs.length,minutes:180,
    medians:Object.fromEntries(['hearthAt','elderAt','decorAt','coins','level','chestCount','gifts'].map(k=>[k,median(runs.map(r=>r[k]))])),
    elderRuns:runs.filter(r=>r.elderAt!==null).length,
    allDecorRuns:runs.filter(r=>r.decorAt!==null).length,
    ledger:Object.fromEntries(Object.keys(runs[0].ledger).map(k=>[k,median(runs.map(r=>r.ledger[k]))]))});
}
console.log(JSON.stringify(results,null,2));
