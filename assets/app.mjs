import { firebaseConfig, albumEdition } from '../config.js';
import { STICKER_IMAGES, STICKER_LANDSCAPE_IMAGE_IDS } from './sticker-images.mjs?v=6';
import { computeStats, exchangeMatch, parseCSV, sectionsFor, clampQty, compareStickerNumbers } from './core.mjs';
import { deriveSyncState } from './offline-state.mjs';
import { computeAchievements, ACHIEVEMENTS } from './achievements.mjs';
import {publicSummary, mergeClubProfile, needsClubPublish, normalizeClubProfile, recentClubAchievements} from './club.mjs';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  getFirestore, doc, collection, query, where, limit, getDoc, getDocs,
  setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, writeBatch, runTransaction
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(name)=>`<svg class="icon" aria-hidden="true"><use href="./assets/icons.svg#${name}"></use></svg>`;
// Correzioni visibili della grafia dei nomi stampati sulle figurine, senza scrivere su Firestore.
const CATALOG_NAME_CORRECTIONS=Object.freeze({'73':'Robert Sánchez','76':'Jacobo Ramón','79':'Álex Valle','88':'Jesús Rodríguez','170':'Piotr Zieliński','182':'Guglielmo Vicario','189':'Jhon Lucumí','197':'Francisco Conceição','199':'Kenan Yildiz','212':'Alfonso Pedraza','255':'Alphadjo Cissé','257':'Luka Modrić','260':'Ruben Loftus-Cheek','267':'Gonçalo Ramos','311':'Rasmus Højlund','477':'Mathis Mout','485':'Glenn Peter Stromberg','128':'Florian Grillitsch','390':'Emirhan Ilkhan'});
function correctedCatalogItem(item){
  const title=CATALOG_NAME_CORRECTIONS[String(item.number)];
  return title&&item.title!==title?{...item,title}:item;
}
const state={user:null,profile:null,admin:false,accessGranted:false,memberUnsub:null,accessRequests:[],memberships:[],items:[],counts:{},pending:{},pendingTokens:{},peers:[],filters:{q:'',team:'',section:'',status:''},page:1,pageSize:24,loaded:{album:false,catalog:false},metadata:{albumCache:true,catalogCache:true,albumPending:false,albumError:false,catalogError:false},unsubs:[],peerUnsub:null,view:'dashboard',busy:false,achievementKey:null,achievementBaseline:null,achievementNotified:new Set(),clubProfiles:[],clubSelected:null,clubLoaded:false,clubError:"",clubFromCache:true};
let auth,db;
let offlineEnabled=false;
const DEVICE_KEY='figurine-club:trusted-offline-device:v1';
const ADMIN_KEY='figurine-club:verified-admin:'+firebaseConfig.projectId;
let markSequence=0;
function readDeviceChoice(){try{return localStorage.getItem(DEVICE_KEY);}catch(_){return null;}}
function saveDeviceChoice(choice){try{localStorage.setItem(DEVICE_KEY,choice);}catch(_){/* Memoria non disponibile: resta la modalità online */}}
function canStoreOffline(){return typeof indexedDB!=='undefined' && 'serviceWorker' in navigator && typeof caches!=='undefined';}
function offlineChoice(){
  if(!canStoreOffline())return Promise.resolve(false);
  const saved=readDeviceChoice();
  if(saved==='yes'||saved==='no')return Promise.resolve(saved==='yes');
  return new Promise(resolve=>{
    const dialog=$('#offline-consent');dialog.hidden=false;
    const finish=enabled=>{
      saveDeviceChoice(enabled?'yes':'no');
      dialog.hidden=true;resolve(enabled);
    };
    $('#offline-allow').addEventListener('click',()=>finish(true),{once:true});
    $('#offline-decline').addEventListener('click',()=>finish(false),{once:true});
  });
}
function updateSyncUI(){
  const badge=$('#sync-status');if(!badge)return;
  const derived=deriveSyncState({
    online:navigator.onLine,albumReady:state.loaded.album,catalogReady:state.loaded.catalog,
    albumFromCache:state.metadata.albumCache,catalogFromCache:state.metadata.catalogCache,
    pendingWrites:state.metadata.albumPending || Object.keys(state.pending).length>0,
    persistence:offlineEnabled,error:state.metadata.albumError||state.metadata.catalogError
  });
  badge.dataset.status=derived.kind;
  badge.title=derived.explanation;
  $('#sync-label').textContent=derived.label;
  const details=$('#offline-detail');if(details)details.textContent=derived.explanation;
}
function updateOfflineSetting(){
  const setting=$('#offline-device-status');
  if(setting)setting.textContent=offlineEnabled?'Memoria offline attiva su questo dispositivo.':'Memoria offline disattivata su questo dispositivo.';
  const btn=$('#enable-offline');if(btn)btn.hidden=offlineEnabled||!canStoreOffline();
}
function isCatalogAvailable(){return state.loaded.album && state.loaded.catalog && state.items.length>0;}
window.addEventListener('online',updateSyncUI);
window.addEventListener('online',()=>queueClubPublish());
window.addEventListener('offline',updateSyncUI);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){updateSyncUI();queueClubPublish();}});
let toastTimer;
function toast(message,isError=false){const n=$('#toast');n.textContent=message;n.classList.toggle('error',isError);n.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('show'),3400);}
function show(id){for(const name of ['boot-screen','setup-screen','auth-screen','pending-screen','app-screen'])$(`#${name}`).hidden=name!==id;document.body.classList.toggle('auth-body',id!=='app-screen');document.body.classList.toggle('app-body',id==='app-screen');}
function errorText(e){const errors={'auth/email-already-in-use':'Questa email è già registrata.','auth/invalid-email':'L’indirizzo email non è valido.','auth/weak-password':'Scegli una password più sicura.','auth/invalid-credential':'Email o password non corretti.','auth/wrong-password':'Password non corretta.','auth/too-many-requests':'Troppi tentativi. Riprova più tardi.','auth/unauthorized-domain':'Il dominio del sito non è autorizzato in Firebase Authentication.','permission-denied':'Accesso negato da Firestore: verifica le regole di sicurezza nella console.','failed-precondition':'Manca una configurazione del database. Controlla Firestore.'};return errors[e?.code]||errors[e?.code?.split('/').pop()]||e?.message||'Si è verificato un errore.';}
function alertApp(message,err=true){const el=$('#site-alert');el.textContent=message;el.hidden=!message;el.classList.toggle('alert-error',err);el.classList.toggle('alert-success',!err);}
function authError(message){const el=$('#auth-error');el.textContent=message;el.hidden=!message;}
let registerMode=false;
function authMode(register){registerMode=register;$('#auth-eyebrow').textContent=register?'IL TUO ALBUM COMINCIA QUI':'BENTORNATO, COLLEZIONISTA';$('#auth-title').innerHTML=register?'Crea il tuo album<span class="heading-period">.</span>':'Accedi al tuo album<span class="heading-period">.</span>';$('#auth-subtitle').textContent=register?'Registrati ora; potrai entrare dopo l’approvazione dell’amministratore.':'Riprendi da dove avevi lasciato.';$('#name-fields').hidden=!register;$('#display-name').required=register;$('#auth-password').autocomplete=register?'new-password':'current-password';$('#auth-submit').textContent=register?'Richiedi l’accesso →':'Entra nel mio album →';$('#auth-switch').firstChild.textContent=register?'Hai già un account? ':'Non hai un account? ';$('#switch-auth').textContent=register?'Accedi ↗':'Registrati gratis ↗';authError('');}
const signedIn=()=>!!state.user;
function clearListeners(){clearTimeout(clubPublishTimer);state.unsubs.forEach(fn=>fn());state.unsubs=[];if(state.peerUnsub){state.peerUnsub();state.peerUnsub=null;}}
function clearMembershipListener(){if(state.memberUnsub){state.memberUnsub();state.memberUnsub=null;}}
function resetState(){clearListeners();clearMembershipListener();state.user=null;state.profile=null;state.admin=false;state.accessGranted=false;state.accessRequests=[];state.memberships=[];state.items=[];state.counts={};state.pending={};state.pendingTokens={};state.peers=[];state.loaded={album:false,catalog:false};state.metadata={albumCache:true,catalogCache:true,albumPending:false,albumError:false,catalogError:false};state.achievementKey=null;state.achievementBaseline=null;state.achievementNotified=new Set();state.clubProfiles=[];state.clubSelected=null;state.clubLoaded=false;state.clubError="";state.clubFromCache=true;updateSyncUI();}
function getProfileRef(){return doc(db,'users',state.user.uid);}
function getAlbumRef(){return doc(db,'users',state.user.uid,'album','main');}
function stats(){return computeStats(state.items, {...state.counts,...state.pending});}
function qty(n){return clampQty(Number(Object.prototype.hasOwnProperty.call(state.pending,String(n))?state.pending[String(n)]:state.counts[String(n)]||0));}
function route(){let v=(location.hash.slice(1)||'dashboard').split('?')[0];if(!['dashboard','album','bacheca','club','scambi','impostazioni','admin','richieste'].includes(v))v='dashboard';if(['admin','richieste'].includes(v)&&!state.admin)v='dashboard';state.view=v;$$('[data-view]').forEach(el=>el.hidden=el.dataset.view!==v);$$('[data-route]').forEach(el=>el.classList.toggle('active',el.dataset.route===v));$('#breadcrumb').textContent={dashboard:'Panoramica',album:'Il mio album',bacheca:'La mia bacheca',club:'Il Club',scambi:'Scambi',impostazioni:'Impostazioni',admin:'Catalogo / Admin',richieste:'Richieste di accesso'}[v];document.documentElement.classList.remove('menu-open');if(v==='album')renderAlbum();if(v==='bacheca')renderAchievements();if(v==='club')renderClub();if(v==='scambi')renderTrades();if(v==='richieste')renderRequests();if(v==='admin')$('#catalog-info').textContent=`${state.items.length} figurine nel catalogo`;window.scrollTo({top:0,behavior:'instant'});}
function renderChrome(){const name=state.profile?.displayName||state.user?.displayName||'Collezionista';$$('[data-person-name]').forEach(n=>n.textContent=name.split(' ')[0]);$('#side-name').textContent=name;$('#side-email').textContent=state.user?.email||'';$('#side-initial').textContent=name[0]?.toUpperCase()||'F';$('#top-initial').textContent=name[0]?.toUpperCase()||'F';$('#profile-name').value=name;$('#profile-email').value=state.user?.email||'';$('#share-trades').checked=!!state.profile?.shareTrades;$('#admin-nav').hidden=!state.admin;$('#dashboard-edition').textContent='CALCIATORI 2026–27';
}
function renderStats(){
  const s=stats();
  for(const key of ['total','found','missing','duplicates'])$$(`[data-stat="${key}"]`).forEach(el=>el.textContent=s[key]);
  $$('[data-percent]').forEach(el=>el.textContent=s.percentage);
  $('#hero-ring').style.setProperty('--progress',s.percentage);
  $('#stadium-found-count').textContent=s.found;
  $('#stadium-board-progress').setAttribute('aria-valuenow',String(s.percentage));
  $('#stadium-board-fill').style.width=`${s.percentage}%`;
  $('#album-ring').style.setProperty('--progress',s.percentage);
  $('#album-ring').textContent=`${s.percentage}%`;
  $('#progress-track').style.width=`${s.percentage}%`;
}
function renderTeams(){
  const map=new Map();
  const hasSerieA=state.items.some(s=>s.section==='Serie A');
  state.items.forEach(st=>{
    if(hasSerieA&&st.section!=='Serie A')return;
    const val=map.get(st.team)||{total:0,found:0};
    val.total++;if(qty(st.number)>0)val.found++;
    map.set(st.team,val);
  });
  const entries=[...map.entries()].sort(([a,av],[b,bv])=>
    (bv.found/bv.total)-(av.found/av.total)||a.localeCompare(b,'it')).slice(0,3);
  $('#teams-grid').innerHTML=entries.length?entries.map(([team,data],i)=>{
    const pct=Math.round(data.found/data.total*100);
    const code=team.trim().slice(0,2).toUpperCase();
    return `<button type="button" class="stadium-team-row" data-team="${esc(team)}" aria-label="${esc(team)}: ${data.found} figurine su ${data.total}, ${pct}%">
      <span class="stadium-team-shield stadium-shield-${i%3}">${esc(code)}</span>
      <span class="stadium-team-detail"><strong>${esc(team)}</strong><span class="stadium-team-track"><span style="width:${pct}%"></span></span></span>
      <strong class="stadium-team-pct">${pct}%</strong>
    </button>`;
  }).join(''):'<div class="stadium-empty">Il catalogo non è ancora disponibile. Quando verrà caricato, qui appariranno i progressi reali delle squadre.</div>';
  $('#demo-notice').hidden=!(state.items.length>0&&state.items.every(st=>/demo|dimostrativ|esempio/i.test(st.subtitle||'')));
}
function renderDashboardClub(){
  const target=$('#stadium-club-activity');
  if(!target)return;
  if(state.clubError){target.innerHTML='<p class="stadium-empty">Le conquiste del Club non sono disponibili al momento. Apri Il Club per i dettagli.</p>';return;}
  if(!state.clubLoaded){target.innerHTML='<p class="stadium-empty">Caricamento delle conquiste del Club…</p>';return;}
  const result=computeAchievements(state.items,{});
  const signature=state.loaded.catalog&&result.available?result.signature:'';
  const profiles=state.clubProfiles.map(p=>p.ready&&p.catalogSignature!==signature?
    {...p,ready:false,unlocked:[],earnedAt:{}}:p);
  const news=recentClubAchievements(profiles,2);
  const defs=new Map(ACHIEVEMENTS.map(a=>[a.id,a]));
  target.innerHTML=news.length?news.map(evt=>{
    const achievement=defs.get(evt.awardId);
    return `<div class="stadium-feed-item"><span class="stadium-feed-medal">${icon(achievement.icon)}</span><span class="stadium-feed-copy"><strong>${esc(evt.name)} ha conquistato “${esc(achievement.title)}”</strong><small>${esc(evt.date.toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'}))} · Traguardo del Club</small></span></div>`;
  }).join(''):'<p class="stadium-empty">Nessuna nuova conquista per ora. I riconoscimenti confermati degli amici compariranno qui.</p>';
  if(state.clubFromCache){
    target.insertAdjacentHTML('beforeend','<small class="stadium-feed-cached">Dati del Club salvati sul dispositivo: potrebbero non essere aggiornati.</small>');
  }
}
function fillFilterOptions(){for(const [id,key] of [['team-filter','team'],['section-filter','section']]){const select=$(`#${id}`);const current=state.filters[key];const label=key==='team'?'Tutte le squadre':'Tutte le sezioni';const values=[...new Set(state.items.map(s=>s[key]))].sort((a,b)=>a.localeCompare(b,'it'));select.innerHTML=`<option value="">${label}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');select.value=values.includes(current)?current:'';state.filters[key]=select.value;}}
function renderAlbum(){const f=state.filters;let rows=state.items.filter(s=>{const n=qty(s.number);return (!f.q||[s.number,s.team,s.section,s.title,s.subtitle,s.kind].some(v=>String(v||'').toLocaleLowerCase('it').includes(f.q.toLocaleLowerCase('it'))))&&(!f.team||s.team===f.team)&&(!f.section||s.section===f.section)&&(!f.status||(f.status==='found'&&n>0)||(f.status==='missing'&&n===0)||(f.status==='duplicates'&&n>1));});$('#results-count').textContent=rows.length;$('#album-empty').hidden=rows.length>0;const pages=Math.max(1,Math.ceil(rows.length/state.pageSize));state.page=Math.max(1,Math.min(pages,state.page));const visible=rows.slice((state.page-1)*state.pageSize,state.page*state.pageSize);
$('#sticker-grid').innerHTML=visible.map(s=>{const q=qty(s.number);const found=q>0;const digit=(String(s.number).match(/\d+/)||['0'])[0];const tone=Number(digit)%6;const image=s.kind.toLowerCase()==='scudetto'?'★':s.kind.toLowerCase()==='squadra'?'◆':String(Number(digit)%10);const composite=s.section==='Serie BKT'||s.section==='Serie C'||(s.section==='Celebration'&&/\b[AB]\)/.test(s.title));const photo=STICKER_IMAGES[String(s.number)];const landscape=photo&&STICKER_LANDSCAPE_IMAGE_IDS.includes(String(s.number));return `<article class="sticker-card ${found?'is-owned':''} ${composite?'is-composite':''}" data-sticker="${esc(s.number)}"><div class="sticker-visual team-color-${tone} ${photo?'has-sticker-image':''} ${landscape?'sticker-image-landscape':''}"><div class="sticker-top"><span class="sticker-no">#${String(s.number).padStart(3,'0')}</span><span class="sticker-type">${esc(s.kind)}</span></div><div class="sticker-art"><span class="art-sparks sparkle-mark" aria-hidden="true"></span><div class="sticker-symbol">${esc(image)}</div>${photo?`<img class="sticker-photo" src="${esc(photo)}" alt="Figurina ${esc(s.number)}: ${esc(s.title)}" loading="lazy" decoding="async">`: ''}<span class="art-fineprint">COLLECT · PLAY · COMPLETE</span></div>${photo?`<button type="button" class="zoom-sticker" data-zoom title="Ingrandisci la figurina" aria-label="Ingrandisci la figurina ${esc(s.title)}">${icon('search')}</button>`:''}<button type="button" class="check-sticker ${found?'checked':''}" data-mark aria-label="${found?'Segna come mancante':'Segna come trovata'}">${icon('check')}</button></div><div class="sticker-details"><span class="sticker-team">${esc(s.team)} <span>· ${esc(s.section)}</span></span><h3 title="${esc(s.title)}">${esc(s.title)}</h3><p title="${esc(s.subtitle)}">${esc(s.subtitle||`Figurina n. ${s.number}`)}</p></div><div class="sticker-footer"><span class="sticker-status ${found?'status-owned':''}">${found?'✓ Trovata':'Da trovare'}</span><div class="qty-control"><button type="button" data-step="-1" aria-label="Rimuovi una copia" ${q===0?'disabled':''}>${icon('minus')}</button><output>${q}</output><button type="button" data-step="1" aria-label="Aggiungi una copia" ${q===99?'disabled':''}>${icon('plus')}</button></div></div></article>`;}).join('');
const nav=$('#pagination');nav.innerHTML=pages===1?'':`<button data-page="${state.page-1}" ${state.page===1?'disabled':''}>← Prec.</button>`+[...new Set([1,state.page-1,state.page,state.page+1,pages].filter(n=>n>=1&&n<=pages))].sort((a,b)=>a-b).map(n=>`<button data-page="${n}" ${n===state.page?'class="active" aria-current="page"':''}>${n}</button>`).join('')+`<button data-page="${state.page+1}" ${state.page===pages?'disabled':''}>Succ. →</button>`;}

// Barra presente SOLO dentro il singolo riconoscimento (personale o di un amico).
// Percentuale mancante/vecchio client: non inventiamo uno 0%, mostriamo un trattino.
function awardProgressHtml(title,percentage,detail){
  const valid=Number.isInteger(percentage)&&percentage>=0&&percentage<=100;
  const pct=valid?percentage:0;
  const caption=valid?detail:'Progressi non ancora disponibili';
  const track=valid?` role="progressbar" aria-label="${esc(title)}: ${pct}%" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"`:
    ` aria-label="Progresso non disponibile per ${esc(title)}"`;
  return `<div class="award-progress"><div class="award-progress-caption"><span class="progress-detail">${esc(caption)}</span><strong>${valid?pct+'%':'—'}</strong></div>
    <div class="award-progress-track"${track}><span style="width:${pct}%"></span></div></div>`;
}
// Riconoscimenti personali: derivati dall'album corrente, senza nuove scritture Firebase.
// Gli sblocchi sono annunciati solo dopo la conferma del server; nessun toast
// all'ingresso, al semplice caricamento da cache o con catalogo dimostrativo.
function renderAchievements(){
  const result=computeAchievements(state.items,{...state.counts,...state.pending});
  const ready=state.loaded.album&&state.loaded.catalog;
  const eligible=ready&&result.available;
  const synchronized=eligible && navigator.onLine && !state.metadata.albumCache &&
    !state.metadata.catalogCache && !state.metadata.albumPending &&
    !state.metadata.albumError && !state.metadata.catalogError &&
    Object.keys(state.pending).length===0;
  const now=new Set(result.awards.filter(a=>a.unlocked).map(a=>a.id));
  if(!eligible){state.achievementKey=null;state.achievementBaseline=null;}
  else if(state.achievementKey!==result.signature || state.achievementBaseline===null){
    // Una nuova stagione/catalogo o un primo accesso sono il punto di partenza:
    // premi già acquisiti non producono notifiche retroattive.
    state.achievementKey=result.signature;
    state.achievementBaseline=now;
    state.achievementNotified=new Set();
  }else if(synchronized){
    const newly=result.awards.filter(a=>a.unlocked &&
      !state.achievementBaseline.has(a.id) && !state.achievementNotified.has(a.id));
    state.achievementBaseline=now;
    if(newly.length){
      for(const award of newly)state.achievementNotified.add(award.id);
      const title=newly.length===1?newly[0].title:`${newly.length} riconoscimenti`;
      toast(`Nuovo traguardo conquistato! ${title}`);
      if(state.view==='bacheca'){
        requestAnimationFrame(()=>{
          for(const a of newly){const row=$(`[data-achievement="${a.id}"]`);if(row){row.classList.add('award-new');setTimeout(()=>row.classList.remove('award-new'),2000);}}
        });
      }
    }
  }
  $('#awards-edition').textContent=albumEdition;
  $('#awards-percent').textContent=ready?result.percentage:0;
  const bar=$('#awards-progress');
  bar.setAttribute('aria-valuenow',String(ready?result.percentage:0));
  $('#awards-progress-fill').style.width=`${ready?result.percentage:0}%`;
  $('#awards-counter').textContent=`${eligible?result.unlocked:0} di ${ACHIEVEMENTS.length}`;
  $('#awards-overview-note').textContent=!ready?'Caricamento album e catalogo…':
    result.demo?'Il catalogo contiene figurine dimostrative: i premi sono sospesi.':
    !result.total?`Nessun catalogo caricato. I ${ACHIEVEMENTS.length} traguardi ti aspettano.`:
    `${result.found} figurine diverse raccolte su ${result.total}. ${result.completeTeams} squadre completate.`;
  $('#awards-list').innerHTML=result.awards.map(a=>{
    const unlocked=eligible&&a.unlocked;
    const unavailable=a.unavailable;
    const description=a.description;
    const pendingUnlock=unlocked && (state.metadata.albumPending || Object.keys(state.pending).length>0) &&
      state.achievementBaseline && !state.achievementBaseline.has(a.id);
    const status=pendingUnlock?'Da sincronizzare':unlocked?'Sbloccato':unavailable?'Non disponibile':'Da sbloccare';
    return `<div class="award-row ${unlocked?'award-unlocked':'award-locked'} ${unavailable?'award-unavailable':''}" data-achievement="${a.id}" data-tone="${a.tone}">
      <span class="award-icon">${icon(a.icon)}</span>
      <div class="award-copy"><h3>${a.title}</h3><p>${description}</p>${a.id.startsWith('special-')&&eligible&&unavailable?'<small>In attesa della categoria nel catalogo.</small>':''}</div>
      <span class="award-status">${icon(pendingUnlock?'refresh':unlocked?'check-circle':'lock')}<span>${status}</span></span>
      ${awardProgressHtml(a.title,eligible&&!unavailable?a.progress:null,a.progressDetail)}
    </div>`;
  }).join('');
  $('#awards-data-note').textContent=!ready?'I riconoscimenti saranno disponibili dopo il caricamento dei dati.':
    result.demo?'I premi non si sbloccano con figurine dimostrative.':
    !result.total?'Importa il catalogo ufficiale quando disponibile per attivare i riconoscimenti.':
    !navigator.onLine||state.metadata.albumPending||Object.keys(state.pending).length||state.metadata.albumCache||state.metadata.catalogCache
      ?'Stai vedendo progressi locali o non ancora confermati: eventuali nuovi premi saranno confermati alla sincronizzazione.':
      'Premi calcolati sulle figurine del catalogo attualmente importato.';
}
function renderEverything(){renderStats();renderTeams();renderDashboardClub();renderAchievements();if(state.view==='album')renderAlbum();if(state.view==='scambi')renderTrades();queueClubPublish();}
function mark(number,next){
  if(!state.user||!state.accessGranted)return;
  if(!isCatalogAvailable()){
    toast('Attendi il caricamento dell’album e del catalogo prima di modificarli.',true);return;
  }
  if(!navigator.onLine&&!offlineEnabled){
    toast('Memoria offline non attiva: collegati a Internet per modificare le figurine.',true);return;
  }
  const k=String(number),prev=qty(number);
  if(prev===next)return;
  const userId=state.user.uid;
  const token=++markSequence;
  state.pending[k]=next;state.pendingTokens[k]=token;
  renderEverything();updateSyncUI();
  // Firestore memorizza la modifica localmente; la Promise termina solo dopo
  // la conferma del server. Non aspettarla per mostrare il cambiamento.
  try{
    const commit=setDoc(getAlbumRef(),{counts:{[k]:next},updatedAt:serverTimestamp()},{merge:true});
    if(!navigator.onLine)toast('Modifica in attesa: si sincronizzerà quando torni online.');
    else toast(next===0?'Figurina segnata come mancante':next===1?'Figurina trovata!':`Ora hai ${next} copie`);
    commit.then(()=>{
      if(state.user?.uid!==userId || state.pendingTokens[k]!==token)return;
      delete state.pending[k];delete state.pendingTokens[k];renderEverything();updateSyncUI();queueTradePublish();
    }).catch(e=>{
      if(state.user?.uid!==userId || state.pendingTokens[k]!==token)return;
      delete state.pending[k];delete state.pendingTokens[k];renderEverything();updateSyncUI();
      toast('Salvataggio non riuscito: '+errorText(e),true);
    });
  }catch(e){
    if(state.pendingTokens[k]===token){delete state.pending[k];delete state.pendingTokens[k];renderEverything();updateSyncUI();}
    toast(errorText(e),true);
  }
}
async function publishTradeSheet(){if(!state.user||!state.profile?.shareTrades||!state.loaded.album||!state.loaded.catalog||!navigator.onLine||state.metadata.albumCache||state.metadata.albumPending||Object.keys(state.pending).length)return;const duplicates=[],missing=[];for(const s of state.items){const n=qty(s.number);if(n>1)duplicates.push(s.number);if(n===0)missing.push(s.number);}await setDoc(doc(db,'tradeSheets',state.user.uid),{active:true,displayName:state.profile.displayName,duplicates,missing,updatedAt:serverTimestamp()});}
let publishTimer;
let clubPublishTimer;
let clubBootstrapBusy=false;
function queueTradePublish(){clearTimeout(publishTimer);if(!state.profile?.shareTrades||!navigator.onLine||state.metadata.albumCache||state.metadata.albumPending||Object.keys(state.pending).length)return;publishTimer=setTimeout(()=>publishTradeSheet().catch(e=>toast('Impossibile aggiornare gli scambi: '+errorText(e),true)),700);}
function subscribePeers(){if(state.peerUnsub){state.peerUnsub();state.peerUnsub=null;}state.peers=[];if(!state.profile?.shareTrades){renderTrades();return;}state.peerUnsub=onSnapshot(query(collection(db,'tradeSheets'),where('active','==',true),limit(150)),snap=>{state.peers=snap.docs.filter(d=>d.id!==state.user?.uid).map(d=>({id:d.id,...d.data()}));renderTrades();},e=>toast('Errore caricamento scambi: '+errorText(e),true));}
// Il Club legge esclusivamente /clubProfiles: nessun altro utente può leggere
// i documenti /users/{uid}/album/main o i profili con indirizzi email.
function renderClub(){
  const warning=$('#club-warning');
  const message=state.clubError || (state.clubFromCache?'Dati del Club in memoria locale: potrebbero non essere aggiornati. Torna online per vedere i progressi più recenti.':'');
  warning.hidden=!message;warning.textContent=message;
  const currentCatalog=computeAchievements(state.items,{});
  const signature=state.loaded.catalog&&currentCatalog.available?currentCatalog.signature:'';
  const members=state.clubProfiles.map(p=>p.ready&&p.catalogSignature!==signature?{...p,ready:false,percentage:0,unlocked:[],earnedAt:{}}:p).sort((a,b)=>a.displayName.localeCompare(b.displayName,'it'));
  $('#club-member-count').textContent=String(members.length);
  const current=members.find(p=>p.id===state.clubSelected);
  $('#club-list-panel').hidden=!!current;
  $('#club-profile-panel').hidden=!current;
  if(!current){
    $('#club-members').innerHTML=members.length?members.map(member=>{
      const pct=member.ready?`${member.percentage}%`:'—';
      return `<button type="button" class="club-member-card" data-club-id="${esc(member.id)}">
        <span class="club-member-head"><span class="club-member-avatar">${esc(member.displayName[0]?.toUpperCase()||'F')}</span><span class="club-member-text"><strong>${esc(member.displayName)}</strong><small>${member.id===state.user?.uid?'Il tuo album · ':''}${member.ready?'Album Calciatori':'Progressi non ancora disponibili'}</small></span><span class="club-member-pct">${pct}</span></span>
        <span class="club-member-bar"><span style="width:${member.percentage}%"></span></span>
        <span class="club-member-footer"><span>${member.ready?`${member.unlocked.length} di ${ACHIEVEMENTS.length} riconoscimenti`:'Attende l’aggiornamento dell’album'}</span><b>Apri bacheca →</b></span></button>`;
    }).join(''):`<div class="club-empty">${state.clubLoaded?'Non ci sono ancora bacheche pubblicate. Gli iscritti compariranno dopo il primo accesso alla versione aggiornata.':'Caricamento dei membri del Club…'}</div>`;
    const news=recentClubAchievements(members);
    const defs=new Map(ACHIEVEMENTS.map(a=>[a.id,a]));
    $('#club-activity').innerHTML=news.length?news.map(evt=>{
      const a=defs.get(evt.awardId);
      const when=evt.date.toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'});
      return `<div class="club-news-row"><span class="club-news-icon">${icon(a.icon)}</span><span class="club-news-text"><strong>${esc(evt.name)} ha conquistato “${esc(a.title)}”!</strong><small>${esc(when)} · Traguardo del Club</small></span></div>`;
    }).join(''):'<div class="club-empty">Le nuove conquiste confermate degli amici compariranno qui. Le bacheche già completate prima di questo aggiornamento non generano annunci retroattivi.</div>';
    return;
  }
  $('#club-profile-name').textContent=current.displayName;
  $('#club-profile-caption').textContent=current.ready?'Album Calciatori · Riconoscimenti del membro':'Questo membro non ha ancora aggiornato il proprio album con la nuova versione.';
  $('#club-profile-percent').textContent=current.ready?`${current.percentage}%`:'—';
  $('#club-profile-progress').setAttribute('aria-valuenow',String(current.percentage));
  $('#club-profile-progress-fill').style.width=`${current.percentage}%`;
  $('#club-profile-awards-counter').textContent=`${current.unlocked.length} di ${ACHIEVEMENTS.length}`;
  $('#club-profile-awards').innerHTML=ACHIEVEMENTS.map(a=>{
    const obtained=current.ready&&current.unlocked.includes(a.id);
    return `<div class="award-row ${obtained?'award-unlocked':'award-locked'}" data-tone="${a.tone}"><span class="award-icon">${icon(a.icon)}</span>
    <div class="award-copy"><h3>${esc(a.title)}</h3><p>${esc(a.description)}</p></div>
    <span class="award-status">${icon(obtained?'check-circle':'lock')}<span>${obtained?'Sbloccato':current.ready?'Da sbloccare':'In attesa'}</span></span>
    ${awardProgressHtml(a.title,current.ready?current.awardProgress?.[a.id]:null,
      a.id==='first-team'?'La squadra più vicina al traguardo':
      a.id==='three-teams'?'Le tre squadre più vicine al traguardo':
      'Avanzamento di questo obiettivo')}
    </div>`;
  }).join('');
}
let clubPublishInProgress=false;
async function publishClubProfile(){
  if(!state.user||!state.accessGranted||!state.profile||!navigator.onLine||
     !state.loaded.album||!state.loaded.catalog||state.metadata.albumCache||state.metadata.catalogCache||
     state.metadata.albumPending||state.metadata.albumError||state.metadata.catalogError||
     Object.keys(state.pending).length||clubPublishInProgress)return;
  const uid=state.user.uid;
  const desired=publicSummary(computeAchievements(state.items,state.counts),state.profile.displayName);
  clubPublishInProgress=true;
  try{
    await runTransaction(db,async tx=>{
      const ref=doc(db,'clubProfiles',uid);
      const snap=await tx.get(ref);
      const existing=snap.exists()?snap.data():null;
      const merged=mergeClubProfile(existing,desired,serverTimestamp());
      if(needsClubPublish(existing,merged))tx.set(ref,{...merged,updatedAt:serverTimestamp()});
    });
    if(state.user?.uid===uid){state.clubError='';renderDashboardClub();if(state.view==='club')renderClub();}
  }catch(e){
    if(state.user?.uid===uid){state.clubError='Impossibile aggiornare i progressi del Club: '+errorText(e)+'. Verifica che le nuove regole Firestore siano state pubblicate.';if(state.view==='club')renderClub();}
  }finally{clubPublishInProgress=false;}
}
function queueClubPublish(){
  clearTimeout(clubPublishTimer);
  clubPublishTimer=setTimeout(()=>publishClubProfile(),1100);
}
function subscribeClub(){
  state.unsubs.push(onSnapshot(query(collection(db,'clubProfiles'),limit(150)),{includeMetadataChanges:true},snap=>{
    state.clubProfiles=snap.docs.map(x=>normalizeClubProfile(x.id,x.data()));
    state.clubLoaded=true;state.clubFromCache=snap.metadata.fromCache;
    state.clubError='';renderDashboardClub();if(state.view==='club')renderClub();
  },e=>{state.clubError='Non è stato possibile caricare Il Club: '+errorText(e)+'. Controlla le nuove regole Firestore.';renderDashboardClub();if(state.view==='club')renderClub();}));
  queueClubPublish();
}
async function bootstrapClubMembers(){
  if(!state.admin||!state.user||!state.accessGranted||!navigator.onLine||clubBootstrapBusy)return;
  clubBootstrapBusy=true;
  try{
    // L'amministratore crea soltanto schede VUOTE degli autorizzati. Non legge
    // e non inventa i progressi dei loro album personali.
    for(const member of state.memberships.filter(x=>x.approved===true).slice(0,140)){
      if(member.uid===state.user.uid)continue;
      await runTransaction(db,async tx=>{
        const ref=doc(db,'clubProfiles',member.uid);
        const current=await tx.get(ref);
        if(!current.exists())tx.set(ref,{displayName:String(member.displayName||'Collezionista').slice(0,40),ready:false,percentage:0,unlocked:[],awardProgress:{},catalogSignature:'',earnedAt:{},updatedAt:serverTimestamp()});
      });
    }
  }catch(e){console.warn('Il Club: inizializzazione elenco membri incompleta.',e);}
  finally{clubBootstrapBusy=false;}
}
function renderTrades(){const shared=!!state.profile?.shareTrades;$('#trade-disabled').hidden=shared;$('#trade-enabled').hidden=!shared;if(!shared)return;const select=$('#partner');const selected=select.value;select.innerHTML='<option value="">Seleziona un amico...</option>'+state.peers.map(p=>`<option value="${esc(p.id)}">${esc(p.displayName)}</option>`).join('');select.value=state.peers.some(p=>p.id===selected)?selected:'';if(!state.peers.length)$('#trade-results').innerHTML='<div class="section-card"><p class="muted-copy">Nessun altro amico ha ancora attivato la partecipazione agli scambi.</p></div>';
else if(!select.value)$('#trade-results').innerHTML='<div class="empty-small">Seleziona un amico per confrontare i doppioni.</div>';}
function compareTrades(){const peer=state.peers.find(p=>p.id===$('#partner').value);if(!peer){toast('Seleziona un amico.',true);return;}const match=exchangeMatch(state.items,{...state.counts,...state.pending},peer);const list=items=>items.length?items.map(s=>`<div class="match-item"><div class="match-number">#${String(s.number).padStart(3,'0')}</div><div><strong>${esc(s.title)}</strong><span>${esc(s.team)} · ${esc(s.section)}</span></div></div>`).join(''):'<div class="empty-small">Nessuna corrispondenza per il momento.</div>';$('#trade-results').innerHTML=`<div class="trade-match-header"><div class="avatar peer-avatar">${esc(peer.displayName?.[0]?.toUpperCase()||'F')}</div><div><span class="eyebrow">CONFRONTO CON</span><h2>${esc(peer.displayName)}</h2></div></div><div class="match-grid"><div class="section-card"><div class="section-heading"><div><span class="eyebrow">L’AMICO HA, TU CERCHI</span><h2>Puoi ricevere <span class="small-count">${match.receive.length}</span></h2></div></div><div class="match-list">${list(match.receive)}</div></div><div class="section-card"><div class="section-heading"><div><span class="eyebrow">TU HAI, L’AMICO CERCA</span><h2>Puoi offrire <span class="small-count">${match.offer.length}</span></h2></div></div><div class="match-list">${list(match.offer)}</div></div></div><p class="trade-footnote">I confronti indicano possibili scambi, senza trasferire automaticamente figurine. Accordatevi direttamente.</p>`;}
function renderRequests(){
  const pending=state.accessRequests.filter(x=>x.status==='pending');
  const active=state.memberships.filter(x=>x.approved===true);
  const removed=state.memberships.filter(x=>x.approved!==true);
  $('#requests-count').textContent=pending.length;
  $('#requests-nav-count').textContent=pending.length>0?String(pending.length):'';
  $('#requests-nav-count').hidden=pending.length===0;
  $('#members-count').textContent=active.length;
  const badge=x=>`<span class="request-email">${esc(x.email||'')}</span>`;
  $('#requests-list').innerHTML=pending.length?pending.map(x=>`<div class="request-row"><span class="request-avatar">${esc((x.displayName||'?')[0].toUpperCase())}</span><div class="request-user"><strong>${esc(x.displayName||'Collezionista')}</strong>${badge(x)}<small>Richiesta in attesa di approvazione</small></div><div class="request-actions"><button class="btn btn-primary" data-approval="approve" data-user-id="${esc(x.uid)}">Approva</button><button class="btn btn-outline" data-approval="reject" data-user-id="${esc(x.uid)}">Rifiuta</button></div></div>`).join(''):'<div class="request-empty">Nessuna richiesta in attesa. Le nuove iscrizioni compariranno qui.</div>';
  $('#members-list').innerHTML=active.length?active.map(x=>`<div class="request-row"><span class="request-avatar approved-avatar">${esc((x.displayName||'?')[0].toUpperCase())}</span><div class="request-user"><strong>${esc(x.displayName||'Collezionista')}</strong>${badge(x)}<small>Accesso autorizzato</small></div><div class="request-actions"><button class="btn btn-outline btn-warning" data-approval="revoke" data-user-id="${esc(x.uid)}">Revoca accesso</button></div></div>`).join(''):'<div class="request-empty">Nessun iscritto approvato. Il tuo accesso Admin non viene conteggiato.</div>';
  $('#revoked-list').innerHTML=removed.length?removed.map(x=>`<div class="request-row"><span class="request-avatar">${esc((x.displayName||'?')[0].toUpperCase())}</span><div class="request-user"><strong>${esc(x.displayName||'Collezionista')}</strong>${badge(x)}<small>Accesso non autorizzato</small></div><div class="request-actions"><button class="btn btn-outline" data-approval="restore" data-user-id="${esc(x.uid)}">Riattiva</button></div></div>`).join(''):'';
  $('#revoked-panel').hidden=removed.length===0;
}
function subscribeApprovals(){
  if(!state.admin)return;
  state.unsubs.push(onSnapshot(collection(db,'joinRequests'),snap=>{state.accessRequests=snap.docs.map(x=>({uid:x.id,...x.data()}));renderRequests();},e=>alertApp('Richieste: '+errorText(e))));
  state.unsubs.push(onSnapshot(collection(db,'memberships'),{includeMetadataChanges:true},snap=>{state.memberships=snap.docs.map(x=>({uid:x.id,...x.data()}));renderRequests();if(!snap.metadata.fromCache)bootstrapClubMembers();},e=>alertApp('Autorizzazioni: '+errorText(e))));
}
async function changeApproval(uid,action){
  if(!navigator.onLine)throw new Error('La gestione degli accessi richiede Internet.');
  if(!state.admin)throw new Error('Operazione riservata all’amministratore.');
  const request=state.accessRequests.find(x=>x.uid===uid);
  const member=state.memberships.find(x=>x.uid===uid);
  const membershipRef=doc(db,'memberships',uid);
  const requestRef=doc(db,'joinRequests',uid);
  if((action==='approve'||action==='reject')&&(!request||request.status!=='pending'))throw new Error('Questa richiesta non è più in attesa.');
  if((action==='restore'||action==='revoke')&&!member)throw new Error('Iscritto non trovato.');
  const isApprove=action==='approve'||action==='restore';
  if(action==='revoke'&&!confirm(`Revocare l'accesso di ${member?.displayName||'questo utente'}?`))return;
  if(action==='reject'&&!confirm(`Rifiutare la registrazione di ${request?.displayName||'questo utente'}?`))return;
  const source=request||member;
  const batch=writeBatch(db);
  batch.set(membershipRef,{email:source.email,displayName:source.displayName,approved:isApprove,updatedAt:serverTimestamp()});
  // Il profilo pubblico di un membro revocato non deve restare visibile nel Club.
  if(!isApprove)batch.delete(doc(db,'clubProfiles',uid));
  if(request)batch.update(requestRef,{status:isApprove?'approved':action==='reject'?'rejected':'revoked',updatedAt:serverTimestamp()});
  await batch.commit();
  toast(isApprove?'Utente autorizzato.':'Accesso non autorizzato.');
}
async function ensureJoinRequest(user){
  const ref=doc(db,'joinRequests',user.uid);
  let snap=await getDoc(ref);
  if(!snap.exists()){
    const suggested=(user.displayName||user.email?.split('@')[0]||'Collezionista').trim().slice(0,40);
    const name=suggested.length>=2?suggested:'Amico';
    try{await setDoc(ref,{email:user.email,displayName:name,status:'pending',createdAt:serverTimestamp()});}
    catch(e){ // Un altro avvio potrebbe aver creato la stessa richiesta nel frattempo.
      snap=await getDoc(ref);if(!snap.exists())throw e;
    }
    if(!snap.exists())snap=await getDoc(ref);
  }
  return snap.data()||{status:'pending'};
}
function displayPending(status){
  const rejected=status==='rejected',revoked=status==='revoked';
  $('#pending-eyebrow').textContent=rejected?'RICHIESTA NON APPROVATA':revoked?'ACCESSO REVOCATO':'ISCRIZIONE IN ATTESA';
  $('#pending-title').textContent=rejected?'Richiesta non approvata.':revoked?'Accesso sospeso.':'La tua richiesta è arrivata.';
  $('#pending-description').textContent=rejected?'L’amministratore non ha approvato questa iscrizione. Se pensi che ci sia un errore, contattalo direttamente.':revoked?'Il tuo accesso è stato revocato dall’amministratore. Per chiarimenti, contattalo direttamente.':'Prima di accedere all’album, l’amministratore deve autorizzare il tuo account. Non dovrai richiedere nuovamente l’autorizzazione: quando sarà approvata, potrai entrare sempre con email e password.';
  $('#pending-email').textContent=state.user?.email||'';
  show('pending-screen');
}
async function enterClub(user){
  if(!state.user||state.user.uid!==user.uid||!state.accessGranted)return;
  try{
    const profileRef=getProfileRef();let profileSnap=await getDoc(profileRef);
    if(!state.user||!state.accessGranted)return;
    if(!profileSnap.exists()){
      const suggestion=(user.displayName||user.email?.split('@')[0]||'Collezionista').slice(0,40);
      const name=suggestion.length>=2?suggestion:'Amico';
      await setDoc(profileRef,{displayName:name,email:user.email,shareTrades:false,createdAt:serverTimestamp()});
      profileSnap=await getDoc(profileRef);
    }
    if(!state.user||!state.accessGranted)return;
    state.profile=profileSnap.data();renderChrome();liveData();subscribePeers();subscribeApprovals();subscribeClub();show('app-screen');route();
  }catch(e){show('pending-screen');$('#pending-title').textContent='Accesso momentaneamente non disponibile.';$('#pending-description').textContent='Non è stato possibile caricare il tuo profilo: '+errorText(e);}
}
async function onUser(user){
  resetState();if(!user){show('auth-screen');authMode(registerMode);return;}
  state.user=user;show('boot-screen');
  try{
    try{state.admin=(await getDoc(doc(db,'admins',user.uid))).exists();if(offlineEnabled){try{if(state.admin)localStorage.setItem(ADMIN_KEY,user.uid);else if(localStorage.getItem(ADMIN_KEY)===user.uid)localStorage.removeItem(ADMIN_KEY);}catch(_){/* Il browser potrebbe non consentire localStorage. */}}}
    catch(e){if(navigator.onLine)throw e;try{state.admin=offlineEnabled&&localStorage.getItem(ADMIN_KEY)===user.uid;}catch(_){state.admin=false;} /* Solo stato già verificato online sul dispositivo. */}
    if(!state.user||state.user.uid!==user.uid)return;
    if(state.admin){state.accessGranted=true;await enterClub(user);return;}
    state.memberUnsub=onSnapshot(doc(db,'memberships',user.uid),async snapshot=>{
      if(!state.user||state.user.uid!==user.uid)return;
      const granted=snapshot.data()?.approved===true;
      if(granted){if(!state.accessGranted){state.accessGranted=true;show('boot-screen');await enterClub(user);}return;}
      if(state.accessGranted){state.accessGranted=false;clearListeners();state.profile=null;state.items=[];state.counts={};}
      try{if(!navigator.onLine){show('pending-screen');$('#pending-title').textContent='Accesso offline non disponibile.';$('#pending-description').textContent='Apri l’app online almeno una volta su questo dispositivo per memorizzare la tua autorizzazione.';return;}const request=await ensureJoinRequest(user);if(state.user?.uid===user.uid&&!state.accessGranted)displayPending(request.status);}
      catch(e){show('pending-screen');$('#pending-title').textContent='Richiesta non disponibile.';$('#pending-description').textContent=errorText(e);}
    },e=>{show('pending-screen');$('#pending-title').textContent='Verifica accesso non riuscita.';$('#pending-description').textContent=errorText(e);});
  }catch(e){show('pending-screen');$('#pending-title').textContent='Impossibile verificare il tuo account.';$('#pending-description').textContent=errorText(e);}
}
function liveData(){state.unsubs.push(onSnapshot(getProfileRef(),snap=>{if(!snap.exists())return;const previous=state.profile?.shareTrades;state.profile=snap.data();renderChrome();queueClubPublish();if(previous!==state.profile.shareTrades)subscribePeers();renderTrades();},e=>alertApp('Profilo: '+errorText(e))));
state.unsubs.push(onSnapshot(getAlbumRef(),{includeMetadataChanges:true},snap=>{state.counts=snap.data()?.counts||{};state.loaded.album=true;state.metadata.albumError=false;state.metadata.albumCache=snap.metadata.fromCache;state.metadata.albumPending=snap.metadata.hasPendingWrites;renderEverything();updateSyncUI();queueTradePublish();},e=>{state.metadata.albumError=true;updateSyncUI();alertApp('Album: '+errorText(e));}));
state.unsubs.push(onSnapshot(collection(db,'catalog'),{includeMetadataChanges:true},snap=>{const map=new Map();for(const sec of snap.docs){for(const s of sec.data().items||[])if(!map.has(s.number))map.set(s.number,s);}state.items=[...map.values()].map(correctedCatalogItem).sort((a,b)=>compareStickerNumbers(a.number,b.number));state.loaded.catalog=true;state.metadata.catalogError=false;state.metadata.catalogCache=snap.metadata.fromCache;fillFilterOptions();renderEverything();updateSyncUI();queueTradePublish();},e=>{state.metadata.catalogError=true;updateSyncUI();alertApp('Catalogo: '+errorText(e));}));}
async function importCatalog(items){const sections=sectionsFor(items);const old=await getDocs(collection(db,'catalog'));const keep=new Set(sections.map(s=>s.id));const toDelete=old.docs.map(s=>s.id).filter(id=>!keep.has(id));const operations=[...sections.map(s=>({op:'set',...s})),...toDelete.map(id=>({op:'delete',id}))];
// Firestore ammette max 500 operazioni per batch; usiamo gruppi più piccoli.
for(let i=0;i<operations.length;i+=350){const batch=writeBatch(db);for(const entry of operations.slice(i,i+350)){const r=doc(db,'catalog',entry.id);if(entry.op==='delete')batch.delete(r);else batch.set(r,{team:entry.team,section:entry.section,items:entry.items,updatedAt:serverTimestamp()});}await batch.commit();}
}
function demoItems(){const names=['Atalanta','Bologna','Como','Fiorentina','Genoa','Inter','Juventus','Lazio','Milan','Napoli','Roma','Torino'];const result=[];let n=1;for(const team of names){result.push({number:n++,team,section:'Simboli',title:`Scudetto ${team}`,subtitle:'Figurina dimostrativa · non ufficiale',kind:'Scudetto'});result.push({number:n++,team,section:'Squadra',title:`Foto squadra ${team}`,subtitle:'Figurina dimostrativa · non ufficiale',kind:'Squadra'});for(let i=1;i<=6;i++)result.push({number:n++,team,section:'Giocatori',title:`Giocatore demo ${i.toString().padStart(2,'0')}`,subtitle:'Figurina dimostrativa · non ufficiale',kind:'Giocatore'});}return result;}
async function handleImport(items){if(!state.admin)throw new Error('Non hai permessi di amministratore.');if(!navigator.onLine)throw new Error('L’importazione del catalogo richiede Internet.');if(!confirm(`Aggiornare il catalogo condiviso con ${items.length} figurine? Le figurine non presenti nel file scompariranno dalla lista, ma le quantità personali non verranno cancellate.`))return;$('#import-catalog').disabled=true;$('#load-demo').disabled=true;try{await importCatalog(items);toast(`Importate ${items.length} figurine. Catalogo aggiornato.`);}finally{$('#import-catalog').disabled=false;$('#load-demo').disabled=false;}}
function exportCatalog(){if(!state.items.length){toast('Catalogo vuoto.',true);return;}const fields=['numero','squadra','sezione','titolo','sottotitolo','tipo'];const csv=[fields.join(','),...state.items.map(s=>[s.number,s.team,s.section,s.title,s.subtitle,s.kind].map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(','))].join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='figurine_club_catalogo.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function wireUI(){
  $('#enable-offline').addEventListener('click',()=>{saveDeviceChoice('yes');location.reload();});
  window.addEventListener('hashchange',()=>{if(signedIn()&&state.accessGranted)route();});$('#menu-button').addEventListener('click',()=>document.documentElement.classList.toggle('menu-open'));$('#menu-overlay').addEventListener('click',()=>document.documentElement.classList.remove('menu-open'));document.addEventListener('keydown',e=>{if(e.key==='Escape')document.documentElement.classList.remove('menu-open');});
$('#switch-auth').addEventListener('click',()=>authMode(!registerMode));$('#toggle-password').addEventListener('click',()=>{const input=$('#auth-password');input.type=input.type==='password'?'text':'password';});
$('#auth-form').addEventListener('submit',async e=>{e.preventDefault();authError('');const btn=$('#auth-submit');btn.disabled=true;try{const email=$('#auth-email').value.trim();const password=$('#auth-password').value;if(registerMode){const name=$('#display-name').value.trim();if(name.length<2)throw new Error('Inserisci un nome di almeno due caratteri.');const result=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(result.user,{displayName:name});await ensureJoinRequest(result.user);const req=doc(db,'joinRequests',result.user.uid);const snap=await getDoc(req);if(snap.exists()&&snap.data().status==='pending'&&snap.data().displayName!==name)await updateDoc(req,{displayName:name});}else await signInWithEmailAndPassword(auth,email,password);}catch(err){authError(errorText(err));}finally{btn.disabled=false;}});
$('#forgot-password').addEventListener('click',async()=>{const email=$('#auth-email').value.trim();if(!email){authError('Inserisci l’indirizzo email e poi riprova.');return;}try{await sendPasswordResetEmail(auth,email);toast('Se esiste un account, controlla la tua email per reimpostare la password.');}catch(err){authError(errorText(err));}});
$('#pending-logout').addEventListener('click',async()=>{try{await signOut(auth);}catch(e){toast(errorText(e),true);}});
$('#logout-button').addEventListener('click',async()=>{if((state.metadata.albumPending||Object.keys(state.pending).length)&&!confirm('Hai modifiche non ancora sincronizzate. Se esci potrebbero rimanere in attesa finché non effettuerai nuovamente l’accesso con questo account. Vuoi uscire comunque?'))return;try{await signOut(auth);}catch(e){toast(errorText(e),true);}});
for(const key of ['q','team','section','status']){const id={q:'search',team:'team-filter',section:'section-filter',status:'status-filter'}[key];$(`#${id}`).addEventListener(key==='q'?'input':'change',e=>{state.filters[key]=e.target.value;state.page=1;renderAlbum();});}
$('#teams-grid').addEventListener('click',e=>{const card=e.target.closest('[data-team]');if(!card)return;state.filters.team=card.dataset.team;state.filters.q='';state.filters.status='';state.filters.section='';$('#team-filter').value=state.filters.team;$('#section-filter').value='';$('#status-filter').value='';$('#search').value='';state.page=1;location.hash='#album';if(state.view==='album')renderAlbum();});
$$('[data-quick-filter]').forEach(a=>a.addEventListener('click',()=>{state.filters.status=a.dataset.quickFilter;$('#status-filter').value=state.filters.status;state.page=1;}));for(const link of [$('#hero-missing'),$('.stadium-more-link')]){
  link.addEventListener('click',()=>{
    state.filters={q:'',team:'',section:'',status:''};
    for(const id of ['search','team-filter','section-filter','status-filter'])$(`#${id}`).value='';
    state.page=1;
  });
}
// Foto pubbliche statiche: nessuna scrittura su Firestore e nessuna modifica ai progressi.
$('#sticker-grid').addEventListener('error',e=>{
  if(!e.target.matches('.sticker-photo'))return;
  const visual=e.target.closest('.sticker-visual');
  visual?.classList.remove('has-sticker-image');
  visual?.querySelector('.zoom-sticker')?.remove();
  e.target.remove(); // Resta il simbolo segnaposto se la foto non è raggiungibile.
},true);
$('#sticker-grid').addEventListener('click',e=>{
  const btn=e.target.closest('[data-zoom]');if(!btn)return;
  const card=btn.closest('[data-sticker]');
  const photo=card?.querySelector('.sticker-photo');if(!photo)return;
  const dialog=$('#sticker-image-dialog');
  // Su PC le figurine a 2/4 parti entrano tutte nel popup, senza scorrimento.
  dialog.classList.toggle('sticker-lightbox-composite',card.classList.contains('is-composite'));
  $('#sticker-dialog-image').src=photo.src;
  $('#sticker-dialog-image').alt=photo.alt;
  $('#sticker-dialog-title').textContent=card.querySelector('.sticker-details h3')?.textContent||'';
  dialog.showModal();
});
$('#sticker-image-dialog').addEventListener('click',e=>{
  if(e.target===$('#sticker-image-dialog'))e.target.close();
});
$('#sticker-grid').addEventListener('click',e=>{const button=e.target.closest('[data-mark],[data-step]');if(!button)return;const card=button.closest('[data-sticker]');if(!card)return;const n=card.dataset.sticker,old=qty(n),next=button.hasAttribute('data-mark')?(old>0?0:1):clampQty(old+Number(button.dataset.step));mark(n,next);});
$('#pagination').addEventListener('click',e=>{const btn=e.target.closest('[data-page]');if(!btn||btn.disabled)return;state.page=Number(btn.dataset.page);renderAlbum();$('#view-album').scrollIntoView({behavior:'smooth'});});
$('#club-members').addEventListener('click',e=>{const card=e.target.closest('[data-club-id]');if(!card)return;state.clubSelected=card.dataset.clubId;renderClub();$('#view-club').scrollIntoView({behavior:'instant'});});
  $('#club-back').addEventListener('click',()=>{state.clubSelected=null;renderClub();});
  $('#profile-form').addEventListener('submit',async e=>{e.preventDefault();if(!navigator.onLine){toast('Per aggiornare il profilo è necessaria una connessione Internet.',true);return;}const name=$('#profile-name').value.trim();if(name.length<2||name.length>40){toast('Nome da 2 a 40 caratteri.',true);return;}try{await updateDoc(getProfileRef(),{displayName:name});toast('Nome aggiornato.');queueTradePublish();}catch(err){toast(errorText(err),true);}});
$('#share-trades').addEventListener('change',async e=>{if(!navigator.onLine){e.target.checked=!e.target.checked;toast('Per cambiare la condivisione degli scambi è necessaria una connessione Internet.',true);return;}const on=e.target.checked;e.target.disabled=true;try{await updateDoc(getProfileRef(),{shareTrades:on});state.profile.shareTrades=on;if(on){await publishTradeSheet();toast('Condivisione per gli scambi attivata.');}else{await deleteDoc(doc(db,'tradeSheets',state.user.uid));toast('Riepilogo scambi rimosso.');}subscribePeers();}catch(err){e.target.checked=!on;toast(errorText(err),true);}finally{e.target.disabled=false;}});
$('#compare-button').addEventListener('click',compareTrades);$('#partner').addEventListener('change',()=>{$('#trade-results').innerHTML='';});
$('#load-demo').addEventListener('click',async()=>{try{await handleImport(demoItems());}catch(e){toast(errorText(e),true);}});
$('#import-catalog').addEventListener('click',async()=>{const file=$('#catalog-file').files?.[0];if(!file){toast('Seleziona un file CSV.',true);return;}try{const contents=await file.text();const rows=parseCSV(contents);await handleImport(rows);}catch(e){toast(errorText(e),true);}});
$('#export-catalog').addEventListener('click',exportCatalog);
$('#view-richieste').addEventListener('click',async e=>{
  const btn=e.target.closest('[data-approval]');if(!btn||btn.disabled)return;
  btn.disabled=true;
  try{await changeApproval(btn.dataset.userId,btn.dataset.approval);}catch(err){toast(errorText(err),true);}finally{btn.disabled=false;}
});
}
wireUI();
if(!firebaseConfig.apiKey||firebaseConfig.apiKey.includes('INSERISCI')||firebaseConfig.projectId.includes('INSERISCI'))show('setup-screen');
else {
  // La memoria persistente è attivata solo dopo consenso per questo dispositivo.
  offlineChoice().then(allowed=>{
    try{
      const firebase=initializeApp(firebaseConfig);
      auth=getAuth(firebase);
      offlineEnabled=allowed;
      db=allowed
        ? initializeFirestore(firebase,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})})
        : getFirestore(firebase);
      updateOfflineSetting();updateSyncUI();
      onAuthStateChanged(auth,onUser,e=>{show('auth-screen');authError(errorText(e));});
    }catch(e){show('setup-screen');console.error(e);}
  }).catch(e=>{show('setup-screen');console.error(e);});
}
