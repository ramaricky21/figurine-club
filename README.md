# Figurine Club — GitHub Pages + Firebase Spark

Web app responsive per collezionare figurine con amici, account separati,
progresso, doppioni, ricerca, squadre e confronti per gli scambi.

**Inizia da [LEGGIMI_PRIMA.md](LEGGIMI_PRIMA.md).**

## File essenziali
- `index.html`: interfaccia web per telefono e PC
- `assets/style.css`, `assets/extra.css`: grafica responsive
- `assets/app.mjs`: applicazione web / Firebase Authentication / Firestore
- `assets/core.mjs`: logica e parser CSV testati con Node
- `config.js`: configurazione pubblica del tuo progetto Firebase (da compilare)
- `firestore.rules`: regole di sicurezza OBBLIGATORIE da incollare su Firebase
- `examples/catalogo_esempio.csv`: CSV dimostrativo
- `scripts/sync_catalog.py` e `.github/workflows/sync-catalog.yml`: import automatizzato
  **facoltativo** e disabilitato finché non fornisci fonte e credenziali sicure

Il progetto NON ha un server Python. GitHub Pages non supporta FastAPI/SQLite.
L'app usa SDK JavaScript di Firebase dal CDN ufficiale e non necessita npm
per la pubblicazione. Python è disponibile per l'automazione opzionale.

## Licenza
MIT per il codice. Sono incluse 87 fotografie estratte dai PDF forniti dall'utente; verifica separatamente il diritto di pubblicare e distribuire le immagini delle figurine.

## Fotografie delle figurine

Sono state integrate 87 immagini nel catalogo esistente, senza modificare Firebase.
Vedi [AGGIORNAMENTO_IMMAGINI_GITHUB_FIREBASE.md](AGGIORNAMENTO_IMMAGINI_GITHUB_FIREBASE.md)
per i file modificati e le istruzioni di pubblicazione.
