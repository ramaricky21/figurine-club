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
  {id:'special',title:'Cacciatore di speciali',description:'Completa una sezione di figurine speciali, se presente nel catalogo.',icon:'gem',tone:'violet'},
  {id:'ninety',title:'A un passo dalla gloria',description:'Raggiungi il 90% dell’album.',icon:'flame',tone:'orange'},
  {id:'complete',title:'Leggenda delle figurine',description:'Completa il 100% dell’album.',icon:'trophy',tone:'gold'}
]);

const teamPlaceholder=/^(album|introduzione|intro|speciali?|figurine speciali|varie|various|tutte le squadre|calciatori)$/i;
const isSpecialSection=name=>/\bspecial(?:i|e)?\b/i.test(String(name||'').trim());
const isDemo=item=>/\b(?:demo|dimostrativ[oaie]|esempio)\b/i.test(String(item.subtitle||''));

export function catalogSignature(items){
  // Hash leggero per riconoscere l'aggiornamento del catalogo: non è un identificativo privato.
  let hash=2166136261;
  for(const item of items){
    for(const c of `${item.number}|${item.team}|${item.section};`){hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;}
  }
  return `${items.length}-${hash.toString(16)}`;
}

export function computeAchievements(items=[],counts={}){
  const unique=new Map();
  for(const item of items){
    if(!Number.isInteger(Number(item.number)) || Number(item.number)<1)continue;
    if(!unique.has(String(item.number)))unique.set(String(item.number),item);
  }
  const stickers=[...unique.values()];
  const total=stickers.length;
  const demo=stickers.some(isDemo);
  const available=total>0&&!demo;
  const owned=stickers.filter(item=>clampQty(Number(counts[String(item.number)]||0))>0);
  const found=owned.length;
  const teams=new Map(),specialSections=new Map();
  for(const item of stickers){
    const present=clampQty(Number(counts[String(item.number)]||0))>0;
    const team=String(item.team||'').trim();
    if(team&&!teamPlaceholder.test(team)){
      const key=team.toLocaleLowerCase('it');
      const group=teams.get(key)||{total:0,found:0};group.total++;if(present)group.found++;teams.set(key,group);
    }
    const section=String(item.section||'').trim();
    if(isSpecialSection(section)){
      const key=section.toLocaleLowerCase('it');
      const group=specialSections.get(key)||{total:0,found:0};group.total++;if(present)group.found++;specialSections.set(key,group);
    }
  }
  const completeTeams=[...teams.values()].filter(v=>v.total>0&&v.found===v.total).length;
  const specialAvailable=specialSections.size>0;
  const completeSpecial=[...specialSections.values()].some(v=>v.total>0&&v.found===v.total);
  // Usare il rapporto esatto: 49,6% non deve sbloccare il premio del 50%.
  const passed={
    'first-team':completeTeams>=1,
    'hundred':found>=100,
    'three-teams':completeTeams>=3,
    'half':total>0&&found*2>=total,
    'special':specialAvailable&&completeSpecial,
    'ninety':total>0&&found*10>=total*9,
    'complete':total>0&&found===total
  };
  const awards=ACHIEVEMENTS.map(def=>({
    ...def,unlocked:available&&passed[def.id],
    unavailable:!available||(def.id==='special'&&!specialAvailable)
  }));
  return {awards,total,found,percentage:total?Math.round(found/total*100):0,
    unlocked:awards.filter(x=>x.unlocked).length,available,demo,specialAvailable,completeTeams,
    signature:catalogSignature(stickers)};
}
