/* Figurine Club · scambi programmati.
 * Dati e prenotazioni separati da users/{uid}/album/main.
 * Nessuna funzione di questo modulo modifica quantità o conteggi dell'album.
 */
export const ACTIVE_TRADE_STATUSES = Object.freeze(['pending', 'confirmed']);
export function tradeActive(p){return ACTIVE_TRADE_STATUSES.includes(p?.status);}
export function tradeOtherId(p,uid){return p.initiatorId===uid?p.recipientId:p.initiatorId;}
export function tradeOtherName(p,uid){return p.initiatorId===uid?p.recipientName:p.initiatorName;}
export function ownSides(p,uid){
  return p.initiatorId===uid
    ? {offer:p.fromInitiator||[],receive:p.fromRecipient||[]}
    : {offer:p.fromRecipient||[],receive:p.fromInitiator||[]};
}
export function uniqueStickerIds(values){return [...new Set((values||[]).map(x=>String(x)))];}
export function tradeReservations(proposals,uid,number,side,excludeId=''){
  const id=String(number);
  return proposals.filter(p=>tradeActive(p)&&p.id!==excludeId&&
    (p.initiatorId===uid||p.recipientId===uid)&&ownSides(p,uid)[side].includes(id));
}
export function tradeAvailability(proposals,uid,counts,number,side,excludeId=''){
  const reserved=tradeReservations(proposals,uid,number,side,excludeId);
  const spare=side==='offer'
    ?Math.max(0,Number(counts[String(number)]||0)-1-reserved.length)
    :reserved.length===0?1:0;
  return {reserved,free:spare,blocked:spare===0};
}
export function validateTradeSelection(proposals,uid,counts,offer,receive,excludeId=''){
  const offers=uniqueStickerIds(offer),receives=uniqueStickerIds(receive);
  if(!offers.length||!receives.length)return 'Seleziona almeno una figurina da offrire e una da ricevere.';
  if(offers.length>50||receives.length>50)return 'Puoi scegliere fino a 50 figurine per lato.';
  for(const n of offers)if(tradeAvailability(proposals,uid,counts,n,'offer',excludeId).blocked)return `Il doppione #${n} non è più disponibile.`;
  for(const n of receives)if(tradeAvailability(proposals,uid,counts,n,'receive',excludeId).blocked)return `La figurina #${n} è già prevista in un altro scambio.`;
  return '';
}
export function proposalPayload(uid,name,peerId,peerName,offer,receive){
  return {partyIds:[uid,peerId],initiatorId:uid,recipientId:peerId,
    initiatorName:name,recipientName:peerName,fromInitiator:uniqueStickerIds(offer),
    fromRecipient:uniqueStickerIds(receive),pendingFor:peerId,lastActor:uid,
    status:'pending',revision:1};
}
export function changesFromMyView(p,uid,offer,receive){
  return p.initiatorId===uid
    ? {fromInitiator:uniqueStickerIds(offer),fromRecipient:uniqueStickerIds(receive)}
    : {fromInitiator:uniqueStickerIds(receive),fromRecipient:uniqueStickerIds(offer)};
}
export function sameStickers(a,b){
  return a.length===b.length&&a.every(x=>b.includes(x));
}
