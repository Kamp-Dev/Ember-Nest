// Static visual fixture; never reads or writes a player's browser save.
const fs=require('node:fs');
const path=require('node:path');
const {game}=require('../tests/support/game-harness.cjs');
const g=game();
g.run(`recordElementDiscovery({level:5,element:'water',shiny:true});currentBookElement='water';currentBookPage=5;currentBookTab=1;renderBook();`);
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
let modal=source.slice(source.indexOf('<div id="book"'),source.indexOf('<!-- WIPE CONFIRMATION MODAL -->'));
modal=modal.replace('class="modal"','class="modal open"')
  .replace('<div id="bookSpread" class="book-spread"></div>','<div id="bookSpread" class="book-spread">'+g.nodes.get('bookSpread').innerHTML+'</div>')
  .replace('value="water"','value="water" selected')
  .replace('Beginnings · 1 / 2','Water · 4 / 4')
  .replaceAll('>0</span>','>1 / 4</span>');
console.log('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="../"><link rel="stylesheet" href="style.css"><title>Dragon Book visual QA</title></head><body>'+modal+'</body></html>');
