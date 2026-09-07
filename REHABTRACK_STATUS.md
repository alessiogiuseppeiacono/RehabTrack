# REHABTRACK_STATUS.md — Stato Codebase Pre-Sprint Finale

> Generato il 2026-09-07 dopo analisi completa della codebase.
> Destinato a un agente LLM che dovrà eseguire lo Sprint Finale (Polish UI + Build Mobile).

---

## 1. Stato del Progetto (Riepilogo)

### Lato Paziente (Mobile — Tab-based)

| Feature | Stato | File principali |
| :--- | :--- | :--- |
| **Login / Logout** | ✅ Funzionante | `login/login.page.ts`, `services/auth.service.ts` |
| **Scheda odierna (Tab 1)** | ✅ Funzionante | `tab1/tab1.page.ts` — lista esercizi, empty state, loading, errore |
| **Timer countdown per recupero** | ✅ Funzionante | `components/timer/timer.component.ts` |
| **Timer sessione + Report dolore** | ✅ Funzionante | `components/session-timer/session-timer.component.ts` — cronometro + form pain_level (1-10) + note |
| **Log sessione al backend** | ✅ Funzionante | `PatientService.saveSessionLog()` → `POST /api/patient/session-logs` |
| **Galleria Diario Posturale (Tab 2)** | ✅ Funzionante | `tab2/tab2.page.ts` — Camera/file picker, griglia 2 col, localStorage, modal preview, eliminazione |
| **Mappa + GPS (Tab 3)** | ✅ Funzionante | `tab3/tab3.page.ts` — Leaflet, marker centro riab., geolocalizzazione con fallback Palermo |

### Lato Terapista (Desktop — Dashboard)

| Feature | Stato | File principali |
| :--- | :--- | :--- |
| **Dashboard master-detail** | ✅ Funzionante | `dashboard/dashboard.page.ts` — CSS Grid 2 colonne, responsive ≤768px |
| **Lista pazienti + filtro ricerca** | ✅ Funzionante | Filtro locale sull'array `patients[]` con `ion-searchbar` |
| **Storico sessioni paziente** | ✅ Funzionante | `TherapistService.getPatientLogs()` — griglia card con dolore/durata/note |
| **Schede assegnate** | ✅ Funzionante | `TherapistService.getPatientCards()` — conteggio esercizi JOIN |
| **Compositore schede (modale)** | ✅ Funzionante | `dashboard/card-composer.component.ts` — FormArray, validazione, Toast successo/errore |
| **Feedback & Diario (modale)** | ✅ Funzionante | `dashboard/feedback-viewer.component.ts` — statistiche avg/critico, cronologia, sezione diario con fallback |
| **Creazione paziente** | ✅ Endpoint OK | `TherapistService.createPatient()` — endpoint backend pronto, UI non ancora implementata |

### Backend (Express 5 + SQLite)

| Feature | Stato | Note |
| :--- | :--- | :--- |
| **Autenticazione JWT** | ✅ | `POST /api/auth/login`, `POST /api/auth/register` |
| **Middleware auth** | ✅ | `verifyToken` + `requireRole()` su tutte le rotte protette |
| **Interceptor HTTP (frontend)** | ✅ | Risolve URL relativi → `http://localhost:3000/api`, inietta Bearer, redirect 401 |
| **API Paziente** | ✅ | `GET /today-card`, `POST /session-logs` con validazione input |
| **API Terapista** | ✅ | `GET /patients`, `POST /patients`, `POST /cards`, `GET /patients/:id/logs`, `GET /patients/:id/cards` |
| **Schema DB + Seed** | ✅ | 4 tabelle (`users`, `cards`, `exercises`, `session_logs`), seed con dati di esempio |
| **Error handler centralizzato** | ✅ | `server.js` — middleware Express 5 per Promise rigettate |

---

## 2. Bug Noti e Debito Tecnico (Da Sistemare)

### 2.1 Tipizzazione `any` nel CardComposerComponent

**File**: `dashboard/card-composer.component.ts:108`
```typescript
exercises: this.form.value.exercises.map((ex: any, i: number) => ({
```
- **Problema**: `ex` è tipizzato `any` perché `FormGroup.value` restituisce `{ [key: string]: any }`. È un pattern comune con Reactive Forms, ma è un warning Angular/TS implicito.
- **Fix**: Definire un'interfaccia `ExerciseFormValue` e usare `this.form.getRawValue()` + cast esplicito, oppure lasciare `any` con un commento `// ponytail: FormGroup.value is inherently untyped`.
- **Severità**: ⚠️ Bassa — non causa bug, solo rumore di linting.

