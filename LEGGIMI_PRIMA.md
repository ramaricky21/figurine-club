# FIGURINE CLUB — Guida semplice per pubblicare GRATIS

Questa è la **versione GitHub Pages + Firebase**. Non caricare lo ZIP precedente
(Python/FastAPI/SQLite): non può funzionare su GitHub Pages.

## Prima di cominciare

Ti servono soltanto un account **GitHub** e un account **Google**.
Non devi comprare un dominio, installare Python su un server né aggiungere una carta di credito.
Si usa **Firebase Spark**, il piano gratuito. Restano applicabili le sue **quote d'uso**.

### 1. Crea un progetto Firebase (gratis)

1. Vai a **https://console.firebase.google.com/** → `Crea progetto`.
2. Dai un nome, ad esempio `figurine-club-miei-amici`, e **non attivare piani a pagamento**.
   Google Analytics non è necessario.
3. In `Authentication` → `Sign-in method` → attiva **Email/Password** (non phone/SMS).
4. In `Firestore Database` → `Crea database`: scegli **Standard** e una regione disponibile.
   Per iniziare scegli **Modalità produzione**, non una regola aperta di test.
5. In `Firestore Database` → `Regole` incolla **tutto** il contenuto del file
   `firestore.rules` e premi **Pubblica**. Questo è essenziale per la privacy.
6. In `Impostazioni progetto` (ingranaggio) → `Le tue app` → `Aggiungi app` →
   icona **Web** `</>` → registra la app (Hosting Firebase non serve).
7. Firebase mostrerà un oggetto `firebaseConfig` con campi come `apiKey`,
   `authDomain`, `projectId`, `appId`, eventualmente `messagingSenderId` e `storageBucket`.
8. Apri il file **`config.js`** sul tuo computer e sostituisci i valori `INSERISCI_...`
   con quelli mostrati da Firebase. NON incollare `firebase-adminsdk` o chiavi private.

**Nota:** i valori `firebaseConfig` per app web sono identificatori pubblici, non password.
La sicurezza dipende dalle regole Firestore e dall'autenticazione.

### 2. Pubblica il sito su GitHub Pages

1. Vai su **https://github.com/new** e crea un repository **Public**, ad esempio
   `figurine-club`. La visibilità pubblica è necessaria per GitHub Pages sul piano Free.
2. Apri il repository → `Add file` → `Upload files`.
3. **Carica il contenuto della cartella estratta** `FIGURINE_CLUB_GITHUB_FIREBASE`,
   non caricare soltanto il file ZIP. `index.html` e `config.js` devono essere
   **nella radice del repository**, accanto alla cartella `assets/`.
   Se l'interfaccia di GitHub non permette di selezionare cartelle, trascina tutte
   le cartelle e i file dalla cartella estratta dentro il riquadro di upload.
4. Premi `Commit changes`.
5. Apri `Settings` → `Pages` → `Build and deployment` →
   `Source: Deploy from a branch` → `Branch: main` → `/(root)` → `Save`.
6. Otterrai un URL del tipo:

       https://TUO_USERNAME.github.io/figurine-club/

   **È QUESTO IL LINK DA INVIARE AGLI AMICI**, non `github.com/...`.
   La pubblicazione può richiedere alcuni minuti.

### 3. Autorizza il dominio in Firebase Authentication

1. Vai su Firebase Console → `Authentication` → `Settings` → `Authorized domains`.
2. Aggiungi **`TUO_USERNAME.github.io`** (solo il dominio, niente `https://` o `/figurine-club`).
3. Per provarlo in locale aggiungi anche `localhost`, se non è già presente.

Se dimentichi questo passaggio, il login può mostrare `auth/unauthorized-domain`.

### 4. Diventa amministratore (solo tu)

