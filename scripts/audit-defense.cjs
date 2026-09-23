const D=require('../defense-core.js');
function play(roles){
 const s=D.create();roles.forEach((role,i)=>{if(role)D.deploy(s,i,role);});
 const waves=[];
 for(let steps=0;steps<12000&&!['won','lost'].includes(s.phase);steps++){
  if(s.phase==='build'){
   if(s.wave){
    // Expand toward the bend, then invest in Fire damage and range.
    for(const [i,role] of [[4,'fire'],[5,'water'],[3,'nature']])D.deploy(s,i,role);
    for(const i of [4,1,2,0,5,3])D.upgrade(s,i);
   }
   waves.push({wave:s.wave+1,health:s.health,energy:s.energy});D.startWave(s);
  }
  D.tick(s,.1);
 }
 return {phase:s.phase,health:s.health,energy:s.energy,kills:s.kills,seconds:Math.round(s.time),waves};
}
for(const roles of [['fire','water','nature'],['fire','fire','fire'],['water','water','water'],['nature','nature','nature']])console.log(JSON.stringify({roles,...play(roles)}));
module.exports={play};
