# Modifica anteprima fotografie delle figurine — 25 ottobre 2026

## Che cosa cambia

- Nell'**Album**, la foto della figurina usa tutto lo spazio verticale del riquadro e riempie maggiormente la superficie, con due sottili strisce laterali del verde già usato come sfondo. Una piccola porzione della figurina può venire tagliata (per esempio il nome in basso), per dare risalto al volto e alla maglia.
- **Ingrandimento con la lente invariato**: quando apri la fotografia, la figurina completa resta visibile come prima, senza ritagli.
- Nessuna modifica a 87 immagini, catalogo di 775 figurine, funzioni Album, progressi, quantità, Club, bacheca o sincronizzazione dati.

## Aggiornare GitHub (solo quattro file)

Nel repository GitHub del sito, sostituisci i file con i medesimi percorsi contenuti nello ZIP delle **sole modifiche**:

1. `assets/sticker-images.css` — solo aspetto dell'anteprima; non modifica le regole della lente.
2. `index.html` — passa alla versione `?v=2` del foglio di stile per evitare che il browser carichi quello vecchio.
3. `service-worker.js` — aggiorna la versione della cache PWA e il riferimento al CSS.
4. `tests/sticker-images.test.mjs` — test aggiornato + verifica su ritaglio dell'anteprima e lente invariata (opzionale per il sito, consigliato su GitHub).

Nello ZIP è inclusa anche questa guida. Non è necessario ricaricare le immagini WebP: rimangono quelle della versione precedente.

Esegui commit e push sul branch usato da GitHub Pages. Quando la pubblicazione è avvenuta, aggiorna la pagina del sito; se usi la versione installata come PWA, chiudi e riapri l'app affinché il service worker rilevi il nuovo aggiornamento.

**Importante:** questo ZIP di sole modifiche si applica **alla versione precedente con già integrate le 87 fotografie**. Se il repository non è ancora aggiornato a quella versione, usa prima il pacchetto completo.

## Firebase

**Nessuna modifica.** Non è necessario operare su Firestore, Storage, regole di sicurezza, catalogo CSV o utenti: è una modifica puramente grafica, ospitata su GitHub Pages.

## Controllo rapido

Apri `Album`, cerca una figurina che ha la foto (ad esempio un giocatore di una squadra presente) e verifica che l'anteprima sia più grande e occupi la card; usa la lente: l'immagine deve mostrarsi intera, come nella versione precedente. Confronta anche una figurina senza foto: rimane invariata.
