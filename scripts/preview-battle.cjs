// Generates a disposable memory-only browser fixture, never a player save.
const fs=require('node:fs');
const path=require('node:path');
const {game}=require('../tests/support/game-harness.cjs');
const g=game();
g.run(`state.seenGuide=true;state.wardrobePending=[];state.level=15;state.highestDiscovered=5;state.hearthDone=true;
  state.cells[0]={level:1,count:5,element:'neutral'};
  for(const [i,element] of ['fire','water','nature'].entries())state.cells[i+1]={level:5,count:1,element};
  state.cells[4]={level:2,count:1,element:'water'};
  state.cells[5]={level:3,count:1,element:'fire'};
  state.cells[6]={level:4,count:1,element:'nature'};
  state.book={0:true,1:true,2:true,3:true,4:true,5:true};
  state.energy=30;state.maxEnergy=30;rollContracts();awardWardrobeMilestones();state.wardrobePending=[];save();`);
const saved=Object.fromEntries(g.storage);saved['ember-nest-tile-motion']='on';
const shim=`<base href="../"><script>
const battleAuditStorage=new Map(Object.entries(${JSON.stringify(saved)}));
Object.defineProperty(window,'localStorage',{value:{getItem:k=>battleAuditStorage.get(k)??null,setItem:(k,v)=>battleAuditStorage.set(k,String(v)),removeItem:k=>battleAuditStorage.delete(k)}});
</script>`;
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8').replace('<head>','<head>'+shim).replace('<title>Ember Nest</title>','<title>PvE audit · MEMORY-ONLY save</title>');
fs.writeFileSync(path.resolve(__dirname,'../tests/battle-audit.html'),html);
console.log('Open http://127.0.0.1:5500/tests/battle-audit.html — isolated, resets on refresh.');