### 2.2 `standalone: true` mancante in Tab1Page e LoginPage

**File**: `tab1/tab1.page.ts:19-31`, `login/login.page.ts:11-20`
- **Problema**: I decorator `@Component` di `Tab1Page` e `LoginPage` **non** includono `standalone: true`. In Angular 19+ con il default `standalone: true` a livello di compilatore, questo funziona comunque, ma è **incoerente** con `Tab2Page`, `Tab3Page`, `DashboardPage`, `CardComposerComponent`, `FeedbackViewerComponent` e `SessionTimerComponent` che lo dichiarano esplicitamente.
- **Fix**: Aggiungere `standalone: true` nei decoratori per consistenza.
- **Severità**: ⚠️ Bassa — funziona per via del default di Angular 19, ma va uniformato.

### 2.3 `formatDuration()` duplicato

**File**: `dashboard/dashboard.page.ts:170-174` e `dashboard/feedback-viewer.component.ts:80-82`
- **Problema**: La stessa funzione `formatDuration(seconds)` è implementata in due componenti diversi con logica identica.
- **Fix**: Estrarre in una funzione utility condivisa (o un Pipe Angular), oppure ignorare (YAGNI — sono 2 righe).
- **Severità**: ℹ️ Minima — codice duplicato ma triviale.

### 2.4 URL backend hardcoded `http://localhost:3000`

**File**: `services/patient.service.ts:41`, `services/therapist.service.ts:71`, `http-int.interceptor.ts:6-7`
- **Problema**: L'URL del backend è hardcoded in 3 posti diversi. Funziona in dev ma **rompe la build mobile**: su un device nativo, `localhost` punta al device stesso, non al PC di sviluppo.
- **Fix per Sprint Finale**: Centralizzare in `environment.ts` / `environment.prod.ts`. Per Capacitor su device fisico, usare l'IP della rete locale (es. `http://192.168.x.x:3000`) o configurare un server di backend deployato.
- **Severità**: 🔴 **Critico per il build mobile** — l'app su iOS/Android non riuscirà a contattare il backend.

### 2.5 `capacitor.config.ts` — valori placeholder

**File**: `frontend/capacitor.config.ts`
```typescript
appId: 'io.ionic.starter',
appName: 'frontend',
```
- **Problema**: `appId` e `appName` sono ancora quelli di default del template Ionic.
- **Fix**: Rinominare in `it.rehabtrack.app` e `RehabTrack`.
- **Severità**: 🔴 **Bloccante per rilascio mobile** — l'app store rifiuterebbe `io.ionic.starter`.

### 2.6 Nessun progetto nativo (`ios/`, `android/`) inizializzato

- **Problema**: Le cartelle `ios/` e `android/` non esistono nella root di `frontend/`. Capacitor CLI è installato (`@capacitor/cli: 8.5.1`) ma `npx cap add ios` e `npx cap add android` non sono mai stati eseguiti.
- **Fix**: Eseguire `npx cap add android` (e/o `npx cap add ios`) dopo il primo `ng build`.
- **Severità**: 🔴 **Bloccante per build mobile**.

### 2.7 Gestione errori HTTP — stato attuale

| Componente | Errore gestito? | Meccanismo |
| :--- | :--- | :--- |
| `LoginPage` | ✅ Sì | Messaggio inline (`errorMsg`) nel template |
| `Tab1Page.loadTodayCard()` | ✅ Sì | Stato `error` con messaggio visualizzato in template; 404 → empty state |
| `Tab1Page.onSessionFinished()` | ⚠️ Parziale | Stato `sessionLogState = 'error'` → nota rossa "Errore nel salvataggio", **ma nessun dettaglio** (il messaggio di errore HTTP viene ignorato) |
| `DashboardPage.loadPatients()` | ✅ Sì | Stato `patientsError` visualizzato nel template |
| `DashboardPage.selectPatient()` — logs | ✅ Sì | Stato `logsError` visualizzato nel template |
| `DashboardPage.selectPatient()` — cards | ❌ **No** | L'errore delle cards è **silenziosamente ignorato**: il subscribe ha solo `next`, nessun `error` handler |
| `CardComposerComponent.submit()` | ✅ Sì | Toast di errore con `ToastController` (buon pattern) |
| `FeedbackViewerComponent` | ✅ Sì | Stato `error` visualizzato nel template |
| **Interceptor 401** | ✅ Sì | Redirect automatico a `/login` |
| **Errori di rete generici** (backend down) | ⚠️ Parziale | Ogni componente gestisce il suo errore localmente. Non c'è un **Toast globale** per errori di rete (es. `ERR_CONNECTION_REFUSED`). L'utente vede messaggi tecnici come "Http failure response" |

