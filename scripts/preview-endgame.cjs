// Static production-renderer fixtures: no browser state, gameplay scripts or saves.
const fs = require('node:fs');
const path = require('node:path');
const { game } = require('../tests/support/game-harness.cjs');
const g = game();
for (const id of ['sanctuaryCollection','collectionSummary','sanctuaryBadge']) g.nodes.set(id,{innerHTML:'',textContent:''});
g.run(`state.masteryClaims={fire:true,water:true,nature:true};state.coins=300000;state.contractTokens=20;
state.completedContractWeeks={'2026-8-3':true,'2026-8-10':true,'2026-8-17':true,'2026-8-24':true};
claimCollection('ember_garden');equipCollection('ember_garden');renderCollection();`);
const cells = [];
for (const element of ['fire','water','nature']) for (let level=1;level<=5;level++) {
  cells.push('<div class="cell">'+g.run(`itemHtml(${JSON.stringify({element,level,count:1})})`)+'</div>');
}
for (const appearance of ['light','dark']) {
  const html = `<!doctype html><html data-appearance="${appearance}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="../"><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="storybook.css"><link rel="stylesheet" href="moonlight.css"><title>Endgame visual QA</title><style>html,body{display:block!important;height:auto!important;overflow:auto!important}body.storybook #app{height:auto!important;max-height:none!important;margin:20px auto;padding:16px}h1{font-size:20px}.collection-card{pointer-events:none}</style></head><body class="storybook"><main id="app" data-sanctuary="fire"><h1>Ember Garden · ${appearance} preview</h1><p>Static QA fixture. No game save is loaded or changed.</p><div id="board">${cells.join('')}</div><div>${g.nodes.get('sanctuaryCollection').innerHTML.replace(/onclick="[^"]*"/g,'')}</div></main></body></html>`;
  fs.writeFileSync(path.resolve(__dirname,`../tests/endgame-${appearance}-preview.html`),html);
}
