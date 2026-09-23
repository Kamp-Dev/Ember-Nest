// Interactive QA page uses the real app with MEMORY-ONLY storage. No player saves are read or written.
const fs=require('node:fs');
const path=require('node:path');
const {game}=require('../tests/support/game-harness.cjs');
const g=game();
g.run(`state.level=12;state.seenGuide=true;state.wardrobeFirstContract=true;state.stash.rare_egg=2;state.stash.border_ember=1;awardWardrobeMilestones();useFromStash('wardrobe_uncommon_head');save()`);
const saved=Object.fromEntries(g.storage);
saved['ember-nest-appearance']='dark';
const shim=`<base href="../"><script>
// QA fixture: isolated in-memory storage, discarded on reload.
const fixtureStorage = new Map(Object.entries(${JSON.stringify(saved)}));
Object.defineProperty(window,'localStorage',{value:{getItem:key=>fixtureStorage.get(key)??null,setItem:(key,value)=>fixtureStorage.set(key,String(value)),removeItem:key=>fixtureStorage.delete(key)}});
</script>`;
let html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8').replace('<head>','<head>'+shim).replace('<title>Ember Nest</title>','<title>Wardrobe QA · Memory-only save</title>');
fs.writeFileSync(path.resolve(__dirname,'../tests/wardrobe-interactive-preview.html'),html);
