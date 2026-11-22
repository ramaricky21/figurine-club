# Figurine Club — Navigazione pagine anche sopra le figurine

## Modifica inclusa

Questa versione deriva dal progetto **FIGURINE_CLUB_COMPLETO_SCAMBI_PROGRAMMATI.zip** già aggiornato con gli scambi programmati.

La navigazione dell'album è duplicata: sopra e sotto la griglia compaiono gli stessi pulsanti «Prec.», numeri di pagina e «Succ.». Il risultato funziona con tutte le modalità filtrate che usano la paginazione esistente, comprese «Tutte», «Trovate», «Mancanti», «Doppie», squadre, sezioni e ricerca. Non viene mostrata la barra superiore se i risultati occupano una sola pagina.

I due comandi sono sincronizzati: una pressione aggiorna la griglia, la pagina attiva e entrambi i gruppi di pulsanti. Su telefono restano adattivi senza scorrimento orizzontale.

## GitHub (modifica necessaria)

Se il repository usa la versione con gli scambi programmati già installata, estrai **FIGURINE_CLUB_SOLO_MODIFICHE_PAGINAZIONE_ALTO.zip** e sostituisci i file alle stesse posizioni nel repository. I file necessari al funzionamento sono:

- `index.html`
- `assets/app.mjs`
- `assets/extra.css`
- `service-worker.js`

Lo ZIP include inoltre aggiornamenti ai test e questo documento. Conservali nei rispettivi percorsi se il tuo repository contiene una cartella `tests/`.

Fai il commit sul ramo pubblicato da GitHub Pages. È stata incrementata la versione di `app.mjs` e della cache PWA per facilitare il caricamento della nuova interfaccia sui dispositivi che avevano installato la versione precedente.

## Firebase (nessuna modifica)

Per questa *sola* modifica di navigazione **non servono modifiche a Firestore, Firebase Authentication o alle regole di sicurezza**. Mantieni le regole dell'ultima versione con gli scambi programmati. Se quelle regole non sono ancora state pubblicate, vanno installate come previsto dalle istruzioni dell'aggiornamento precedente: questa novità non le sostituisce.

## Verifiche

- Test automatici Node.js: 89/89 superati (`node --test tests/*.test.mjs`).
- Controllo funzionale Chromium con script reali: 1280 px e 390 px; entrambi i gruppi di pulsanti passano alle stesse pagine, cambio pagina anche usando i pulsanti inferiori, filtro con una sola pagina e assenza di scorrimento orizzontale nel test mobile.

La modifica non cambia conteggi degli album, proposte di scambio, dati Firebase o layout delle figurine.
