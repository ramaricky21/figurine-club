/* Logica indipendente da Firebase: testabile con node --test. */
export const clampQty = n => Math.min(99, Math.max(0, Number.isFinite(n) ? Math.trunc(n) : 0));
export function computeStats(items, counts={}) {
  const total=items.length;
  const found=items.filter(item=>clampQty(Number(counts[String(item.number)] || 0))>0).length;
  const duplicates=items.reduce((sum,item)=>sum+Math.max(0,clampQty(Number(counts[String(item.number)] || 0))-1),0);
  return {total,found,missing:total-found,duplicates,percentage:total?Math.round(found/total*100):0};
}
export function exchangeMatch(items, myCounts, peer) {
  const pDup=new Set((peer.duplicates||[]).map(String));
  const pMissing=new Set((peer.missing||[]).map(String));
  return {
    receive:items.filter(s=>clampQty(Number(myCounts[String(s.number)]||0))===0&&pDup.has(String(s.number))),
    offer:items.filter(s=>clampQty(Number(myCounts[String(s.number)]||0))>1&&pMissing.has(String(s.number)))
  };
}
// Gli identificativi numerici restano numeri per conservare i progressi già salvati.
// I codici dell'album sono stringhe e NON vanno convertiti con Number().
export function stickerNumber(value) {
  const raw=String(value??'').trim();
  if (/^[1-9]\d{0,4}$/.test(raw)) return Number(raw);
  const match=/^(Kit|UPG|C|K)([1-9]\d{0,3})$/i.exec(raw);
  if (!match) return null;
  const prefix=match[1].toUpperCase()==='KIT'?'Kit':match[1].toUpperCase();
  return prefix+String(Number(match[2]));
}
// Ordine preciso del PDF, compresi i gruppi alfanumerici tra le sezioni numeriche.
export function stickerSortKey(value) {
  const id=stickerNumber(value);
  if (typeof id==='number') {
    if (id<=444) return [0,id];
    if (id<=504) return [2,id];
    if (id<=579) return [4,id];
    return [7,id];
  }
  const match=/^(Kit|UPG|C|K)(\d+)$/.exec(String(id));
  if (!match) return [8,String(value)];
  return [{Kit:1,UPG:3,C:5,K:6}[match[1]],Number(match[2])];
}
export function compareStickerNumbers(a,b) {
  const x=stickerSortKey(a),y=stickerSortKey(b);
  return x[0]-y[0]||(typeof x[1]==='number'&&typeof y[1]==='number'
    ? x[1]-y[1] : String(x[1]).localeCompare(String(y[1]),'it'));
}
export function catalogNormalize(rows) {
  if (!rows.length) throw new Error('Il CSV non contiene figurine.');
  if (rows.length>4000) throw new Error('Massimo 4.000 figurine per importazione.');
  const seen=new Set();
  return rows.map((row,i)=>{
    const number=stickerNumber(row.numero);
    if (number===null||seen.has(String(number))) throw new Error(`Numero non valido o ripetuto alla riga ${i+2}.`);
    seen.add(String(number));
    const fields=['squadra','sezione','titolo','sottotitolo','tipo'];
    for(const field of fields) if(String(row[field]||'').trim().length>160) throw new Error(`Testo troppo lungo alla riga ${i+2}.`);
    const [team,section,title,subtitle,kind]=fields.map(f=>String(row[f]||'').trim());
    if (!team||!section||!title) throw new Error(`Squadra, sezione e titolo obbligatori alla riga ${i+2}.`);
    return {number,team,section,title,subtitle,kind:kind||'Giocatore'};
  }).sort((a,b)=>compareStickerNumbers(a.number,b.number));
}
/* Parser CSV RFC-4180 per virgole, virgolette, righe multilinea e BOM. */
export function parseCSV(text) {
  text=String(text||'').replace(/^\uFEFF/,'');
  if (text.length>2_000_000) throw new Error('File CSV troppo grande (massimo 2 MB).');
  const head=text.split(/\r?\n/,1)[0];
  const delimiter=(head.match(/;/g)||[]).length>(head.match(/,/g)||[]).length?';':',';
  const rows=[];let row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"') {
      if(quoted&&text[i+1]==='"'){value+='"';i++;}
      else if(quoted){quoted=false;}
      else if(!value){quoted=true;}
      else throw new Error('Virgolette non valide nel CSV.');
    } else if(ch===delimiter&&!quoted){row.push(value);value='';}
    else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(c=>c.trim()))rows.push(row);row=[];value='';}
    else value+=ch;
  }
  if(quoted)throw new Error('Virgolette non chiuse nel CSV.');
  row.push(value);if(row.some(c=>c.trim()))rows.push(row);
  const headers=(rows.shift()||[]).map(c=>c.trim().toLowerCase());
  for(const required of ['numero','squadra','sezione','titolo'])if(!headers.includes(required))throw new Error(`Manca la colonna ${required}.`);
  return catalogNormalize(rows.map((values,i)=>{
    if(values.length!==headers.length)throw new Error(`Colonne errate alla riga ${i+2}.`);
    return Object.fromEntries(headers.map((h,j)=>[h,values[j]]));
  }));
}
export function sectionsFor(items) {
  const sections=new Map();
  for(const item of items){
    const key=`${item.team}\u0000${item.section}`;
    if(!sections.has(key))sections.set(key,{team:item.team,section:item.section,items:[]});
    sections.get(key).items.push(item);
  }
  const out=[];
  for(const sec of sections.values())for(let i=0;i<sec.items.length;i+=80){
    const segment=Math.floor(i/80);
    const key=[sec.team,sec.section,String(segment)].join('|');
    // btoa su UTF-8, per conservare documenti con nomi senza slash.
    const bytes=new TextEncoder().encode(key);
    let id=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    // Evita di oltrepassare i 1.500 byte consentiti per l'ID Firestore.
    if(id.length>1400){
      let hash=0x811c9dc5;for(const byte of bytes){hash=Math.imul(hash^byte,0x01000193)>>>0;}
      id=id.slice(0,1300)+'_'+hash.toString(16).padStart(8,'0');
    }
    out.push({id,team:sec.team,section:sec.section,items:sec.items.slice(i,i+80)});
  }
  if(out.length>400)throw new Error('Troppe sezioni distinte per una singola importazione.');
  return out;
}