1. Apri il sito pubblicato e fai **Registrati**, con email/password.
2. Riapri Firebase Console → `Authentication` → `Users`, trova il TUO utente e
   copia il suo **UID** (identificatore univoco, NON l'email).
3. Apri `Firestore Database` → `Data` → `Start collection` (o `Add collection`).
4. `Collection ID`: **`admins`**. `Document ID`: incolla **esattamente il tuo UID**.
5. Aggiungi un campo a scelta, ad esempio `role` di tipo `string`, valore `admin`, salva.
6. Aggiorna la pagina del sito. Comparirà il menu **Catalogo / Admin**.

**IMPORTANTE:** solo tu, dalla console Firebase, puoi creare questi documenti.
Le regole fornite NON consentono ai normali iscritti di darsi i permessi admin.
Puoi concedere permessi a un altro utente creando un altro documento `admins/UID`.

### 5. Importa le figurine

1. Nel sito, apri **Catalogo / Admin**.
2. Premi `Carica le figurine demo` per avere 96 figurine FAKE (facoltativo), oppure
   scegli un CSV reale e clicca `Importa o aggiorna CSV`.
3. Formato del CSV (UTF-8; virgola o punto e virgola):

       numero,squadra,sezione,titolo,sottotitolo,tipo
       1,Juventus,Simboli,Scudetto Juventus,Esempio,Scudetto
       2,Juventus,Giocatori,Mario Rossi,Esempio,Giocatore

   `numero` deve essere **unico** nell'intero album. Max 4.000 figurine e
   160 caratteri per campo. Esempio in `examples/catalogo_esempio.csv`.
4. I tuoi amici si registrano e ciascuno avrà **il proprio album privato**, ma la
   stessa lista di figurine. Spunte e quantità si sincronizzano tra telefono e PC.
5. Per confrontare i doppioni, entrambi gli amici devono attivare
   `Impostazioni` → `Partecipo agli scambi con gli amici`.

### Come controllare che funzioni veramente

- Accedi come utente A: spunta una figurina.
- Accedi come utente B, anche su un altro dispositivo: la figurina **non** deve
  risultare spuntata nel suo album.
- Torna su A dal telefono e dal PC: deve vedere la stessa spunta.
- Attiva gli scambi su A e B: deve comparire il riepilogo dei numeri condivisi.
- L'utente B non deve vedere il pulsante Admin, né poter scrivere nel catalogo.

### E quando esce il catalogo ufficiale?

Al momento non esiste nel progetto una fonte ufficiale verificata dalla quale
prelevare **automaticamente** tutte le figurine. Non inseriremo giocatori inventati.
Puoi importare il CSV in pochi clic, anche senza programmare.

Se più avanti trovi una **URL HTTPS stabile** che restituisce un CSV pubblico
con diritti di utilizzo, nello ZIP trovi ANCHE il flusso facoltativo
`.github/workflows/sync-catalog.yml` e `scripts/sync_catalog.py`.
Per attivarlo servono:
- GitHub repository → `Settings` → `Secrets and variables` → `Actions` →
  `Variables`: creare **`CATALOG_CSV_URL`** con URL del CSV.
- In `Secrets` creare **`FIREBASE_SERVICE_ACCOUNT`** con il JSON delle credenziali
  dell'account di servizio Firebase (ottenuto in `Impostazioni progetto` →
  `Service accounts` → `Generate new private key`). **Questa chiave è segreta:
  mai inserirla in `config.js`, nei file o nel repository pubblico.**
- Il workflow controlla ogni giorno e aggiorna solo i dati modificati.
  L'automatismo dipende dalla disponibilità del CSV e dalle regole GitHub Actions;
  NON può indovinare o ricostruire un catalogo che non è stato pubblicato.

### Si paga?

Il codice è libero (licenza MIT). GitHub Pages è gratuito per repository pubblici
sul piano GitHub Free. Firebase **Spark** è gratuito senza carta di credito,
ma NON è illimitato. Firestore include tipicamente **50.000 letture e 20.000
scritture al giorno e 1 GiB** di dati; se le quote sono superate, alcune
funzioni possono non essere disponibili fino al ripristino. I limiti e le
condizioni possono cambiare; non è possibile promettere gratis per sempre
senza limiti. **Non attivare il piano Blaze se vuoi evitare addebiti.**

### Problemi frequenti

- Vedo `Collega Firebase`: modifica `config.js` e ricarica il sito.
- Vedo `auth/unauthorized-domain`: aggiungi `USERNAME.github.io` ai domini autorizzati.
- Vedo `permission-denied`: pubblica le regole di `firestore.rules`, verifica
  Firestore e il login. Se sei Admin, controlla il documento `admins/TUO_UID`.
- Non vedo il sito: controlla `Settings → Pages`; `index.html` deve essere in `/`.
- Mi apre solo la repository: stai condividendo il link **GitHub**, non quello
  **github.io** generato da Pages.
- Modifiche mancanti su mobile: usa lo stesso account, con connessione internet.
- Registrazione: ogni persona crea un account usando **Email/Password**.

### Avvio locale (facoltativo)

Se hai Python, apri un terminale nella cartella del progetto ed esegui:

    python -m http.server 8000

Poi visita `http://localhost:8000` (autorizza `localhost` in Firebase Auth).
Non aprire semplicemente `index.html` con doppio clic: i moduli JS hanno
bisogno di essere caricati tramite HTTP o HTTPS.

### Test del codice (facoltativo)

Con Node.js installato:

    node --test tests/*.test.mjs

### Privacy e backup

Le regole mantengono album e profili personali leggibili solo dal proprietario.
Le schede scambi sono pubblicate ai soli utenti autenticati che scelgono di
partecipare. Il codice e `config.js` sono pubblici su GitHub Pages:
**NON inserirvi password o dati personali.**
Fai periodicamente un backup dei CSV del catalogo; il piano Firestore gratuito
non include il servizio gestito di backup e non sostituisce la gestione dei backup.

### Fonti ufficiali
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- Firebase prezzi: https://firebase.google.com/pricing
- Firestore regole: https://firebase.google.com/docs/firestore/security/get-started
- Firebase SDK web: https://firebase.google.com/docs/web/setup
