import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {STICKER_IMAGES,STICKER_IMAGE_IDS} from '../assets/sticker-images.mjs';
import {parseCSV,computeStats} from '../assets/core.mjs';
const local=p=>new URL('../'+p,import.meta.url);
const items=parseCSV(readFileSync(local('catalogo_2026_2027.csv'),'utf8'));
const byId=new Map(items.map(x=>[String(x.number),x]));
const manifest=JSON.parse(readFileSync(local('assets/stickers/associazioni.json'),'utf8'));

test('Sono presenti 87 figurine univoche e tutte appartengono al catalogo già esistente',()=>{
 assert.equal(STICKER_IMAGE_IDS.length,87);
 assert.equal(new Set(STICKER_IMAGE_IDS).size,87);
 assert.equal(Object.keys(STICKER_IMAGES).length,87);
 assert.equal(manifest.length,87);
 for(const id of STICKER_IMAGE_IDS)assert.ok(byId.has(id),`Id fuori catalogo: ${id}`);
});
test('Le 87 immagini corrispondono ai file WebP e al titolo del catalogo',()=>{
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
 assert.match(html,/sticker-images\.css\?v=2/);
 assert.match(html,/id="sticker-image-dialog"/);
 assert.match(sw,/STICKER_IMAGE_CACHE/);
 assert.match(sw,/sticker-images\.mjs/);
 assert.match(sw,/assets\/stickers\//);
});

test('La foto della tessera riempie l’anteprima senza alterare la visualizzazione con lente',()=>{
 const css=readFileSync(local('assets/sticker-images.css'),'utf8');
 const sw=readFileSync(local('service-worker.js'),'utf8');
 assert.match(css,/\.sticker-visual\.has-sticker-image \.sticker-art\{inset:0 9px;overflow:hidden\}/);
 assert.match(css,/\.sticker-visual\.has-sticker-image \.sticker-photo\{[^}]*object-fit:cover;object-position:center 22%/);
 assert.match(css,/\.sticker-lightbox img\{[^}]*object-fit:contain/);
 assert.match(css,/\.sticker-visual\.has-sticker-image \.sticker-art\{inset:0 6px\}/);
 assert.match(sw,/sticker-images\.css\?v=2/);
 assert.match(sw,/images-2/);
});
