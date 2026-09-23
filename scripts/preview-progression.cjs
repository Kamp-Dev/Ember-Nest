// Browser fixture: all storage is in memory; never reads or writes player saves.
const fs=require('node:fs');
const path=require('node:path');
const {game}=require('../tests/support/game-harness.cjs');
const g=game();
g.run(`state.level=25;state.coins=65000;state.seenGuide=true;state.highestDiscovered=5;
state.hearthDone=true;state.decor=Object.fromEntries(DECOR.map(d=>[d.id,true]));
state.book={0:true,1:true,2:true,3:true,4:true,5:true};
state.cells=Array.from({length:25},(_,i)=>i<19?{level:1,count:1,element:'neutral'}:null);
state.rewardInbox=[{level:2,quantity:3}];state.perchBank=800;
state.ashTrialCompleted=true;state.contracts=null;rollContracts();
awardWardrobeMilestones();state.wardrobePending=[];save();`);
const saved=Object.fromEntries(g.storage);
saved['ember-nest-appearance']='light';
const shim=`<base href="../"><script>
const fixtureStorage=new Map(Object.entries(${JSON.stringify(saved)}));
Object.defineProperty(window,'localStorage',{value:{getItem:k=>fixtureStorage.get(k)??null,setItem:(k,v)=>fixtureStorage.set(k,String(v)),removeItem:k=>fixtureStorage.delete(k)}});
</script>`;
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8').replace('<head>','<head>'+shim).replace('<title>Ember Nest</title>','<title>Progression QA · Memory-only save</title>');
fs.writeFileSync(path.resolve(__dirname,'../tests/progression-preview.html'),html);
