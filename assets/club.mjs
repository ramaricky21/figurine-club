/* Figurine Club · STEP 4: soli riepiloghi pubblicabili, mai gli elenchi delle figurine.
 * La cronologia si basa sugli sblocchi confermati. Le pubblicazioni iniziali e
 * i cambi di catalogo NON generano false "ultime conquiste".
 */
import {ACHIEVEMENTS} from './achievements.mjs';

const ALLOWED=new Set(ACHIEVEMENTS.map(a=>a.id));
const sameList=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function publicSummary(result,name){
  const ready=Boolean(result.available);
  return {
    displayName:String(name||'Collezionista').trim().slice(0,40),
    ready,
    percentage:ready?Math.max(0,Math.min(100,Math.round(result.percentage))):0,
    unlocked:ready?ACHIEVEMENTS.filter(a=>result.awards.some(x=>x.id===a.id&&x.unlocked)).map(a=>a.id):[],
    // Solo 15 numeri aggregati 0–100: niente figurine, quantità, squadre o email.
    awardProgress:ready?Object.fromEntries(result.awards.map(a=>[a.id,a.progress])):{},
    catalogSignature:ready?result.signature:''
  };
}
export function mergeClubProfile(previous,desired,newAwardTimestamp){
  const sameCatalog=Boolean(previous?.ready && desired.ready && previous.catalogSignature===desired.catalogSignature);
  const earnedAt=sameCatalog?{...(previous.earnedAt||{})}:{};
  const before=new Set(sameCatalog&&Array.isArray(previous.unlocked)?previous.unlocked:[]);
  for(const id of desired.unlocked){
    if(sameCatalog&&!before.has(id)&&!Object.hasOwn(earnedAt,id)) earnedAt[id]=newAwardTimestamp;
  }
  return {...desired,earnedAt};
}
export function needsClubPublish(oldData,next){
  return !oldData || oldData.displayName!==next.displayName || oldData.ready!==next.ready ||
    oldData.percentage!==next.percentage || oldData.catalogSignature!==next.catalogSignature ||
    !sameList(oldData.unlocked,next.unlocked) || !sameList(oldData.awardProgress,next.awardProgress);
}
export function normalizeClubProfile(id,data){
  const ready=data?.ready===true;
  const unlocked=ready&&Array.isArray(data?.unlocked)?data.unlocked.filter(a=>ALLOWED.has(a)):[];
  const rawProgress=data?.awardProgress;
  const awardProgress=ready&&rawProgress&&typeof rawProgress==='object'&&!Array.isArray(rawProgress)?
    Object.fromEntries(Object.entries(rawProgress).filter(([id,n])=>ALLOWED.has(id)&&Number.isInteger(n)&&n>=0&&n<=100)):{};
  return {id,displayName:String(data?.displayName||'Collezionista').slice(0,40),ready,catalogSignature:String(data?.catalogSignature||''),awardProgress,
    percentage:ready&&Number.isInteger(data.percentage)?Math.max(0,Math.min(100,data.percentage)):0,
    unlocked,earnedAt:data?.earnedAt&&typeof data.earnedAt==='object'?data.earnedAt:{}};
}
function asDate(value){
  if(value?.toDate)return value.toDate();
  if(value instanceof Date)return value;
  return null;
}
export function recentClubAchievements(profiles,limit=12){
  const news=[];
  for(const profile of profiles){
    if(!profile.ready)continue;
    for(const awardId of profile.unlocked){
      if(!ALLOWED.has(awardId))continue;
      const when=asDate(profile.earnedAt?.[awardId]);
      if(!when||!Number.isFinite(when.getTime()))continue;
      news.push({userId:profile.id,name:profile.displayName,awardId,date:when});
    }
  }
  return news.sort((a,b)=>b.date.getTime()-a.date.getTime()||a.userId.localeCompare(b.userId)).slice(0,limit);
}
