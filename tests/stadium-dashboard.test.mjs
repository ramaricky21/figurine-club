import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html');
const app=read('assets/app.mjs');
const css=read('assets/dashboard-stadium.css');
const sw=read('service-worker.js');
const dashboard=html.split('<section data-view="dashboard"')[1].split('<section data-view="album"')[0];
test('Stadium 2.0: nuova panoramica isolata, sezioni precedenti ancora presenti',()=>{
 assert.match(html,/id="view-dashboard" class="stadium-dashboard"/);
 for(const id of ['view-album','view-bacheca','view-club','view-scambi','view-impostazioni','view-admin','view-richieste'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(html,/assets\/dashboard-stadium\.css\?v=1/);
 assert.ok(existsSync(new URL('../assets/stadium-night.jpg',import.meta.url)));
 assert.match(css,/#view-dashboard \.stadium-hero/);
 assert.doesNotMatch(css,/^\.sidebar|^\.sticker-card/m);
});
test('Il tabellone e i numeri della Panoramica usano i contatori esistenti',()=>{
 for(const id of ['stadium-found-count','stadium-board-progress','stadium-board-fill','hero-ring','teams-grid','stadium-club-activity','demo-notice'])assert.match(dashboard,new RegExp(`id="${id}"`));
 for(const stat of ['total','found','missing','duplicates'])assert.match(dashboard,new RegExp(`data-stat="${stat}"`));
 assert.match(app,/const s=stats\(\)/);
 assert.match(app,/\$\('#stadium-found-count'\)\.textContent=s\.found/);
 assert.match(app,/\$\('#stadium-board-progress'\)\.setAttribute\('aria-valuenow',String\(s\.percentage\)\)/);
 assert.match(app,/\$\('#stadium-board-fill'\)\.style\.width=`\$\{s\.percentage\}%`/);
});
test('Progressi squadra: dati catalogo, senza percentuali fittizie e con collegamento album',()=>{
 assert.match(app,/state\.items\.forEach\(st=>/);
 assert.match(app,/if\(qty\(st\.number\)>0\)val\.found\+\+/);
 assert.match(app,/const pct=Math\.round\(data\.found\/data\.total\*100\)/);
 assert.match(app,/data-team="\$\{esc\(team\)\}"/);
 assert.match(dashboard,/href="#album" class="stadium-more-link"/);
 assert.match(dashboard,/Il catalogo/);
});
test('Ultime conquiste dal Club, senza nuovi dati pubblicati o eventi finti',()=>{
 assert.match(app,/recentClubAchievements\(profiles,2\)/);
 assert.match(app,/state\.clubProfiles\.map/);
 assert.match(app,/p\.catalogSignature!==signature/);
 assert.match(app,/if\(!state\.clubLoaded\)/);
 assert.match(app,/Nessuna nuova conquista per ora/);
 assert.match(app,/renderDashboardClub\(\);if\(state\.view==='club'\)renderClub\(\)/);
 assert.doesNotMatch(dashboard,/Marco|Luca|68%|221 figurine/);
});
test('PWA precache lo stadio e CSS/JS nuovi, senza dati privati',()=>{
 assert.match(sw,/stadium2-bacheca-percentuali-20261026-images-5-composites-2-lightbox-fit-catalog-names-1/);
 assert.match(sw,/\.\/assets\/stadium-night\.jpg/);
 assert.match(sw,/\.\/assets\/dashboard-stadium\.css\?v=1/);
 assert.match(sw,/\.\/assets\/app\.mjs\?v=13/);
 assert.doesNotMatch(sw,/['"]\.\/users\//);
});
