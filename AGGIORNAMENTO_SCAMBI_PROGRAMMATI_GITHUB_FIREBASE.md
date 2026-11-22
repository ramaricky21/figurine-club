# Figurine Club — Scambi programmati (22 novembre 2026)

Questa versione introduce **prenotazioni e proposte di scambio reali tra account**, mantenendo l'interfaccia originale, il catalogo, i progressi e le esportazioni PDF.

## Cosa puoi fare

- In **Scambi → Trova uno scambio** confronti due liste affiancate su PC e sovrapposte su telefono, con **foto della figurina a sinistra**, numero e nome a destra, **spunta grande** per la selezione e **quadratino ambra tenue** per le figurine non disponibili perché prenotate.
- Selezioni più figurine da ricevere e più figurine da offrire. La barra di scorrimento verticale delle liste lunghe è sottile; non c'è scorrimento laterale.
- Invii una proposta reale al secondo utente. L'altro può **accettare**, **rifiutare** oppure creare **manualmente una controproposta**, scegliendo singolarmente ogni figurina.
- Anche il proponente può correggere la propria richiesta **prima** della risposta. Ogni versione successiva richiede l'accettazione di chi la riceve.
- In **Scambi → Scambi programmati** vedi le richieste in attesa e le prenotazioni confermate, e puoi annullarle o segnare come effettuato uno scambio confermato.
- Con due doppioni disponibili, se uno è prenotato l'altro resta selezionabile. Una figurina mancante già prevista in arrivo da un altro scambio viene bloccata nella selezione.
- Le richieste sono visibili **soltanto ai due partecipanti**. Sono sincronizzate tramite Firestore, non sono una simulazione locale.

**Nessuna azione in Scambi modifica il documento `users/UID/album/main`, il numero di doppioni, le percentuali di completamento, il catalogo o i PDF.** Dopo lo scambio fisico aggiorni l'album come sempre, manualmente.

## IMPORTANTE: aggiorna Firebase PRIMA di GitHub

1. Apri **https://console.firebase.google.com/** e seleziona il tuo progetto Figurine Club.
2. Vai a **Firestore Database → Regole (Rules)**.
3. Apri `firestore.rules` **di questa nuova versione** sul computer e **sostituisci tutto il testo** delle regole esistenti con il contenuto completo del file (non copiare soltanto il nuovo blocco: sono già incluse tutte le regole precedenti).
4. Premi **Pubblica (Publish)** e verifica che la pubblicazione riesca.
5. Non abilitare **Test mode**, `allow read, write: if true` o regole pubbliche. Nessun indice Firestore va creato manualmente per la query attuale (`array-contains` su `partyIds`, senza `orderBy`).

La raccolta **`tradeProposals`** compare automaticamente quando viene inviata la prima richiesta. Non crearla a mano e non modificare album, utenti, credenziali, Firebase Authentication o `config.js`. Il nuovo file `firestore.rules` deve essere pubblicato sulla console **anche se lo carichi su GitHub**: GitHub Pages non applica automaticamente le regole Firestore.

Se sul tuo progetto Firebase hai modificato manualmente le regole dopo la creazione dello ZIP precedente, **confrontale prima di sostituirle** per non perdere eventuali regole aggiunte fuori dal progetto.

## Aggiornamento GitHub: due alternative

**A — Consigliata se il tuo repository funziona già:** estrai `FIGURINE_CLUB_SOLO_MODIFICHE_SCAMBI.zip` e carica/sovrascrivi **nei percorsi esatti** della radice del repository i file presenti nell'archivio. Non eliminare nessuno degli altri file.

**B — Progetto completo:** estrai `FIGURINE_CLUB_COMPLETO_SCAMBI_PROGRAMMATI.zip`, apri la cartella interna `FIGURINE_CLUB_BACHECA_PERCENTUALI_PROGETTO_COMPLETO` e usa il suo **contenuto** per aggiornare la radice del repository. È una copia completa, non va caricato su GitHub come singolo `.zip`.

