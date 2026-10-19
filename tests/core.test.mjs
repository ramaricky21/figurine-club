import test from 'node:test';
import assert from 'node:assert/strict';
import {clampQty, computeStats, exchangeMatch, parseCSV, catalogNormalize, sectionsFor} from '../assets/core.mjs';
const stickers=[
 {number:1,team:'Juventus',section:'Simboli',title:'Scudetto',subtitle:'',kind:'Scudetto'},
 {number:2,team:'Juventus',section:'Giocatori',title:'Nome Cognome',subtitle:'',kind:'Giocatore'},
 {number:3,team:'Inter',section:'Giocatori',title:'Altro',subtitle:'',kind:'Giocatore'}
];
test('Statistiche: trovate, mancanti, percentuale, copie extra',()=>{
 assert.deepEqual(computeStats(stickers,{'1':3,'3':1}),{total:3,found:2,missing:1,duplicates:2,percentage:67});
 assert.equal(computeStats([],{}).percentage,0);
});
test('Quantità vincolate tra 0 e 99',()=>{
 assert.equal(clampQty(-8),0);assert.equal(clampQty(500),99);assert.equal(clampQty(3.8),3);
});
test('Abbinamento: ricevere doppioni mancanti e cedere i propri',()=>{
 assert.deepEqual(exchangeMatch(stickers,{'1':2,'2':0,'3':1},{duplicates:[2,3],missing:[1,2]}),{receive:[stickers[1]],offer:[stickers[0]]});
});
test('CSV italiano con separatore virgola e quote',()=>{
 const rows=parseCSV('numero,squadra,sezione,titolo,sottotitolo,tipo\n1,Juventus,Simboli,"Scudetto, Juventus",,"Scudetto"\n2,Inter,Giocatori,"Nome ""Calciatore""",,Giocatore');
 assert.equal(rows[0].title,'Scudetto, Juventus');assert.equal(rows[1].title,'Nome "Calciatore"');
});
test('CSV punto e virgola + BOM + righe multilinea',()=>{
 const rows=parseCSV('\ufeffnumero;squadra;sezione;titolo;sottotitolo;tipo\r\n1;Roma;Giocatori;"Mario\nRossi";;Giocatore\r\n');
 assert.equal(rows[0].title,'Mario\nRossi');
});
test('Niente numeri duplicati o intestazioni incomplete',()=>{
 assert.throws(()=>parseCSV('numero,squadra,sezione,titolo\n1,A,B,C\n1,D,E,F'),/ripetuto/);
 assert.throws(()=>parseCSV('numero,squadra,titolo\n1,A,B'),/sezione/);
 assert.throws(()=>catalogNormalize([]),/non contiene/);
});
test('Sezioni deterministiche e max 80 sticker per documento',()=>{
 const arr=Array.from({length:171},(_,i)=>({...stickers[0],number:i+1}));
 const parts=sectionsFor(arr);assert.equal(parts.length,3);assert.deepEqual(parts.map(s=>s.items.length),[80,80,11]);
 assert.deepEqual(sectionsFor(arr).map(s=>s.id),parts.map(s=>s.id));
});
test('Caratteri UTF-8 lunghi non eccedono gli ID Firestore',()=>{
 const rows=[{...stickers[0],team:'🎯'.repeat(160),section:'🔴'.repeat(160)}];
 assert.ok(sectionsFor(rows)[0].id.length<1500);
});
