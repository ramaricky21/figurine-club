# Figurine Club - integrazione fotografie figurine3.pdf

Base: **FIGURINE_CLUB_COMPLETO_FIGURINE_INTERE.zip** (ultima versione funzionante approvata).

## Cosa è stato aggiunto

- **43 fotografie di partenza** -> **19 immagini catalogo** (ID), senza alterare i 775 elementi: 
  - quattro mosaici verticali 2x2 con sezioni A-B-C-D: **541, 544, 550, 556**;
  - dodici figurine orizzontali A+B: **509, 510, 513, 514, 516, 542, 545, 551, 555, 557, 567, 576**;
  - tre figurine singole Player of the Match: **580, 584, 588**.
- Totale foto nel sito: **106** (87 preesistenti + 19 nuove).
- Le figurine verticali mantengono l'altezza intera con i soli bordi verdi laterali.
- Le figurine orizzontali sono ridimensionate **interamente** nel riquadro, senza tagliare le metà A e B (può restare verde sopra/sotto in base allo spazio).
- L'ingrandimento con la lente resta invariato.

I dettagli delle singole fonti e dell'ordine delle parti sono in `assets/stickers/associazioni.json`.

## Aggiornare GitHub

1. Fai una copia di sicurezza del repository attualmente online.
2. Estrai `SOLO_MODIFICHE_GITHUB_FIGURINE3.zip`. Carica il contenuto **della cartella di progetto** nella cartella root di GitHub, mantenendo i percorsi.
3. Sono necessari i **19 file** nuovi in `assets/stickers/`, `assets/stickers/associazioni.json`, `assets/sticker-images.mjs`, `assets/sticker-images.css`, `assets/app.mjs`, `index.html` e `service-worker.js`.
4. Sono inclusi anche il test aggiornato e questa guida.
5. Fai commit e attendi che GitHub Pages pubblichi la nuova versione. Se necessario, ricarica con Ctrl+F5 (PWA: riapri l'app).

Non caricare **soltanto** i nuovi file WebP: la mappa ID e lo stile orizzontale devono essere aggiornati assieme.

## Firebase

**Nessuna modifica richiesta** a Firestore, alle regole, a Firebase Storage o agli account. Le fotografie sono file statici pubblici sul sito GitHub Pages. Non reimportare il catalogo e non cancellare dati o progressi.

## Nuove fotografie in futuro

Usare come base il nuovo progetto completo aggiornato, non gli ZIP più vecchi. Aggiungere per ID di catalogo, rispettando le sezioni A/B/C/D, ed evitare la sostituzione delle fotografie precedenti, salvo richiesta espressa.
