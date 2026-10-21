/* Figurine Club · STEP 2: cache di sole risorse pubbliche e SDK Firebase.
 * Album e credenziali sono gestiti dall'IndexedDB di Firebase (su dispositivo attendibile).
 * Non memorizzare mai qui risposte Firestore, token o dati personali.
 */
'use strict';
const CACHE_VERSION='stadium2-dashboard-20261021-1';
const STATIC_CACHE='figurine-club-static-'+CACHE_VERSION;
const CACHE_PREFIX='figurine-club-static-';
const APP_SCOPE=self.registration.scope;
const INDEX_URL=new URL('./index.html',APP_SCOPE).href;
const OFFLINE_URL=new URL('./offline.html',APP_SCOPE).href;
const STATIC_PATHS=[
  './index.html','./offline.html','./manifest.webmanifest','./config.js',
  './assets/style.css','./assets/extra.css','./assets/refined.css?v=4',
  './assets/achievements.css?v=1','./assets/club.css?v=1',
  './assets/dashboard-stadium.css?v=1','./assets/stadium-night.jpg',
  './assets/app.mjs?v=6','./assets/core.mjs','./assets/offline-state.mjs',
  './assets/achievements.mjs','./assets/club.mjs',
  './assets/icons.svg','./assets/favicon.svg','./assets/asterisk.svg',
  './assets/sparkle.svg','./assets/pwa-register.js',
  './assets/pwa/icon.svg','./assets/pwa/icon-192.png','./assets/pwa/icon-512.png',
  './assets/pwa/icon-maskable-512.png','./assets/pwa/apple-touch-icon.png'
];
const STATIC_URLS=STATIC_PATHS.map(p=>new URL(p,APP_SCOPE).href);
const STATIC_SET=new Set(STATIC_URLS);
// Questi tre moduli sono file statici PUBBLICI, non dati Firebase degli iscritti.
// Sono richiesti per avviare l'SDK anche quando il telefono è offline.
const FIREBASE_MODULES=[
 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js',
 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js',
 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js'
];
const FIREBASE_SET=new Set(FIREBASE_MODULES);
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(STATIC_CACHE);
    await cache.addAll(STATIC_URLS);
    // Un problema temporaneo col CDN non deve impedire l'aggiornamento della PWA.
    await Promise.all(FIREBASE_MODULES.map(async url=>{
      try{const response=await fetch(url,{mode:'cors'});if(response.ok)await cache.put(url,response);}
      catch(e){console.warn('Modulo offline non disponibile:',url,e);}
    }));
    // Non interrompiamo pagine aperte e modifiche ancora in attesa di invio.
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==STATIC_CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(FIREBASE_SET.has(url.href)){
    event.respondWith((async()=>{
      const cache=await caches.open(STATIC_CACHE);
      const stored=await cache.match(request);if(stored)return stored;
      try{const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;}
      catch(_){return Response.error();}
    })());
    return;
  }
  if(url.origin!==self.location.origin || !url.pathname.startsWith(new URL(APP_SCOPE).pathname))return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{const response=await fetch(request);if(response.ok)return response;}catch(_){}
      return (await caches.match(INDEX_URL))||(await caches.match(OFFLINE_URL))||Response.error();
    })());
    return;
  }
  if(!STATIC_SET.has(url.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(STATIC_CACHE);
    const stored=await cache.match(request);
    if(/\.(png|svg|jpe?g)$/.test(url.pathname)&&stored)return stored;
    try{const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;}
    catch(_){return stored||Response.error();}
  })());
});
