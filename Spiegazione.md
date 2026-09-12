# Spiegazione Completa — Progetto RehabTrack

**Manuale di studio per la discussione d'esame di Programmazione Web e Mobile**  
Prof. Luca Cruciata — A.A. 2025/2026  
Autori: Iacono, Virone

---

# 1. PANORAMICA DEL SISTEMA E ARCHITETTURA SOFTWARE

## 1.1 Dominio Applicativo

RehabTrack è una piattaforma di **tele-riabilitazione** che mette in comunicazione due attori principali:

- **Fisioterapista**: crea schede riabilitative personalizzate composte da esercizi, le assegna a ciascun paziente, monitora l'aderenza terapeutica e il livello di dolore riportato, visualizza le foto posturali inviate dai pazienti.
- **Paziente**: visualizza la scheda del giorno, esegue la sessione di allenamento guidata da un timer integrato (countdown per esercizi a tempo, conteggio serie per esercizi a ripetizioni), registra al termine il feedback (livello dolore 1-10, note testuali, foto opzionale), e consulta il proprio storico nel Diario Posturale.

L'applicazione copre dunque l'intero ciclo di vita del percorso riabilitativo domiciliare: **prescrizione → esecuzione → feedback → monitoraggio**.

## 1.2 Architettura Three-Tier

Il progetto implementa una classica architettura a tre livelli (Three-Tier), dove ciascun livello è fisicamente e logicamente separato:

```
┌─────────────────────────────────────────────┐
│  PRESENTATION TIER  (Frontend)              │
│  Angular 22 + Ionic 9 + Capacitor 8         │
│  Porta: 8100 (dev) / APK nativo             │
│  Comunica col backend via HTTP/JSON          │
├─────────────────────────────────────────────┤
│  APPLICATION / LOGIC TIER  (Backend)        │
│  Node.js + Express 5                        │
│  Porta: 3000                                │
│  REST API stateless, logica di business,    │
│  autenticazione JWT, validazione, RBAC      │
├─────────────────────────────────────────────┤
│  DATA TIER  (Database)                      │
│  SQLite (file rehabtrack.db)                │
│  Schema relazionale: users, cards,          │
│  exercises, session_logs                    │
└─────────────────────────────────────────────┘
```

**Disaccoppiamento reale, non fittizio:**
- Il frontend non accede **mai** direttamente al database: ogni operazione passa attraverso una chiamata HTTP REST al backend sulla porta 3000.
- Il backend è un processo Node.js indipendente, avviabile separatamente (`npm start` in `/backend`).
- Il frontend è un'applicazione Angular compilata separatamente (`ng serve` in `/frontend`), servita su una porta diversa (tipicamente 8100).
- Il database SQLite è un file fisico (`backend/db/rehabtrack.db`), accessibile unicamente dal processo backend tramite il modulo `sqlite3`.

## 1.3 Stack Tecnologico e Motivazione delle Scelte

### Backend

| Tecnologia | Versione | Motivazione |
|---|---|---|
| **Node.js** | LTS | Runtime JavaScript server-side non bloccante, ideale per API I/O-intensive; stessa lingua del frontend riduce il context-switch. |
| **Express 5** | 5.2.1 | Framework web minimale e maturo. La versione 5 gestisce automaticamente le Promise rigettate nei route handler (non serve `try/catch` esplicito per ogni controller asincrono). |
| **sqlite3** | 6.0.1 | Binding Node.js per SQLite. Database embedded, zero configurazione, perfetto per prototipi e applicazioni single-server. Non richiede un servizio database separato. |
| **bcrypt** | 6.0.0 | Hashing adattativo delle password con salt automatico. Algoritmo deliberatamente lento (10 salt rounds) per resistere ad attacchi brute-force. |
| **jsonwebtoken** | 9.0.3 | Creazione e verifica di token JWT (JSON Web Token) per autenticazione stateless. |
| **cors** | 2.8.6 | Middleware Express per la gestione dei Cross-Origin Resource Sharing, necessario perché frontend e backend girano su porte diverse in sviluppo. |
| **multer** | 2.3.0 | Middleware per l'upload di file multipart/form-data; usato per le foto allegate al diario di sessione. |

### Frontend

| Tecnologia | Versione | Motivazione |
|---|---|---|
| **Angular** | 22.0.1 | Framework component-based con DI, routing, reactive forms, e HTTP client integrati. Standalone components (senza NgModule). |
| **Ionic** | 9.x | Libreria di componenti UI mobile-first (tab bar, modal, toast, alert, spinner, ecc.) con look nativo cross-platform. |
| **Capacitor** | 8.5.1 | Runtime nativo che consente l'accesso a API del dispositivo (Camera, Geolocation) e il packaging in APK Android. |
| **Leaflet** | 1.9.4 | Libreria open-source per mappe interattive, usata nella Tab3 (Mappa) per mostrare il centro di riabilitazione e la posizione dell'utente. |
| **RxJS** | 7.8 | Libreria per la programmazione reattiva, usata per gli Observable delle chiamate HTTP e le pipe di trasformazione dati. |
| **TypeScript** | 6.0 | Superset tipizzato di JavaScript, garantisce sicurezza a compile-time e autocompletamento IDE. |

### Perché SQLite e non PostgreSQL/MySQL?
SQLite è un database **embedded** (serverless): il file `.db` vive accanto al backend, non necessita di installazione di un DBMS separato. Questo semplifica drasticamente il setup per lo sviluppo e la demo di un progetto accademico, mantenendo comunque supporto completo a SQL, transazioni ACID, chiavi esterne e vincoli di integrità.

### Perché JWT e non sessioni server-side?
Il JWT è **stateless**: il server non deve memorizzare sessioni in memoria o nel database. Ogni richiesta contiene il token nell'header `Authorization`, il backend lo verifica con la chiave segreta e ne estrae i dati dell'utente. Questo rende l'architettura più scalabile e coerente con il paradigma REST.

## 1.4 Modello di Sicurezza

### Autenticazione
- Le password vengono hashate con **bcrypt** (10 salt rounds) prima dell'inserimento nel database. La password in chiaro non viene mai memorizzata.
- Al login, il backend confronta l'hash salvato con la password fornita usando `bcrypt.compare()`. Se corrisponde, genera un **JWT** contenente `{ id, email, role }` con scadenza 7 giorni, firmato con una chiave segreta (`JWT_SECRET`).
- Il token viene restituito al frontend, che lo salva in `localStorage`.
- Il messaggio di errore in caso di login fallito è volutamente generico (`"Credenziali non valide"`) per non rivelare se l'email è registrata o meno (prevenzione user enumeration).

### Autorizzazione (RBAC — Role-Based Access Control)
Sono implementati due middleware concatenabili:

1. **`verifyToken`**: estrae il token dall'header `Authorization: Bearer <token>`, lo decodifica con `jwt.verify()` e inietta `req.user = { id, email, role }`. Se il token è assente, scaduto o non valido, restituisce HTTP 401.
2. **`requireRole(...roles)`**: factory function che restituisce un middleware che verifica se `req.user.role` è incluso nei ruoli specificati. Se non lo è, restituisce HTTP 403.

Le rotte del fisioterapista (`/api/therapist/*`) richiedono entrambi i middleware: `verifyToken` + `requireRole('fisioterapista')`. Le rotte del paziente (`/api/patient/*`) richiedono `verifyToken` + `requireRole('paziente')`.

### Protezione degli endpoint
Ogni controller verifica la proprietà delle risorse. Esempi:
- `createCard` verifica che il `patient_id` fornito appartenga effettivamente al terapista autenticato (`patient.therapist_id !== req.user.id`).
- `saveSessionLog` verifica che la `card_id` fornita appartenga al paziente autenticato.
- `deleteCard` verifica che la scheda sia stata creata dal terapista autenticato.

### Prevenzione SQL Injection
Tutte le query SQL sono **parametrizzate** (prepared statements): i valori utente vengono passati come array di parametri `?`, mai concatenati nella stringa SQL. Questo è il meccanismo standard e più efficace per prevenire iniezioni SQL.

### CORS
Il middleware `cors()` è configurato in modalità aperta (tutte le origini) poiché frontend e backend girano su porte diverse in sviluppo. In produzione, andrebbe ristretto alle sole origini autorizzate.

### Interceptor HTTP lato frontend
L'`httpIntInterceptor` intercetta ogni risposta HTTP. In caso di HTTP 401, rimuove il token da `localStorage`, mostra un toast "Sessione scaduta" e redirige alla pagina di login. Questo garantisce un logout automatico graceful quando il token scade.

---

# 2. SCHEMA E MODELLO DATI (DATABASE)

Lo schema viene creato in `backend/db/db.js` usando `CREATE TABLE IF NOT EXISTS`, dunque è idempotente: il database si auto-inizializza al primo avvio.

## 2.1 Tabella `users`

```sql
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,
  password      TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK(role IN ('fisioterapista', 'paziente')),
  first_name    TEXT    NOT NULL,
  last_name     TEXT    NOT NULL,
  pathology     TEXT    DEFAULT NULL,
  clinical_notes TEXT   DEFAULT '',
  therapist_id  INTEGER DEFAULT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (therapist_id) REFERENCES users(id)
)
```

| Colonna | Tipo | Vincoli | Descrizione |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | Identificativo univoco auto-incrementale |
| `email` | TEXT | NOT NULL, UNIQUE | Indirizzo email, usato come username per il login |
| `password` | TEXT | NOT NULL | Hash bcrypt della password (mai in chiaro) |
| `role` | TEXT | NOT NULL, CHECK | Ruolo: `'fisioterapista'` o `'paziente'` |
| `first_name` | TEXT | NOT NULL | Nome |
| `last_name` | TEXT | NOT NULL | Cognome |
| `pathology` | TEXT | DEFAULT NULL | Patologia del paziente (NULL per i fisioterapisti) |
| `clinical_notes` | TEXT | DEFAULT '' | Note cliniche aggiuntive, editabili dal fisioterapista |
| `therapist_id` | INTEGER | FK → users(id), DEFAULT NULL | Self-referencing: punta al terapista che segue il paziente. NULL per i fisioterapisti e per i pazienti non ancora assegnati |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Data/ora di registrazione |

