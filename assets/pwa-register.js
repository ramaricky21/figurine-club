/* Step 1: solo installazione e cache dei file pubblici. Nessuna scrittura Firebase. */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function () {
    // Percorso relativo: funziona anche in un repository GitHub Pages /nome-repository/.
    navigator.serviceWorker.register('./service-worker.js', { scope: './' })
      .catch(function (error) {
        // Se il browser non supporta il service worker, il sito resta normalmente usabile.
        console.warn('Figurine Club: registrazione PWA non disponibile.', error);
      });
  });
}());
