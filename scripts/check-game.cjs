// Repeatable local release gate. Does not touch player storage or install packages.
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const run=args=>{
 const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
};
for(const file of ['game-data.js','game-core.js','app.js'])run(['--check',file]);
const tests=fs.readdirSync(path.join(root,'tests')).filter(file=>file.endsWith('.test.cjs')).sort().map(file=>'tests/'+file);
run(['--test',...tests]);
console.log('Local code gate passed. Browser/device playtesting remains a separate release gate.');
