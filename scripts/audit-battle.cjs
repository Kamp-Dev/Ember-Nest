// Fixed-rule balance smoke test, not a substitute for human playtesting.
const B=require('../battle-core.js');
function simulate(encounter,element,rank,special='burst',smart=true){
  const dragon={level:encounter.stage,count:1,element,training:{id:1,name:'Audit',xp:B.threshold(rank),special}};
  const b=B.create(dragon,encounter.id);
  while(b.phase==='active'){
    const intent=B.intent(b),p=b.player;
    const move=!smart?'strike':intent.power>1?'guard':special==='mend'&&p.hp<p.maxHp*.72&&B.legal(b,'special')?'special':intent.guard?'strike':special==='burst'&&B.legal(b,'special')?'special':B.legal(b,'element')?'element':'strike';
    B.resolve(b,move);
  }
  return {result:b.phase,turns:b.round-1,hp:b.player.hp};
}
const rows=[];
for(const e of B.encounters)for(const element of B.elements){
  const builds=['burst',...(e.stage===5&&e.rank>=3?['mend']:[])];
  const results=builds.map(skill=>({skill,...simulate(e,element,e.rank,skill)}));
  const best=results.find(r=>r.result==='won')||results[0];
  rows.push({encounter:e.id,element,training:e.rank,...best});
}
console.table(rows);
console.log('Lifetime first-clear coin supply:',B.encounters.reduce((n,e)=>n+e.coins,0));
console.log('Repeat coin supply: 0; XP to Elder training 12:',B.threshold(12));
module.exports={simulate};
