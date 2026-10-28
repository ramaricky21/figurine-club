import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html');
const css=read('assets/refined.css');
const sw=read('service-worker.js');
test('Nessun bottone vuoto sul saluto mobile; resta il link album accessibile',()=>{
 assert.match(html, /id="view-dashboard" class="stadium-dashboard"[\s\S]*?id="hero-missing"/);
 assert.doesNotMatch(html.match(/<div class="page-head stadium-welcome">([\s\S]*?)<div id="demo-notice"/)[1], /<a href=/);
 assert.match(html, /href="#album"[^>]+id="hero-missing"/);
});
test('Menu mobile ha altezza dinamica e scorrimento indipendente',()=>{
 assert.match(css,/height:100dvh/);
 assert.match(css,/overflow-y:auto/);
 assert.match(css,/-webkit-overflow-scrolling:touch/);
 assert.match(css,/overscroll-behavior-y:contain/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(html, /id="logout-button"/);
});
test('Risorse aggiornate e nuova cache per installazioni PWA precedenti',()=>{
 assert.match(html,/assets\/refined\.css\?v=4/);
 assert.match(sw,/assets\/refined\.css\?v=4/);
 assert.match(sw,/const CACHE_VERSION='stadium2-bacheca-percentuali-20261028-figurine8-completa-v1'/);
});
