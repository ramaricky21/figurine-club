# Figurine Club — Aggiornamento figurine5 (27 ottobre 2026)

## Contenuto consegna
- PDF sorgente: `figurine5.pdf` (14 pagine, 190 immagini distinte).
- 190 figurine lavorate, di cui **155 nuove** e **35 foto esistenti sostituite**.
- Le fotografie complessive collegate passano da **179 a 334**.
- **171 screenshot** ripuliti del riquadro blu e del nome esterno; **19 immagini** già tagliate o fotografie singole conservate.
- Il catalogo conserva **775 ID**: gli ID esistenti restano immutati.
- Tutte le fotografie salvate come WebP in `assets/stickers/<ID>.webp`.
- Aggiornati il manifesto `assets/stickers/associazioni.json` e `assets/sticker-images.mjs`.

## Figurine composte (NON suddivise)
Sono state salvate e mostrate come **un'unica immagine per ciascun ID** le seguenti figurine:
- `574` — Scudetti Inter U23 / Monopoli / Picerno / Potenza
- `571` — Scudetti Cosenza / Crotone / Foggia / Giugliano
- `521` — Divise Juve Stabia / L.R. Vicenza
- `569` — Divise Casarano / Casertana
- `578` — Divise Salernitana / Savoia
- `546` — Divise Pergolettese / Pro Vercelli

Le due figurine con quattro scudetti restano composte da quattro stemmi in un'unica fotografia, senza suddivisione o ricomposizione. Le divise a due parti restano unite. Le altre immagini speciali e tutte le foto precedenti non sostituite rimangono inalterate.

## Nomi
Le fotografie prevalgono sulle abbreviazioni esterne agli screenshot. Le grafie evidenti corrette nel CSV e, per gli utenti dell'app, nella mappa di visualizzazione presente in `assets/app.mjs` sono:
- `73`: Robert Sánchez
- `76`: Jacobo Ramón
- `79`: Álex Valle
- `88`: Jesús Rodríguez
- `182`: Guglielmo Vicario
- `189`: Jhon Lucumí
- `197`: Francisco Conceição
- `199`: Kenan Yildiz
- `255`: Alphadjo Cissé
- `257`: Luka Modrić
- `260`: Ruben Loftus-Cheek
- `267`: Gonçalo Ramos
- `311`: Rasmus Højlund
- `485`: Glenn Peter Stromberg

**Nota Firebase:** per sicurezza NON viene riscritto il catalogo già importato nella raccolta Firestore `catalog`. Le grafie corrette sono visibili nel sito tramite una correzione del solo client; il CSV in questo progetto contiene i titoli corretti. Se si ispezionano i record originali in Firestore, alcuni possono ancora presentare la vecchia grafia. Questo non influisce sulle foto, sugli ID o sui progressi.

## Quale ZIP utilizzare
1. `FIGURINE_CLUB_FIGURINE5_COMPLETO.zip`: copia integrale del progetto aggiornata; conservarla per la prossima volta.
2. `FIGURINE_CLUB_FIGURINE5_SOLO_MODIFICHE_GITHUB.zip`: solo i file nuovi o modificati con i percorsi relativi alla radice del repository; usare per pubblicare su GitHub.

### Pubblicazione GitHub (senza sovrascrivere i dati degli utenti)
1. Estrarre **SOLO_MODIFICHE_GITHUB.zip** sul computer.
2. Copiare **il contenuto** dello ZIP nella radice del repository GitHub esistente, rispettando i percorsi, e sostituire i file omonimi.
3. Effettuare commit e push. GitHub Pages si aggiorna automaticamente se già attivo; caricare uno ZIP come file singolo nel repository NON pubblica l'aggiornamento.
4. Ricaricare il sito e verificare alcune figurine (per esempio i due gruppi di scudetti di Serie C e le divise doppie). Se necessario aggiornare la pagina e la PWA per svuotare le risorse precedenti.
5. Il nome dei file WebP resta lo stesso per i 35 duplicati, ma il numero della cache delle immagini nel Service Worker passa da 2 a 3 e la versione delle risorse JavaScript viene incrementata. Le foto già sostituite verranno riscaricate.

### Firebase
**Nessuna operazione necessaria.** Non importare di nuovo il CSV, non modificare Firestore/Storage/Authentication e non azzerare quantità, account, scambi, Club o Bacheca. I progressi degli utenti restano associati agli stessi ID.

## Test e limiti di verifica
- `node --test tests/*.test.mjs`: **67/67 superati**.
- `python -m unittest discover -s tests -p "test_*.py"`: **5/5 superati**.
- Verificati i 190 file WebP, gli ID, le dimensioni, l'unicità, le associazioni e la presenza dei 775 record.
- Non è stato possibile eseguire prove con accesso autenticato all'app pubblicata da telefono e PC, né scrivere su GitHub/Firebase. Verificare il risultato visivo dopo la pubblicazione.
