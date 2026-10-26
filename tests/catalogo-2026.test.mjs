import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCSV,compareStickerNumbers,sectionsFor,computeStats,exchangeMatch} from '../assets/core.mjs';
import {computeAchievements,specialCategory,ACHIEVEMENTS} from '../assets/achievements.mjs';

const csv=readFileSync(new URL('../catalogo_2026_2027.csv',import.meta.url),'utf8');
const items=parseCSV(csv);
const lookup=new Map(items.map(item=>[String(item.number),item]));

test('Catalogo integrale: 775 identificativi distinti e tutte le 589 figurine numeriche',()=>{
 assert.equal(items.length,775);
 assert.equal(lookup.size,775);
 const numerical=items.filter(item=>typeof item.number==='number');
 assert.deepEqual(numerical.map(item=>item.number),Array.from({length:589},(_,i)=>i+1));
 assert.equal(items.filter(item=>typeof item.number==='string').length,186);
 assert.equal(items.findIndex(s=>s.number==='Kit1'),444);
 assert.equal(items.findIndex(s=>s.number==='UPG1'),524);
 assert.equal(items.findIndex(s=>s.number==='C1'),699);
 assert.equal(items.findIndex(s=>s.number==='K1'),759);
});

test('Codici Kit, UPG, C, K: preservano quantità, doppioni e ordine',()=>{
 for(const [prefix,n] of [['Kit',20],['UPG',100],['C',60],['K',6]]){
  const group=items.filter(item=>typeof item.number==='string'&&new RegExp(`^${prefix}\\d+$`).test(item.number));
  assert.deepEqual(group.map(item=>item.number),Array.from({length:n},(_,i)=>prefix+(i+1)));
 }
 assert.ok(compareStickerNumbers('Kit20',445)<0);
 assert.ok(compareStickerNumbers('UPG100',505)<0);
 assert.ok(compareStickerNumbers('C60','K1')<0);
 assert.deepEqual(computeStats([lookup.get('Kit1'),lookup.get('505')],{'Kit1':3,505:1}),
  {total:2,found:2,missing:0,duplicates:2,percentage:100});
 const match=exchangeMatch([lookup.get('Kit1'),lookup.get('C1')],{'Kit1':2,'C1':0},
  {duplicates:['C1'],missing:['Kit1']});
 assert.deepEqual(match.receive.map(x=>x.number),['C1']);
 assert.deepEqual(match.offer.map(x=>x.number),['Kit1']);
});

test('Ogni parte della Serie BKT/C è informazione di una sola figurina',()=>{
 assert.equal(lookup.get('505').subtitle,'505A: Scudetto Arezzo · 505B: Scudetto Ascoli');
 assert.equal(lookup.get('506').subtitle,'506A: Divisa Arezzo · 506B: Divisa Ascoli');
 assert.match(lookup.get('535').subtitle,/535A: Albinoleffe.*535B: Alcione Milano.*535C: Arzignano Valchiampo.*535D: Carpi/);
 assert.equal(specialCategory(lookup.get('505')),'special-serie-b');
 assert.equal(specialCategory(lookup.get('506')),null);
 assert.equal(specialCategory(lookup.get('535')),'special-serie-c');
 assert.equal(specialCategory(lookup.get('536')),null);
});

test('Esattamente 9 traguardi speciali, 139 figurine e 20 squadre con allenatore normale',()=>{
 const categories=new Map();
 for(const item of items){const category=specialCategory(item);if(category)categories.set(category,(categories.get(category)||0)+1);}
 assert.deepEqual(Object.fromEntries(categories),{
  'special-trophies':4,'special-serie-a':20,'special-kits':20,
  'special-signings':20,'special-rookies':20,'special-capsule':20,
  'special-serie-b':10,'special-serie-c':15,'special-potm':10
 });
 assert.equal([...categories.values()].reduce((a,b)=>a+b,0),139);
 assert.equal(ACHIEVEMENTS.length,15);
 assert.equal(items.filter(item=>item.kind==='Allenatore').length,20);
 assert.ok(items.filter(item=>item.kind==='Allenatore').every(item=>specialCategory(item)===null));
 for(const sect of ['Upgrade','Celebration','Kinder'])assert.ok(items.filter(x=>x.section===sect).every(item=>!specialCategory(item)));
 const counts=Object.fromEntries(items.map(x=>[String(x.number),1]));
 const complete=computeAchievements(items,counts);
 assert.equal(complete.found,775);
 assert.equal(complete.completeTeams,20);
 assert.equal(complete.unlocked,15);
 for(const category of categories.keys()){
  const subset=items.filter(x=>specialCategory(x)===category);
  const missing={...counts,[String(subset[0].number)]:0};
  const r=computeAchievements(items,missing);
  assert.equal(r.awards.find(a=>a.id===category).unlocked,false,category);
 }
});

test('Importer Firestore: ogni sezione ha <=80 figurine, tutte le 775 preservate',()=>{
 const groups=sectionsFor(items);
 assert.ok(groups.length<=400);
 assert.ok(groups.every(group=>group.items.length<=80));
 assert.equal(groups.reduce((sum,group)=>sum+group.items.length,0),775);
 assert.equal(new Set(groups.map(group=>group.id)).size,groups.length);
});


test('Grafie corrette nel catalogo per gli ID immutabili 170 e 212',()=>{
 const byId=new Map(items.map(item=>[String(item.number),item]));
 assert.equal(byId.get('170').title,'Piotr Zieliński');
 assert.equal(byId.get('212').title,'Alfonso Pedraza');
 const app=readFileSync(new URL('../assets/app.mjs',import.meta.url),'utf8');
 assert.match(app,/\'170\':\'Piotr Zieliński\'/);
 assert.match(app,/\'212\':\'Alfonso Pedraza\'/);
 assert.match(app,/\.map\(correctedCatalogItem\)/);
 assert.doesNotMatch(app,/updateDoc\(.*catalog/);
});
