import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {computeAchievements} from '../assets/achievements.mjs';
import {publicSummary,mergeClubProfile,needsClubPublish,normalizeClubProfile,recentClubAchievements} from '../assets/club.mjs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const item={number:1,team:'Roma',section:'Giocatori',title:'Prova',subtitle:''};
const awardResult=counts=>computeAchievements([item],counts);
test('Pubblicazione aggregata: niente numeri delle figurine, email o doppioni',()=>{
 const derived=publicSummary(awardResult({'1':99}),'Riccardo');
 assert.deepEqual(Object.keys(derived).sort(),['awardProgress','catalogSignature','displayName','percentage','ready','unlocked'].sort());
 assert.equal(derived.percentage,100);assert.ok(derived.unlocked.includes('first-team'));
 assert.equal(JSON.stringify(derived).includes('99'),false);
 assert.equal(derived.ready,true);
});
test('Catalogo mancante o demo: profilo in attesa, nessun risultato inventato',()=>{
 const r=publicSummary(computeAchievements([]),'Marco');
 assert.deepEqual([r.ready,r.percentage,r.unlocked.length,r.catalogSignature],[false,0,0,'']);
 const demo=publicSummary(computeAchievements([{...item,subtitle:'Figurina demo'}],{'1':1}),'Marco');
 assert.equal(demo.ready,false);
});
test('Primo popolamento e cambio catalogo non generano notizie retroattive',()=>{
 const data=publicSummary(awardResult({'1':1}),'Riccardo');
 const first=mergeClubProfile(null,data,new Date('2026-10-21T10:00:00Z'));
 assert.deepEqual(first.earnedAt,{});
 const previous={...data,unlocked:[],catalogSignature:'old',earnedAt:{'half':new Date()}};
 assert.deepEqual(mergeClubProfile(previous,data,new Date()).earnedAt,{});
});
test('Una nuova conquista è registrata una sola volta, anche dopo riapertura o regressione',()=>{
 const t=new Date('2026-10-21T10:10:00Z');
 const before={displayName:'Riccardo',ready:true,percentage:0,unlocked:[],catalogSignature:'1-catalog',earnedAt:{}};
 const now={...before,percentage:100,unlocked:['first-team','complete']};
 const updated=mergeClubProfile(before,now,t);
 assert.deepEqual(Object.keys(updated.earnedAt),['first-team','complete']);
 assert.equal(updated.earnedAt.complete,t);
 assert.equal(needsClubPublish(before,updated),true);
 assert.equal(needsClubPublish(updated,mergeClubProfile(updated,now,new Date())),false);
 const undo=mergeClubProfile(updated,{...now,percentage:0,unlocked:[]},new Date());
 const redo=mergeClubProfile(undo,now,new Date());
 assert.equal(redo.earnedAt.complete,t);
});
test('Feed filtrato per badge sbloccati e ordinato per data, senza email',()=>{
 const start={id:'123',displayName:'Luca',ready:true,percentage:50,unlocked:['half'],earnedAt:{half:new Date('2026-10-21T10:00:00Z')}};
 const other={id:'456',displayName:'Marco',ready:true,percentage:0,unlocked:['half'],earnedAt:{half:new Date('2026-10-21T11:00:00Z')}};
 const records=recentClubAchievements([start,other]);
 assert.deepEqual(records.map(x=>x.name),['Marco','Luca']);
 assert.equal(recentClubAchievements([{...start,unlocked:[]}]).length,0);
 assert.equal(recentClubAchievements([{...start,ready:false}]).length,0);
});
test('Separazione Firestore: album privato, liste pubbliche solo approvati, mai email',()=>{
 const rules=read('firestore.rules');const app=read('assets/app.mjs');const html=read('index.html');
 assert.match(rules,/match \/clubProfiles\/\{uid\}/);
 assert.match(rules,/allow list: if canUseClub\(\) && request\.query\.limit <= 150/);
 assert.match(rules,/allow update: if owner\(uid\) && canUseClub\(\) && validClubProfile/);
 assert.match(rules,/allow get: if owner\(uid\) && canUseClub\(\);/);
 assert.match(rules,/d\.keys\(\)\.hasOnly\(\['displayName','ready','percentage','unlocked','awardProgress','catalogSignature','earnedAt','updatedAt'\]\)/);
 assert.match(app,/batch\.delete\(doc\(db,'clubProfiles',uid\)\)/);
 assert.match(html,/id="view-club"/);
 assert.match(html,/id="club-profile-awards" class="awards-list"/);
 assert.match(read('assets/club.css'),/\.club-member-grid/);
 assert.match(read('service-worker.js'),/assets\/club\.mjs/);
 assert.match(read('service-worker.js'),/assets\/club\.css/);
});
