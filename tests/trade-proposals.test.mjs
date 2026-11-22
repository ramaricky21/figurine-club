import test from 'node:test';
import assert from 'node:assert/strict';
import { tradeActive, ownSides, tradeAvailability, validateTradeSelection,
  proposalPayload, changesFromMyView, sameStickers } from '../assets/trade-proposals.mjs';
import { computeStats } from '../assets/core.mjs';
const user='utente1';
const peer='utente2';
const base=(over={})=>({id:'p1',initiatorId:user,recipientId:peer,
  initiatorName:'Utente Uno',recipientName:'Utente Due',fromInitiator:['3'],fromRecipient:['2'],
  status:'pending',pendingFor:peer,lastActor:user,revision:1,...over});
test('creazione: prospettiva coerente per entrambi gli utenti',()=>{
  const p=proposalPayload(user,'Utente Uno',peer,'Utente Due',['3'],['2']);
  assert.deepEqual(ownSides(p,user),{offer:['3'],receive:['2']});
  assert.deepEqual(ownSides(p,peer),{offer:['2'],receive:['3']});
  assert.equal(p.pendingFor,peer);
});
test('una sola copia doppia prenotata: blocco dopo la richiesta',()=>{
  const p=base();
  assert.equal(tradeAvailability([p],user,{'3':2},'3','offer').blocked,true);
  assert.equal(tradeAvailability([p],user,{'2':0},'2','receive').blocked,true);
  assert.equal(tradeAvailability([p],user,{'3':2},'3','offer','p1').blocked,false);
});
test('più doppioni: quantità libera anche se uno è prenotato',()=>{
  assert.equal(tradeAvailability([base()],user,{'3':4},'3','offer').free,2);
  assert.equal(tradeAvailability([base()],user,{'3':3},'3','offer').free,1);
  assert.equal(tradeAvailability([base()],user,{'3':1},'3','offer').free,0);
});
test('rifiuto e annullamento liberano le figurine',()=>{
  for(const status of ['rejected','cancelled','completed']){
    assert.equal(tradeActive(base({status})),false);
    assert.equal(tradeAvailability([base({status})],user,{'3':2},'3','offer').blocked,false);
  }
  assert.equal(tradeActive(base({status:'confirmed'})),true);
});
test('controproposta: la lista cambia solo quando scelta manualmente',()=>{
  const p=base();
  const changed=changesFromMyView(p,peer,['2','4'],['3','5']);
  assert.deepEqual(changed,{fromInitiator:['3','5'],fromRecipient:['2','4']});
  assert.deepEqual(p.fromInitiator,['3']);
  assert.deepEqual(p.fromRecipient,['2']);
  assert.equal(sameStickers(['3','5'],['5','3']),true);
  assert.equal(sameStickers(['3'],['3','4']),false);
});
test('la selezione deve avere almeno una figurina da ogni lato, senza conflitti',()=>{
  assert.match(validateTradeSelection([],user,{'3':2},['3'],[]),/almeno una/);
  assert.match(validateTradeSelection([base()],user,{'3':2},['3'],['2']),/non è più disponibile/);
  assert.equal(validateTradeSelection([],user,{'3':2},['3'],['2']),'');
});
test('prenotare e confermare non cambia i conteggi dell’album',()=>{
  const album={'2':0,'3':2};const entries=[{number:2},{number:3}];
  const before=computeStats(entries,album);
  const p=proposalPayload(user,'Utente Uno',peer,'Utente Due',['3'],['2']);
  assert.ok(p);assert.deepEqual(computeStats(entries,album),before);
  assert.deepEqual(album,{'2':0,'3':2});
});