**Relazioni:**
- **Self-referencing 1:N**: Un fisioterapista (users.id) ha molti pazienti (users.therapist_id). La FK `therapist_id → users(id)` realizza questa relazione sulla stessa tabella.

## 2.2 Tabella `cards` (Schede Riabilitative)

```sql
CREATE TABLE IF NOT EXISTS cards (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id    INTEGER NOT NULL,
  therapist_id  INTEGER NOT NULL,
  title         TEXT    NOT NULL,
  start_date    DATE    NOT NULL DEFAULT (CURRENT_DATE),
  end_date      DATE    DEFAULT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id)   REFERENCES users(id),
  FOREIGN KEY (therapist_id) REFERENCES users(id)
)
```

| Colonna | Tipo | Vincoli | Descrizione |
|---|---|---|---|
| `id` | INTEGER | PK, AUTOINCREMENT | ID univoco della scheda |
| `patient_id` | INTEGER | NOT NULL, FK → users(id) | Paziente a cui è assegnata |
| `therapist_id` | INTEGER | NOT NULL, FK → users(id) | Fisioterapista che l'ha creata |
| `title` | TEXT | NOT NULL | Titolo descrittivo (es. "Protocollo Lombalgia - Settimana 1") |
| `start_date` | DATE | DEFAULT CURRENT_DATE | Data di inizio validità |
| `end_date` | DATE | DEFAULT NULL | Data di fine validità (NULL = valida indefinitamente) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Data di creazione |

**Relazioni:**
- **1:N** `users (fisioterapista)` → `cards`: un terapista crea molte schede.
- **1:N** `users (paziente)` → `cards`: un paziente ha molte schede assegnate.

## 2.3 Tabella `exercises` (Esercizi)

```sql
CREATE TABLE IF NOT EXISTS exercises (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id           INTEGER NOT NULL,
  name              TEXT    NOT NULL,
  sets              INTEGER NOT NULL,
  reps_or_duration  TEXT    NOT NULL,
  rest_seconds      INTEGER NOT NULL,
  posture_notes     TEXT    DEFAULT '',
  order_index       INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (card_id) REFERENCES cards(id)
)
```

| Colonna | Tipo | Vincoli | Descrizione |
|---|---|---|---|
| `id` | INTEGER | PK | ID univoco dell'esercizio |
| `card_id` | INTEGER | NOT NULL, FK → cards(id) | Scheda di appartenenza |
| `name` | TEXT | NOT NULL | Nome dell'esercizio (es. "Ponte gluteo") |
| `sets` | INTEGER | NOT NULL | Numero di serie |
| `reps_or_duration` | TEXT | NOT NULL | Ripetizioni o durata (es. "12" oppure "30 secondi") |
| `rest_seconds` | INTEGER | NOT NULL | Secondi di recupero tra le serie |
| `posture_notes` | TEXT | DEFAULT '' | Note posturali per l'esecuzione corretta |
| `order_index` | INTEGER | NOT NULL, DEFAULT 0 | Ordine di esecuzione all'interno della scheda |

**Relazioni:**
- **1:N** `cards` → `exercises`: una scheda contiene molti esercizi.

## 2.4 Tabella `session_logs` (Log di Sessione)

```sql
CREATE TABLE IF NOT EXISTS session_logs (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id            INTEGER NOT NULL,
  patient_id         INTEGER NOT NULL,
  pain_level         INTEGER CHECK(pain_level BETWEEN 1 AND 10),
  patient_notes      TEXT    DEFAULT '',
  duration_seconds   INTEGER DEFAULT 0,
  photo_base64       TEXT    DEFAULT NULL,
  completed_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id)    REFERENCES cards(id),
  FOREIGN KEY (patient_id) REFERENCES users(id)
)
```

| Colonna | Tipo | Vincoli | Descrizione |
|---|---|---|---|
| `id` | INTEGER | PK | ID univoco del log |
| `card_id` | INTEGER | NOT NULL, FK → cards(id) | Scheda eseguita |
| `patient_id` | INTEGER | NOT NULL, FK → users(id) | Paziente che ha eseguito |
| `pain_level` | INTEGER | CHECK(1-10) | Livello di dolore percepito (scala 1-10) |
| `patient_notes` | TEXT | DEFAULT '' | Note testuali del paziente |
| `duration_seconds` | INTEGER | DEFAULT 0 | Durata della sessione in secondi (registrata dal timer) |
| `photo_base64` | TEXT | DEFAULT NULL | Percorso relativo alla foto allegata (es. `/uploads/diaries/nome.jpg`). Il nome della colonna è storico; contiene un URL, non base64 |
| `completed_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp di completamento |

**Relazioni:**
- **1:N** `cards` → `session_logs`: una scheda può avere molti log di sessione.
- **1:N** `users (paziente)` → `session_logs`: un paziente genera molti log.

## 2.5 Diagramma ER sintetico

```
users ←──self-ref──┐
  │                │ therapist_id
  │ 1:N            │
  ├──── cards ─── 1:N ── exercises
  │       │
  │       └──── 1:N ── session_logs
  │                        │
  └────── 1:N ─────────────┘
           (patient_id)
```

## 2.6 Seed Iniziale (`putData()`)

Il file `db.js` contiene una funzione `putData()` che viene eseguita **solo se la tabella `users` è vuota** (controllo `SELECT COUNT(*) AS cnt FROM users`). Inserisce:

1. Un fisioterapista demo: `dott.rossi@rehabtrack.it` / `terapista123`
2. Un paziente associato: `luigi.bianchi@email.it` / `paziente123` (con patologia "Lombalgia cronica")
3. Una scheda "Protocollo Lombalgia - Settimana 1" con 4 esercizi
4. Un session_log di esempio con dolore 4/10

Successivamente, due funzioni (`ensureMarcoVerdiExists`, `ensureAnnaNeriExists`) inseriscono due pazienti aggiuntivi **non associati** a nessun terapista, utili per testare la funzionalità di assegnazione.

Le password sono tutte hashate con `bcrypt.hash(password, 10)` — nel database non appare mai la password in chiaro.

## 2.7 Migrazioni inline

Il file contiene anche migrazioni leggere via `PRAGMA table_info()`: controlla se colonne come `clinical_notes` o `start_date` esistono e, se assenti, le aggiunge con `ALTER TABLE`. Questo permette di aggiornare lo schema senza cancellare il database esistente.

---

# 3. ANALISI TECNICA DETTAGLIATA FILE PER FILE

## 3.1 BACKEND

---

### 3.1.1 `backend/package.json`

**Ruolo:** Manifesto del progetto backend — dichiara nome, versione, script npm, dipendenze e il tipo di modulo.

**Dettagli chiave:**
- `"type": "commonjs"` — usa `require()`/`module.exports` (non ESM `import`/`export`).
- `"main": "server.js"` — entry point dell'applicazione.
- Script `"start": "node server.js"` — avvia il server in produzione.
- Script `"dev": "node --watch server.js"` — avvia con hot-reload nativo di Node.js (flag `--watch`), riavvia automaticamente a ogni modifica del sorgente.
- Dipendenze: `express`, `cors`, `sqlite3`, `bcrypt`, `jsonwebtoken`, `multer`.

---

### 3.1.2 `backend/server.js`

**Ruolo:** Entry point del backend. Configura l'app Express, monta middleware globali, registra i gruppi di rotte e avvia il server HTTP.

**Dipendenze importate:**
- `express` — framework web
- `cors` — middleware CORS
- `./routes/authRoutes`, `./routes/therapistRoutes`, `./routes/patientRoutes` — router modulari
- `path` — per risolvere percorsi dei file statici
- `./db/db` — importato per effetto collaterale: il `require` attiva la creazione dello schema e il seed

**Flusso dettagliato:**

1. **`app.use(cors())`** — abilita CORS per tutte le origini. Necessario perché il frontend Angular gira su porta 8100 (o da APK Capacitor).
2. **`app.use(express.json())`** — middleware di parsing: converte il body delle richieste JSON in `req.body`.
3. **`app.use('/uploads', express.static(...))`** — serve i file caricati (foto del diario) come risorse statiche. URL del tipo `http://localhost:3000/uploads/diaries/1234.jpg`.
4. **Mounting delle rotte:**
   - `/api/auth` → `authRoutes` (login, register, profile)
   - `/api/therapist` → `therapistRoutes` (gestione pazienti, schede, log)
   - `/api/patient` → `patientRoutes` (scheda del giorno, session-logs)
