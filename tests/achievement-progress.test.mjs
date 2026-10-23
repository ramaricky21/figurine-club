import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCSV} from '../assets/core.mjs';
import {computeAchievements,ACHIEVEMENTS} from '../assets/achievements.mjs';
import {publicSummary,needsClubPublish,normalizeClubProfile} from '../assets/club.mjs';
const catalog=parseCSV(readFileSync(new URL('../catalogo_2026_2027.csv',import.meta.url),'utf8'));
const goal=(r,id)=>r.awards.find(x=>x.id===id);
const owned=(rows)=>Object.fromEntries(rows.map(s=>[String(s.number),1]));
test('Tutti e 15 gli obiettivi reali hanno progresso specifico anche allo 0%',()=>{
  const result=computeAchievements(catalog,{});
  assert.equal(result.total,775);
  assert.equal(result.awards.length,15);
  for(const award of result.awards){
    assert.equal(award.unavailable,false,award.id);
    assert.equal(award.progress,0,award.id);
    assert.ok(award.progressDetail,award.id);
  }
});
test('Prima squadra: si segue automaticamente quella con la percentuale maggiore',()=>{
  const teamNames=['Atalanta','Bologna','Cagliari'];
  const groups=teamNames.map(name=>catalog.filter(i=>i.team===name && i.section==='Serie A'));
  assert.deepEqual(groups.map(x=>x.length),[22,22,22]);
  const a=computeAchievements(catalog,owned([...groups[0].slice(0,5),...groups[1].slice(0,9)]));
  assert.equal(goal(a,'first-team').progress,41); // Bologna: 9/22
  const b=computeAchievements(catalog,owned([...groups[0].slice(0,14),...groups[1].slice(0,9)]));
  assert.equal(goal(b,'first-team').progress,64); // Atalanta: 14/22
  assert.equal(goal(b,'first-team').unlocked,false);
  const c=computeAchievements(catalog,owned([...groups[0],...groups[1].slice(0,9)]));
  assert.equal(goal(c,'first-team').progress,100);
  assert.equal(goal(c,'first-team').unlocked,true);
});
test('100 figurine diverse: 87% anche con tante copie dello stesso numero',()=>{
  const counts=owned(catalog.slice(0,87));
  counts[String(catalog[0].number)]=99;
  const r=computeAchievements(catalog,counts);
  assert.equal(goal(r,'hundred').progress,87);
  assert.equal(goal(r,'hundred').unlocked,false);
  assert.match(goal(r,'hundred').progressDetail,/87 di 100/);
});
test('Tripletta: tre squadre migliori, 100% solo completandole tutte',()=>{
  const groups=['Atalanta','Bologna','Cagliari','Como'].map(name=>catalog.filter(i=>i.team===name && i.section==='Serie A'));
  const r=computeAchievements(catalog,owned([...groups[0],...groups[1].slice(0,11),...groups[2].slice(0,6),...groups[3].slice(0,2)]));
  assert.equal(goal(r,'three-teams').progress,Math.round(100*(22+11+6)/66));
  assert.equal(goal(r,'three-teams').unlocked,false);
  const completed=computeAchievements(catalog,owned(groups.slice(0,3).flat()));
  assert.equal(goal(completed,'three-teams').progress,100);
  assert.equal(goal(completed,'three-teams').unlocked,true);
});
test('Nove categorie speciali separate; soglie del 50%, 90% e 100%',()=>{
  const category={
    'special-trophies':catalog.filter(x=>x.section==='Trofei'),
    'special-serie-a':catalog.filter(x=>x.section==='Serie A'&&x.kind==='Scudetto'),
    'special-kits':catalog.filter(x=>x.section==='Divise Serie A'),
    'special-signings':catalog.filter(x=>x.section==='Nuove Firme in Città'),
    'special-rookies':catalog.filter(x=>x.section==='Rookie'),
    'special-capsule':catalog.filter(x=>x.section==='Time Capsule'),
    'special-serie-b':catalog.filter(x=>x.section==='Serie BKT'&&x.kind==='Scudetto'),
    'special-serie-c':catalog.filter(x=>x.section==='Serie C'&&x.kind==='Scudetto'),
    'special-potm':catalog.filter(x=>x.section==='Player Of The Match')
  };
  for(const [id,group] of Object.entries(category)){
    assert.ok(group.length>0,id);
    const r=computeAchievements(catalog,owned(group.slice(0,Math.ceil(group.length/2))));
    assert.equal(goal(r,id).progress,Math.round(Math.ceil(group.length/2)*100/group.length),id);
    assert.equal(goal(r,id).unlocked,false,id);
    const complete=computeAchievements(catalog,owned(group));
    assert.equal(goal(complete,id).progress,100,id);
    assert.equal(goal(complete,id).unlocked,true,id);
  }
  const almostHalf=computeAchievements(catalog,owned(catalog.slice(0,387)));
  assert.equal(goal(almostHalf,'half').progress,99);
  assert.equal(goal(almostHalf,'half').unlocked,false);
  assert.equal(goal(computeAchievements(catalog,owned(catalog.slice(0,388))),'half').progress,100);
  assert.equal(goal(computeAchievements(catalog,owned(catalog.slice(0,697))),'ninety').unlocked,false);
  assert.equal(goal(computeAchievements(catalog,owned(catalog.slice(0,698))),'ninety').progress,100);
  assert.equal(goal(computeAchievements(catalog,owned(catalog.slice(0,774))),'complete').progress,99);
});
test('Club: solo 15 percentuali anonime, legacy visibile senza inventare zeri',()=>{
  const result=computeAchievements(catalog,owned(catalog.slice(0,87)));
  const desired=publicSummary(result,'Amico');
  assert.deepEqual(Object.keys(desired.awardProgress),ACHIEVEMENTS.map(a=>a.id));
  assert.equal(desired.awardProgress.hundred,87);
  assert.ok(Object.values(desired.awardProgress).every(n=>Number.isInteger(n)&&n>=0&&n<=100));
  assert.equal(JSON.stringify(desired).includes('counts'),false);
  const prev={...desired};delete prev.awardProgress;
  assert.equal(needsClubPublish(prev,desired),true,'pubblica la mappa sulle vecchie bacheche');
  assert.equal(normalizeClubProfile('id',prev).awardProgress.hundred,undefined);
  assert.equal(normalizeClubProfile('id',desired).awardProgress.hundred,87);
  const sameAlbumDifferentGoal={...desired,awardProgress:{...desired.awardProgress,hundred:88}};
  assert.equal(needsClubPublish(desired,sameAlbumDifferentGoal),true,'aggiorna anche se il totale non cambia');
});
test('I riepiloghi esterni non contengono i numeri delle figurine né le copie',()=>{
  const result=computeAchievements(catalog,owned(catalog.slice(0,87)));
  const p=publicSummary(result,'Giocatore');
  assert.equal(JSON.stringify(p).includes('87 di 100'),false);
  assert.ok(!('items' in p)&&!('counts' in p)&&!('duplicates' in p)&&!('email' in p));
  const rules=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
  assert.match(rules,/function validAwardProgress\(p\)/);
  assert.match(rules,/d\.get\('awardProgress',\{\}\)/);
});
