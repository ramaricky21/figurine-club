import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseCSV, compareStickerNumbers } from '../assets/core.mjs';
import { buildCollectionPdf, selectPdfStickers, pdfExportFilenames } from '../assets/pdf-export.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const catalog=parseCSV(readFileSync(join(root,'catalogo_2026_2027.csv'),'utf8'));
const sample={1:4,5:1,6:2,170:1,241:2,257:3,Kit1:2,UPG1:4,C1:1,K1:2};

for(const mode of ['catalogo','trovate','doppioni']){
  test(`${mode}: generazione PDF valida e file unico`,()=>{
    const document=buildCollectionPdf(catalog,sample,mode,new Date('2026-11-01T10:40:00+01:00'));
    const binary=new TextDecoder('latin1').decode(document);
    assert.match(binary,/^%PDF-1\.4/);
    assert.match(binary,/\/Type \/Catalog/);
    assert.match(binary,/\/Type \/Pages/);
    assert.match(binary,/\/Count \d+/);
    assert.match(binary,/startxref\n\d+\n%%EOF\n$/);
    assert.ok(document.length>500);
    assert.match(pdfExportFilenames[mode],/\.pdf$/);
  });
}
test('catalogo: 775 figurine, tutti i gruppi nel medesimo ordine dell’app',()=>{
  assert.equal(catalog.length,775);
  const chosen=selectPdfStickers([...catalog].reverse(),{},'catalogo');
  assert.equal(chosen.length,catalog.length);
  assert.deepEqual(chosen.map(i=>i.number),catalog.map(i=>i.number));
  for(let j=1;j<chosen.length;j++)assert.ok(compareStickerNumbers(chosen[j-1].number,chosen[j].number)<=0);
});
test('trovate: una riga per figurina presente, senza quantita aggiuntive',()=>{
  const owned=selectPdfStickers(catalog,sample,'trovate');
  assert.equal(owned.length,Object.values(sample).filter(q=>q>0).length);
  assert.ok(owned.some(s=>s.number===1));
  assert.ok(owned.some(s=>String(s.number)==='C1'));
  assert.ok(owned.every(s=>!Object.hasOwn(s,'exchangeCopies')));
});
test('doppioni: solo copie scambiabili, senza copia già attaccata',()=>{
  const duplicates=selectPdfStickers(catalog,sample,'doppioni');
  assert.deepEqual(duplicates.map(x=>[String(x.number),x.exchangeCopies]),[
    ['1',3],['6',1],['241',1],['257',2],['Kit1',1],['UPG1',3],['K1',1]
  ]);
  assert.ok(!duplicates.some(x=>x.number===5 || String(x.number)==='C1'));
  assert.ok(!duplicates.some(x=>Object.hasOwn(x,'copiesOwned')));
});
test('nessuna figurina trovata o doppia produce comunque un PDF di una pagina',()=>{
  for(const mode of ['trovate','doppioni']){
    const pdf=new TextDecoder('latin1').decode(buildCollectionPdf(catalog,{},mode));
    assert.match(pdf,/\/Count 1\b/);
  }
});
test('modifiche locali, quantità oltre i limiti e account separati',()=>{
  const base={1:1,5:1};
  const pending={1:4,5:0};
  const withPending=selectPdfStickers(catalog,{...base,...pending},'doppioni');
  assert.deepEqual(withPending.map(s=>[s.number,s.exchangeCopies]),[[1,3]]);
  assert.deepEqual(selectPdfStickers(catalog,{1:1000},'doppioni').map(s=>s.exchangeCopies),[98]);
  assert.equal(selectPdfStickers(catalog,{1:1},'doppioni').length,0);
});
