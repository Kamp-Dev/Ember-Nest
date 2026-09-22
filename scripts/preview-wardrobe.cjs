// Production-renderer visual fixtures. Never load or change a browser game save.
const fs = require('node:fs');
const path = require('node:path');
const { game } = require('../tests/support/game-harness.cjs');
const g = game();
g.nodes.set('wardrobeMilestones',{innerHTML:''});
g.run(`state.level=75;state.ashTrialCompleted=true;state.wardrobeFirstContract=true;
state.masteryClaims={fire:true,water:true,nature:true,fire_rare:true,water_rare:true,nature_rare:true};
state.completedContractWeeks=Object.fromEntries(Array.from({length:8},(_,i)=>['2026-7-'+(i+1),true]));
awardWardrobeMilestones();renderWardrobeMilestones();`);
const sets = g.run('JSON.parse(JSON.stringify(WARDROBE_SETS))');
const cards = sets.map(set => {
  g.run(`state.keeper.equipment.legs='clothing_${set.rarity}_legs_v1.png'`);
  const layers = ['body','legs','torso','head'].map(slot => {
    const item = slot === 'body' ? {img:'assets/avatar/body_base.png'} : g.run(`STASH_CATALOG['wardrobe_${set.rarity}_${slot}']`);
    const el={style:{}};
    g.nodes.set('previewLayer',el);
    g.run(`fitKeeperLayer(document.getElementById('previewLayer'),${JSON.stringify(item.img)})`);
    const s=el.style;
    return `<img alt="${slot}" src="${item.img}" style="position:absolute;left:${s.left};top:${s.top};width:${s.width};height:${s.height};object-fit:fill;clip-path:${s.clipPath || 'none'}">`;
  }).join('');
  const tiles = g.run(`['head','torso','legs'].map(slot=>stashTileHtml({itemId:'wardrobe_${set.rarity}_'+slot,quantity:1,equipped:slot==='head'})).join('')`).replace(/onclick="[^"]*"/g,'');
  return `<section class="set-preview"><h2>${set.name}</h2><div class="paper-doll">${layers}</div><div class="preview-tiles">${tiles}</div></section>`;
}).join('');
for (const appearance of ['light','dark']) {
  const html=`<!doctype html><html data-appearance="${appearance}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="../"><title>Wardrobe visual QA</title>${['style','storybook','moonlight','wardrobe'].map(s=>`<link rel="stylesheet" href="${s}.css">`).join('')}<style>html,body{display:block!important;overflow:auto!important;height:auto!important}body.storybook #app{height:auto!important;max-height:none!important;max-width:1100px!important;margin:16px auto;padding:16px;overflow:visible}.set-grid{display:flex;flex-wrap:wrap;gap:18px;justify-content:center}.set-preview{width:310px}h1{font-size:22px}h2{font-size:16px;text-align:center}.paper-doll{position:relative;width:310px;height:310px;overflow:hidden;background:#c9ccb5;border-radius:12px}.preview-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:12px 0}.preview-tiles button{height:85px!important}.wardrobe-journal{max-width:440px;margin:24px auto}</style></head><body class="storybook"><main id="app"><h1>Keeper wardrobe · ${appearance}</h1><p>Static art-fit and rarity QA. No game saves are accessed.</p><div class="set-grid">${cards}</div><details class="wardrobe-journal"><summary>Wardrobe milestones</summary>${g.nodes.get('wardrobeMilestones').innerHTML}</details></main></body></html>`;
  fs.writeFileSync(path.resolve(__dirname,`../tests/wardrobe-${appearance}-preview.html`),html);
}
