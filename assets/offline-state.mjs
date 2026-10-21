/* Stato visibile della sincronizzazione; niente credenziali o dati utente. */
export function deriveSyncState({online,albumReady,catalogReady,albumFromCache,catalogFromCache,pendingWrites,persistence,error=false}){
  if(error) return {kind:'error',label:'Controlla sincronizzazione',explanation:'Firebase ha segnalato un errore. Verifica la connessione e i permessi dell’account; non eliminare i dati locali in attesa.'};
  if(pendingWrites) return {kind:'pending',label:'Modifiche in attesa',explanation:'Le modifiche locali non sono ancora state confermate da Firebase. Non cancellare i dati dell’app e torna online per sincronizzarle.'};
  if(!online) return persistence
    ? {kind:'offline',label:'Modalità offline',explanation:'Stai consultando i dati già scaricati su questo dispositivo. L’app sincronizzerà le modifiche quando tornerà online.'}
    : {kind:'offline-disabled',label:'Senza connessione',explanation:'La memoria offline non è attiva: riconnettiti per utilizzare l’album.'};
  if(!albumReady||!catalogReady) return {kind:'loading',label:'Caricamento album…',explanation:'L’app sta caricando o recuperando la tua collezione.'};
  if(albumFromCache||catalogFromCache) return {kind:'cache',label:'Verifica connessione…',explanation:'Stai visualizzando dati dalla cache: Firebase non ha ancora confermato che siano aggiornati.'};
  return {kind:'synced',label:'Album sincronizzato',explanation:'Firebase ha confermato l’ultimo stato dell’album e del catalogo.'};
}
