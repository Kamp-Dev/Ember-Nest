// Isolated UI scenarios; no real player localStorage is ever accessed.
const fs=require('node:fs');
const path=require('node:path');
const {game}=require('../tests/support/game-harness.cjs');
for(const scenario of ['fresh','mid','late','expedition-ready','surge']) {
  const g=game();
  g.run(`state.seenGuide=true;
    if('${scenario}'!=='fresh'){
      const late=['late','expedition-ready','surge'].includes('${scenario}');state.level=late?50:10;state.coins=late?250000:5000;
      state.highestDiscovered=late?5:3;state.hearthDone=late;
      state.book=late?{0:true,1:true,2:true,3:true,4:true,5:true}:{0:true,1:true,2:true,3:true};
      state.cells[0]={level:late?5:3,count:1,element:'fire'};
      state.decor=late?Object.fromEntries(DECOR.map(d=>[d.id,true])):{moss:true,lamp:true};
      state.perch[0]={level:late?5:1,count:1,element:'fire'};
      state.perchBank=late?15000:500;state.maxEnergy=late?30:25;state.energy=state.maxEnergy;
    }
    if('${scenario}'==='expedition-ready')state.expedition={route:'water',package:'survey',id:123,startedAt:1,readyAt:2};
    if('${scenario}'==='surge')state.ashTrialCompleted=true;
    state.contracts=null;rollContracts();awardWardrobeMilestones();state.wardrobePending=[];save();`);
  const saved=Object.fromEntries(g.storage);
  const shim=`<base href="../"><script>
    const auditStorage=new Map(Object.entries(${JSON.stringify(saved)}));
    Object.defineProperty(window,'localStorage',{value:{getItem:k=>auditStorage.get(k)??null,setItem:(k,v)=>auditStorage.set(k,String(v)),removeItem:k=>auditStorage.delete(k)}});
    </script>`;
  const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8').replace('<head>','<head>'+shim).replace('<title>Ember Nest</title>',`<title>${scenario} progression audit · Memory-only save</title>`);
  fs.writeFileSync(path.resolve(__dirname,`../tests/progression-${scenario}-audit.html`),html);
}
