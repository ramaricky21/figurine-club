# Aggiunta di 87 foto delle figurine — 25 ottobre 2026

## Risultato

- Sono state estratte **87 immagini** dai due PDF forniti e convertite in **WebP** senza rinumerare le figurine.
- Ogni immagine è associata al numero/codice già presente nel catalogo (`assets/sticker-images.mjs`).
- Nell'**Album** appaiono le foto reali, con tasto **lente** per ingrandirle; le altre figurine continuano ad avere il segnaposto originale.
- Il numero delle figurine rimane **775**: il conteggio di trovate, mancanti, doppioni, scambi, bacheca e Club non cambia.
- Le foto visitate vengono memorizzate dal service worker e possono essere riviste offline sullo stesso dispositivo. Per quelle non ancora visitate, senza connessione resta il segnaposto.

## Aggiornare GitHub

**Metodo più semplice:** usa lo ZIP separato `SOLO_MODIFICHE_GITHUB_FIGURINE.zip`.

1. Apri il repository GitHub già collegato al sito. Lavora sul branch usato da GitHub Pages (di solito `main`).
2. Copia **tutti** i file e le cartelle dello ZIP aggiornamenti nella **radice del repository**, rispettandone le sottocartelle. **Sovrascrivi i file con lo stesso percorso**. Non creare una seconda cartella `FIGURINE_CLUB...` nel repository.
3. Registra un commit, per esempio `Aggiunte 87 immagini figurine` e fai push su GitHub. Assicurati che i file binari `.webp` siano stati caricati, oltre ai `.mjs`, `.css` e `.html`.
4. Attendi che GitHub Pages pubblichi il commit. Apri il sito, aggiorna la pagina e visita **Album**. Se usi la PWA installata e vedi ancora la grafica precedente, chiudi e riapri l'app o ricarica online per installare il nuovo service worker.

**Alternativa:** usa lo ZIP del progetto completo, sostituendo il progetto locale e pubblicando i cambiamenti sul repository.

### File cambiati

- `index.html` — include foglio stile foto, aggiorna modulo e aggiunge la finestra per ingrandirle.
- `assets/app.mjs` — associa foto ai numeri nel rendering dell'Album e gestisce ingrandimento/errori.
- `assets/sticker-images.mjs` **(nuovo)** — tabella numeri/codici → percorsi file.
- `assets/sticker-images.css` **(nuovo)** — stile immagini, zoom e visualizzazione mobile.
- `assets/stickers/*.webp` **(87 nuovi)** — fotografie estratte dai PDF.
- `assets/stickers/associazioni.json` **(nuovo)** — elenco delle immagini e origine per controlli e future aggiunte.
- `service-worker.js` — nuova versione cache e memorizzazione delle immagini aperte.
- `tests/*.test.mjs` — test adattati alla versione aggiornata e nuovi test immagini.
- `AGGIORNAMENTO_IMMAGINI_GITHUB_FIREBASE.md` **(nuovo)** — questa guida.

## Aggiornare Firebase

**Nessuna operazione necessaria.** Non caricare né importare immagini su Firebase Storage/Firestore, non modificare `config.js` o `firestore.rules` e **non reimportare il catalogo CSV**.

Motivo: le foto sono risorse pubbliche servite direttamente da **GitHub Pages**. La loro corrispondenza con gli identificativi delle figurine è già definita nel codice. Firestore continua a contenere l'attuale catalogo e i progressi personali, **immutati**.

## Come aggiungere altre foto successivamente

Le associazioni dipendono dall'identificativo *del progetto* (`12`, `49`, `Kit6`, `454`, `492`, ecc.), **non dal numero stampato sulla maglietta o dalla posizione della foto nel PDF**.

In un prossimo aggiornamento:

1. Fornisci un altro PDF con le nuove immagini, possibilmente divise per squadra e per categoria come ora.
2. Prima di collegare ogni foto, confronta **nome del giocatore**, **squadra/categoria** e **voce corrispondente nel catalogo**.
3. Aggiungi il file `assets/stickers/<ID>.webp` e la chiave `<ID>` in `assets/sticker-images.mjs`; aggiorna anche `associazioni.json`.
4. Esegui i test (`node --test tests/*.test.mjs`) e pubblica su GitHub soltanto i file nuovi o modificati.
5. **Non servono modifiche Firebase** finché esiste già una voce del catalogo per ciascuna nuova immagine. Se un giocatore non è presente nel catalogo, non associargli una foto a caso: verifica prima il catalogo.

Se viene sostituita una foto già esistente, elimina la precedente dalla cache dell'app oppure modifica il relativo URL aggiungendo una versione (es. `?v=2`) nel file `assets/sticker-images.mjs` per forzare l'aggiornamento.

### Nota sulle immagini

Le foto provengono esclusivamente dai PDF forniti dall'utente. Prima di pubblicarle su un sito GitHub Pages accessibile pubblicamente, verifica di avere il diritto di utilizzarle e distribuirle.
