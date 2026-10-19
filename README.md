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
MIT. Le figurine e i dati ufficiali non sono inclusi; rispetta i diritti d'uso.
