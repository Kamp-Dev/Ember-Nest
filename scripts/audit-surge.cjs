// Greedy production-rule playthroughs, not a proof of every board's solvability.
const {game}=require('../tests/support/game-harness.cjs');
let wins=0;const examples=[];
for(let seed=1;seed<=100;seed++){
 const g=game();
 const result=JSON.parse(g.run(`
  let rng=${seed};Math.random=()=>((rng=(1664525*rng+1013904223)>>>0)/4294967296);
  render=()=>{};toast=()=>{};sfx=()=>{};let failed=false,callbacks=[];
  setTimeout=fn=>{callbacks.push(fn);};showTrailFail=()=>{failed=true;};
  state.ashTrialCompleted=true;enterStage('surge');let actions=0;
  for(;actions<200&&state.mode==='stage'&&!failed;actions++){
   let best=null,bestScore=-Infinity;
   for(let i=0;i<25;i++)for(let j=0;j<25;j++){
    const a=state.stageCells[i],b=state.stageCells[j];if(i===j||!a||!b||a.level!==b.level||a.level>=5)continue;
    let cleared=0;const promotion=a.count+b.count>=5;
    if(promotion){const ash=state.ash.slice(),burned=state.ashBurned;applyWarmth(j,a.level+1);cleared=state.ashBurned-burned;state.ash=ash;state.ashBurned=burned;}
    const score=cleared*100+(promotion?20:0)+a.count+b.count+a.level;
    if(score>bestScore){bestScore=score;best=[i,j];}
   }
   if(best)mergeInto(...best);else if(state.trailGathers>0&&emptyOpen().length)gather();else break;
   const due=callbacks;callbacks=[];due.forEach(fn=>fn());
  }
  JSON.stringify({won:!!state.surgeCleared,actions,burned:state.ashBurned,failed});`));
 if(result.won)wins++;
 if(seed<=5)examples.push({seed,...result});
}
console.log(JSON.stringify({seeds:100,wins,policy:'one-step ash-clearing greedy merge; gather only when no pair exists',examples},null,2));
if(!wins)process.exitCode=1;
