# 🎓 Copione Simulazione Orale — RehabTrack (Prof. Cruciata)

## 🎬 FASE 1 — Introduzione e Architettura

*(Hai già avviato tutto: Terminale 1 → `cd backend && node server.js`, Terminale 2 → `cd frontend && ionic serve`. L'app è aperta nel browser su `localhost:8100` e mostra la schermata di Login.)*

**Tu:**
"Buongiorno Professore. Il progetto che presento oggi si chiama **RehabTrack**. È un'applicazione pensata per il mondo della riabilitazione: permette a due tipologie di utenti — il **fisioterapista** e il **paziente** — di collaborare a distanza. Il fisioterapista può creare schede riabilitative personalizzate con esercizi, serie, ripetizioni e note posturali. Il paziente, dal canto suo, esegue la sessione di allenamento guidata dall'app, e al termine invia un feedback con livello di dolore, note testuali e opzionalmente una foto posturale."

"A livello architetturale, il progetto segue il classico modello **Client-Server** con un'API REST come punto di contatto tra le due parti:

- Il **Frontend** è un'app ibrida costruita con **Ionic** e **Angular**, scritta interamente in **TypeScript**. Ionic ci permette di avere un'unica codebase che funziona sia come web app nel browser sia come app nativa su Android e iOS, grazie a **Capacitor** che fa da ponte con le API native del dispositivo (come la fotocamera).
- Il **Backend** è un server **Node.js** con il framework **Express.js** che espone le API REST e gestisce l'autenticazione, l'autorizzazione e la logica di business.
- Il **Database** è **SQLite**, un database relazionale embedded che salva tutto in un singolo file. È perfetto per un prototipo perché non richiede un server separato, ma supporta comunque le Foreign Key e le query SQL standard."

---

## 💻 FASE 2 — Avvio del Backend

**Tu:**
"Prima di mostrarle l'app, le faccio vedere cosa succede quando avviamo il server. Ecco il file `server.js`, che è l'entry point del backend."

*(Apri `server.js` nell'editor)*

```javascript
const express = require('express');                          // Importa il framework Express
const cors = require('cors');                                // Importa il middleware CORS
const authRoutes = require('./routes/authRoutes');            // Importa le rotte per login/registrazione
const therapistRoutes = require('./routes/therapistRoutes');  // Importa le rotte del fisioterapista
const patientRoutes = require('./routes/patientRoutes');      // Importa le rotte del paziente

const app = express();                                       // Crea l'istanza dell'applicazione Express
const PORT = process.env.PORT || 3000;                       // Porta del server (default 3000)

// --- MIDDLEWARE GLOBALI ---
app.use(cors());           // Consente richieste da origini diverse (il frontend è su porta 8100)
app.use(express.json());   // Parsa automaticamente il body JSON delle richieste POST/PUT

// --- ROTTE ---
app.use('/api/auth', authRoutes);            // Monta le rotte di autenticazione sotto /api/auth
app.use('/api/therapist', therapistRoutes);  // Monta le rotte del terapista sotto /api/therapist
app.use('/api/patient', patientRoutes);      // Monta le rotte del paziente sotto /api/patient

// --- GESTIONE ERRORI ---
app.use((err, req, res, next) => {           // Middleware a 4 parametri = error handler di Express
  res.status(err.status || 500).json({ error: err.message || 'Errore interno del server' });
});

require('./db/db');                          // Importa db.js → crea le tabelle e inserisce i dati di prova
app.listen(PORT, () => console.log(`Backend in ascolto su http://localhost:${PORT}`));
```

"Qui ci sono tre concetti importanti. 

Il **CORS**: il frontend gira su `localhost:8100` e il backend su `localhost:3000`. Sono due origini diverse. Per default, il browser applica la **Same-Origin Policy** e bloccherebbe tutte le richieste dal frontend al backend. Il middleware `cors()` dice al browser: 'fidati, accetta richieste anche da altre origini'.

**express.json()**: questo middleware parsa il body delle richieste HTTP. Quando il frontend invia un JSON nel body di una POST (ad esempio i dati del login), lo trasforma in un oggetto JavaScript accessibile tramite `req.body`. Senza di esso, `req.body` sarebbe `undefined`.

Il **mounting delle rotte**: `app.use('/api/auth', authRoutes)` monta tutte le rotte definite in `authRoutes` sotto il prefisso `/api/auth`. Quindi se dentro `authRoutes` definiamo un `router.post('/login', ...)`, l'URL completo diventa `POST /api/auth/login`."

---

## 🗄️ FASE 3 — Il Database (Schema Relazionale)

**Tu:**
"Quando il server parte, la riga `require('./db/db')` carica il file del database. Questo file apre la connessione, crea lo schema e inserisce i dati di prova."

*(Apri `db/db.js` nell'editor)*

```javascript
const sqlite3 = require('sqlite3').verbose();          // Importa il driver SQLite
const bcrypt = require('bcrypt');                       // Libreria per l'hashing sicuro delle password
const DB_PATH = path.join(__dirname, 'rehabtrack.db');  // Percorso del file database

// Apertura connessione — il file viene creato automaticamente se non esiste
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) throw err;
  console.log('Connesso al database SQLite:', DB_PATH);
});

