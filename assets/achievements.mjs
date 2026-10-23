/* Figurine Club · STEP 3. Criteri calcolati dal catalogo e dall'album correnti.
 * Non scrive in Firestore, non memorizza dati personali e non conta le copie doppie.
 * La cronologia permanente delle conquiste condivise verrà progettata nello STEP 4.
 */
import {clampQty} from './core.mjs';

export const ACHIEVEMENTS=Object.freeze([
  {id:'first-team',title:'Prima squadra completata',description:'Trova tutte le figurine della tua prima squadra.',icon:'shield',tone:'gold'},
  {id:'hundred',title:'Collezionista in crescita',description:'Raccogli 100 figurine diverse.',icon:'layers',tone:'lime'},
  {id:'three-teams',title:'Tripletta perfetta',description:'Completa tre squadre dell’album.',icon:'medal',tone:'blue'},
  {id:'half',title:'A metà dell’opera',description:'Raggiungi il 50% dell’album.',icon:'target',tone:'mint'},
  {id:'special-trophies',title:'Collezionista di trofei',description:'Colleziona tutti e 4 i trofei iniziali.',icon:'trophy',tone:'gold'},
  {id:'special-serie-a',title:'Scudetti Serie A',description:'Completa i 20 scudetti delle squadre di Serie A.',icon:'shield',tone:'violet'},
  {id:'special-kits',title:'Divise Serie A',description:'Trova tutte le 20 figurine Kit delle divise.',icon:'layers',tone:'lime'},
  {id:'special-signings',title:'Nuove firme in città',description:'Completa tutte le 20 figurine Nuove Firme in Città.',icon:'gem',tone:'violet'},
  {id:'special-rookies',title:'Edizione Rookie',description:'Colleziona tutte le 20 figurine Rookie.',icon:'medal',tone:'blue'},
  {id:'special-capsule',title:'Edizione Time Capsule',description:'Completa tutte le 20 figurine Time Capsule.',icon:'flame',tone:'orange'},
  {id:'special-serie-b',title:'Scudetti Serie BKT',description:'Trova tutte le 10 figurine con due scudetti A e B.',icon:'shield',tone:'mint'},
  {id:'special-serie-c',title:'Scudetti Serie C',description:'Trova tutte le 15 figurine con quattro scudetti A, B, C e D.',icon:'shield',tone:'blue'},
  {id:'special-potm',title:'Player Of The Match',description:'Completa le 10 figurine dell’edizione Player Of The Match.',icon:'trophy',tone:'gold'},
  {id:'ninety',title:'A un passo dalla gloria',description:'Raggiungi il 90% dell’album.',icon:'flame',tone:'orange'},
  {id:'complete',title:'Leggenda delle figurine',description:'Completa il 100% dell’album.',icon:'trophy',tone:'gold'}
]);

export function specialCategory(item) {
  const section=String(item.section||'').trim().toLocaleLowerCase('it');
  const kind=String(item.kind||'').trim().toLocaleLowerCase('it');
  // Upgrade, Celebration, Kinder, capitani, allenatori e divise B/C restano normali.
  if(section==='trofei')return 'special-trophies';
  if(section==='serie a'&&kind==='scudetto')return 'special-serie-a';
  if(section==='divise serie a')return 'special-kits';
  if(section==='nuove firme in città')return 'special-signings';
  if(section==='rookie')return 'special-rookies';
  if(section==='time capsule')return 'special-capsule';
  if(section==='serie bkt'&&kind==='scudetto')return 'special-serie-b';
  if(section==='serie c'&&kind==='scudetto')return 'special-serie-c';
  if(section==='player of the match')return 'special-potm';
  return null;
}

const teamPlaceholder=/^(album|introduzione|intro|speciali?|figurine speciali|varie|various|tutte le squadre|calciatori)$/i;
const isDemo=item=>/\b(?:demo|dimostrativ[oaie]|esempio)\b/i.test(String(item.subtitle||''));

export function catalogSignature(items){
  // Hash leggero per riconoscere l'aggiornamento del catalogo: non è un identificativo privato.
  let hash=2166136261;
  for(const item of items){
    for(const c of `${item.number}|${item.team}|${item.section}|${item.kind||''};`){hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;}
  }
  return `${items.length}-${hash.toString(16)}`;
}

