# Correzione anteprime figurine intere - 25 ottobre 2026

## Risultato

La foto occupa ora **tutta l'altezza** del riquadro dell'Album: si vedono il bordo superiore e quello inferiore originali della figurina, senza tagliare la testa o la scritta del nome. Le proporzioni della foto sono conservate. L'eventuale spazio inutilizzato appare **solo a destra e a sinistra**, sul fondo verdognolo gia' presente. Su schermi particolarmente stretti, i bordi laterali possono essere leggermente rifilati, ma non la parte superiore o inferiore.

**L'ingrandimento con la lente resta identico** (figurina intera). Non cambia la grafica delle figurine senza fotografia.

### Perche' era comparsa la fascia in alto

Un altro foglio di stile (`assets/refined.css`) rendeva `.sticker-art` relativo invece che assoluto. L'immagine era quindi costretta in un contenitore troppo basso. Ora `.sticker-art` copre davvero l'intera altezza del riquadro e la fotografia si adatta mantenendo il suo rapporto larghezza/altezza.

## GitHub: carica SOLO i file dello ZIP delle modifiche

1. `assets/sticker-images.css`: correzione layout dell'anteprima, non del pop-up della lente.
2. `index.html`: aggiornamento riferimento CSS a `?v=3` per caricare la nuova versione.
3. `service-worker.js`: nuova versione cache PWA per evitare di visualizzare il vecchio CSS.
4. `tests/sticker-images.test.mjs`: test della correzione (consigliato nel repository, non necessario al funzionamento del sito).
5. Questo file: guida di aggiornamento.

Estrai lo ZIP e copia i file **mantenendo le cartelle e gli stessi nomi** nella radice del repository GitHub Pages. Conferma la sostituzione, poi fai commit/push. **Non occorre ricaricare le 87 immagini** e non e' necessario cambiare il catalogo.

**Importante:** lo ZIP di sole modifiche si applica alla versione gia' pubblicata con le 87 immagini e la precedente modifica delle anteprime. Se non hai ancora quella versione, pubblica invece lo ZIP completo.

### App installata / aggiornamento cache

Dopo la pubblicazione, aggiorna la pagina; per la PWA installata puo' essere necessario chiudere e riaprire l'app o effettuare un secondo refresh perche' il service worker attivi la nuova versione. In casi ostinati fai un aggiornamento forzato (`Ctrl+F5`) della pagina del sito.

## Firebase

**Nessun aggiornamento:** Firestore, Storage, utenti, quantita', progressi, Club e regole sono invariati. Sono modificati solo stile, caricamento CSS, cache e relativi test.

## Controllo

Nell'Album apri ad esempio la #012 (Giorgio Scalvini): nella miniatura devono essere visibili **intera maglia e nome**, oltre al volto; a sinistra e a destra puo' apparire un bordo verde tenue. Controlla poi la lente, che deve funzionare come prima.
