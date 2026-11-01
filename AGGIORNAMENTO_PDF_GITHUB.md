# Figurine Club - Esportazione PDF (1 novembre 2026)

## Funzioni aggiunte

Nella pagina **Panoramica**:
- **Scarica catalogo completo PDF**: tutte le figurine, senza dati personali.

Nella pagina **Il mio album**:
- **Scarica trovate PDF**: una riga per figurina posseduta, senza colonna quantità. Anche con 4 copie la figurina appare **una sola volta**.
- **Scarica doppioni PDF**: un elenco delle figurine di cui si possiedono almeno due copie. La colonna **SCAMBI** indica **copie possedute meno una**. Esempio: 4 copie possedute = 3 copie scambiabili. Non viene stampata la quantità totale.

Tutti i PDF sono A4 multipagina, nell'ordine dell'app (numeri e codici come Kit1, UPG1, C1, K1). Ogni riga riporta numero/codice, nome, squadra, sezione, tipo (giocatore, scudetto, allenatore, carta speciale ecc.) e descrizione del catalogo, comprese le sottocategorie speciali. Quando una figurina non è indicata come speciale nel catalogo, il PDF non la classifica arbitrariamente come speciale. I PDF vengono generati **localmente nel browser**, senza inviare dati personali a servizi di esportazione.

I PDF usano i dati del catalogo e dell'album **effettivamente caricati** per l'utente autenticato. Le modifiche locali ancora da sincronizzare vengono incluse così come mostrate dall'app. Per una situazione confermata da Firestore è preferibile attendere il completamento della sincronizzazione prima del download.

## Quale ZIP utilizzare

1. `FIGURINE_CLUB_COMPLETO_CON_ESPORTAZIONE_PDF.zip`: progetto completo, pronto a sostituire la copia precedente.
2. `FIGURINE_CLUB_SOLO_MODIFICHE_GITHUB_PDF.zip`: **solo file modificati/aggiunti** con i percorsi relativi alla radice del repository. È il modo consigliato per aggiornare un repository GitHub esistente **senza cancellare gli altri file**.

### Aggiornamento GitHub Pages

1. Scarica ed **estrai** lo ZIP con le sole modifiche.
2. Sovrascrivi nel repository GitHub i file con gli stessi percorsi relativi (es. `index.html`, `assets/app.mjs`, `assets/pdf-export.mjs`, `service-worker.js`, ecc.). I file che non sono nello ZIP vanno **lasciati invariati**.
3. Esegui commit e push sul ramo pubblicato tramite GitHub Pages (spesso `main`). Se lavori dalla web UI di GitHub, carica **i file estratti**, non lo ZIP compresso: GitHub non estrae automaticamente uno ZIP caricato.
4. Attendi che GitHub Pages termini la pubblicazione; aggiorna la pagina. Nella PWA installata su telefono potrebbe essere necessario chiudere e riaprire l'app, oppure ricaricarla, per attivare la nuova versione della cache.

### Se usi la riga di comando Git

Dalla cartella del repository clonato, dopo aver estratto lo ZIP delle modifiche **direttamente nella radice** del repository:

```bash
git add index.html service-worker.js assets/app.mjs assets/pdf-export.mjs assets/pdf-export.css README.md AGGIORNAMENTO_PDF_GITHUB.md tests/
git commit -m "Aggiunge esportazioni PDF catalogo, trovate e doppioni"
git push
```

## Firebase / altri servizi

**Non devi cambiare Firebase**: nessuna nuova raccolta Firestore, nessuna modifica alle regole, nessuna nuova credenziale, nessuna importazione del catalogo. Le esportazioni utilizzano i dati già ricevuti dall'app. Non servono file ZIP separati per Firebase, hosting o server esterni.

## File dell'aggiornamento

- `index.html`: tre pulsanti e aggiornamento del numero di versione dell'app.
- `assets/app.mjs`: collegamento pulsanti, lettura dei dati già disponibili, controlli di caricamento e gestione download.
- `assets/pdf-export.mjs` (nuovo): selezione delle figurine e generazione PDF multipagina autonoma, senza dipendenze esterne.
- `assets/pdf-export.css` (nuovo): impaginazione responsive dei pulsanti.
- `service-worker.js`: nuova versione della cache, pre-cache dei due nuovi file per la PWA offline.
- `README.md`, questa guida e i test aggiornati.

## Verifiche effettuate

- Test automatici Node: **78 su 78 superati** (`node --test tests/*.test.mjs`).
- Catalogo reale nel progetto: **775 figurine**, ordinamento app preservato, PDF multipagina verificato con un lettore PDF.
- Test con quantità simulate: 4 copie -> 3 scambiabili; 1 copia -> nessun doppione; figurine trovate senza quantità.
- Verifica statica della disposizione dei pulsanti su schermi desktop e telefono.

Non è stato possibile effettuare un test end-to-end con accesso a un account Firebase reale: occorre controllare anche un download dopo la pubblicazione e l'accesso all'app con un account approvato.
