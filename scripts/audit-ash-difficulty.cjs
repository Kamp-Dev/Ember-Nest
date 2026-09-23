// Memory-only production-rule comparison. Solver results are not human win rates.
const {game}=require('../tests/support/game-harness.cjs');
const candidates=[{name:'shuffled-8',goal:8,grace:1,limit:10},{name:'shuffled-10',goal:10,grace:1,limit:10},{name:'shuffled-12',goal:12,grace:1,limit:10}];
const results=[];
for(const rules of candidates)for(const bonus of [0,6,11])for(const policy of ['aimed','first-pair']){
 let wins=0,promotions=0;
 for(let seed=1;seed<=100;seed++){
  const g=game();
  const result=JSON.parse(g.run(`
   let rng=${seed};Math.random=()=>((rng=(1664525*rng+1013904223)>>>0)/4294967296);
   render=()=>{};toast=()=>{};sfx=()=>{};let callbacks=[];setTimeout=fn=>callbacks.push(fn);
   trialRules=()=>(${JSON.stringify({...rules,name:'Ash Trial'})});
   let won=false,winningPromotions=0;const realWin=winStage;
   winStage=()=>{won=true;winningPromotions=state.stageMerges;realWin();};
   state.pouchBonus=${bonus};enterStage('ash');
   for(let actions=0;actions<250&&state.mode==='stage'&&!state.trailWon&&!state.trialFailed;actions++){
    let best=null,score=-Infinity;
    for(let i=0;i<25;i++)for(let j=0;j<25;j++){
     const a=state.stageCells[i],b=state.stageCells[j];
     if(i===j||!a||!b||a.level!==b.level||a.level>=5)continue;
     const promotes=a.count+b.count>=5;
     const clears=promotes?warmthTargets(j,a.level+1).filter(k=>state.ash[k]).length:0;
     const value=${JSON.stringify(policy)}==='aimed'?clears*100+(promotes?20:0)+a.count+b.count+a.level:0;
     if(value>score){score=value;best=[i,j];}
    }
    if(best)mergeInto(...best);else if(state.trailGathers>0&&emptyOpen().length)gather();else break;
    const due=callbacks;callbacks=[];due.forEach(fn=>fn());
   }
   JSON.stringify({won,promotions:winningPromotions});`));
  if(result.won){wins++;promotions+=result.promotions;}
 }
 results.push({rules:rules.name,bonus,policy,wins,seeds:100,meanWinningPromotions:wins?+(promotions/wins).toFixed(1):null});
}
console.table(results);