5. **Error handler globale**: `app.use((err, req, res, next) => ...)` — Express 5 inoltra qui tutte le Promise rigettate non gestite. Logga l'errore in console e restituisce JSON con il codice di stato appropriato.
6. **`require('./db/db')`** — trigger dello schema e del seed.
7. **`app.listen(PORT)`** — avvia il server sulla porta 3000 (o variabile d'ambiente `PORT`).
8. **`server.on('error')`** — gestisce errori di avvio (es. porta già occupata con codice `EADDRINUSE`).

---

### 3.1.3 `backend/db/db.js`

**Ruolo:** Gestione della connessione al database SQLite, creazione dello schema relazionale (DDL), migrazioni inline e seed dei dati iniziali.

**Dipendenze:** `sqlite3` (con `.verbose()` per debug), `bcrypt`, `path`.

**Flusso dettagliato:**

1. **Apertura connessione:** `new sqlite3.Database(DB_PATH)` apre (o crea) il file `rehabtrack.db`.
2. **`PRAGMA foreign_keys = ON`** — **fondamentale**: SQLite disabilita le chiavi esterne per default. Senza questa riga, le FK non sarebbero mai applicate.
3. **`db.serialize(() => {...})`** — garantisce che le query DDL (`CREATE TABLE`) siano eseguite in ordine sequenziale, non in parallelo. Importante perché la tabella `exercises` referenzia `cards`, che a sua volta referenzia `users`.
4. **Creazione 4 tabelle** con `CREATE TABLE IF NOT EXISTS`: `users`, `cards`, `exercises`, `session_logs`.
5. **Migrazioni inline** via `PRAGMA table_info()`: controlla l'esistenza di colonne aggiunte successivamente allo schema iniziale e le aggiunge con `ALTER TABLE` se mancano.
6. **`putData()`** — funzione asincrona di seed. Controlla se `users` è vuota, e se sì inserisce i dati demo. Usa `new Promise()` per wrappare le callback asincrone di `sqlite3` in Promise awaitable.
7. **`ensureMarcoVerdiExists()` / `ensureAnnaNeriExists()`** — inseriscono pazienti extra non associati, utili per testare il flusso di assegnazione.
8. **`module.exports = db`** — esporta l'istanza della connessione, usata da tutti i model.

**Nota tecnica:** `sqlite3` usa un'API a callback. Tutte le operazioni async nel seed sono wrappate in `new Promise((resolve, reject) => db.run(..., function(err) {...}))`. È usata la keyword `function` (non arrow) per accedere a `this.lastID` (l'ID dell'ultimo record inserito, disponibile solo nel contesto `function` di `db.run`).

---

### 3.1.4 `backend/middleware/authMiddleware.js`

**Ruolo:** Middleware di autenticazione e autorizzazione. Espone due funzioni: `verifyToken` e `requireRole`.

**`verifyToken(req, res, next)`:**
1. Estrae l'header `Authorization` dalla richiesta.
2. Verifica che inizi con `"Bearer "`. Se no → 401.
3. Estrae il token con `header.slice(7)` (7 = lunghezza di `"Bearer "`).
4. Decodifica e verifica il token con `jwt.verify(token, JWT_SECRET)`.
5. Se valido, inietta il payload decodificato in `req.user` (contiene `{ id, email, role }`).
6. Se non valido o scaduto, il `catch` restituisce 401.

**`requireRole(...roles)`:**
- Factory function che accetta uno o più ruoli come argomenti (rest parameters).
- Restituisce un middleware che controlla se `req.user.role` è tra i ruoli consentiti.
- Se il ruolo non è autorizzato → 403 (Forbidden).
- Deve essere montato **dopo** `verifyToken` (dipende da `req.user`).

**La chiave segreta `JWT_SECRET`** è hardcoded come fallback per lo sviluppo (`'rehabtrack_dev_secret'`) ma può essere sovrascritta con una variabile d'ambiente in produzione.

---

### 3.1.5 `backend/models/userModel.js`

**Ruolo:** Modello (Data Access Layer) per la tabella `users`. Incapsula tutte le query SQL relative agli utenti in un oggetto `User` con metodi Promise-based.

**Metodi:**

| Metodo | SQL | Descrizione |
|---|---|---|
| `create(data)` | `INSERT INTO users ... VALUES (?, ?, ?, ?, ?, ?, ?)` | Inserisce un nuovo utente. Restituisce l'oggetto con `this.lastID`. |
| `findByEmail(email)` | `SELECT * FROM users WHERE email = ?` | Cerca utente per email. Restituisce il record completo **inclusa la password** (necessario per bcrypt.compare al login). |
| `findById(id)` | `SELECT id, email, role, ... FROM users WHERE id = ?` | Cerca utente per ID. **Esclude il campo `password`** dalla SELECT per sicurezza. |
| `findPatientsByTherapist(therapistId)` | `SELECT ... WHERE role = 'paziente' AND therapist_id = ?` | Recupera tutti i pazienti di un terapista, ordinati per cognome e nome. |
| `findAllPatients(therapistId?)` | Conditional | Se `therapistId` è fornito, delega a `findPatientsByTherapist`. Altrimenti, recupera tutti i pazienti nel database. |
| `updatePatientNotes(id, data)` | `UPDATE users SET pathology = ?, clinical_notes = ? WHERE id = ?` | Aggiorna patologia e note cliniche. |
| `updateTherapist(id, therapistId)` | `UPDATE users SET therapist_id = ? WHERE id = ?` | Associa o dissocia un terapista (imposta il `therapist_id`). |

**Pattern utilizzato:** Tutte le query sono wrappate in `new Promise()` con la callback di `sqlite3`. L'uso di `function` (non arrow) nelle callback di `db.run` è necessario per accedere a `this.lastID` e `this.changes`.

---

### 3.1.6 `backend/models/cardModel.js`

**Ruolo:** Modello per le tabelle `cards` ed `exercises`. Esporta due oggetti: `Card` ed `Exercise`.

**Card — Metodi:**

| Metodo | Descrizione |
|---|---|
| `create({patient_id, therapist_id, title})` | Inserisce una nuova scheda. |
| `findByPatient(patientId)` | Recupera tutte le schede di un paziente, ordinate dalla più recente. |
| `findTodayCard(patientId)` | Trova la scheda valida oggi: confronta `date('now','localtime')` con `start_date` e `end_date`. Usa `LIMIT 1` per restituire solo l'ultima. |
| `findById(id)` | Recupera una scheda per ID. |
| `update(id, {title, start_date, end_date})` | Aggiorna titolo e date di validità. |

**Exercise — Metodi:**

| Metodo | Descrizione |
|---|---|
| `createBulk(cardId, exercises)` | Inserisce N esercizi in una **transazione SQLite** (`BEGIN TRANSACTION` → N INSERT → `COMMIT`). Se un insert fallisce, esegue `ROLLBACK`. Questo garantisce atomicità: o tutti gli esercizi vengono inseriti, o nessuno. |
| `findByCard(cardId)` | Recupera gli esercizi ordinati per `order_index ASC`. |
| `deleteByCard(cardId)` | Elimina tutti gli esercizi di una scheda. Usato durante l'aggiornamento (delete-and-reinsert). |

**La transazione esplicita in `createBulk`** è un dettaglio architetturale rilevante: senza di essa, un fallimento a metà degli inserimenti lascerebbe la scheda in uno stato inconsistente (con solo parte degli esercizi). Il contatore `pending` tiene traccia degli inserimenti completati e committa solo quando tutti sono andati a buon fine.

---

### 3.1.7 `backend/models/userModel.check.js` e `backend/models/cardModel.check.js`

**Ruolo:** Script di self-check (auto-verifica) per i modelli. Usano il modulo nativo `assert` di Node.js per verificare che i metodi del modello funzionino correttamente con i dati seed.

**Modalità di esecuzione:** `node backend/models/userModel.check.js` — eseguibili standalone come smoke test.

**Cosa verificano:**
- `userModel.check.js`: `findByEmail`, `findById` (verifica che la password non sia esposta), `create`, `findPatientsByTherapist`, `findAllPatients`. Pulisce i dati di test al termine.
- `cardModel.check.js`: `findByPatient`, `findById`, `findByCard` (verifica ordinamento), `create` + `createBulk` (transazione), `findTodayCard`. Pulisce i dati al termine.

Questi file sono il minimo runnable check previsto dalle regole del progetto.

---

### 3.1.8 `backend/controllers/authControllers.js`

**Ruolo:** Controller per autenticazione e registrazione. Gestisce 3 endpoint.

**Costanti:** `JWT_SECRET`, `TOKEN_EXPIRY = '7d'`, `SALT_ROUNDS = 10`.

**`register(req, res)` — POST `/api/auth/register`:**
1. Estrae `email, password, role, first_name, last_name, pathology, therapist_id` dal body.
2. Valida i campi obbligatori → 400 se mancanti.
3. Valida che il ruolo sia `'fisioterapista'` o `'paziente'` → 400 se invalido.
4. Controlla unicità email con `User.findByEmail()` → 409 (Conflict) se già registrata.
5. Hash della password con `bcrypt.hash(password, SALT_ROUNDS)`.
6. Crea l'utente con `User.create()`.
7. Restituisce 201 con i dati dell'utente (senza password).

**`login(req, res)` — POST `/api/auth/login`:**
1. Estrae `email, password` dal body → 400 se mancanti.
2. Cerca l'utente con `User.findByEmail()` → 401 se non trovato (messaggio generico).
3. Confronta la password con `bcrypt.compare()` → 401 se non corrisponde.
4. Genera il JWT con `jwt.sign({ id, email, role }, JWT_SECRET, { expiresIn: '7d' })`.
5. Restituisce `{ token, role, userId }`.

**`getProfile(req, res)` — GET `/api/auth/profile`:**
1. Usa `req.user.id` (iniettato dal middleware `verifyToken`).
2. Cerca l'utente con `User.findById()` → 404 se non trovato.
3. Restituisce l'oggetto utente (senza password, perché `findById` la esclude dalla SELECT).

---

### 3.1.9 `backend/controllers/therapistControllers.js`

**Ruolo:** Controller per tutte le operazioni del fisioterapista. È il controller più corposo (~285 righe).

**Funzioni esportate:**

**`getPatients(req, res)` — GET `/api/therapist/patients`:**
- Chiama `User.findPatientsByTherapist(req.user.id)` e restituisce l'array.

**`createPatient(req, res)` — POST `/api/therapist/patients`:**
- Crea un nuovo paziente con `role = 'paziente'` e `therapist_id = req.user.id` (automaticamente associato al terapista autenticato).
- Hasha la password con bcrypt prima dell'inserimento.

**`createCard(req, res)` — POST `/api/therapist/cards`:**
1. Estrae `patient_id, title, exercises` dal body.
2. Valida che exercises sia un array non vuoto.
3. Verifica che il paziente appartenga al terapista autenticato.
4. Crea la scheda con `Card.create()`.
5. Inserisce gli esercizi in transazione con `Exercise.createBulk()`.
6. Restituisce 201 con `{ card, exerciseIds }`.

**`updateCard(req, res)` — PUT `/api/therapist/cards/:id`:**
1. Verifica proprietà della scheda.
2. Aggiorna titolo e date con `Card.update()`.
3. Se `exercises` è fornito nel body, esegue un **delete-and-reinsert**: `Exercise.deleteByCard()` + `Exercise.createBulk()`.
4. Restituisce la scheda e gli esercizi aggiornati.

**`deleteCard(req, res)` — DELETE `/api/therapist/cards/:id`:**
1. Verifica proprietà.
2. Elimina in ordine: `session_logs` (per FK NOT NULL su card_id) → `exercises` → `cards`.
3. L'ordine di eliminazione è necessario per rispettare i vincoli di integrità referenziale.

**`getPatientLogs(req, res)` — GET `/api/therapist/patients/:id/logs`:**
- JOIN tra `session_logs` e `cards` per includere il `card_title`.
- Verifica che il paziente appartenga al terapista.

**`getPatientCards(req, res)` — GET `/api/therapist/patients/:id/cards`:**
- JOIN con `exercises` per il `COUNT(e.id) AS exercise_count`.
- GROUP BY `c.id` per aggregare il conteggio per scheda.

**`getCardDetails(req, res)` — GET `/api/therapist/cards/:id`:**
- Restituisce `{ card, exercises }` per una scheda specifica.

**`updatePatientNotes(req, res)` — PUT `/api/therapist/patients/:id/notes`:**
- Aggiorna `pathology` e `clinical_notes` del paziente.

**`assignPatient(req, res)` — POST `/api/therapist/assign-patient`:**
- Cerca un paziente per email.
- Verifica: esiste? è un paziente? è già assegnato allo stesso terapista? è già assegnato a un altro?
- Se tutte le verifiche passano, aggiorna `therapist_id`.

**`unassignPatient(req, res)` — DELETE `/api/therapist/patients/:id/unassign`:**
- Imposta `therapist_id = NULL` per dissociare il paziente.

**`getExercises(req, res)` — GET `/api/therapist/exercises`:**
- Restituisce `SELECT DISTINCT name FROM exercises` — lista di nomi esercizi unici, utile per suggerimenti o autocompletamento.

---

### 3.1.10 `backend/controllers/patientControllers.js`

**Ruolo:** Controller per le operazioni del paziente.

**`getTodayCard(req, res)` — GET `/api/patient/today-card`:**
1. Chiama `Card.findTodayCard(req.user.id)` — cerca la scheda valida oggi.
2. Se non esiste, restituisce `{ card: null, exercises: [] }`.
3. Recupera gli esercizi con `Exercise.findByCard(card.id)`.
4. Controlla se la sessione è già stata completata oggi con una query su `session_logs` (`WHERE DATE(completed_at) = DATE('now','localtime')`).
5. Arricchisce l'oggetto card con `is_completed_today` e `last_completed_at`.

**`saveSessionLog(req, res)` — POST `/api/patient/session-logs`:**
1. Gestisce sia JSON che `multipart/form-data` (se c'è una foto allegata, Multer popola `req.file`).
2. Valida `card_id` (obbligatorio) e `pain_level` (se presente, deve essere intero 0-10).
3. Verifica che la scheda appartenga al paziente autenticato.
4. Se presente `req.file`, salva il percorso relativo nel campo `photo_base64` (es. `/uploads/diaries/12345.jpg`).
5. Inserisce il record in `session_logs`.
6. Restituisce 201 con i dati salvati.

**`getSessionLogs(req, res)` — GET `/api/patient/session-logs`:**
- JOIN con `cards` per includere `card_title`.
- Filtra per `patient_id = req.user.id`, ordinati per `completed_at DESC`.

**`deleteSessionLog(req, res)` — DELETE `/api/patient/session-logs/:id`:**
1. Recupera il log dal database.
2. Controllo permessi: se il ruolo è `paziente`, verifica che la scheda appartenga a lui. Se è `fisioterapista`, è sempre consentito.
3. Se il log ha una foto associata, la elimina dal filesystem con `fs.unlinkSync()`.
4. Elimina il record dal database.

---

### 3.1.11 `backend/routes/authRoutes.js`

**Ruolo:** Router Express per gli endpoint di autenticazione.

```
POST /api/auth/register  → authControllers.register   (pubblica)
POST /api/auth/login     → authControllers.login       (pubblica)
GET  /api/auth/profile   → verifyToken → authControllers.getProfile  (protetta)
```

Le rotte `register` e `login` sono **pubbliche** (nessun middleware di autenticazione). La rotta `profile` richiede il middleware `verifyToken`.

---

### 3.1.12 `backend/routes/therapistRoutes.js`

**Ruolo:** Router per gli endpoint del fisioterapista.

**Middleware globale del router:** `router.use(verifyToken, requireRole('fisioterapista'))` — applicato a **tutte** le rotte di questo router. Ogni richiesta deve avere un token JWT valido appartenente a un utente con ruolo `'fisioterapista'`.

**Rotte:**
```
GET    /api/therapist/patients              → getPatients
POST   /api/therapist/patients              → createPatient
POST   /api/therapist/assign-patient        → assignPatient
PUT    /api/therapist/patients/:id/notes    → updatePatientNotes
DELETE /api/therapist/patients/:id/unassign → unassignPatient
POST   /api/therapist/cards                 → createCard
PUT    /api/therapist/cards/:id             → updateCard
DELETE /api/therapist/cards/:id             → deleteCard
GET    /api/therapist/cards/:id             → getCardDetails
GET    /api/therapist/exercises             → getExercises
GET    /api/therapist/patients/:id/logs     → getPatientLogs
GET    /api/therapist/patients/:id/cards    → getPatientCards
```

---

### 3.1.13 `backend/routes/patientRoutes.js`

**Ruolo:** Router per gli endpoint del paziente. Include la configurazione di **Multer** per l'upload delle foto.

**Configurazione Multer:**
- `destination`: `backend/uploads/diaries/`
- `filename`: `Date.now() + '-' + random + estensione originale` — genera nomi unici per evitare collisioni.

**Rotte:**
```
DELETE /api/patient/session-logs/:id  → verifyToken, requireRole('paziente','fisioterapista'), deleteSessionLog
GET    /api/patient/today-card        → verifyToken, requireRole('paziente'), getTodayCard
POST   /api/patient/session-logs      → verifyToken, requireRole('paziente'), upload.single('photo_file'), saveSessionLog
GET    /api/patient/session-logs      → verifyToken, requireRole('paziente'), getSessionLogs
```

**Nota:** La rotta DELETE è definita **prima** del `router.use(verifyToken, requireRole('paziente'))` globale, perché deve essere accessibile sia ai pazienti che ai fisioterapisti. Le rotte successive applicano il requireRole globale solo per `'paziente'`.

---

## 3.2 FRONTEND

---

### 3.2.1 `frontend/package.json`

**Ruolo:** Manifesto del progetto frontend.

**Dipendenze chiave:** Angular 22, Ionic 9, Capacitor 8 (core, camera, geolocation, android), Leaflet, RxJS.

**Dev dependencies:** Angular CLI, TypeScript 6.0, ESLint, Vitest.

---

### 3.2.2 `frontend/capacitor.config.ts`

**Ruolo:** Configurazione di Capacitor per il build mobile nativo.

- `appId: 'it.rehabtrack.app'` — identificativo univoco dell'app Android (package name).
- `appName: 'Rehab Track'` — nome visualizzato nell'app drawer.
- `webDir: 'www'` — cartella di output del build Angular, servita dalla WebView nativa.

---

### 3.2.3 `frontend/src/index.html`

**Ruolo:** File HTML entry point. Contiene il tag `<app-root>` dove Angular monta il componente radice.

**Meta tags rilevanti:**
- `lang="it"` e `translate="no"` — prevengono la traduzione automatica del browser (i valori dei timer verrebbero "tradotti" come testo).
- `viewport-fit=cover` — gestione corretta del notch su dispositivi iOS/Android.
- `user-scalable=no` — disabilita lo zoom per un comportamento simil-nativo.

---

### 3.2.4 `frontend/src/main.ts`

**Ruolo:** Bootstrap dell'applicazione Angular. Usa `bootstrapApplication` (standalone, senza NgModule).

**Provider configurati:**
1. `RouteReuseStrategy → IonicRouteStrategy` — strategia di riuso delle rotte specifica di Ionic (preserva lo stato delle pagine durante la navigazione con animazioni).
2. `provideIonicAngular()` — inizializza i componenti Ionic.
3. `provideHttpClient(withInterceptors([httpIntInterceptor]))` — configura `HttpClient` con l'interceptor personalizzato che aggiunge il token JWT e gestisce i 401.
4. `provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding())` — configura il router con:
   - `PreloadAllModules` — precarica tutti i moduli lazy-loaded in background dopo il primo render, per navigazioni successive istantanee.
   - `withComponentInputBinding()` — permette di iniettare i parametri di rotta come `@Input()` nei componenti.

---

### 3.2.5 `frontend/src/app/app.component.ts` e `.html`

**Ruolo:** Componente radice dell'applicazione. Template minimale:

```html
<ion-app>
  <ion-router-outlet></ion-router-outlet>
</ion-app>
```

`<ion-router-outlet>` è l'equivalente Ionic di `<router-outlet>` di Angular: renderizza il componente corrispondente alla rotta corrente, con animazioni di transizione native.

---

### 3.2.6 `frontend/src/app/app.routes.ts`

**Ruolo:** Configurazione del routing principale dell'applicazione.

```typescript
'login'             → LoginPage                   (nessun guard)
'dashboard'         → DashboardPage               (authGuard + roleGuard('fisioterapista'))
'dashboard/card/:id' → CardDetailPage             (authGuard + roleGuard('fisioterapista'))
''                  → tabs.routes (lazy-loaded)    (authGuard + roleGuard('paziente'))
'**'                → redirect a /login
```

**Lazy loading:** I componenti sono importati con `loadComponent: () => import(...)`, che genera chunk separati caricati on-demand. Le rotte dei tab del paziente usano `loadChildren` per caricare l'intero modulo di routing delle tab.

**Guard:**
- `authGuard` — verifica che l'utente sia autenticato (token valido e non scaduto).
- `roleGuard('fisioterapista')` o `roleGuard('paziente')` — verifica che il ruolo dell'utente corrisponda a quello richiesto dalla rotta.

Il redirect `**` (wildcard) cattura qualsiasi percorso non riconosciuto e redirige al login.

---

### 3.2.7 `frontend/src/app/http-int.interceptor.ts`

**Ruolo:** Interceptor HTTP funzionale (Angular 15+ functional interceptor). Esegue due operazioni:

1. **URL rewriting:** Trasforma gli URL relativi (es. `/auth/login`) in URL assoluti puntanti al backend (`http://localhost:3000/api/auth/login`). Gestisce vari formati: `/api/...`, `/...`, `api/...`. Include un workaround per dispositivi mobili Capacitor dove `new URL(url)` potrebbe fallire.

2. **Token injection:** Se esiste un token in `localStorage`, lo aggiunge all'header `Authorization: Bearer <token>` via `req.clone()` (le richieste Angular sono immutabili).

3. **Error handling 401:** In caso di errore 401 (non durante il login stesso), rimuove il token, mostra un toast "Sessione scaduta" e redirige a `/login`.

---

### 3.2.8 `frontend/src/app/guards/auth.guard.ts`

**Ruolo:** Guard funzionale Angular. Verifica che l'utente sia autenticato tramite `AuthService.isAuthenticated()`.

- Se autenticato → `return true` (consente la navigazione).
- Se non autenticato → `return router.createUrlTree(['/login'])` (redirect al login).

---

### 3.2.9 `frontend/src/app/guards/role.guard.ts`

**Ruolo:** Factory function che restituisce un guard parametrizzato per ruolo.

```typescript
export function roleGuard(expectedRole: 'fisioterapista' | 'paziente'): CanActivateFn
```

- Se non autenticato → redirect a `/login`.
- Se il ruolo corrisponde → `return true`.
- Se il ruolo non corrisponde → redirect all'area corretta del proprio ruolo (es. un paziente che tenta di accedere a `/dashboard` viene rediretto a `/tabs/tab1`).

---

### 3.2.10 `frontend/src/app/services/auth.service.ts`

**Ruolo:** Servizio singleton (`providedIn: 'root'`) per la gestione dell'autenticazione.

**Metodi:**

| Metodo | Descrizione |
|---|---|
| `login(email, password)` | POST `/auth/login`. Salva il token JWT in `localStorage` tramite l'operatore RxJS `tap`. |
| `register(data)` | POST `/auth/register`. |
| `getToken()` | Recupera il token da `localStorage`. |
| `decodeToken()` | Decodifica il payload JWT con `atob()` (decodifica Base64 nativa). Nessuna libreria esterna. Split per `.`, prende la parte [1] (payload), la decodifica e la parsa come JSON. |
| `getRole()` | Restituisce il ruolo dal token decodificato. |
| `getUserId()` | Restituisce l'ID utente dal token decodificato. |
| `isAuthenticated()` | Decodifica il token e verifica che `payload.exp > Date.now() / 1000` (confronto epoch). Il backend ri-verifica comunque al momento della richiesta. |
| `logout()` | Rimuove il token da `localStorage` e redirige a `/login`. |

---

### 3.2.11 `frontend/src/app/services/patient.service.ts`

**Ruolo:** Client HTTP per le API del paziente.

**Interfacce TypeScript esportate:** `Exercise`, `Card`, `TodayCardResponse`, `SessionLog`, `SessionLogResponse` — contratti tipizzati per i dati scambiati con il backend.

**Metodi:**

| Metodo | Endpoint | Note |
|---|---|---|
| `getTodayCard()` | GET `/patient/today-card` | Restituisce `Observable<TodayCardResponse>`. |
| `saveSessionLog(logData)` | POST `/patient/session-logs` | **Doppio path:** se `logData.photo_file` è presente, costruisce un `FormData` con i campi e il file (multipart/form-data). Altrimenti, invia un oggetto JSON standard. |
| `getSessionLogs()` | GET `/patient/session-logs` | Storico sessioni. |
| `deleteSessionLog(logId)` | DELETE `/patient/session-logs/:id` | Eliminazione con conferma. |

---

### 3.2.12 `frontend/src/app/services/therapist.service.ts`

**Ruolo:** Client HTTP per le API del fisioterapista.

**Interfacce esportate:** `Patient`, `TherapistCard`, `PatientCard`, `PatientLog`, `CardExercisePayload`, `CardPayload`, `CreateCardResponse`, `Exercise`, `CardDetailsResponse`.

**Metodi:** `getPatients`, `getPatientLogs`, `createPatient`, `createCard`, `updateCard`, `deleteCard`, `getPatientCards`, `getCardDetails`, `getAvailableExercises`, `assignPatientByEmail`, `unassignPatient`, `updatePatientClinicalNotes`. Ciascuno corrisponde 1:1 a un endpoint del backend.

---

### 3.2.13 `frontend/src/app/login/login.page.ts`, `.html`, `.scss`

**Ruolo:** Pagina di login dell'applicazione.

**TypeScript:**
- Usa **Reactive Forms** (`FormBuilder`, `FormGroup`) con validatori `Validators.required` e `Validators.email`.
- Al submit (`onSubmit()`): valida il form, chiama `auth.login()`, e in base al ruolo restituito dal token, redirige a `/dashboard` (fisioterapista) o `/tabs/tab1` (paziente).
- Gestisce lo stato di loading (spinner durante la chiamata) e l'errore (messaggio rosso).
- `ChangeDetectorRef.markForCheck()` è usato per forzare il rilevamento delle modifiche — necessario con componenti standalone che potrebbero usare OnPush.

**Template HTML:**
- Usa componenti Ionic: `ion-card`, `ion-input` con `labelPlacement="floating"`, `ion-button`, `ion-spinner`.
- Binding con `[formGroup]="loginForm"`, `(ngSubmit)="onSubmit()"`, `[disabled]="loginForm.invalid || loading"`.
- Usa la nuova sintassi Angular 17+ `@if (condition) { ... }` al posto di `*ngIf`.

**SCSS:**
- Background con gradiente scuro: `linear-gradient(135deg, #0f2027, #203a43, #2c5364)`.
- Card con effetto **glassmorphism**: `backdrop-filter: blur(12px)`, `background: rgba(255,255,255,0.06)`, border semi-trasparente.
- Bottone con gradiente teal: `linear-gradient(90deg, #4dd0e1, #26c6da)`.

---

### 3.2.14 `frontend/src/app/dashboard/dashboard.page.ts`, `.html`, `.scss`

**Ruolo:** Dashboard del fisioterapista — interfaccia **master-detail** a due colonne.

**Layout master-detail:**
- **Colonna sinistra (aside):** Lista dei pazienti con barra di ricerca locale, avatar con iniziali, patologia, pulsanti aggiungi/dissocia.
- **Colonna destra (main):** Dettaglio del paziente selezionato: profilo, azioni (Nuova Scheda, Vedi Feedback), lista schede assegnate, storico sessioni.

**Funzionalità principali (TypeScript):**

| Metodo | Descrizione |
|---|---|
| `loadPatients()` | Chiama `therapistService.getPatients()`, popola `patients[]` e `filteredPatients[]`. |
| `onSearch(event)` | Filtra localmente `filteredPatients` per nome/cognome o patologia. Usa `String.includes()` case-insensitive. |
| `selectPatient(patient)` | Carica in parallelo i log e le schede del paziente selezionato. Mostra spinner durante il caricamento. |
| `openComposer()` | Apre il modale `CardComposerComponent` in modalità creazione. |
| `openEditCard(card)` | Carica i dettagli della scheda con `getCardDetails()` e apre il composer in modalità modifica. |
| `confirmDeleteCard(card)` | Mostra un `AlertController` di conferma, poi chiama `deleteCard()`. |
| `onCardCreated()` | Callback dal composer: chiude il modale e ricarica le schede del paziente. |
| `openFeedback()` | Apre il modale `FeedbackViewerComponent`. |
| `promptAddPatient()` | Alert con input email per associare un paziente esistente via `assignPatientByEmail()`. |
| `promptUnassignPatient(patient, event)` | `event.stopPropagation()` per evitare la selezione del paziente, poi alert di conferma per la dissociazione. |
| `promptEditClinicalNotes()` | Alert con input per patologia e note cliniche. |
| `logout()` | Alert di conferma, poi `authService.logout()`. |

**Helper:**
- `painColor(level)`: restituisce `'success'` (≤4), `'warning'` (5-7), `'danger'` (>7) — usato per colorare i badge.
- `formatDuration(seconds)`: converte secondi in `Xm Ys`.

---

### 3.2.15 `frontend/src/app/dashboard/card-composer.component.ts`, `.html`

**Ruolo:** Componente modale per la creazione e modifica di schede riabilitative.

**Input/Output:**
- `@Input() patient` — il paziente a cui assegnare la scheda.
- `@Input() editCard` — se valorizzato, il form opera in **modalità modifica** (pre-popola titolo, date ed esercizi).
- `@Output() cardCreated` — evento emesso al salvataggio (il parent dashboard ricarica i dati).
- `@Output() dismissed` — evento emesso alla chiusura.

**Form reattivo con FormArray:**
- `this.fb.group({ title, start_date, end_date, exercises: this.fb.array([...]) })`
- `exercises` è un `FormArray` di `FormGroup`, ciascuno con: `name`, `sets`, `reps_or_duration`, `rest_seconds`, `posture_notes`.
- `addExercise()` aggiunge un nuovo FormGroup vuoto.
- `removeExercise(index)` rimuove un esercizio (minimo 1).

**Submit:**
- In modalità creazione: chiama `therapistService.createCard(payload)`.
- In modalità modifica: chiama `therapistService.updateCard(cardId, data)`.
- Dopo il salvataggio mostra un toast di successo.

---

### 3.2.16 `frontend/src/app/dashboard/feedback-viewer.component.ts`, `.html`, `.scss`

**Ruolo:** Componente modale che mostra il riepilogo feedback/dolore e il diario posturale del paziente.

**Dati calcolati:**
- `avgPain`: media aritmetica dei livelli di dolore (solo sessioni con dolore registrato).
- `criticalCount`: conteggio sessioni con dolore > 7.
- `painTimelineLogs`: ultime 5 sessioni con dolore, in ordine cronologico (dalla più vecchia alla più recente, per visualizzazione "andamento").

**Visualizzazione:**
- Riga di statistiche riassuntive (sessioni totali, dolore medio, sessioni critiche).
- Timeline visiva del dolore con nodi colorati (`getPainHexColor()`: verde ≤4, giallo 5-7, rosso >7).
- Cronologia sessioni con data, titolo scheda, durata, badge dolore, note, foto allegata.
- Pulsante eliminazione per ogni sessione (con conferma).

---

### 3.2.17 `frontend/src/app/dashboard/card-detail/card-detail.page.ts`, `.html`

**Ruolo:** Pagina di dettaglio di una scheda riabilitativa, raggiungibile via rotta `/dashboard/card/:id`.

- Legge il parametro `:id` dalla rotta con `ActivatedRoute.snapshot.paramMap.get('id')`.
- Chiama `therapistService.getCardDetails(id)` per caricare i dati.
- Mostra: titolo scheda, data creazione, lista esercizi con order_index, nome, serie x ripetizioni, recupero, note posturali.

---

### 3.2.18 `frontend/src/app/tabs/tabs.page.ts`, `.html`, `tabs.routes.ts`

**Ruolo:** Componente contenitore per la navigazione a tab del paziente.

**Template:** Barra a tab inferiore con 3 pulsanti:
1. **Scheda** (tab1) — icona `fitness-outline`
2. **Diario** (tab2) — icona `camera-outline`
3. **Mappa** (tab3) — icona `map-outline`

**Routing delle tab (`tabs.routes.ts`):**
```
/tabs/tab1 → Tab1Page (lazy)
/tabs/tab2 → Tab2Page (lazy)
/tabs/tab3 → Tab3Page (lazy)
/ → redirect a /tabs/tab1
```

---

### 3.2.19 `frontend/src/app/tab1/tab1.page.ts`, `.html`, `.scss`

**Ruolo:** Scheda del giorno del paziente — **il componente più complesso del frontend** (~416 righe TS, ~328 righe HTML). Implementa un workout runner completo con macchina a stati.

**Macchina a stati (`WorkoutState`):**

```
overview → prepare → exercise ↔ rest → feedback → completed
                                ↑                      │
                                └──────────────────────┘
                                (abandonWorkout salta a feedback)
```

| Stato | Descrizione |
|---|---|
| `overview` | Visualizzazione della scheda con lista esercizi e pulsante "Inizia Sessione". |
| `prepare` | Countdown di 5 secondi prima del primo esercizio. |
| `exercise` | Esecuzione dell'esercizio corrente. Se time-based, mostra countdown. Se rep-based, mostra il numero di ripetizioni. |
| `rest` | Countdown del tempo di recupero (`rest_seconds`). |
| `feedback` | Form di feedback post-sessione: slider dolore, note, foto, invio. |
| `completed` | Conferma di salvataggio avvenuto. |

**Timer globale:**
- `startGlobalTimer()` avvia un `setInterval(1000ms)` che:
  - Incrementa `totalElapsedSeconds` (tempo totale sessione) quando NON si è in `feedback`/`completed`/`overview`.
  - Se `isTimerRunning` e `countdownSeconds > 0`, decrementa il countdown.
  - Quando il countdown raggiunge 0, attiva la transizione di stato appropriata.
- Il timer gira **fuori da NgZone** (`ngZone.runOutsideAngular`) per evitare change detection ogni secondo, e rientra in zona Angular solo quando serve aggiornare la UI (`ngZone.run`).

**Parsing esercizi a tempo:**
- `parseExerciseDuration('30 secondi')` → `30` (cerca la keyword `s`/`sec`/`secondi` ed estrae il numero).
- Se restituisce `null`, l'esercizio è a ripetizioni (mostra il pulsante "Serie Completata" invece del countdown).

**Gestione foto (Capacitor Camera):**
- Su piattaforma nativa: usa `Camera.getPhoto()` con `CameraSource.Prompt` (l'utente sceglie tra fotocamera e galleria).
- Su browser/web: fallback con `document.createElement('input')` di tipo `file`.
- La foto viene convertita in `Blob` con `fetch(dataUrl).blob()` e inviata come `FormData`.

---

### 3.2.20 `frontend/src/app/tab2/tab2.page.ts`, `.html`, `.scss`

**Ruolo:** Diario Posturale del paziente. Due sezioni switchabili con `ion-segment`:

1. **Sessioni:** Storico dei session_logs con ricerca testuale, filtri per livello di dolore (chip: Tutti/Lieve/Moderato/Intenso/Con Note), badge dolore colorati, note, foto allegate. Pull-to-refresh con `ion-refresher`.

2. **Foto:** Galleria fotografica locale (salvata in `localStorage`). Griglia a 2 colonne, FAB per scattare/scegliere foto, anteprima full-screen in modale, eliminazione.

**Filtri:**
- `applyFilters()` combina ricerca testuale (su titolo scheda e note) con filtro per fascia di dolore. I filtri sono applicati in cascata (AND logico).

**Implementa `ViewWillEnter`** (lifecycle hook Ionic) per ricaricare i log ad ogni accesso alla tab.

---

### 3.2.21 `frontend/src/app/tab3/tab3.page.ts`, `.html`, `.scss`

**Ruolo:** Mappa interattiva con Leaflet + Geolocation.

**Implementazione:**
1. Definisce un'icona marker personalizzata (da `assets/leaflet/`) perché l'icona default di Leaflet non funziona con i bundler Webpack/esbuild.
2. `ionViewDidEnter()` — lifecycle hook Ionic: inizializza la mappa solo dopo che la vista è completamente visibile (necessario per Leaflet che richiede un container con dimensioni definite).
3. Centra la mappa su Palermo (`[38.1157, 13.3615]`) con un marker "Centro di Riabilitazione".
4. `locateUser()` usa `Capacitor Geolocation.getCurrentPosition()` per ottenere la posizione dell'utente, aggiungere un marker "La tua posizione" e un cerchio di accuratezza.
5. `invalidateSize()` dopo un `setTimeout(200)` — necessario perché Leaflet potrebbe calcolare dimensioni errate se il container non è ancora nel suo layout finale.

**`ngOnDestroy`:** Rimuove la mappa per evitare memory leak (`this.map.remove()`).

---

### 3.2.22 `frontend/src/app/components/timer/timer.component.ts`

**Ruolo:** Componente di timer countdown riutilizzabile per il tempo di recupero tra le serie.

**@Input:** `durationSeconds` — durata del countdown in secondi.

**Macchina a stati:** `idle → running → paused → done`.

**Metodi:** `start()`, `pause()`, `reset()`. Il timer usa `setInterval(1000ms)` fuori da NgZone.

**Nota:** Questo componente è stato sostituito dal timer integrato in Tab1Page nella versione corrente, ma rimane disponibile come componente riutilizzabile.

---

### 3.2.23 `frontend/src/app/components/session-timer/session-timer.component.ts`

**Ruolo:** Componente standalone che combina timer di sessione + form di feedback in un unico componente inline (template e stili nel file TypeScript).

**@Output:** `finished` — emette un oggetto `SessionReport` con `duration_seconds`, `pain_level`, `patient_notes`, `photo_file`.

**Flusso:** `idle → running → paused → report (form feedback) → emit finished`.

Include la stessa logica di acquisizione foto (Capacitor Camera + fallback file picker) presente in Tab1Page.

**Nota:** Come il TimerComponent, anche questo è stato sostituito dalla logica integrata in Tab1Page, ma è ancora presente nel codebase.

---

### 3.2.24 `frontend/src/app/explore-container/` (componente boilerplate)

Componente placeholder generato dallo scaffold Ionic. Non è utilizzato attivamente nell'applicazione. Mostra un messaggio descrittivo della sezione.

---

### 3.2.25 `frontend/src/environments/environment.ts` e `environment.prod.ts`

**Ruolo:** File di configurazione ambiente Angular.

- **Development:** `apiUrl: 'http://localhost:3000/api'`
- **Production:** Stesso URL (da sostituire con l'IP del server o URL di produzione per build mobile).

Il build Angular sostituisce automaticamente `environment.ts` con `environment.prod.ts` durante `ng build --configuration production`.

---

### 3.2.26 `frontend/src/global.scss`

**Ruolo:** Stili globali dell'applicazione.

Import chiave:
- CSS core di Ionic (normalize, structure, typography, display, padding, etc.)
- **CSS Leaflet** (`leaflet/dist/leaflet.css`) — obbligatorio per il rendering corretto di tile e controlli mappa.
- **Dark mode** con `dark.system.css` — segue le preferenze di sistema dell'utente.

---

# 4. FLUSSI DATI END-TO-END

## 4.1 Flusso 1: Autenticazione e Login

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. UTENTE compila email e password nel form (login.page.html)          │
│    → [formGroup]="loginForm" con Validators.required/email             │
│                                                                         │
│ 2. Click su "Accedi" → onSubmit()                                      │
│    → loading=true, cdr.markForCheck(), spinner visibile                 │
│                                                                         │
│ 3. auth.login(email, password)                                          │
│    → AuthService.login() → http.post('/auth/login', {email, password}) │
│                                                                         │
│ 4. INTERCEPTOR (http-int.interceptor.ts)                                │
│    → URL rewriting: '/auth/login' → 'http://localhost:3000/api/auth/login' │
│    → (nessun token da iniettare, è la prima richiesta)                 │
│                                                                         │
│ 5. BACKEND: Express route POST /api/auth/login                         │
│    → authControllers.login()                                            │
│    → User.findByEmail(email) → SELECT * FROM users WHERE email = ?     │
│    → bcrypt.compare(password, user.password)                           │
│    → jwt.sign({id, email, role}, JWT_SECRET, {expiresIn: '7d'})       │
│    → res.json({ token, role, userId })                                 │
│                                                                         │
│ 6. FRONTEND: tap() in AuthService salva token in localStorage          │
│    → onSubmit.next(): auth.getRole() decodifica il JWT con atob()     │
│    → Se 'fisioterapista' → router.navigateByUrl('/dashboard')          │
│    → Se 'paziente'       → router.navigateByUrl('/tabs/tab1')         │
│                                                                         │
│ 7. GUARD: authGuard verifica isAuthenticated() (token non scaduto)     │
│    → roleGuard verifica che il ruolo corrisponda alla rotta            │
│    → Navigazione consentita → componente renderizzato                  │
└─────────────────────────────────────────────────────────────────────────┘
```

## 4.2 Flusso 2: Creazione e Assegnazione Scheda di Riabilitazione

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. FISIOTERAPISTA seleziona un paziente nella lista (dashboard)         │
│    → selectPatient(patient) carica log e schede del paziente           │
│                                                                         │
│ 2. Click su "Nuova Scheda" → openComposer()                           │
│    → showComposer=true → ion-modal si apre                            │
│    → CardComposerComponent riceve @Input() patient                     │
│                                                                         │
│ 3. Il terapista compila:                                                │
│    - Titolo scheda (Reactive Form, Validators.required, minLength 3)   │
│    - Date opzionali (start_date, end_date)                             │
│    - N esercizi (FormArray): nome, serie, ripetizioni, recupero, note  │
│    → addExercise() per aggiungerne, removeExercise() per toglierne     │
│                                                                         │
│ 4. Click su "CREA E ASSEGNA SCHEDA" → submit()                        │
│    → Costruisce CardPayload con exercises[].order_index = i+1          │
│    → therapistService.createCard(payload)                              │
│    → POST http://localhost:3000/api/therapist/cards                    │
│                                                                         │
│ 5. BACKEND: verifyToken → requireRole('fisioterapista') → createCard() │
│    → Validazione: patient_id, title, exercises (array non vuoto)       │
│    → User.findById(patient_id) → verifica patient.therapist_id        │
│    → Card.create({patient_id, therapist_id, title})                    │
│    → Exercise.createBulk(card.id, exercises)                           │
│      → BEGIN TRANSACTION                                                │
│      → N × INSERT INTO exercises VALUES (?,?,?,?,?,?,?)                 │
│      → COMMIT (o ROLLBACK in caso di errore)                           │
│    → res.status(201).json({card, exerciseIds})                         │
│                                                                         │
│ 6. FRONTEND: cardCreated.emit() → onCardCreated()                     │
│    → Chiude modale, ricarica le schede del paziente                    │
│    → Toast "Scheda creata e assegnata con successo!"                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## 4.3 Flusso 3: Esecuzione Sessione da Parte del Paziente

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. PAZIENTE accede alla Tab1 ("La Mia Scheda")                         │
│    → ngOnInit() → loadTodayCard()                                      │
│    → GET http://localhost:3000/api/patient/today-card                   │
│    → Backend: Card.findTodayCard(req.user.id) con date matching         │
│    → Restituisce {card, exercises, is_completed_today}                  │
│                                                                         │
│ 2. OVERVIEW: il paziente vede titolo, N esercizi, dettagli             │
│    → Se già completata oggi: badge "Completata oggi" + btn "Ripeti"    │
│                                                                         │
│ 3. Click "Inizia Sessione" → startWorkout() → doStartWorkout()        │
│    → Reset stato: index=0, set=1, timer=0, feedback fields            │
│    → startGlobalTimer(): setInterval(1s) fuori NgZone                  │
│    → startPreparePhase(): countdown 5s ("Preparati!")                   │
│                                                                         │
│ 4. PREPARE → countdown 5→0 → finishPrepare() → startExercisePhase()   │
│                                                                         │
│ 5. EXERCISE:                                                            │
│    → Se time-based ("30 secondi"): countdown da 30 a 0                 │
│    → Se rep-based ("12"): mostra numero, btn "Serie Completata"        │
│    → Ogni serie completata → completeSet()                             │
│      → Se non ultima serie → currentSet++ → REST phase                 │
│      → Se ultima serie, non ultimo esercizio → next exercise → REST    │
│      → Se ultima serie dell'ultimo esercizio → finishWorkout()         │
│                                                                         │
│ 6. REST: countdown rest_seconds → finishRest() → back to EXERCISE     │
│    (Possibile "Salta Recupero" per proseguire immediatamente)          │
│    (Possibile "Interrompi Allenamento" → FEEDBACK con isEarlyExit=true)│
│                                                                         │
│ 7. FEEDBACK: il paziente compila:                                       │
│    → Slider dolore (1-10, default 5)                                   │
│    → Note testuali (opzionale)                                          │
│    → Foto tramite Camera/file picker (opzionale)                       │
│                                                                         │
│ 8. Click "Invia Feedback" → submitFeedback()                           │
│    → patientService.saveSessionLog({card_id, duration, pain, notes, photo}) │
│    → Se c'è foto: FormData (multipart/form-data)                       │
│    → Se no foto: JSON body                                              │
│    → POST http://localhost:3000/api/patient/session-logs               │
│    → Multer salva il file in uploads/diaries/                          │
│    → INSERT INTO session_logs VALUES (...)                              │
│                                                                         │
│ 9. COMPLETED: "Sessione Registrata" con checkmark verde                │
│    → card.is_completed_today = true                                    │
│    → Btn "Torna alla Panoramica" → resetToOverview()                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## 4.4 Flusso 4: Visualizzazione Statistiche e Avanzamento

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. FISIOTERAPISTA seleziona un paziente nella dashboard                │
│    → selectPatient() carica in parallelo:                              │
│      a) therapistService.getPatientLogs(id)                            │
│         → GET /api/therapist/patients/:id/logs                         │
│         → JOIN session_logs + cards → array di PatientLog              │
│      b) therapistService.getPatientCards(id)                           │
│         → GET /api/therapist/patients/:id/cards                        │
│         → JOIN cards + COUNT(exercises) → array di PatientCard         │
│                                                                         │
│ 2. Dashboard mostra:                                                    │
│    → SCHEDE ASSEGNATE: titolo, data, conteggio esercizi                │
│      → Click su scheda → navigateToCard() → pagina dettaglio          │
│      → Bottoni modifica (→ composer edit mode) e elimina (→ alert)     │
│    → STORICO SESSIONI: griglia di card con data, durata, dolore, note │
│      → Badge dolore colorato: verde ≤4, giallo 5-7, rosso >7         │
│      → Card con bordo rosso se pain_level > 7 (classe pain-critical)  │
│                                                                         │
│ 3. Click "Vedi Feedback & Diario" → openFeedback()                    │
│    → Modale FeedbackViewerComponent:                                    │
│      → STATISTICHE: tot sessioni, dolore medio, sessioni critiche (>7) │
│      → TIMELINE DOLORE: ultime 5 sessioni con nodi colorati           │
│      → CRONOLOGIA: tutte le sessioni con data, durata, dolore,         │
│        note, foto allegata (dall'URL http://localhost:3000/uploads/...) │
│      → ELIMINAZIONE: pulsante trash per ogni sessione (con conferma)   │
│                                                                         │
│ 4. Il terapista può anche:                                              │
│    → Modificare le note cliniche del paziente (promptEditClinicalNotes) │
│    → Modificare una scheda esistente (openEditCard → composer edit)     │
│    → Eliminare una scheda (confirmDeleteCard)                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 5. DOMANDE PROBABILI DEL PROFESSORE E RISPOSTE GUIDATE

## Domanda 1: "Com'è strutturata l'architettura Three-Tier e come si verifica che sia reale?"

**Risposta:** L'architettura è genuinamente three-tier. Il **Presentation Tier** è un'applicazione Angular/Ionic compilata e servita su porta 8100 (o come APK nativo via Capacitor). L'**Application Tier** è un server Express su porta 3000 che espone API REST JSON. Il **Data Tier** è un file SQLite gestito dal modulo `sqlite3`. La separazione è verificabile dal fatto che i due processi (frontend e backend) girano indipendentemente: il frontend comunica col backend solo tramite chiamate HTTP, mai con accesso diretto al database. L'interceptor HTTP nel frontend riscrive gli URL per puntare a `localhost:3000`, confermando la separazione fisica.

## Domanda 2: "Come prevenite la SQL Injection?"

**Risposta:** Tutte le query SQL nel progetto sono **parametrizzate** con placeholder `?`. I valori dell'utente vengono passati come array nel secondo argomento di `db.run(sql, [param1, param2, ...])` o `db.get(sql, [...])`. Il driver `sqlite3` di Node.js gestisce l'escaping e il binding dei parametri a livello di prepared statement, rendendo impossibile l'iniezione. Ad esempio: `'SELECT * FROM users WHERE email = ?', [email]` — il contenuto di `email` non viene mai interpolato nella stringa SQL.

## Domanda 3: "Perché avete scelto JWT e non sessioni server-side? Quali sono i pro e i contro?"

**Risposta:** Il JWT è **stateless**: il server non deve mantenere uno store di sessioni in memoria o nel database. Questo semplifica l'architettura (nessuna dipendenza da Redis o tabelle sessioni) ed è coerente con il paradigma REST. I **pro**: scalabilità orizzontale (ogni istanza del server può verificare il token indipendentemente), nessun overhead di lookup sessione. I **contro**: il token non è revocabile prima della scadenza (se compromesso, resta valido fino all'expiry di 7 giorni), e il payload è leggibile da chiunque abbia il token (anche se firmato, non è cifrato). Per un progetto accademico, il trade-off è accettabile. In produzione, si potrebbe aggiungere una blacklist di token revocati.

## Domanda 4: "Come funziona l'autorizzazione basata sui ruoli? Cosa succede se un paziente tenta di accedere a un endpoint del fisioterapista?"

**Risposta:** L'autorizzazione è a due livelli. **Lato backend**, il middleware `requireRole('fisioterapista')` montato globalmente su tutte le rotte di `therapistRoutes.js` verifica che `req.user.role` (estratto dal JWT) sia `'fisioterapista'`. Se un paziente invia una richiesta con un token valido ma con ruolo `'paziente'`, riceve HTTP 403 Forbidden. **Lato frontend**, il `roleGuard` impedisce la navigazione: se un paziente tenta di accedere a `/dashboard`, il guard lo redirige a `/tabs/tab1`. La protezione è dunque su entrambi i lati: il frontend previene la navigazione, il backend rifiuta le richieste non autorizzate.

## Domanda 5: "Come gestite lo stato dell'applicazione nel frontend? Usate un state manager come NgRx?"

**Risposta:** No, non usiamo un state manager esterno. Lo stato è gestito **a livello di componente** con proprietà TypeScript standard e `ChangeDetectorRef` per forzare gli aggiornamenti della vista. Questo è sufficiente per la complessità dell'applicazione: ogni pagina carica i propri dati dal backend al mount (`ngOnInit` o `ionViewWillEnter`), senza necessità di sincronizzare stato tra componenti non correlati. L'unico stato persistente è il token JWT in `localStorage`, gestito da `AuthService`. Il `PatientService` e il `TherapistService` sono stateless: ogni chiamata è un Observable one-shot che il componente sottoscrive e consuma.

## Domanda 6: "Spiegatemi come funziona il CORS nel progetto e perché è necessario."

**Risposta:** CORS (Cross-Origin Resource Sharing) è necessario perché frontend e backend girano su **origini diverse** in sviluppo: il frontend Angular su `http://localhost:8100` e il backend Express su `http://localhost:3000`. Il browser, per ragioni di sicurezza (Same-Origin Policy), bloccherebbe le richieste XHR/fetch cross-origin senza le appropriate header CORS nella risposta. Il middleware `cors()` di Express aggiunge automaticamente le header `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods`, ecc. In produzione, andrebbe configurato con un whitelist di origini specifiche anziché `*`.

## Domanda 7: "Come funziona il timer della sessione? Perché usate NgZone?"

**Risposta:** Il timer usa `setInterval(1000ms)` per incrementare un contatore ogni secondo. Il motivo per cui il `setInterval` viene eseguito **fuori da NgZone** (`ngZone.runOutsideAngular`) è una **ottimizzazione delle performance**: Angular, per default, esegue la change detection su ogni evento asincrono (setTimeout, setInterval, event handler). Un timer che scatta ogni secondo provocherebbe 60 cicli di change detection al minuto su tutto l'albero dei componenti, anche se solo un numero nel template è cambiato. Eseguendo il timer fuori dalla zona Angular ed entrando selettivamente con `ngZone.run()` solo quando serve aggiornare la UI, riduciamo drasticamente il lavoro del change detector.

## Domanda 8: "Come gestite il caricamento delle foto? Qual è il flusso completo dal dispositivo al database?"

**Risposta:** Il flusso è: (1) Su piattaforma nativa, usiamo `@capacitor/camera` con `CameraSource.Prompt` per offrire la scelta tra fotocamera e galleria. Su browser, il fallback è un `<input type="file" accept="image/*">` creato dinamicamente. (2) L'immagine viene ottenuta come DataURL (base64), convertita in `Blob` con `fetch(dataUrl).blob()`. (3) Il frontend costruisce un `FormData` con il campo `photo_file` e gli altri dati testuali. (4) Il backend riceve la richiesta multipart tramite **Multer**, che salva il file su disco in `backend/uploads/diaries/` con un nome univoco (timestamp + random). (5) Il percorso relativo del file (es. `/uploads/diaries/1234567890.jpg`) viene salvato nella colonna `photo_base64` della tabella `session_logs`. (6) Le foto sono servite staticamente da Express via `app.use('/uploads', express.static(...))`.

## Domanda 9: "Cosa succede se il server crasha durante l'inserimento degli esercizi? Avete gestione delle transazioni?"

**Risposta:** Sì. Il metodo `Exercise.createBulk()` usa una **transazione esplicita SQLite**: `BEGIN TRANSACTION` → N INSERT → `COMMIT`. Se uno qualsiasi degli inserimenti fallisce, viene eseguito `ROLLBACK`, annullando tutti gli inserimenti precedenti. Questo garantisce **atomicità**: o tutti gli esercizi vengono inseriti correttamente, o nessuno. Senza la transazione, un crash a metà lascerebbe la scheda in uno stato inconsistente con solo parte degli esercizi.

## Domanda 10: "Come gestite la gestione degli errori nel backend? Cosa succede con un errore non gestito?"

**Risposta:** La gestione errori è su tre livelli: (1) **Validazione controller**: ogni controller verifica i campi obbligatori e restituisce HTTP 400 con messaggio specifico. (2) **Promise rejection**: Express 5 cattura automaticamente le Promise rigettate nei route handler e le inoltra all'error handler. Questo significa che non serve `try/catch` esplicito in ogni controller async — un vantaggio di Express 5 rispetto alla versione 4. (3) **Error handler globale** in `server.js`: `app.use((err, req, res, next) => ...)` logga l'errore e restituisce JSON con codice 500 (o il codice specificato dall'errore).

## Domanda 11: "Come funziona il sistema di routing in Angular? Cos'è il lazy loading e perché lo usate?"

**Risposta:** Il routing Angular mappa percorsi URL a componenti. Usiamo il **lazy loading** con `loadComponent: () => import('./path').then(m => m.Component)`: i componenti vengono caricati on-demand solo quando l'utente naviga alla rotta corrispondente, anziché essere inclusi nel bundle iniziale. Questo riduce il tempo di primo caricamento. Inoltre, `withPreloading(PreloadAllModules)` precara in background tutti i chunk lazy dopo il primo render, così le navigazioni successive sono istantanee. `withComponentInputBinding()` permette di ricevere i parametri di rotta direttamente come `@Input()`.

## Domanda 12: "Come funziona il vostro interceptor HTTP? Perché non usate direttamente URL assoluti nelle chiamate?"

**Risposta:** L'interceptor centralizza due responsabilità trasversali: (1) **URL rewriting** — i service usano URL relativi (es. `/auth/login`), e l'interceptor li risolve in URL assoluti verso il backend (`http://localhost:3000/api/auth/login`). Questo disaccoppia i service dall'URL del server: per cambiare host/porta basta modificare `environment.apiUrl`. (2) **Token injection** — aggiunge automaticamente l'header `Authorization: Bearer <token>` a tutte le richieste, evitando di ripetere questa logica in ogni service. (3) **Error handling 401** — gestisce centralmente la scadenza della sessione.

## Domanda 13: "La colonna si chiama `photo_base64` ma contiene un URL. Perché?"

**Risposta:** È un artefatto dell'evoluzione del progetto. Inizialmente il design prevedeva di salvare le foto come stringhe Base64 direttamente nel database (approccio semplice ma inefficiente per immagini grandi). Successivamente si è passati all'upload su filesystem tramite Multer, salvando nel database solo il percorso relativo del file. Il nome della colonna non è stato rinominato per evitare di dover migrare dati esistenti, ma il contenuto è effettivamente un percorso URL (es. `/uploads/diaries/1234.jpg`), non una stringa base64.

## Domanda 14: "Cos'è Capacitor e come si differenzia da Cordova?"

**Risposta:** Capacitor è il runtime nativo sviluppato dal team Ionic, successore spirituale di Cordova. Entrambi permettono di eseguire un'app web in una WebView nativa con accesso alle API del dispositivo (camera, GPS, filesystem). Le differenze principali: Capacitor usa un approccio "web-first" (l'app web funziona anche senza il layer nativo), ha plugin TypeScript-first con tipi, gestisce il progetto Android/iOS come asset di prima classe (non genera e rigenera i progetti nativi), e offre una migrazione più agevole verso API native. Nel progetto, Capacitor abilita `@capacitor/camera` per le foto e `@capacitor/geolocation` per la mappa.

## Domanda 15: "Come si potrebbe migliorare il sistema in produzione?"

**Risposta:** Diverse aree di miglioramento: (1) **Sicurezza**: `JWT_SECRET` da variabile d'ambiente, CORS ristretto, HTTPS obbligatorio, rate limiting sulle rotte di login. (2) **Database**: migrazione a PostgreSQL per concorrenza e scalabilità (SQLite supporta un solo writer alla volta). (3) **Password**: politiche di complessità, scadenza, cambio password. (4) **Token**: refresh token con durata breve per l'access token, blacklist per revoca. (5) **Upload**: limiti di dimensione file, validazione tipo MIME, storage cloud (S3). (6) **Performance**: caching delle risposte GET, paginazione delle liste lunghe, indici database mancanti. (7) **Monitoraggio**: logging strutturato, health check endpoint, metriche APM.
