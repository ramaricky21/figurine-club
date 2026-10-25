# Aggiornamento ingrandimento PC: figurine composte (2 e 4 parti)

## Risultato
- **Solo su PC** (larghezza >=700px e puntatore fine): la lente sulle figurine composte mostra **l’intera immagine in un unico riquadro**, adattandone larghezza e altezza allo schermo, senza barre di scorrimento.
- Finestra orizzontale per le figurine a 2 parti e verticale per le figurine a 4 parti, in base alle proporzioni dell’immagine. Anche i titoli lunghi restano visibili.
- **Nessuna modifica** al modo in cui le figurine appaiono nell’Album, alle figure singole, o alla vista da telefono; nessuna modifica alle 106 immagini, alle 775 voci o ai dati degli utenti.

## Aggiornare GitHub
Caricare **solo i file** presenti nel ZIP "SOLO_MODIFICHE_GITHUB_LIGHTBOX_PC.zip" nella radice del repository GitHub, mantenendo le cartelle. Sovrascrivere i file con lo stesso percorso e fare commit. Il sito pubblicato (es. GitHub Pages) caricherà la nuova versione; su PC, se necessario, eseguire Ctrl+F5 per forzare l’aggiornamento.

## Firebase
Non è richiesto alcun intervento in Firebase Authentication, Firestore, regole di sicurezza o Storage: si tratta solo di HTML, CSS, JavaScript e versione della cache PWA.

## File modificati
- `assets/sticker-images.css`: nuovi limiti di dimensione del popup esclusivamente per le figurine composte su PC.
- `assets/app.mjs`: attiva il nuovo stile solo per le carte `is-composite` al click sulla lente.
- `index.html` e `service-worker.js`: cambio versione delle risorse e cache PWA.
- `tests/sticker-images.test.mjs`: verifica il nuovo comportamento previsto e le versioni delle risorse.

La lente continua a mostrare le immagini originali: nessuna fotografia è stata tagliata, rielaborata o sostituita.
