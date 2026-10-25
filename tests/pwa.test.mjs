import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const path = file => new URL('../' + file, import.meta.url);
const read = file => readFileSync(path(file), 'utf8');
const html = read('index.html');
const manifest = JSON.parse(read('manifest.webmanifest'));
const sw = read('service-worker.js');

test('PWA: manifest relativo al repository GitHub Pages e metadati Apple', () => {
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.id, './');
  assert.equal(manifest.theme_color, '#101917');
  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon" sizes="180x180"/);
  assert.match(html, /name="apple-mobile-web-app-capable" content="yes"/);
  assert.match(html, /src="\.\/assets\/pwa-register\.js"/);
});

test('PWA: icone PNG locali per installazione standard, maskable e Apple', () => {
  for (const icon of manifest.icons) {
    assert.ok(icon.src.startsWith('./assets/pwa/'));
    assert.ok(existsSync(path(icon.src)));
  }
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable' && icon.sizes === '512x512'));
  assert.ok(manifest.icons.some(icon => icon.purpose === 'any' && icon.sizes === '192x192'));
  assert.ok(existsSync(path('assets/pwa/apple-touch-icon.png')));
});

test('PWA: script indipendente da Firebase e nessun caricamento JS principale modificato', () => {
  assert.match(read('assets/pwa-register.js'), /register\('\.\/service-worker\.js', \{ scope: '\.\/' \}\)/);
  assert.match(html, /src="\.\/assets\/app\.mjs\?v=10"/);
  assert.match(html, /href="\.\/assets\/refined\.css\?v=4"/);
  assert.doesNotMatch(read('assets/pwa-register.js'), /(?:from|import|fetch|writeBatch|setDoc|addDoc|updateDoc)\s*\(?[^\n]*firebase|signOut\s*\(/i);
});

test('PWA: risorse statiche pubbliche e CDN Firebase sono disponibili offline, non gli album', async () => {
  const handlers=new Map();
  const scope='https://example.github.io/figurine-club/';
  const index={ok:true,from:'cached-index'};
  const sdk={ok:true,from:'cached-sdk'};
  const stored=new Map([[scope+'index.html',index],['https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js',sdk]]);
  const preloaded=[];
  const mockCache={
    addAll:async urls=>{preloaded.push(...urls);},
    match:async request=>stored.get(typeof request==='string'?request:request.url),
    put:async(request,response)=>stored.set(typeof request==='string'?request:request.url,response)
  };
  const self={location:{origin:'https://example.github.io'},registration:{scope},clients:{claim:async()=>{}},addEventListener(name,cb){handlers.set(name,cb);}};
  const caches={open:async()=>mockCache,keys:async()=>[],delete:async()=>true,match:async url=>stored.get(url)};
  vm.runInNewContext(sw,{self,caches,URL,Set,Promise,console,
    Response:{error:()=>({error:true})},fetch:async()=>{throw new Error('offline');}
  },{filename:'service-worker.js'});
  const event=(url,mode='same-origin')=>{
    let result;
    handlers.get('fetch')({request:{method:'GET',url,mode},respondWith:p=>{result=p;}});
    return result;
  };
  assert.equal(event('https://firestore.googleapis.com/v1/projects/x/databases/(default)/documents/users/123'),undefined);
  assert.equal(event('https://identitytoolkit.googleapis.com/v1/accounts:lookup'),undefined);
  assert.equal(event('https://example.github.io/other-repository/config.js'),undefined);
  assert.equal(event(scope+'users/user-123/album'),undefined);
  assert.equal(await event('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),sdk);
  assert.equal(await event(scope,'navigate'),index,'la navigazione offline apre l’app, non la vecchia schermata di errore');
  let install;
  handlers.get('install')({waitUntil:p=>{install=p;}});
  await install;
  assert.ok(preloaded.includes(scope+'index.html'));
  assert.ok(preloaded.includes(scope+'config.js'));
  assert.ok(preloaded.includes(scope+'assets/offline-state.mjs'));
  assert.ok(preloaded.includes(scope+'assets/app.mjs?v=10'));
  assert.ok(!preloaded.some(url=>/users\/|firestore\.googleapis\.com|identitytoolkit/i.test(url)));
});