### 2.8 Cartella `components/rest-timer/` vuota

**File**: `components/rest-timer/` — directory presente ma completamente vuota.
- **Fix**: Eliminare la directory.
- **Severità**: ℹ️ Cosmetica.

### 2.9 Import doppio di `Patient` nel FeedbackViewerComponent

**File**: `dashboard/feedback-viewer.component.ts:16-17`
```typescript
import { TherapistService, PatientLog } from '../services/therapist.service';
import { Patient } from '../services/therapist.service';
```
- **Problema**: Due `import` dallo stesso modulo su righe consecutive. Funziona, ma è rumore.
- **Fix**: Unificare in un singolo `import { TherapistService, PatientLog, Patient } from ...`.
- **Severità**: ℹ️ Cosmetica.

### 2.10 Import doppio di `Patient` nel CardComposerComponent

**File**: `dashboard/card-composer.component.ts:18-19`
```typescript
import { TherapistService, CardPayload } from '../services/therapist.service';
import { Patient } from '../services/therapist.service';
```
- **Fix**: Stesso del punto 2.9 — unificare in un singolo import.
- **Severità**: ℹ️ Cosmetica.

### 2.11 Session log seed senza `duration_seconds`

**File**: `backend/db/db.js:203-208`
```javascript
`INSERT INTO session_logs (card_id, patient_id, pain_level, patient_notes) VALUES (?, ?, ?, ?)`
```
- **Problema**: Il session log di seed non include `duration_seconds`, che verrà quindi inizializzato a `0` (il default della colonna). Nella dashboard il log di esempio mostrerà "0m 0s", che è fuorviante.
- **Fix**: Aggiungere un valore realistico, es. `duration_seconds: 720` (12 minuti).
- **Severità**: ℹ️ Cosmetica per demo.

---

## 3. Edge Cases & UI Polish

### 3.1 Empty States — Verifica completezza

| Pagina / Componente | Empty State presente? | Dettaglio |
| :--- | :--- | :--- |
| Tab1 — Scheda odierna (no scheda) | ✅ Sì | Icona + "Nessuna scheda per oggi" + sottotesto esplicativo |
| Tab1 — Errore caricamento | ✅ Sì | Icona pericolo + messaggio errore dinamico |
| Tab2 — Galleria vuota (0 foto) | ✅ Sì | Icona camera + "Nessuna foto ancora" |
| Tab3 — Mappa | ✅ N/A | Mappa sempre visibile con marker centro di default |
| Dashboard — Nessun paziente selezionato | ✅ Sì | Icona grande + "Seleziona un paziente" + sottotesto |
| Dashboard — Lista pazienti vuota | ✅ Sì | Icona persona + "Nessun paziente associato" / "Nessun paziente trovato" (filtro) |
| Dashboard — Errore lista pazienti | ✅ Sì | Icona pericolo rossa + messaggio |
| Dashboard — Nessun log sessione | ✅ Sì | Icona calendario + "Nessuna sessione registrata" |
| Dashboard — Errore log sessioni | ✅ Sì | Icona pericolo rossa + messaggio |
| Dashboard — Nessuna scheda assegnata | ✅ Sì | Icona fitness + "Nessuna scheda assegnata" |
| Feedback Viewer — Nessun log | ✅ Sì | Icona calendario + titolo + sottotesto esplicativo |
| Feedback Viewer — Errore caricamento | ✅ Sì | Icona pericolo rossa + messaggio |
| Feedback Viewer — Diario posturale | ✅ Sì | Messaggio fallback "foto salvate localmente sul device" |

**Risultato**: Tutti gli empty state sono gestiti. ✅

### 3.2 Coerenza UI tra le pagine

