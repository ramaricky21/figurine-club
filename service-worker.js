/* Figurine Club PWA - STEP 1: cache esclusivamente di file statici pubblici.
   NON gestisce l'offline delle figurine: sarà implementato nello Step 2.
   Per invalidare tutta la cache in un futuro rilascio, cambiare CACHE_VERSION.
*/
'use strict';
const CACHE_VERSION = 'step1-20261021-1';
const STATIC_CACHE = 'figurine-club-static-' + CACHE_VERSION;
const CACHE_PREFIX = 'figurine-club-static-';
const APP_SCOPE = self.registration.scope;

// Nessun endpoint di Firebase, nessuna risposta autenticata, nessun dato dell'album.
// config.js non è in cache: eventuali modifiche alla configurazione resteranno immediatamente leggibili online.
const PRECACHE_PATHS = [
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './assets/style.css',
  './assets/extra.css',
  './assets/refined.css?v=2',
  './assets/app.mjs?v=2',
  './assets/core.mjs',
  './assets/icons.svg',
  './assets/favicon.svg',
  './assets/asterisk.svg',
  './assets/sparkle.svg',
  './assets/pwa-register.js',
  './assets/pwa/icon.svg',
  './assets/pwa/icon-192.png',
  './assets/pwa/icon-512.png',
  './assets/pwa/icon-maskable-512.png',
  './assets/pwa/apple-touch-icon.png'
];
const PRECACHE_URLS = PRECACHE_PATHS.map(path => new URL(path, APP_SCOPE).href);
const PRECACHE_KEYS = new Set(PRECACHE_URLS);
const OFFLINE_URL = new URL('./offline.html', APP_SCOPE).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(PRECACHE_URLS);
    // Non forzare il ricaricamento di pagine aperte: potrebbe interrompere operazioni in corso.
    // La nuova versione si attiverà dopo la chiusura delle vecchie pagine.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== STATIC_CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Non intercettare pagine o file appartenenti ad altri siti o repository GitHub Pages.
  if (!url.pathname.startsWith(new URL(APP_SCOPE).pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // HTML fresco quando c'è rete; nessun avvio dell'app che prometta un album offline già operativo.
        return await fetch(request);
      } catch (_) {
        return (await caches.match(OFFLINE_URL)) || Response.error();
      }
    })());
    return;
  }

  // Solo URL statici espressamente autorizzati, senza query arbitrarie.
  if (!PRECACHE_KEYS.has(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    // Immagini e icone sono immutabili durante lo Step 1.
    if (/\.(png|svg)$/.test(url.pathname)) {
      const stored = await cache.match(request);
      if (stored) return stored;
    }
    try {
      // CSS e JS: network-first per non usare codice obsoleto dopo un aggiornamento GitHub.
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
      return response;
    } catch (_) {
      return (await cache.match(request)) || Response.error();
    }
  })());
});
