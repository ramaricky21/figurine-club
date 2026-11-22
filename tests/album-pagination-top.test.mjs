import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'), app=read('assets/app.mjs'), css=read('assets/extra.css'), sw=read('service-worker.js');
test('La navigazione aggiuntiva precede l’album e quella originale resta sotto',()=>{
 const top=html.indexOf('id="pagination-top"'),grid=html.indexOf('id="sticker-grid"'),bottom=html.indexOf('id="pagination"');
 assert.ok(top!==-1 && grid!==-1 && bottom!==-1 && top<grid && grid<bottom);
 assert.match(html,/id="pagination-top"[^>]*hidden/);
 assert.match(html,/id="pagination"/);
});
test('Entrambe le barre sono create dallo stesso HTML e si aggiornano a ogni render e filtro',()=>{
 assert.match(app,/const paginationHTML=pages===1\?'':/);
 assert.match(app,/for\(const nav of \[\$\('#pagination-top'\),\$\('#pagination'\)\]\)nav\.innerHTML=paginationHTML/);
 assert.match(app,/\$\('#pagination-top'\)\.hidden=pages===1/);
 assert.match(app,/for\(const pagination of \[\$\('#pagination-top'\),\$\('#pagination'\)\]\)/);
 assert.match(app,/state\.page=Number\(btn\.dataset\.page\);renderAlbum\(\)/);
 assert.match(app,/state\.page=1;renderAlbum\(\)/);
});
test('I pulsanti superiori mantengono il medesimo stile, il layout non mostra spazi se non servono',()=>{
 assert.match(html,/class="pagination pagination-top"/);
 assert.match(css,/\.pagination-top\[hidden\]\{display:none;/);
 assert.doesNotMatch(css,/overflow-x:\s*scroll/);
});
test('La PWA scarica il nuovo script e aggiorna la cache offline',()=>{
 assert.match(html,/app\.mjs\?v=19/);
 assert.match(sw,/app\.mjs\?v=19/);
 assert.match(sw,/const CACHE_VERSION='stadium2-trade-proposals-double-pagination-20261122-v2'/);
});