| Aspetto | Coerente? | Note |
| :--- | :--- | :--- |
| **Icone Ionicons** | ✅ | Tutte registrate con `addIcons()` dove usate |
| **Pattern loading** | ✅ | Tutte le pagine: `ion-spinner name="crescent"` + testo "Caricamento..." |
| **Pattern errore** | ✅ | `alert-circle-outline` + testo rosso su tutte le pagine |
| **Palette colori** | ✅ | Usa la palette Ionic default (`primary`, `secondary`, `danger`, `warning`, `success`, `medium`) |
| **Badge dolore 3 livelli** | ⚠️ Parziale | `FeedbackViewerComponent` usa 3 livelli (verde ≤4, arancio ≤7, rosso >7). `DashboardPage` usa solo 2 livelli (verde ≤7, rosso >7) via `isPainCritical()`. **Incoerenza** |
| **Layout responsive** | ✅ | Dashboard collassa a colonna singola su ≤768px. Tab mobile funzionano nativamente |
| **Footer card-composer** | ⚠️ | `background: #fff` hardcoded nel footer del compositore. Non rispetterà un eventuale dark mode |
| **CSS class naming** | ✅ | Convenzione coerente: `state-center`, `detail-*`, `panel-*`, `log-*`, `session-*` |
| **Font** | ✅ | Usa i font di default Ionic (system font stack) |

### 3.3 Accessibilità

- `aria-label` presente su pulsante elimina foto (Tab2) e pulsante aggiungi foto (Tab2). ✅
- Dashboard e modali: nessun `aria-label` esplicito sui bottoni, ma Ionic aggiunge attributi ARIA automaticamente. ⚠️ Verificare con screen reader.

---

## 4. Roadmap per il Prossimo Sprint (Fase Finale)

### 4.1 Fix Bug e Debito Tecnico

- [ ] **[CRITICO] Centralizzare URL backend**: Spostare `http://localhost:3000` in `environment.ts` / `environment.prod.ts` e referenziarlo nei servizi e nell'interceptor. Per il build mobile, configurare l'URL produzione/rete locale.
- [ ] **[CRITICO] Aggiornare `capacitor.config.ts`**: Cambiare `appId` → `it.rehabtrack.app`, `appName` → `RehabTrack`.
- [ ] **[BUG] Gestire errore cards nella dashboard**: Aggiungere handler `error` nel subscribe di `getPatientCards()` in `dashboard.page.ts:141`.
- [ ] **[BUG] Allineare badge dolore**: Usare lo stesso schema a 3 livelli (verde/arancio/rosso) sia nella dashboard che nel feedback viewer.
- [ ] **[MINOR] Aggiungere `standalone: true`** esplicitamente a `Tab1Page` e `LoginPage` per consistenza.
- [ ] **[MINOR] Unificare import doppi** in `card-composer.component.ts` e `feedback-viewer.component.ts`.
- [ ] **[MINOR] Eliminare directory vuota** `components/rest-timer/`.
- [ ] **[MINOR] Tipizzare `ex: any`** nel card-composer oppure annotare con commento `ponytail:`.
- [ ] **[MINOR] Aggiungere `duration_seconds`** al session log di seed in `db.js` per una demo più realistica.
- [ ] **[NICE-TO-HAVE] Migliorare errore sessione** in `Tab1Page.onSessionFinished()`: mostrare il messaggio di errore HTTP, non solo "Errore nel salvataggio".

### 4.2 Capacitor — Build Mobile

- [ ] Eseguire `ng build --configuration=production` (o `development` per debug).
- [ ] Eseguire `npx cap add android` nella directory `frontend/`.
- [ ] (Facoltativo) Eseguire `npx cap add ios` se l'ambiente ha Xcode.
- [ ] Eseguire `npx cap sync` per copiare il build web nelle cartelle native.
- [ ] Verificare che `capacitor.config.ts` abbia `webDir: 'www'` (già corretto) e che `angular.json` `outputPath` punti a `www/browser` o sia allineato.
- [ ] Verificare permessi nativi in `AndroidManifest.xml` / `Info.plist`:
  - Camera (`@capacitor/camera`)
  - Geolocalizzazione (`@capacitor/geolocation`)
- [ ] Testare su emulatore Android (Android Studio) e/o device fisico.

### 4.3 Polish UI (Sprint Finale)

- [ ] **Dark mode**: Verificare che i colori hardcoded (`#fff`, `#f4f5f8`, `background: #fff` nel footer card-composer) rispettino `prefers-color-scheme: dark`. Usare le CSS custom properties di Ionic dove possibile.
- [ ] **Splash screen / App icon**: Generare risorse con `@capacitor/assets` o manualmente per Android/iOS.
- [ ] **Loading globale**: Valutare un interceptor che mostra un Toast generico su errori di rete (`ERR_CONNECTION_REFUSED`, `status === 0`).
- [ ] **Animazioni di transizione**: Le modali della dashboard usano le animazioni default Ionic — verificare che siano fluide anche su mobile.
- [ ] **Feedback tattile**: Verificare se `@capacitor/haptics` (già installato) è usato da qualche parte — al momento non lo è. Aggiungere feedback aptico al submit del report sessione e alla creazione scheda.

