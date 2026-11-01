/* Figurine Club - Esportazione PDF locale, senza librerie esterne o invio dei dati.
 * I dati delle figurine personali rimangono nel browser dell'utente.
 * Usa font PDF standard (Helvetica): nessuna dipendenza di rete e funziona nella PWA offline.
 */
import { compareStickerNumbers, clampQty } from './core.mjs';

const PAGE_WIDTH=595.28;
const PAGE_HEIGHT=841.89;
const LEFT=29;
const RIGHT=PAGE_WIDTH-LEFT;
const TABLE_WIDTH=RIGHT-LEFT;
const DARK='#142c21';
const DARK_ACCENT='#2b5039';
const LIME='#c5f477';
const MUTED='#667668';
const GREEN='#4b8656';
const LINE='#e4eadf';
const PALE='#eaf3e6';
const STRIPE='#f9fbf7';
const WIN1252=new Map([
  [0x20ac,128],[0x201a,130],[0x0192,131],[0x201e,132],[0x2026,133],
  [0x2020,134],[0x2021,135],[0x02c6,136],[0x2030,137],[0x0160,138],
  [0x2039,139],[0x0152,140],[0x017d,142],[0x2018,145],[0x2019,146],
  [0x201c,147],[0x201d,148],[0x2022,149],[0x2013,150],[0x2014,151],
  [0x02dc,152],[0x2122,153],[0x0161,154],[0x203a,155],[0x0153,156],
  [0x017e,158],[0x0178,159]
]);
// Voci del catalogo con accenti centroeuropei: nei font standard PDF si
// compongono visivamente da lettera + accento, evitando di perdere l'accento.
const COMBINING_ACUTE=new Set(['ń','Ń','ć','Ć','ś','Ś','ź','Ź','ĺ','Ĺ','ŕ','Ŕ']);
function normalizedCharacters(value){
  const result=[];
  for(const original of String(value??'')){
    if(COMBINING_ACUTE.has(original)){
      const base=original.normalize('NFD')[0];
      result.push({char:base,accent:true});
      continue;
    }
    const cp=original.codePointAt(0);
    if(cp>=32&&cp<=126 || cp>=160&&cp<=255 || WIN1252.has(cp)){
      result.push({char:original,accent:false});
      continue;
    }
    // Supporto di sicurezza per importazioni con caratteri non coperti da
    // WinAnsi: conserva le lettere latine dove possibile.
    const decomposed=original.normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
    if(decomposed!==original && /^[\x20-\x7E\xA0-\xFF]+$/.test(decomposed)){
      for(const c of decomposed)result.push({char:c,accent:false});
    }else result.push({char:'?',accent:false});
  }
  return result;
}
function winByte(char){
  const cp=char.codePointAt(0);
  return WIN1252.get(cp) ?? cp;
}
function toPdfHex(text){
  return normalizedCharacters(text).map(part=>winByte(part.char).toString(16).padStart(2,'0')).join('').toUpperCase();
}
// Larghezze AFM dei font PDF standard, in millesimi di punto.
const REGULAR_WIDTHS=[761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,556,222,556,333,1000,556,556,333,1000,667,333,1000,556,611,556,556,222,222,333,333,350,556,1000,333,1000,500,333,944,556,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
const BOLD_WIDTHS=[761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,761,278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,611,278,556,500,1000,556,556,333,1000,667,333,1000,611,611,611,611,278,278,500,500,350,556,1000,333,1000,556,333,944,611,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];
function widthOf(text,size=8,bold=false){
  const widths=bold?BOLD_WIDTHS:REGULAR_WIDTHS;
  return normalizedCharacters(text).reduce((total,part)=>total+(widths[winByte(part.char)]||widths[63])*size/1000,0);
}
function splitWord(word,maxWidth,size,bold){
  const pieces=[];
  let fragment='';
  for(const ch of word){
    if(fragment && widthOf(fragment+ch,size,bold)>maxWidth){pieces.push(fragment);fragment=ch;}
    else fragment+=ch;
  }
  if(fragment)pieces.push(fragment);
  return pieces;
}
function wrapText(value,maxWidth,size,bold=false){
  const result=[];
  for(const paragraph of String(value??'').split(/\r?\n/)){
    if(!paragraph.trim()){result.push('');continue;}
    let line='';
    for(const original of paragraph.split(/\s+/).filter(Boolean)){
      for(const word of (widthOf(original,size,bold)>maxWidth ? splitWord(original,maxWidth,size,bold) : [original])){
        const next=line?line+' '+word:word;
        if(line&&widthOf(next,size,bold)>maxWidth){result.push(line);line=word;}
        else line=next;
      }
    }
    result.push(line);
  }
  return result.length?result:[''];
}
function rgb(hex){return hex.match(/[0-9a-f]{2}/gi).map(x=>(parseInt(x,16)/255).toFixed(3)).join(' ');}
function pdfDate(now){
  const z=n=>String(n).padStart(2,'0');
  return `D:${now.getFullYear()}${z(now.getMonth()+1)}${z(now.getDate())}${z(now.getHours())}${z(now.getMinutes())}${z(now.getSeconds())}`;
}
function bytes(text){return new TextEncoder().encode(text);}

class PdfPage {
  constructor(){this.commands=[];}
  add(cmd){this.commands.push(cmd);}
  fillRect(x,top,width,height,color){
    this.add(`${rgb(color)} rg ${x.toFixed(2)} ${(PAGE_HEIGHT-top-height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`);
  }
  strokeLine(x1,y1,x2,y2,color=LINE,lineWidth=.5){
    this.add(`${rgb(color)} RG ${lineWidth} w ${x1.toFixed(2)} ${(PAGE_HEIGHT-y1).toFixed(2)} m ${x2.toFixed(2)} ${(PAGE_HEIGHT-y2).toFixed(2)} l S`);
  }
  circle(cx,cy,r,color){
    const y=PAGE_HEIGHT-cy;
    const k=.55228475*r;
    const c=n=>n.toFixed(2);
    this.add(`${rgb(color)} rg ${c(cx+r)} ${c(y)} m ${c(cx+r)} ${c(y+k)} ${c(cx+k)} ${c(y+r)} ${c(cx)} ${c(y+r)} c ${c(cx-k)} ${c(y+r)} ${c(cx-r)} ${c(y+k)} ${c(cx-r)} ${c(y)} c ${c(cx-r)} ${c(y-k)} ${c(cx-k)} ${c(y-r)} ${c(cx)} ${c(y-r)} c ${c(cx+k)} ${c(y-r)} ${c(cx+r)} ${c(y-k)} ${c(cx+r)} ${c(y)} c f`);
  }
  drawText(value,x,baseline,{size=8,bold=false,color=DARK,align='left'}={}){
    const original=String(value??'');
    if(!original)return;
    const span=widthOf(original,size,bold);
    const left=align==='center'?x-span/2:align==='right'?x-span:x;
    this.add(`BT /${bold?'F2':'F1'} ${size} Tf ${rgb(color)} rg 1 0 0 1 ${left.toFixed(2)} ${(PAGE_HEIGHT-baseline).toFixed(2)} Tm <${toPdfHex(original)}> Tj ET`);
    // Due nomi ufficiali usano lettere non presenti nel WinAnsi (ń, ć).
    // Il segno acuto viene disegnato sopra il glifo di base.
    let advance=0;
    for(const part of normalizedCharacters(original)){
      const charWidth=widthOf(part.char,size,bold);
      if(part.accent){
        const x0=left+advance+charWidth*.50;
        const y0=baseline-size*.85;
        this.strokeLine(x0,y0,x0+size*.19,y0-size*.22,color,.65);
      }
      advance+=charWidth;
    }
  }
}
function composePdf(pages,metadata={}){
  const chunks=[];
  const offsets=[0];
  let length=0;
  const push=data=>{
    const chunk=typeof data==='string'?bytes(data):data;
    chunks.push(chunk);length+=chunk.length;
  };
  const objects=[];
  const addObject=body=>{objects.push(body);return objects.length;};
  const catalogId=addObject('');
  const pagesId=addObject('');
  const regularFontId=addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const boldFontId=addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pageIds=[];
  for(const page of pages){
    const content=page.commands.join('\n')+'\n';
    const stream=bytes(content);
    const contentId=addObject({stream});
    const pageId=addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }
  const infoId=addObject(`<< /Title <${toPdfHex(metadata.title||'Figurine Club')}> /Creator <${toPdfHex('Figurine Club - PDF locale')}> /CreationDate (${pdfDate(metadata.now||new Date())}) >>`);
  objects[catalogId-1]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId-1]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  for(let id=1;id<=objects.length;id++){
    offsets[id]=length;
    push(`${id} 0 obj\n`);
    const body=objects[id-1];
    if(typeof body==='string')push(body+'\n');
    else{
      push(`<< /Length ${body.stream.length} >>\nstream\n`);
      push(body.stream);
      push('endstream\n');
    }
    push('endobj\n');
  }
  const xref=length;
  push(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`);
  for(let id=1;id<=objects.length;id++)push(`${String(offsets[id]).padStart(10,'0')} 00000 n \n`);
  push(`trailer\n<< /Size ${objects.length+1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const output=new Uint8Array(length);
  let offset=0;
  for(const chunk of chunks){output.set(chunk,offset);offset+=chunk.length;}
  return output;
}

const PDF_TYPES={
  catalogo:{title:'Catalogo completo',kicker:'PANORAMICA - TUTTE LE FIGURINE',intro:'Tutte le figurine, nell\'ordine originale della collezione.',label:'CATALOGO',file:'figurine_club_catalogo_completo.pdf'},
  trovate:{title:'Figurine trovate',kicker:'IL MIO ALBUM - COLLEZIONE PERSONALE',intro:'Le figurine presenti nel tuo album, senza quantita.',label:'TROVATE',file:'figurine_club_trovate.pdf'},
  doppioni:{title:'Figurine doppie',kicker:'IL MIO ALBUM - DISPONIBILI PER LO SCAMBIO',intro:'Solo le copie in piu, escluse quelle conservate nell\'album.',label:'DOPPIONI',file:'figurine_club_doppioni_scambi.pdf'}
};
export const pdfExportFilenames=Object.freeze(Object.fromEntries(Object.entries(PDF_TYPES).map(([key,config])=>[key,config.file])));

export function selectPdfStickers(items,counts={},mode='catalogo'){
  if(!PDF_TYPES[mode])throw new Error('Tipo di esportazione PDF non valido.');
  const filtered=[];
  for(const item of items){
    const owned=clampQty(counts[String(item.number)]??0);
    if(mode==='trovate'&&owned<1 || mode==='doppioni'&&owned<2)continue;
    filtered.push(mode==='doppioni'?{...item,exchangeCopies:owned-1}:{...item});
  }
  return filtered.sort((a,b)=>compareStickerNumbers(a.number,b.number));
}
function pageHeader(page,mode,index,stats,now){
  const def=PDF_TYPES[mode];
  const first=index===0;
  const height=first?170:100;
  page.fillRect(0,0,PAGE_WIDTH,height,DARK);
  page.circle(PAGE_WIDTH+30,first?76:34,156,DARK_ACCENT);
  page.circle(PAGE_WIDTH+20,first?55:20,104,'#355e40');
  page.fillRect(LEFT,first?29:19,32,32,LIME);
  page.drawText('F',LEFT+16,first?53:43,{size:17,bold:true,color:DARK,align:'center'});
  page.drawText('FIGURINE',LEFT+44,first?43:34,{size:12.5,bold:true,color:'#f2fff0'});
  page.drawText('CLUB',LEFT+117,first?43:34,{size:12.5,bold:true,color:LIME});
  page.drawText('CALCIATORI - 2026/27',LEFT+44,first?58:47,{size:7.3,bold:true,color:'#cde5ce'});
  if(first){
    page.drawText(def.kicker,LEFT,103,{size:7.7,bold:true,color:LIME});
    page.drawText(def.title,LEFT,133,{size:23.5,bold:true,color:'#ffffff'});
    page.drawText(def.intro,LEFT,154,{size:8.2,color:'#dceee0'});
    page.fillRect(LEFT,183,TABLE_WIDTH,67,'#ffffff');
    page.strokeLine(LEFT,250,RIGHT,250,LINE,.7);
    const count=String(stats.figurines);
    page.drawText(count+' figurine',LEFT+16,211,{size:13.5,bold:true,color:DARK});
    page.drawText(mode==='catalogo'?'Catalogo presente nell\'app':mode==='trovate'?'Una voce per figurina trovata, senza quantita':`${stats.extras} copie utilizzabili per gli scambi`,LEFT+17,230,{size:8.1,color:MUTED});
    page.fillRect(RIGHT-181,199,165,37,'#f5f8f2');
    page.drawText(def.label,RIGHT-99,214,{size:8.1,bold:true,color:GREEN,align:'center'});
    page.drawText('ESPORTAZIONE PDF',RIGHT-99,227,{size:6.9,color:MUTED,align:'center'});
    page.drawText('Elenco figurine',LEFT,274,{size:11.5,bold:true});
    page.drawText('ORDINE IDENTICO ALL\'APP',RIGHT,273,{size:7.3,color:MUTED,align:'right'});
  } else {
    page.drawText(def.title+' - continua',LEFT,79,{size:16,bold:true,color:'#ffffff'});
    page.drawText(`${stats.figurines} figurine`,RIGHT,82,{size:9,color:'#e2f3da',align:'right'});
  }
  return first?293:120;
}
function prepareRow(sticker,mode,widths){
  const inner=width=>width-15;
  const title=wrapText(sticker.title,inner(widths[1]),8.35,true);
  const team=wrapText(sticker.team,inner(widths[2]),7.8,true);
  const section=wrapText(sticker.section,inner(widths[2]),7.2,false);
  const kind=wrapText(sticker.kind||'Figurina',inner(widths[3]),8.1,true);
  const subtitle=wrapText(sticker.subtitle||'Figurina ordinaria',inner(widths[3]),7,false);
  const height=Math.max(36,14+title.length*10.4,13+team.length*9.8+2+section.length*8.8,12+kind.length*10.2+2+subtitle.length*9);
  return {sticker,title,team,section,kind,subtitle,height:Math.ceil(height+1.5),widths,mode};
}
function drawColumn(page,lines,x,top,options){
  lines.forEach((str,i)=>page.drawText(str,x,top+i*options.step,{size:options.size,bold:options.bold,color:options.color}));
}
function renderRow(page,r,top,index){
  const {widths,sticker}=r;
  const positions=[LEFT];
  for(const w of widths)positions.push(positions[positions.length-1]+w);
  if(index%2===0)page.fillRect(LEFT,top,TABLE_WIDTH,r.height,STRIPE);
  page.strokeLine(LEFT,top+r.height,RIGHT,top+r.height,LINE,.45);
  const number=String(sticker.number);
  page.drawText('#'+(/^[0-9]+$/.test(number)?number.padStart(3,'0'):number),positions[0]+8,top+17,{size:9.1,bold:true});
  drawColumn(page,r.title,positions[1]+7,top+15,{size:8.35,step:10.4,bold:true,color:DARK});
  drawColumn(page,r.team,positions[2]+7,top+15,{size:7.8,step:9.8,bold:true,color:DARK});
  drawColumn(page,r.section,positions[2]+7,top+15+r.team.length*9.8+1,{size:7.2,step:8.8,bold:false,color:MUTED});
  drawColumn(page,r.kind,positions[3]+7,top+14,{size:8.1,step:10.2,bold:true,color:DARK});
  const detailColor=String(sticker.subtitle||'').includes('Carta speciale')?GREEN:MUTED;
  drawColumn(page,r.subtitle,positions[3]+7,top+14+r.kind.length*10.2+2,{size:7,step:9,bold:false,color:detailColor});
  if(r.mode==='doppioni')page.drawText(String(sticker.exchangeCopies),positions[4]+widths[4]/2,top+18,{size:9.5,bold:true,color:DARK,align:'center'});
}
function tableHeader(page,top,mode,widths){
  const labels=['N°','FIGURINA / NOME','SQUADRA / SEZ.','TIPO / CARATTERISTICHE'];
  if(mode==='doppioni')labels.push('SCAMBI');
  page.fillRect(LEFT,top,TABLE_WIDTH,26,PALE);
  let x=LEFT;
  labels.forEach((label,i)=>{page.drawText(label,x+8,top+17,{size:6.7,bold:true});x+=widths[i];});
  return top+26;
}
function pageFooter(page,index,total,now,mode){
  page.strokeLine(LEFT,803,RIGHT,803,LINE,.65);
  const date=now.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'});
  page.drawText(`FIGURINE CLUB - ${date}`,LEFT,818,{size:7.1,color:MUTED});
  page.drawText(mode==='doppioni'?'SCAMBI = COPIE TOTALI MENO 1':'NUMERO, NOME, SQUADRA, SEZIONE E TIPO',LEFT,831,{size:6.7,color:MUTED});
  page.drawText(`PAGINA ${index+1} / ${total}`,RIGHT,820,{size:7.5,bold:true,color:MUTED,align:'right'});
}
export function buildCollectionPdf(items,counts={},mode='catalogo',now=new Date()){
  if(!PDF_TYPES[mode])throw new Error('Tipo di esportazione PDF non valido.');
  if(!Array.isArray(items))throw new TypeError('Il catalogo deve essere un elenco di figurine.');
  const chosen=selectPdfStickers(items,counts,mode);
  const widths=mode==='doppioni'?[47,154,103,176,TABLE_WIDTH-480]:[47,172,116,TABLE_WIDTH-335];
  const rowModels=chosen.map(item=>prepareRow(item,mode,widths));
  const stats={figurines:chosen.length,extras:mode==='doppioni'?chosen.reduce((a,s)=>a+s.exchangeCopies,0):0};
  const pages=[];
  let rowIndex=0;
  while(!pages.length||rowIndex<rowModels.length){
    const page=new PdfPage();
    const y=pageHeader(page,mode,pages.length,stats,now);
    let cursor=tableHeader(page,y,mode,widths);
    if(rowModels.length===0){
      page.drawText(mode==='catalogo'?'Catalogo vuoto.':mode==='trovate'?'Non hai ancora trovato figurine.':'Non hai doppioni disponibili per gli scambi.',LEFT+8,cursor+32,{size:10,color:MUTED});
    }
    while(rowIndex<rowModels.length && cursor+rowModels[rowIndex].height<=790){
      renderRow(page,rowModels[rowIndex],cursor,rowIndex);
      cursor+=rowModels[rowIndex].height;
      rowIndex++;
    }
    pages.push(page);
    if(pages.length>500)throw new Error('Troppi fogli PDF da generare.');
  }
  pages.forEach((page,i)=>pageFooter(page,i,pages.length,now,mode));
  return composePdf(pages,{title:`${PDF_TYPES[mode].title} - Figurine Club`,now});
}
export function downloadCollectionPdf(items,counts,mode){
  const pdf=buildCollectionPdf(items,counts,mode);
  const blob=new Blob([pdf],{type:'application/pdf'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=pdfExportFilenames[mode];
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
  return pdf.length;
}
