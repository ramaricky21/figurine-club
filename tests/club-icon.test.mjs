import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html');
const sw=read('service-worker.js');

test('Il Club: icona menu disegnata nello stesso HTML anche se lo sprite esterno e vecchio',()=>{
  const nav=html.match(/<a href="#club" data-route="club" class="nav-link">([\s\S]*?)<span>Il Club<\/span><\/a>/);
  assert.ok(nav, 'collegamento Il Club presente nel menu');
  assert.match(nav[1], /<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">/);
  assert.match(nav[1], /<path d="M16 20v-2/);
  assert.doesNotMatch(nav[1], /<use\b/);
  assert.match(sw, /stadium2-bacheca-percentuali-20261023-1/);
});