Da interfaccia web GitHub: apri il repository, scegli **Add file → Upload files**, trascina i file e le cartelle estratti mantenendo i percorsi, poi **Commit changes** nel ramo pubblicato da GitHub Pages (normalmente `main`). In alternativa, dal repository locale, dopo aver copiato i file, esegui:

```bash
git add index.html service-worker.js assets/app.mjs assets/trade-proposals.mjs assets/trade-proposals.css firestore.rules README.md AGGIORNAMENTO_SCAMBI_PROGRAMMATI_GITHUB_FIREBASE.md tests/
git commit -m "Aggiunge scambi programmati e controproposte manuali"
git push
```

**File necessari alla pubblicazione del sito**:

- `index.html` — due sottosezioni Scambi e nuova versione dello script.
- `assets/app.mjs` — selezioni, proposte, lettura e scrittura Firestore e gestione dei pulsanti.
- `assets/trade-proposals.mjs` — regole client per prenotazioni, disponibilità e trasformazione delle proposte.
- `assets/trade-proposals.css` — grafica approvata, desktop e mobile.
- `service-worker.js` — rinnovo cache PWA e precaricamento delle nuove risorse.

**File da conservare su GitHub ma da usare anche su Firebase:** `firestore.rules` (da copiare manualmente nella console Firebase come sopra).

**File solo documentazione/test:** `README.md`, questa guida, `tests/` aggiornati. Non cambiano il funzionamento del sito.

`config.js`, catalogo CSV, tutte le immagini, modulo PDF e altri moduli applicativi **non devono essere modificati** rispetto allo ZIP precedente.

## Verifica dopo la pubblicazione

1. Ricarica il sito pubblicato con **Ctrl+F5**. Se usi la PWA installata su iPhone, chiudila e riaprila; se necessario ricarica la pagina per applicare la nuova cache.
2. Accedi con **due account già autorizzati**, A e B, entrambi con `Impostazioni → Partecipo agli scambi con gli amici` attivo.
3. A seleziona un doppione che B non ha e una figurina che manca ad A ma B ha doppia, poi invia la proposta.
4. B apre **Scambi programmati**, prova **Proponi modifica** e cambia manualmente una delle selezioni. A deve vedere la controproposta. Solo l'accettazione della versione proposta la rende **Confermata**.
5. Verifica che il doppione prenotato risulti color ambra se non rimangono copie libere, e che **nessuna quantità nell'album sia cambiata**.
6. Rifiuta o annulla una seconda proposta di prova e verifica che le figurine tornino selezionabili.

## Note sul funzionamento e limiti

- Per **inviare, accettare, modificare o annullare** richieste è richiesta una connessione Internet. È intenzionale: non vengono confermate modifiche offline che potrebbero entrare in conflitto.
- Gli utenti vedono e gestiscono solo le **proposte alle quali partecipano**. Una prenotazione su un altro rapporto non viene esposta a terzi. I controlli sulla disponibilità usano le proposte visibili al proprio account: in caso di modifiche contemporanee o scambi con più persone, conviene verificare la disponibilità effettiva prima della consegna fisica.
- In questa versione uno scambio richiede **almeno una figurina per parte** (massimo 50 per parte); non è prevista la consegna unilaterale senza contropartita.
- Le proposte rifiutate, annullate o effettuate restano nello storico, ma non bloccano più le figurine.
- Non serve un nuovo piano Firebase o un server. Come sempre, l'uso di Firestore rientra nelle quote del tuo progetto.
- La funzionalità è stata sottoposta a test automatici e test dell'interfaccia con dati simulati; **non è stato possibile testare dal vivo il collegamento a due account del tuo Firebase**: esegui la verifica A/B dopo aver pubblicato le regole e i file.

## Per tornare indietro

Conserva lo ZIP originale. Per ripristinare la vecchia interfaccia pubblica i file originali `index.html`, `assets/app.mjs` e `service-worker.js` su GitHub, rimuovendo facoltativamente i due file `trade-proposals` (non è necessario rimuoverli). Puoi lasciare le nuove regole Firestore, che **non consentono** accessi aggiuntivi ad album o catalogo; le nuove proposte già create resteranno in `tradeProposals` fino a un'eventuale eliminazione amministrativa dalla console.