db.run('PRAGMA foreign_keys = ON');  // FONDAMENTALE: SQLite ha le FK disabilitate di default!
```

"In SQLite le **Foreign Key** sono disabilitate di default per retrocompatibilità. Se non mettessimo quel `PRAGMA`, potremmo inserire un `therapist_id = 999` anche se quell'id non esiste, e SQLite non si lamenterebbe. Con il PRAGMA attivo, verrebbe lanciato un errore."

**Tu:**
"Lo schema è composto da **4 tabelle**. Le mostro la principale, `users`:"

```javascript
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,  -- Chiave primaria auto-incrementante
    email         TEXT    NOT NULL UNIQUE,             -- Email univoca, obbligatoria
    password      TEXT    NOT NULL,                    -- Hash bcrypt (MAI in chiaro!)
    role          TEXT    NOT NULL CHECK(role IN ('fisioterapista', 'paziente')),  -- Vincolo CHECK
    first_name    TEXT    NOT NULL,
    last_name     TEXT    NOT NULL,
    pathology     TEXT    DEFAULT NULL,                -- Patologia (solo per i pazienti)
    therapist_id  INTEGER DEFAULT NULL,               -- FK auto-referenziale
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (therapist_id) REFERENCES users(id)   -- Integrità referenziale
  )
`);
```

"`therapist_id` è una **Foreign Key auto-referenziale**: punta alla stessa tabella `users`. Per i fisioterapisti è `NULL`, per i pazienti contiene l'id del terapista. Il vincolo `CHECK` su `role` garantisce a livello di database che nessuno possa inserire un ruolo diverso dai due consentiti.

Le altre tabelle seguono lo stesso schema: `cards` (schede riabilitative, con FK verso `users` sia per il paziente che per il terapista), `exercises` (esercizi della scheda, con FK verso `cards`), e `session_logs` (il diario di sessione con dolore, note, foto e durata, con FK verso `cards` e `users`). Le relazioni sono tutte **1:N**: un terapista crea molte schede, ogni scheda ha molti esercizi, e ogni scheda può avere molti session_log."

"Le password vengono salvate con **bcrypt**: `bcrypt.hash('terapista123', 10)` produce un hash irreversibile. Il 10 sono i 'salt rounds' — un salt è una stringa casuale aggiunta alla password prima dell'hashing che rende impossibili gli attacchi con rainbow table. 10 rounds significa 2^10 = 1024 iterazioni, rendendo il brute-force impraticabile.

Le query usano **Prepared Statements** (i segnaposto `?`) per prevenire le **SQL Injection**: i valori non vengono mai concatenati nella stringa SQL ma passati come array separato al driver, che fa l'escaping automatico."