### 4.4 Testing Finale

- [ ] **Build pulita**: `ng build --configuration=production` senza errori e warning.
- [ ] **Lint**: Eseguire `ng lint` e risolvere eventuali warning.
- [ ] **Test funzionale manuale**:
  - Login paziente → Tab1 (scheda + timer + report) → Tab2 (foto) → Tab3 (mappa GPS)
  - Login terapista → Dashboard → Seleziona paziente → Crea scheda → Vedi Feedback
  - Login con credenziali errate → messaggio errore
  - Backend down → verifica che l'UI non si blocchi
- [ ] **Test su device/emulatore**: Dopo `npx cap sync`, aprire il progetto Android in Android Studio e verificare il funzionamento end-to-end.
- [ ] **Verifica routing**: Paziente non può accedere a `/dashboard`; terapista non può accedere a `/tabs/*`.

---

## 5. File Tree Aggiornato

```
backend/
  server.js                         # Express 5, CORS, porta 3000
  db/db.js                          # Schema SQLite + seed (4 tabelle)
  controllers/
    authControllers.js              # Login + Register (bcrypt + JWT)
    patientControllers.js           # getTodayCard, saveSessionLog
    therapistControllers.js         # getPatients, createPatient, createCard, getPatientLogs, getPatientCards
  routes/
    authRoutes.js                   # POST /auth/login, /auth/register
    patientRoutes.js                # GET /today-card, POST /session-logs
    therapistRoutes.js              # GET+POST /patients, POST /cards, GET /patients/:id/logs, GET /patients/:id/cards
  middleware/authMiddleware.js      # verifyToken, requireRole
  models/
    userModel.js                    # User (findByEmail, findById, create, findPatientsByTherapist)
    cardModel.js                    # Card (create, findById, findTodayCard, findByPatient), Exercise (createBulk, findByCard)

frontend/src/app/
  app.routes.ts                    # Routes: /login, /dashboard (fisioterapista), / → tabs (paziente), ** → login
  http-int.interceptor.ts          # Bearer token, URL resolve, redirect 401
  guards/
    auth.guard.ts                  # isAuthenticated() check
    role.guard.ts                  # roleGuard('fisioterapista' | 'paziente') factory
  services/
    auth.service.ts                # Login, register, JWT decode (atob), token mgmt, logout
    patient.service.ts             # getTodayCard(), saveSessionLog()
    therapist.service.ts           # getPatients(), getPatientLogs(), createPatient(), createCard(), getPatientCards() + interfacce
  login/                           # Pagina login (ReactiveFormsModule, validazione, routing per ruolo)
  tab1/                            # Scheda odierna paziente (loading/errore/vuoto/lista esercizi + timer sessione)
  tab2/                            # Diario posturale (camera/file picker, griglia, localStorage, modal preview)
  tab3/                            # Mappa Leaflet + GPS geolocalizzazione
  tabs/                            # Tab bar layout (tab1=Scheda, tab2=Diario, tab3=Mappa)
  components/
    timer/                         # TimerComponent — countdown per recupero esercizio
    session-timer/                 # SessionTimerComponent — cronometro sessione + form report dolore
    rest-timer/                    # ⚠️ VUOTO — da eliminare
  dashboard/
    dashboard.page.*               # Master-detail terapista: lista pazienti, storico, schede assegnate
    card-composer.component.*      # Modale: compositore schede con FormArray esercizi
    feedback-viewer.component.*    # Modale: cronologia feedback dolore + sezione diario posturale

frontend/capacitor.config.ts      # ⚠️ appId/appName da aggiornare
frontend/src/environments/
    environment.ts                 # { production: false } — manca API_URL
    environment.prod.ts            # { production: true } — manca API_URL
frontend/src/global.scss           # CSS globali + import Leaflet
frontend/src/assets/leaflet/       # Icone marker Leaflet
```

---

## 6. Credenziali Seed (per testing)

| Ruolo | Email | Password |
| :--- | :--- | :--- |
| Fisioterapista | `dott.rossi@rehabtrack.it` | `terapista123` |
| Paziente | `luigi.bianchi@email.it` | `paziente123` |

**Nota**: Per resettare il DB, eliminare `backend/db/rehabtrack.db` e riavviare il server. Il seed verrà rieseguito automaticamente.
