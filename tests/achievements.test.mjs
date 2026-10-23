import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ACHIEVEMENTS,computeAchievements,catalogSignature} from '../assets/achievements.mjs';
const data=(teams,section='Giocatori')=>{
 let number=0;
 return teams.flatMap(team=>Array.from({length:team.length},(_,i)=>({number:++number,team:team.name,section,title:team.name+' '+i,subtitle:'',kind:'Giocatore'})));
};
const unlocked=r=>new Set(r.awards.filter(a=>a.unlocked).map(a=>a.id));
test('Catalogo vuoto: 15 premi visibili ma nessuno sbloccato, percentuale 0',()=>{
 const a=computeAchievements([]);
 assert.equal(a.awards.length,15);assert.equal(a.unlocked,0);assert.equal(a.total,0);
 assert.equal(a.awards.every(x=>!x.unlocked),true);
 assert.equal(a.specialAvailable,false);
});
test('Catalogo demo: premi sospesi anche quando tutte le figurine sono state segnate',()=>{
 const a=computeAchievements([{number:1,team:'Roma',section:'Giocatori',subtitle:'Figurina dimostrativa · non ufficiale'}],{'1':99});
 assert.equal(a.demo,true);assert.equal(a.unlocked,0);assert.equal(a.available,false);
});
test('Prima squadra e tripletta: una squadra completa richiede tutte le sue figurine',()=>{
 const items=data([{name:'Inter',length:3},{name:'Milan',length:3},{name:'Roma',length:3}]);
 const first=computeAchievements(items,{'1':3,'2':1,'3':99,'4':1,'5':1});
 assert.ok(unlocked(first).has('first-team'));
 assert.ok(!unlocked(first).has('three-teams'));
 const triple=computeAchievements(items,Object.fromEntries(items.map(i=>[i.number,1])));
 assert.ok(unlocked(triple).has('three-teams'));
 assert.equal(triple.completeTeams,3);
});
test('100 diverse, non 100 copie: la quantità 99 non aggiunge più di una figurina',()=>{
 const items=data([{name:'Napoli',length:101}]);
 const copies=computeAchievements(items,{'1':99});
 assert.equal(copies.found,1);assert.ok(!unlocked(copies).has('hundred'));
 const counts=Object.fromEntries(items.slice(0,100).map(x=>[x.number,1]));
 assert.ok(unlocked(computeAchievements(items,counts)).has('hundred'));
});
test('Soglie esatte: 49/100, 50/100, 89/100, 90/100, 100/100',()=>{
 const items=data([{name:'Atalanta',length:100}]);
 const flags=n=>unlocked(computeAchievements(items,Object.fromEntries(items.slice(0,n).map(x=>[x.number,1]))));
 assert.ok(!flags(49).has('half'));assert.ok(flags(50).has('half'));
 assert.ok(!flags(89).has('ninety'));assert.ok(flags(90).has('ninety'));
 assert.ok(!flags(99).has('complete'));assert.ok(flags(100).has('complete'));
});
test('49,6 percento visualizzato come 50 non deve sbloccare il 50%',()=>{
 const items=data([{name:'Juventus',length:125}]);
 const counts=Object.fromEntries(items.slice(0,62).map(x=>[x.number,1]));
 const a=computeAchievements(items,counts);
 assert.equal(a.percentage,50);assert.ok(!unlocked(a).has('half'));
});
test('Le 9 categorie speciali sono indipendenti: niente premi per divise B/C o edizioni future',()=>{
 const base=[
  {number:1,team:'Trofei',section:'Trofei',kind:'Trofeo',title:'Trofeo'},
  {number:5,team:'Atalanta',section:'Serie A',kind:'Scudetto',title:'Scudetto'},
  {number:'Kit1',team:'Divise Serie A',section:'Divise Serie A',kind:'Divisa',title:'Kit'},
  {number:445,team:'Nuove Firme in Città',section:'Nuove Firme in Città',kind:'Edizione speciale',title:'Firme'},
  {number:465,team:'Rookie',section:'Rookie',kind:'Edizione speciale',title:'Rookie'},
  {number:485,team:'Time Capsule',section:'Time Capsule',kind:'Edizione speciale',title:'Capsule'},
  {number:505,team:'Serie BKT',section:'Serie BKT',kind:'Scudetto',title:'Scudetti A/B'},
  {number:506,team:'Serie BKT',section:'Serie BKT',kind:'Divisa',title:'Divise A/B'},
  {number:535,team:'Serie C',section:'Serie C',kind:'Scudetto',title:'Scudetti A/B/C/D'},
  {number:536,team:'Serie C',section:'Serie C',kind:'Divisa',title:'Divise A/B'},
  {number:580,team:'Player Of The Match',section:'Player Of The Match',kind:'Edizione speciale',title:'Giocatore'},
  {number:'UPG1',team:'Upgrade',section:'Upgrade',kind:'Upgrade',title:'Upgrade'},
  {number:'C1',team:'Celebration',section:'Celebration',kind:'Celebration',title:'Celebration'},
  {number:'K1',team:'Kinder',section:'Kinder',kind:'Kinder',title:'Kinder'},
  {number:26,team:'Atalanta',section:'Serie A',kind:'Allenatore',title:'Allenatore'}
 ];
 const result=computeAchievements(base,{'1':1,'5':1,'Kit1':1,'445':1,'465':1,'485':1,'505':1,'535':1,'580':1});
 assert.equal(result.total,15);
 assert.equal(result.awards.filter(a=>a.id.startsWith('special-')).length,9);
 assert.equal(result.awards.filter(a=>a.id.startsWith('special-')&&a.unlocked).length,9);
 assert.ok(!unlocked(result).has('complete'));
 assert.equal(computeAchievements([{number:'UPG1',team:'Upgrade',section:'Upgrade',kind:'Upgrade'}],{'UPG1':1}).specialAvailable,false);
});
test('Nessuna mutazione dei dati album e firma diversa per catalogo aggiornato',()=>{
 const items=Object.freeze([Object.freeze({number:1,team:'Roma',section:'Giocatori'})]);
 const counts=Object.freeze({'1':1});
 assert.ok(unlocked(computeAchievements(items,counts)).has('complete'));
 assert.notEqual(catalogSignature(items),catalogSignature([{number:1,team:'Napoli',section:'Giocatori'}]));
});
test('Bacheca: struttura responsive verticale, SVG e nessun ampliamento delle regole Firestore',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../assets/achievements.css',import.meta.url),'utf8');
 const code=readFileSync(new URL('../assets/app.mjs',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../service-worker.js',import.meta.url),'utf8');
 assert.match(html, /id="view-bacheca"/);assert.match(html, /href="#bacheca" data-route="bacheca"/);
 assert.match(css,/\.awards-list\{display:flex;flex-direction:column;/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(code,/function renderAchievements\(/);
 assert.match(code,/computeAchievements\(state\.items,\{\.\.\.state\.counts,\.\.\.state\.pending\}\)/);
 assert.match(sw,/\.\/assets\/achievements\.mjs/);
 assert.match(sw,/\.\/assets\/achievements\.css\?v=2/);
 assert.doesNotMatch(code,/setDoc\(doc\(db,'achievements'/);
 assert.equal(ACHIEVEMENTS.length,15);
});

test('Annuncio solo dopo conferma Firebase, non dal caricamento e senza nuove scritture',()=>{
 const code=readFileSync(new URL('../assets/app.mjs',import.meta.url),'utf8');
 assert.match(code,/state\.achievementBaseline=now;/);
 assert.match(code,/else if\(synchronized\)/);
 assert.match(code,/Nuovo traguardo conquistato!/);
 assert.match(code,/Da sincronizzare/);
 assert.match(code,/state\.achievementNotified\.has/);
});