---

## 🔐 FASE 4 — Login (dall'App al Database e ritorno)

*(Torna sull'app nel browser. Sei sulla schermata di Login.)*

**Tu:**
"Le faccio vedere il flusso completo del login, dal click del bottone fino alla risposta del server."

### 4.1 — Il template e il data-binding di Angular

*(Mostra la pagina di login nel browser e apri `login.page.html`)*

**Tu:**
"La schermata di login usa componenti **Ionic** (`ion-card`, `ion-input`, `ion-button`) e i **Reactive Forms** di Angular. I concetti chiave nel template sono tre tipi di **data-binding**:
- `[formGroup]="loginForm"` — **property binding** (quadre `[ ]`): il TypeScript controlla una proprietà dell'HTML
- `(ngSubmit)="onSubmit()"` — **event binding** (tonde `( )`): un evento HTML chiama un metodo TypeScript
- `{{ errorMsg }}` — **interpolation** (doppie graffe): mostra il valore di una variabile nel template

Il bottone ha `[disabled]="loginForm.invalid || loading"`: finché i validatori non sono soddisfatti, il bottone resta disabilitato. E con `@if (loading)` mostriamo uno spinner durante il caricamento."

### 4.2 — Il componente TypeScript

*(Apri `login.page.ts` nell'editor)*

```typescript
@Component({                            // Decoratore: dice ad Angular che questa classe è un componente UI
  selector: 'app-login',                // Il tag HTML personalizzato: <app-login>
  templateUrl: './login.page.html',      // Collegamento al file HTML (la vista)
  styleUrls: ['./login.page.scss'],      // Collegamento al file di stile
  standalone: true,                      // Componente autonomo (Angular 14+), non serve un NgModule
  imports: [                             // Moduli e componenti usati nel template
    CommonModule, ReactiveFormsModule,
    IonContent, IonCard, IonInput, IonButton, IonSpinner, ...
  ],
})
export class LoginPage {
  // --- Dependency Injection: Angular crea e fornisce queste istanze automaticamente ---
  private readonly fb = inject(FormBuilder);        // Per creare form reattivi
  private readonly auth = inject(AuthService);      // Il nostro service di autenticazione
  private readonly router = inject(Router);         // Per navigare tra le pagine

  // Reactive Form con validatori dichiarati nel TypeScript
  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],  // Obbligatorio + formato email
    password: ['', [Validators.required]],                 // Obbligatorio
  });

  errorMsg = '';       // Messaggio di errore mostrato a schermo
  loading = false;     // Flag per lo spinner
```

"Il decoratore `@Component` è fondamentale: senza di esso, Angular tratterebbe la classe come puro TypeScript e non la renderizzerebbe. La **Dependency Injection** avviene con `inject()`: noi non scriviamo mai `new AuthService()`. Angular crea le istanze dei service e ce le fornisce. I **Reactive Forms** definiscono le regole di validazione nel codice TypeScript, non nell'HTML."

### 4.3 — Il click su "Accedi"

*(Inserisci `dott.rossi@rehabtrack.it` / `terapista123` e premi Accedi)*

```typescript
onSubmit(): void {
  if (this.loginForm.invalid) return;           // Se il form non è valido, non fare nulla

  this.loading = true;                          // Attiva lo spinner
  this.errorMsg = '';                           // Pulisci errori precedenti

  const { email, password } = this.loginForm.getRawValue();  // Estrae i valori dal form

  this.auth.login(email, password).subscribe({  // Chiama il service → parte la richiesta HTTP
    next: () => {                               // SUCCESSO
      const role = this.auth.getRole();         // Legge il ruolo dal token JWT
      // Redirect differenziato: fisioterapista → dashboard, paziente → tabs
      const target = role === 'fisioterapista' ? '/dashboard' : '/tabs/tab1';
      this.router.navigateByUrl(target);        // Naviga verso la pagina corretta
    },
    error: (err) => {                           // ERRORE
      this.errorMsg = err.error?.error || 'Credenziali non valide.';
    },
  });
}
```

"Quando premo 'Accedi': il form chiama `onSubmit()` → `onSubmit()` chiama `auth.login()` → il service fa una POST al backend → il backend verifica le credenziali e genera un JWT → il frontend salva il token e reindirizza. Vediamo ogni passaggio."

### 4.4 — L'AuthService: chiamata HTTP e salvataggio token

*(Apri `auth.service.ts`)*

```typescript
@Injectable({ providedIn: 'root' })   // Singleton globale: una sola istanza in tutta l'app
export class AuthService {
  private readonly http = inject(HttpClient);       // Client HTTP di Angular
  private readonly TOKEN_KEY = 'auth_token';        // Chiave per il localStorage

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>('/auth/login', { email, password })  // POST verso il backend
      .pipe(
        tap((res) => localStorage.setItem(this.TOKEN_KEY, res.token))  // Salva il token ricevuto
      );
  }

  // Decodifica il payload JWT (la parte centrale, in Base64)
  private decodeToken(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = token.split('.')[1];    // JWT = header.PAYLOAD.signature
      return JSON.parse(atob(payload));       // atob() decodifica Base64 → oggetto JSON
    } catch { return null; }
  }

  getRole(): string | null { return this.decodeToken()?.role ?? null; }

  isAuthenticated(): boolean {
    const payload = this.decodeToken();
    if (!payload) return false;
    return payload.exp > Date.now() / 1000;   // Controlla se il token è scaduto
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);  // Rimuove il token
    this.router.navigateByUrl('/login');       // Torna al login
  }
}
```

"L'operatore `tap()` di RxJS è un 'effetto collaterale': non modifica i dati dell'Observable, ma esegue un'azione aggiuntiva — salvare il token nel **localStorage** del browser, che è una memoria persistente (sopravvive alla chiusura della tab). Il **JWT** è composto da tre parti separate da un punto: `header.payload.signature`. Decodifichiamo il payload con `atob()` per leggere il ruolo senza ricontattare il server."

### 4.5 — Il Backend: verifica credenziali e generazione JWT

*(Apri `authControllers.js`)*

```javascript
async function login(req, res) {
  const { email, password } = req.body;          // Estrae i dati dal body della richiesta

  const user = await User.findByEmail(email);    // Cerca l'utente nel DB
  if (!user) {
    // Messaggio VOLUTAMENTE generico — non rivela se l'email esiste (info leak)
    return res.status(401).json({ error: 'Credenziali non valide' });
  }

  // bcrypt.compare() rifà l'hashing della password in chiaro e confronta con l'hash nel DB
  // NON decripta (è irreversibile), ma confronta i due hash
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }

  // Genera il JWT con payload {id, email, role}, firmato con la chiave segreta
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },  // Dati nel token
    JWT_SECRET,                                            // Chiave segreta per la firma
    { expiresIn: '7d' }                                    // Scade dopo 7 giorni
  );

  res.json({ token, role: user.role, userId: user.id });   // Invia il token al frontend
}
```

"Il messaggio di errore è identico sia che l'email non esista sia che la password sia sbagliata: se dicessimo 'Email non trovata', un attaccante potrebbe enumerare le email registrate nel sistema."

### 4.6 — L'Interceptor: il token allegato automaticamente

*(Apri `http-int.interceptor.ts`)*

**Tu:**
"Ora che il token è nel localStorage, come fa ad arrivare in ogni richiesta successiva senza scriverlo a mano? L'**HTTP Interceptor** di Angular si posiziona tra il frontend e il backend e intercetta **ogni** richiesta HTTP:"

```typescript
export const httpIntInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('auth_token');           // Legge il token

  // Clona la richiesta aggiungendo l'header Authorization
  const cloned = req.clone({
    url,                                                       // URL risolto verso porta 3000
    ...(token
      ? { setHeaders: { Authorization: `Bearer ${token}` } }  // Aggiunge "Bearer <token>"
      : {}),
  });

  return next(cloned).pipe(
    catchError((err) => {
      if (err.status === 401) {                                // Se il server dice 401 = token scaduto
        localStorage.removeItem('auth_token');                 // Rimuovi il token
        toastCtrl.create({                                     // Mostra un avviso toast
          message: 'Sessione scaduta, effettua nuovamente l\'accesso',
          duration: 3000, color: 'danger'
        }).then(t => t.present());
        router.navigateByUrl('/login');                        // Reindirizza al login
      }
      return throwError(() => err);
    })
  );
};
```

"L'Interceptor clona ogni richiesta (in Angular sono immutabili) e aggiunge `Authorization: Bearer <token>`. Al ritorno, se il backend risponde **401**, rimuove il token scaduto e reindirizza al login con un toast. L'utente non vede mai un errore tecnico."

"L'interceptor viene registrato globalmente nel bootstrap dell'app:"

```typescript
// main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([httpIntInterceptor])),  // Registra l'interceptor su TUTTE le chiamate
    provideRouter(routes, withPreloading(PreloadAllModules)),   // Configura il router
    provideIonicAngular(),                                      // Abilita Ionic
  ],
});
```

### 4.7 — Il Middleware backend: verifica e autorizzazione

*(Apri `authMiddleware.js`)*

```javascript
function verifyToken(req, res, next) {
  const header = req.headers.authorization;                   // Legge l'header Authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante' }); // Blocca se manca
  }

  const token = header.slice(7);           // Estrae il token (rimuove "Bearer " — 7 caratteri)

  try {
    req.user = jwt.verify(token, JWT_SECRET);  // Verifica firma e decodifica → req.user = {id, email, role}
    next();                                    // Token valido → passa al controller
  } catch (err) {
    return res.status(401).json({ error: 'Token non valido o scaduto' });
  }
}

// Factory: restituisce un middleware personalizzato per il controllo del ruolo
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accesso negato: ruolo non autorizzato' });  // 403 Forbidden
    }
    next();
  };
}
```

"I **middleware** Express sono funzioni `(req, res, next)` eseguiti in sequenza come una catena. Possono modificare la richiesta (`req.user`), bloccarla con una risposta di errore, o passarla al prossimo con `next()`. `requireRole` è una **factory function**: non è un middleware, ma una funzione che *restituisce* un middleware configurato. Si montano così sulle rotte:"

```javascript
// patientRoutes.js
router.use(verifyToken, requireRole('paziente'));  // TUTTE le rotte paziente passano da qui
router.get('/today-card', getTodayCard);           // Solo se autenticato E con ruolo 'paziente'
router.post('/session-logs', upload.single('photo_file'), saveSessionLog);
```

---

## 🛡️ FASE 5 — Protezione rotte anche lato Frontend (Guards)

*(Dopo il login con il fisioterapista, sei nella Dashboard)*

**Tu:**
"Come ha visto, dopo il login siamo nella Dashboard perché l'utente è un fisioterapista. Questa separazione avviene grazie ai **Route Guards** di Angular."

*(Apri `app.routes.ts`)*

```typescript
export const routes: Routes = [
  {
    path: 'login',
    // loadComponent = lazy loading: il codice viene scaricato solo quando serve
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard, roleGuard('fisioterapista')],   // Solo fisioterapisti autenticati
    loadComponent: () => import('./dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: '',
    canActivate: [authGuard, roleGuard('paziente')],         // Solo pazienti autenticati
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  { path: '**', redirectTo: 'login' },  // Wildcard: URL sconosciuti → login
];
```

```typescript
// auth.guard.ts — Guard di autenticazione
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;               // Token valido → consenti
  return inject(Router).createUrlTree(['/login']);        // Altrimenti → reindirizza al login
};

// role.guard.ts — Guard per il ruolo (factory function)
export function roleGuard(expectedRole: 'fisioterapista' | 'paziente'): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
    if (auth.getRole() === expectedRole) return true;    // Ruolo corretto → ok
    // Ruolo sbagliato → reindirizza all'area corretta
    const fallback = auth.getRole() === 'fisioterapista' ? '/dashboard' : '/tabs/tab1';
    return router.createUrlTree([fallback]);
  };
}
```

"Se un paziente provasse a digitare `/dashboard` nella barra degli indirizzi, il `roleGuard('fisioterapista')` lo bloccherebbe e lo reindirizzerebbe alla sua area. La sicurezza è **doppia**: lato frontend con i guards e lato backend con i middleware. Il **lazy loading** è un'ottimizzazione: il codice di una pagina viene scaricato solo quando l'utente ci naviga, riducendo il tempo di caricamento iniziale."

---

## 🏋️ FASE 6 — Area Paziente: la sessione di allenamento

*(Fai logout. Rifai login come paziente: `luigi.bianchi@email.it` / `paziente123`. L'app mostra le tabs.)*

**Tu:**
"Ora le faccio vedere l'esperienza del paziente. Dopo il login entriamo nella struttura a **Tabs**: in basso ci sono tre pulsanti — Scheda, Diario, Mappa. La Tab 1 è la più importante: mostra la scheda di oggi."

### 6.1 — Il Service e il caricamento dati

*(La Tab1 carica automaticamente la scheda "Protocollo Lombalgia — Settimana 1")*

```typescript
// patient.service.ts — Service che gestisce le API del paziente

// Le interfacce TypeScript definiscono la "forma" dei dati → type-checking a compile time
export interface Exercise {
  id: number;               // ID univoco
  name: string;             // Nome (es. "Stretching lombare")
  sets: number;             // Numero di serie
  reps_or_duration: string; // Ripetizioni o durata
  rest_seconds: number;     // Recupero in secondi
  posture_notes: string;    // Note posturali del fisioterapista
}

@Injectable({ providedIn: 'root' })   // Singleton: una sola istanza per tutta l'app
export class PatientService {
  private readonly http = inject(HttpClient);                      // Client HTTP iniettato
  private readonly baseUrl = `${environment.apiUrl}/patient`;      // "http://localhost:3000/api/patient"

  getTodayCard(): Observable<TodayCardResponse> {
    // GET /api/patient/today-card — restituisce un Observable (lazy: non parte finché non c'è subscribe)
    return this.http.get<TodayCardResponse>(`${this.baseUrl}/today-card`);
  }

  saveSessionLog(logData: { ... }): Observable<any> {
    if (logData.photo_file) {
      const formData = new FormData();                   // FormData = formato per upload file (multipart)
      formData.append('card_id', String(logData.card_id));
      formData.append('photo_file', logData.photo_file, 'diary.jpg');
      return this.http.post(`${this.baseUrl}/session-logs`, formData);
    } else {
      return this.http.post(`${this.baseUrl}/session-logs`, payload);  // Senza foto → JSON normale
    }
  }
}
```

"Il concetto chiave qui è l'**Observable** di RxJS. A differenza di una **Promise** (singolo valore, non cancellabile), un Observable è **lazy** (non parte finché non si fa `.subscribe()`), **cancellabile** (`.unsubscribe()`), e componibile con operatori come `pipe()`, `finalize()`, `catchError()`."

### 6.2 — Il componente Tab1: subscribe e change detection

*(Nell'app, la scheda mostra gli esercizi con serie, ripetizioni e note posturali)*

```typescript
// tab1.page.ts
export class Tab1Page implements OnInit, OnDestroy {
  private readonly patientService = inject(PatientService);  // Service iniettato
  card: Card | null = null;          // Scheda di oggi
  exercises: Exercise[] = [];        // Lista esercizi

  ngOnInit(): void {                 // Lifecycle hook: chiamato QUANDO il componente viene creato
    this.loadTodayCard();
  }

  loadTodayCard(): void {
    this.loading = true;
    this.patientService.getTodayCard()       // Chiama il service → parte la GET
      .pipe(finalize(() => {                 // finalize() = come un 'finally': eseguito sempre
        this.loading = false;                // Disattiva lo spinner in ogni caso
        this.cdr.detectChanges();            // Forza Angular a ridisegnare la UI
      }))
      .subscribe({
        next: (res) => {                     // Dati arrivati dal server
          this.card = res?.card ?? null;
          this.exercises = res?.exercises ?? [];
          // Angular rileva il cambio e aggiorna automaticamente il template (change detection)
        },
        error: (err) => {
          this.error = err?.error?.error || 'Errore nel caricamento';
        },
      });
  }
}
```

"Quando i dati arrivano nel `next`, le variabili cambiano e Angular **aggiorna automaticamente il template** grazie alla **change detection**. Nel template la lista di esercizi viene renderizzata con `@for`:"

```html
<!-- tab1.page.html -->
@if (loading) {                                           <!-- Se sta caricando → spinner -->
  <ion-spinner name="crescent"></ion-spinner>
}

@if (!loading && card && exercises.length > 0) {
  <h1>{{ card.title }}</h1>                               <!-- Interpolation: titolo della scheda -->

  <!-- @for = nuova sintassi Angular 17+ (sostituisce *ngFor) -->
  <!-- track ex.id = ottimizzazione: Angular ri-renderizza solo gli elementi che cambiano -->
  @for (ex of exercises; track ex.id) {
    <div class="exercise-card">
      <span>{{ ex.name }}</span>                           <!-- Nome dell'esercizio -->
      <span>{{ ex.sets }} serie × {{ ex.reps_or_duration }}</span>
      @if (ex.posture_notes) {                            <!-- Note mostrate solo se presenti -->
        <p>{{ ex.posture_notes }}</p>
      }
    </div>
  }

  <ion-button (click)="startWorkout()">Inizia Sessione</ion-button>
}
```

### 6.3 — Fine sessione: feedback e salvataggio

*(Clicca "Inizia Sessione", completa qualche esercizio. Al termine appare il form di feedback con slider dolore, note e bottone foto. Clicca "Invia Feedback".)*

**Tu:**
"Al termine, il paziente indica il livello di dolore, scrive note e opzionalmente scatta una foto con **Capacitor** (il bridge di Ionic verso le API native del dispositivo). Quando clicca 'Invia Feedback':"

```typescript
// tab1.page.ts — Invio del feedback
submitFeedback(): void {
  if (!this.card) return;
  this.sessionLogState = 'saving';             // UI → "salvataggio in corso"

  this.patientService.saveSessionLog({         // Chiama il service → POST al backend
    card_id: this.card.id,
    duration_seconds: this.totalElapsedSeconds, // Durata dal timer
    pain_level: this.painLevel,                // Slider dolore (1-10)
    patient_notes: this.patientNotes,
    photo_file: this.photoBlob || undefined    // Foto come Blob binario (opzionale)
  }).subscribe({
    next: () => {
      this.card.is_completed_today = true;     // Segna la scheda come completata
      this.workoutState = 'completed';         // Mostra "Sessione Registrata ✓"
    },
    error: () => { this.sessionLogState = 'error'; },
  });
}
```

### 6.4 — Il Controller backend: salvataggio con upload Multer

*(Apri `patientControllers.js`)*

```javascript
async function saveSessionLog(req, res) {
  const { card_id, pain_level, patient_notes, duration_seconds } = req.body;

  // Controllo di AUTORIZZAZIONE: la scheda deve appartenere al paziente autenticato
  const card = await Card.findById(card_id);
  if (!card || card.patient_id !== req.user.id) {   // req.user viene dal middleware verifyToken
    return res.status(403).json({ error: 'Scheda non associata al paziente autenticato' });
  }

  // req.file è popolato da Multer se è stato inviato un file
  const photoUrl = req.file ? `/uploads/diaries/${req.file.filename}` : null;

  // Prepared Statement: i ? prevengono SQL Injection
  const id = await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO session_logs (card_id, patient_id, pain_level, patient_notes, duration_seconds, photo_base64)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [card_id, req.user.id, parsedPainLevel ?? null, patient_notes || '', parsedDuration ?? 0, photoUrl],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);                  // ID auto-generato dal DB
      }
    );
  });

  res.status(201).json({ id, card_id, ... });  // 201 Created = risorsa creata con successo
}
```

"**Multer** è un middleware Node.js per gestire l'upload di file binari. Viene montato sulla rotta come `upload.single('photo_file')` e popola automaticamente `req.file` con il file ricevuto."

---

## 🎯 FASE 7 — Domande e Risposte

---

### D: "Node.js è single-thread: come gestisce richieste concorrenti?"

**Tu:**
"Node.js usa l'**Event Loop** e l'**I/O asincrono non bloccante**. Quando il codice deve interrogare il database (es. `db.run()`), Node non si ferma ad aspettare: delega l'operazione al sistema operativo in background e torna subito disponibile per servire altre richieste. Quando il DB risponde, inserisce una callback in coda. L'Event Loop la preleva e la esegue sul thread principale. Ecco perché nel nostro codice usiamo callback e Promise con `await`: Node non si blocca mai."

---

### D: "Che differenza c'è tra un Observable e una Promise?"

**Tu:**
"La **Promise** emette un singolo valore e non è cancellabile. L'**Observable** (RxJS) è lazy (non parte senza `.subscribe()`), cancellabile (`.unsubscribe()`), e supporta operatori come `pipe()`, `tap()`, `finalize()`, `catchError()` per comporre flussi di dati in modo dichiarativo. Nel nostro progetto, anche se le chiamate HTTP emettono un singolo valore, il vantaggio è poter usare `finalize()` per disattivare lo spinner in ogni caso, o `tap()` per salvare il token come effetto collaterale."

---

### D: "Cos'è la Dependency Injection?"

**Tu:**
"È un pattern in cui un oggetto non crea le proprie dipendenze, ma le riceve dall'esterno. In Angular, l'iniettore crea automaticamente le istanze dei Service e le fornisce ai componenti. Il nostro `Tab1Page` non fa mai `new PatientService()`, scrive `inject(PatientService)` e Angular fornisce l'istanza. Con `@Injectable({ providedIn: 'root' })` il service diventa un Singleton globale. I vantaggi: testabilità (si iniettano mock nei test), riusabilità e disaccoppiamento."

---

### D: "Come prevenite le SQL Injection?"

**Tu:**
"Con i **Prepared Statements**: non concateniamo mai input utente nella stringa SQL. Mettiamo dei `?` e i valori come array separato. Il driver SQLite fa l'escaping automaticamente. Anche `'; DROP TABLE users;--` verrebbe trattato come testo, non come codice."

---

### D: "Perché Ionic e non un'app nativa?"

**Tu:**
"Ionic ci dà un'unica codebase TypeScript per web, Android e iOS. I componenti si adattano automaticamente alla piattaforma (Material su Android, Cupertino su iOS). Per le API native come la fotocamera, usiamo **Capacitor** come bridge. Per un progetto accademico, tre app separate sarebbero state impraticabili."

---

## 🏁 FASE 8 — Chiusura

**Tu:**
"Per concludere, sviluppare RehabTrack ci ha permesso di applicare concretamente i concetti visti a lezione: l'architettura REST, l'autenticazione stateless con JWT, la validazione con Reactive Forms, il data-binding e la change detection di Angular, l'Event Loop di Node.js e la sicurezza con bcrypt e Prepared Statements. Una delle sfide più formative è stata la gestione della catena di middleware per l'autenticazione e l'autorizzazione, perché un errore nell'ordine di montaggio poteva lasciare rotte non protette. Se desidera, posso mostrarle altre parti di codice."
