const {test}=require('node:test');
const {game}=require('./support/game-harness.cjs');
test('backup round-trip preserves permanent progress but excludes temporary Trials',()=>{
 game().run(`state.cells[0]={level:5,count:1,element:'water',shiny:true};state.elderReserve=[{id:1,dragon:{level:5,count:2,element:'fire'}}];
 state.stash.element_prism=3;state.surgeCleared=true;state.mode='stage';state.stageCells[0]={level:0,count:1};
 const restored=validateBackup(JSON.stringify(backupPayload()));assert.equal(restored.mode,'home');assert.ok(restored.stageCells.every(c=>c===null));
 assert.equal(restored.cells[0].shiny,true);assert.equal(restored.elderReserve[0].dragon.count,2);assert.equal(restored.stash.element_prism,3);assert.equal(restored.surgeCleared,true);`);
});
test('restore preserves previous on-device save and blocks stale in-memory autosave',()=>{
 const g=game();g.run(`save();const before=localStorage.getItem(SAVE);const payload=backupPayload();payload.data.coins=12345;
 assert.equal(commitBackupRestore(JSON.stringify(payload),before),true);
 assert.equal(localStorage.getItem(SAVE+'-before-restore'),before);assert.equal(JSON.parse(localStorage.getItem(SAVE)).coins,12345);
 assert.equal(save(),false);`);
 game(Object.fromEntries(g.storage)).run('assert.equal(state.coins,12345);assert.equal(saveBlocked,false)');
});
test('malformed and unsafe backups are rejected before writing',()=>{
 game().run(`save();const before=localStorage.getItem(SAVE);
 for(const mutate of [p=>p.version=99,p=>p.data.cells=[],p=>p.data.coins=-1,p=>p.data.keeper.equipment.head=123,p=>p.data.contracts.bonus={},p=>p.data.playerName='<img src=x>',p=>p.data.rewardInbox=[{level:0,quantity:-1}]]){
 const p=backupPayload();mutate(p);assert.throws(()=>commitBackupRestore(JSON.stringify(p),before));assert.equal(localStorage.getItem(SAVE),before);}
 assert.throws(()=>validateBackup('{broken'));assert.throws(()=>validateBackup('x'.repeat(2000001)));
 const p=backupPayload();p.data.stash=JSON.parse('{"__proto__":{}}');assert.throws(()=>validateBackup(JSON.stringify(p)));`);
});
test('changed save and Trial mode prevent restore',()=>{
 game().run(`save();const before=localStorage.getItem(SAVE),text=JSON.stringify(backupPayload());
 localStorage.setItem(SAVE,'newer');assert.throws(()=>commitBackupRestore(text,before));assert.equal(localStorage.getItem(SAVE),'newer');
 state.mode='stage';assert.throws(()=>commitBackupRestore(text,'newer'));`);
});
test('failed recovery-copy or primary writes do not replace the primary save',()=>{
 game().run(`save();const before=localStorage.getItem(SAVE),writer=localStorage.setItem,text=JSON.stringify(backupPayload());
 localStorage.setItem=()=>{throw new Error('quota')};assert.throws(()=>commitBackupRestore(text,before));assert.equal(localStorage.getItem(SAVE),before);
 localStorage.setItem=(key,value)=>{if(key===SAVE)throw new Error('quota');writer(key,value)};
 assert.throws(()=>commitBackupRestore(text,before));assert.equal(localStorage.getItem(SAVE),before);localStorage.setItem=writer;`);
});
test('another tab changed the save: stale autosave is blocked without overwrite',()=>{
 game().run(`save();localStorage.setItem(SAVE,'newer-tab-save');assert.equal(save(),false);assert.equal(saveBlocked,true);assert.equal(localStorage.getItem(SAVE),'newer-tab-save');`);
});
test('preview and cancel do not restore or change the active save',async()=>{
 const g=game();g.nodes.set('backupStatus',{textContent:''});g.nodes.set('confirmBackupRestore',{disabled:true});
 await g.run(`previewBackupFile({files:[{size:100,text:async()=>JSON.stringify(backupPayload())}]})`);
 g.run(`assert.ok(pendingRestore);assert.equal(document.getElementById('confirmBackupRestore').disabled,false);const before=localStorage.getItem(SAVE);
 cancelBackupRestore();assert.equal(pendingRestore,null);assert.equal(document.getElementById('confirmBackupRestore').disabled,true);assert.equal(localStorage.getItem(SAVE),before);`);
});
