import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {STICKER_IMAGES,STICKER_IMAGE_IDS,STICKER_LANDSCAPE_IMAGE_IDS} from '../assets/sticker-images.mjs';
import {parseCSV,computeStats} from '../assets/core.mjs';
const local=p=>new URL('../'+p,import.meta.url);
const items=parseCSV(readFileSync(local('catalogo_2026_2027.csv'),'utf8'));
const byId=new Map(items.map(x=>[String(x.number),x]));
const manifest=JSON.parse(readFileSync(local('assets/stickers/associazioni.json'),'utf8'));

test('Sono presenti 179 figurine univoche e tutte appartengono al catalogo già esistente',()=>{
 assert.equal(STICKER_IMAGE_IDS.length,179);
 assert.equal(new Set(STICKER_IMAGE_IDS).size,179);
 assert.equal(Object.keys(STICKER_IMAGES).length,179);
 assert.equal(manifest.length,179);
 for(const id of STICKER_IMAGE_IDS)assert.ok(byId.has(id),`Id fuori catalogo: ${id}`);
});
test('Le 179 immagini corrispondono ai file WebP e al titolo del catalogo',()=>{
 for(const match of manifest){
  const id=match.numero;
  assert.equal(match.nome,byId.get(id)?.title,match.file);
  assert.equal(STICKER_IMAGES[id],`./${match.file}`);
  assert.ok(existsSync(local(match.file)));
  const bytes=readFileSync(local(match.file));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.toString('ascii',8,12),'WEBP');
 }
});
test('Le foto non modificano la composizione dell album o i progressi delle figurine',()=>{
 assert.equal(items.length,775);
 assert.equal(computeStats(items,{'12':3,'Kit6':1}).found,2);
 const app=readFileSync(local('assets/app.mjs'),'utf8');
 assert.match(app,/STICKER_IMAGES\[String\(s\.number\)\]/);
 assert.match(app,/class="sticker-photo"/);
 assert.match(app,/data-zoom/);
 assert.match(app,/data-mark/);
 assert.match(app,/data-step/);
});
test('GitHub Pages e cache offline includono solo foto pubbliche, e non Firestore',()=>{
 const html=readFileSync(local('index.html'),'utf8');
 const sw=readFileSync(local('service-worker.js'),'utf8');
 assert.match(html,/sticker-images\.css\?v=5/);
 assert.match(html,/id="sticker-image-dialog"/);
 assert.match(sw,/STICKER_IMAGE_CACHE/);
 assert.match(sw,/sticker-images\.mjs/);
 assert.match(sw,/assets\/stickers\//);
});

test('Anteprima completa dall alto al basso e margini esclusivamente laterali, lente invariata',()=>{
 const css=readFileSync(local('assets/sticker-images.css'),'utf8');
 const sw=readFileSync(local('service-worker.js'),'utf8');
 // refined.css definisce .sticker-art come relativa: senza position:absolute si ottiene una fascia!
 assert.match(css,/\.sticker-visual\.has-sticker-image \.sticker-art\{position:absolute;inset:0;/);
 assert.match(css,/\.sticker-visual\.has-sticker-image \.sticker-photo\{[^}]*top:0;[^}]*height:100%;width:auto;max-width:none;object-fit:contain/);
 assert.doesNotMatch(css,/object-fit:cover/);
 assert.match(css,/\.sticker-visual\.has-sticker-image\{[^}]*border-bottom:0/);
 assert.match(css,/@media\(max-width:470px\)\{[^}]*height:min\(201px,55vw\)/);
 // Le regole dell'ingrandimento non cambiano.
 assert.match(css,/\.sticker-lightbox img\{[^}]*object-fit:contain/);
 assert.match(sw,/sticker-images\.css\?v=5/);
 assert.match(sw,/images-5-composites-2-lightbox-fit/);
});


test('Le nuove figurine multi-parte hanno i gruppi A/B/C/D corretti, senza riutilizzi',()=>{
 const expected4=['541','544','550','556'];
 const expected2=['509','510','513','514','516','542','545','551','555','557','567','576'];
 const singles=['580','584','588'];
 assert.deepEqual([...STICKER_LANDSCAPE_IMAGE_IDS].sort(),[...expected2].sort());
 const previousOtherEntries=manifest.filter(x=>x.documento!=='figurine3.pdf' && x.documento!=='figurine4.pdf').length;
 assert.equal(previousOtherEntries,72);
 assert.equal(manifest.filter(x=>x.documento==='figurine4.pdf').length,88);
 const newEntries=manifest.filter(x=>x.documento==='figurine3.pdf');
 assert.equal(newEntries.length,19);
 const parts=newEntries.flatMap(x=>x.parti);
 assert.equal(parts.length,43);
 assert.equal(new Set(parts.map(x=>x.xref_pdf)).size,43);
 for(const {numero,composizione,parti:segments} of newEntries){
  const n=expected4.includes(numero)?4:expected2.includes(numero)?2:singles.includes(numero)?1:0;
  assert.ok(n>0,numero);
  assert.equal(segments.length,n,numero);
  assert.equal(composizione,n===4?'four':n===2?'two':'single');
  assert.deepEqual(segments.map(x=>x.sezione),['A','B','C','D'].slice(0,n));
 }
 const app=readFileSync(local('assets/app.mjs'),'utf8');
 assert.match(app,/STICKER_LANDSCAPE_IMAGE_IDS\.includes/);
 assert.match(app,/sticker-image-landscape/);
 const css=readFileSync(local('assets/sticker-images.css'),'utf8');
 assert.match(css,/\.has-sticker-image\.sticker-image-landscape \.sticker-photo\{[^}]*object-fit:contain/);
 const html=readFileSync(local('index.html'),'utf8');
 assert.match(html,/app\.mjs\?v=12/);
});


test('Ingrandimento PC di 2/4 parti: foto intera senza scrollbar, singole e mobile invariati',()=>{
 const app=readFileSync(local('assets/app.mjs'),'utf8');
 const css=readFileSync(local('assets/sticker-images.css'),'utf8');
 const html=readFileSync(local('index.html'),'utf8');
 const sw=readFileSync(local('service-worker.js'),'utf8');
 assert.match(app,/dialog\.classList\.toggle\('sticker-lightbox-composite',card\.classList\.contains\('is-composite'\)\)/);
 assert.match(css,/@media \(min-width:700px\) and \(pointer:fine\)/);
 assert.match(css,/\.sticker-lightbox\.sticker-lightbox-composite \{[^}]*overflow:hidden/);
 assert.match(css,/\.sticker-lightbox\.sticker-lightbox-composite img \{[^}]*max-height:calc\(100dvh - 156px\);[^}]*object-fit:contain/);
 assert.match(html,/sticker-images\.css\?v=5/);
 assert.match(html,/app\.mjs\?v=12/);
 assert.match(sw,/sticker-images\.css\?v=5/);
 assert.match(sw,/app\.mjs\?v=12/);
 // I popup normali restano regolati dal CSS originale fuori dalla media query.
 assert.match(css,/\.sticker-lightbox\{[^}]*overflow:auto/);
 assert.match(css,/\.sticker-lightbox img\{[^}]*object-fit:contain/);
});


test('Figurine4: 88 associazioni certe, 73 nuove e 15 sostituzioni, solo giocatori del catalogo',()=>{
 const added=manifest.filter(x=>x.documento==='figurine4.pdf');
 assert.equal(added.length,88);
 assert.equal(new Set(added.map(x=>x.numero)).size,88);
 for(const x of added){
  const item=byId.get(x.numero);
  assert.ok(item,`ID sconosciuto: ${x.numero}`);
  assert.equal(item.title,x.nome);
  assert.equal(item.team,x.squadra);
  assert.equal(item.kind,'Giocatore');
  assert.ok(x.pagina>=1&&x.pagina<=5);
  assert.ok(x.posizione>=1);
  assert.ok(x.larghezza>=220&&x.altezza>=315);
 }
 const serviceWorker=readFileSync(local('service-worker.js'),'utf8');
 const app=readFileSync(local('assets/app.mjs'),'utf8');
 const html=readFileSync(local('index.html'),'utf8');
 assert.match(serviceWorker,/STICKER_IMAGE_CACHE_PREFIX/);
 assert.match(serviceWorker,/cache:'reload'/);
 assert.match(app,/sticker-images\.mjs\?v=3/);
 assert.match(html,/app\.mjs\?v=12/);
});