export function computeAchievements(items=[],counts={}){
  const unique=new Map();
  for(const item of items){
    if(!/^(?:[1-9]\d{0,4}|Kit[1-9]\d*|UPG[1-9]\d*|C[1-9]\d*|K[1-9]\d*)$/.test(String(item.number)))continue;
    if(!unique.has(String(item.number)))unique.set(String(item.number),item);
  }
  const stickers=[...unique.values()];
  const total=stickers.length;
  const demo=stickers.some(isDemo);
  const available=total>0&&!demo;
  const owned=stickers.filter(item=>clampQty(Number(counts[String(item.number)]||0))>0);
  const found=owned.length;
  const teams=new Map(),specialSections=new Map();
  const hasSerieA=stickers.some(item=>item.section==='Serie A');
  for(const item of stickers){
    const present=clampQty(Number(counts[String(item.number)]||0))>0;
    const team=String(item.team||'').trim();
    if(team&&!teamPlaceholder.test(team)&&(!hasSerieA||item.section==='Serie A')){
      const key=team.toLocaleLowerCase('it');
      const group=teams.get(key)||{total:0,found:0};group.total++;if(present)group.found++;teams.set(key,group);
    }
    const key=specialCategory(item);
    if(key){
      const group=specialSections.get(key)||{total:0,found:0};group.total++;if(present)group.found++;specialSections.set(key,group);
    }
  }
  const teamProgress=[...teams.values()].filter(v=>v.total>0).sort((a,b)=>
    b.found*a.total-a.found*b.total || b.found-a.found);
  const completeTeams=teamProgress.filter(v=>v.found===v.total).length;
  // Le squadre vengono ordinate per FRAZIONE completata, non per figurine assolute.
  // Se la squadra più avanti cambia, il progresso della prima medaglia la segue.
  const bestTeam=teamProgress[0];
  const bestThree=teamProgress.slice(0,3);
  const threeFound=bestThree.reduce((sum,v)=>sum+v.found,0);
  const threeTotal=bestThree.reduce((sum,v)=>sum+v.total,0);
  // Rapporto sul traguardo, non sulla percentuale totale dell'album.
  // Il 100% si mostra soltanto quando la condizione di sblocco è vera.
  const progressPercent=(numerator,denominator,unlocked=false)=>
    denominator>0 ? Math.min(unlocked?100:99,Math.round(100*numerator/denominator)) : 0;
  const specialAvailable=specialSections.size>0;
  const completedSpecial=new Set([...specialSections].filter(([,v])=>v.total>0&&v.found===v.total).map(([key])=>key));
  // Usare il rapporto esatto: 49,6% non deve sbloccare il premio del 50%.
  const passed={
    'first-team':completeTeams>=1,
    'hundred':found>=100,
    'three-teams':completeTeams>=3,
    'half':total>0&&found*2>=total,
    ...Object.fromEntries(ACHIEVEMENTS.filter(a=>a.id.startsWith('special-')).map(a=>[a.id,completedSpecial.has(a.id)])),
    'ninety':total>0&&found*10>=total*9,
    'complete':total>0&&found===total
  };
  const awards=ACHIEVEMENTS.map(def=>{
    const unlocked=available&&passed[def.id];
    let numerator=0,denominator=0,detail='Avanzamento dell’obiettivo';
    if(def.id==='first-team'){
      numerator=bestTeam?.found||0;denominator=bestTeam?.total||0;
      detail=bestTeam?`La squadra più vicina · ${numerator} di ${denominator} figurine`:'Nessuna squadra disponibile';
    }else if(def.id==='three-teams'){
      numerator=threeFound;denominator=threeTotal;
      detail=bestThree.length===3?`Le 3 squadre più avanti · ${numerator} di ${denominator} figurine`:'In attesa di tre squadre nel catalogo';
    }else if(def.id==='hundred'){
      numerator=found;denominator=100;
      detail=`${Math.min(found,100)} di 100 figurine diverse`;
    }else if(def.id==='half'||def.id==='ninety'||def.id==='complete'){
      numerator=found;denominator=def.id==='half'?Math.ceil(total/2):def.id==='ninety'?Math.ceil(total*9/10):total;
      detail=def.id==='complete'?`${found} di ${total} figurine dell’album`:
        `${Math.min(found,denominator)} su ${denominator} figurine necessarie`;
    }else if(def.id.startsWith('special-')){
      const group=specialSections.get(def.id);
      numerator=group?.found||0;denominator=group?.total||0;
      const label=def.id==='special-trophies'?'trofei':
        def.id==='special-serie-a'||def.id==='special-serie-b'||def.id==='special-serie-c'?'scudetti':
        def.id==='special-kits'?'divise':'figurine';
      detail=group?`${numerator} di ${denominator} ${label}`:'Categoria non presente nel catalogo';
    }
    // Con meno di 3 squadre non sarebbe possibile sbloccare la tripletta.
    const factor=def.id==='three-teams'&&bestThree.length<3 ? bestThree.length/3 : 1;
    const progress=progressPercent(numerator*factor,denominator,unlocked);
    return {...def,unlocked,progress,progressDetail:detail,
      unavailable:!available||(def.id.startsWith('special-')&&!specialSections.has(def.id))};
  });
  return {awards,total,found,percentage:total?Math.round(found/total*100):0,
    unlocked:awards.filter(x=>x.unlocked).length,available,demo,specialAvailable,completeTeams,
    signature:catalogSignature(stickers)};
}
