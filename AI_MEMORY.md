# 🧠 AI_MEMORY.md — RehabTrack (branch `feature/sprint4-task-303-therapist-dashboard`)

> Cervello esterno dell'agente. Leggere PRIMA di scrivere codice e aggiornare DOPO ogni task.
> Regole operative: vedere `AGENTS.md` (lazy senior dev — riusare > riscrivere, diff minimo).

---

## 📌 Stato Sprint 2 (Sviluppatore B) — completato

| Task | Stato | Note |
| :--- | :--- | :--- |
| TASK-401 — Controller & Routes Paziente (backend) | ✅ | `GET /today-card`, `POST /session-logs` |
| TASK-402 — Scheda odierna (Tab 1) | ✅ | 404/scheda vuota → stato amichevole; esercizi in `<ion-list>` |
| TASK-403 — Timer sessione + log durata | ✅ | `SessionTimerComponent`; stato 'report' dopo Termina |
| TASK-404 — Form report fine sessione | ✅ | Slider pain_level (1-10) + textarea note; emette `SessionReport` |

## 📌 Stato Sprint 3 (Sviluppatore B) — branch `feature/sprint3-tasks-502-503`

| Task | Stato | Note |
| :--- | :--- | :--- |
| TASK-501 — Camera Service | ✅ (inline) | Logica camera integrata direttamente in `tab2.page.ts`; nessun service separato (YAGNI) |
| TASK-502 — Galleria Diario Posturale (Tab Camera) | ✅ | FAB, griglia 2 col, persistenza `localStorage`, deletePhoto, modal preview full-screen |
| TASK-503 — Mappa Leaflet (Tab Mappa) | ✅ | `L.map()` in `ionViewDidEnter`, OSM tiles, marker Centro di Riabilitazione, fix icone, invalidateSize |
| TASK-504 — GPS + Geolocalizzazione | ✅ | `Geolocation.getCurrentPosition`, marker utente, cerchio accuratezza, fallback silenzioso su Palermo |

## 📌 Stato Sprint 4 (Sviluppatore A) — branch `feature/sprint4-task-303-therapist-dashboard`

| Task | Stato | Note |
| :--- | :--- | :--- |
| TASK-303 — Dashboard Desktop Fisioterapista | ✅ | `TherapistService`, layout master-detail CSS Grid, lista pazienti con filtro, storico log sessioni |
| TASK-304 — Compositore Schede Esercizi | ✅ | `CardComposerComponent` (modale, `FormArray`), fix layout desktop (max-width 720px, max-height 85vh) |
| TASK-305 — Vista Feedback Dolore & Diario Posturale | ✅ | `FeedbackViewerComponent`, sezione Schede Assegnate, `getPatientCards()`, badge dolore colorato, diario con fallback |

> Sprint 4 **COMPLETATO** — build pulita (0 errori, 0 warning)

---

## 🏗️ Decisioni architetturali

1. **URL assoluti obbligatori** nell'HttpClient (anti-crash `Invalid base URL`):
   - `PatientService.baseUrl = 'http://localhost:3000/api/patient'`
   - L'interceptor (`http-int.interceptor.ts`) risolve comunque ogni URL verso `http://localhost:3000/api` e inietta `Authorization: Bearer <token>`.
2. **Ionicons**: ogni icona usata nel template va importata da `ionicons/icons` e registrata con `addIcons({...})` nel constructor (Angular 19+ standalone — senza registrazione il rendering si blocca).
   - Fix applicato: `tabs.page.ts` non registrava `fitness-outline` usato nella tab bar → aggiunto `fitnessOutline`.
3. **Standalone components ovunque**: import diretti (`IonList`, `IonItem`, `CommonModule`, ...) nell'array `imports`, niente NgModule. **`standalone: true` obbligatorio nel decoratore.**
4. **Timer a doppio ruolo**:
   - `TimerComponent` (rest countdown) → conto alla rovescia per esercizio, resta invariato.
   - `SessionTimerComponent` (nuovo) → cronometro di sessione con Avvia/Pausa/Termina; emette i secondi trascorsi.
5. **Contratto REST aggiornato (concordato col nuovo TASK-403)**:
   - `POST /api/patient/session-logs` ora accetta `{ card_id, duration_seconds, pain_level?, patient_notes? }`.
   - `pain_level` è **obbligatorio dal form TASK-404** (inviato come intero 1–10 dallo slider).
   - ⚠️ **Migrazione DB**: `session_logs` ora ha `duration_seconds INTEGER DEFAULT 0` e `pain_level` nullable (solo per DB nuovi). Un DB locale esistente va resettato: `rm backend/db/rehabtrack.db` (il seed lo ricrea).
6. **SessionReport (TASK-404)**:
   - `SessionTimerComponent` ora emette `SessionReport { duration_seconds, pain_level, patient_notes }` invece di `number`.
   - Nuovo stato `'report'` nel timer: cliccando Termina si apre il form inline; solo all'Invia Feedback viene emesso l'evento.
   - `Tab1Page.onSessionFinished(report: SessionReport)` riceve l'oggetto completo e lo passa a `PatientService.saveSessionLog()`.
7. **Bug Fix (branch feature/sprint2-completion)**:
   - Login: `err.error?.error` al posto di `err.error?.message`.
   - Dashboard route: punta a `DashboardPage` placeholder (non più a `LoginPage`).
   - Tab bar: icone `cameraOutline`/`mapOutline`, label "Diario"/"Mappa".
8. **Tab2 — Galleria Posturale (TASK-501/502)**:
   - Camera logica inline in `tab2.page.ts` (nessun service separato — YAGNI).
   - `Capacitor.isNativePlatform()` controlla la piattaforma **prima** di chiamare `Camera.getPhoto()`.
   - Su browser desktop: fallback immediato con `<input type="file">` programmatico + `FileReader`.
   - Persistenza: `localStorage` con chiave `'rehabtrack_photos'`; caricata in `ngOnInit`.
   - Modal preview: `[isOpen]="selectedPhoto !== null"` su `ion-modal`.
9. **Tab3 — Mappa & GPS (TASK-503/504)**:
   - Leaflet inizializzato in `ionViewDidEnter()` (non `ngAfterViewInit`) — garantisce DOM pronto.
   - Guard `if (this.map)` evita doppia inizializzazione al ritorno sulla tab.
   - Fix icone: `L.icon({ iconUrl: 'assets/leaflet/...' })` + override `L.Marker.prototype.options.icon`; file copiati in `frontend/src/assets/leaflet/`.
   - CSS Leaflet importato in `global.scss`.
   - GPS: `Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })`; marker utente + cerchio accuratezza; fallback silenzioso su Palermo.
    - `ngOnDestroy()` → `this.map.remove()` evita "Map container already initialized".
10. **TherapistService & Dashboard (TASK-303/304/305)**:
    - `TherapistService` in `services/therapist.service.ts` — stesso pattern di `PatientService` (inject, URL assoluti, Observable).
    - Interfacce: `Patient`, `TherapistCard`, `PatientCard` (con `exercise_count`), `PatientLog`, `CardPayload`, `CreateCardResponse`.
    - Dashboard: **CSS Grid a 2 colonne** (`var(--master-width): 320px` + `1fr`); collasso a singola colonna su ≤768px.
    - Filtro ricerca: filtro **locale** sull'array `patients[]` (YAGNI).
    - **TASK-304 fix layout**: `ion-modal` con classe `.composer-modal` / `.feedback-modal`; CSS su host della dashboard imposta `--width: min(720px,95vw)`, `--max-height: 85vh`, `--height: auto`, `--border-radius: 16px`. Rimossi `breakpoints`/`initialBreakpoint` (erano per sheet mobile, non desktop).
    - **TASK-305**: `GET /api/therapist/patients/:id/cards` (nuovo endpoint backend con COUNT esercizi JOIN); `FeedbackViewerComponent` modale; sezione Schede Assegnate in dashboard; badge dolore 3 livelli (verde/arancio/rosso); diario posturale con fallback (le foto sono in localStorage del device paziente, non sincronizzate lato server).
    - `ng build --configuration=development` ✅ (0 errori, 0 warning).

---

## 🌱 Variabili d'ambiente / credenziali seed

- Backend porta **3000** (`backend/server.js`, script `npm run dev` = `node --watch`).
- Nessuna `.env` richiesta: DB SQLite locale `backend/db/rehabtrack.db` (gitignored, generato dal seed in `db.js`).
- Credenziali seed:
  - Fisioterapista: `dott.rossi@rehabtrack.it` / `terapista123`
  - Paziente: `luigi.bianchi@email.it` / `paziente123`
- Endpoint paziente (JWT Bearer richiesto, ruolo `paziente`):
  - `GET  http://localhost:3000/api/patient/today-card`
  - `POST http://localhost:3000/api/patient/session-logs`

---

## 🌳 Albero file chiave

```
backend/
  server.js                    # Express 5, CORS, porta 3000
  routes/patientRoutes.js      # /today-card, /session-logs (verifyToken + requireRole paziente)
  controllers/patientControllers.js  # getTodayCard, saveSessionLog (+ duration_seconds)
  db/db.js                     # schema SQLite + seed
  models/cardModel.js          # Card, Exercise
frontend/src/app/
  services/patient.service.ts  # PatientService: getTodayCard(), saveSessionLog()
  services/auth.service.ts     # AuthService: login, logout, token decode
  components/timer/            # TASK-403 parte A: rest countdown
  components/session-timer/    # TASK-403 parte B + TASK-404: cronometro + form dolore
  tab1/                        # TASK-402: scheda odierna (loading/errore/vuoto/lista)
  tab2/                        # TASK-501/502: galleria posturale (Camera + localStorage + modal)
  tab3/                        # TASK-503/504: mappa Leaflet + GPS geolocalizzazione
  http-int.interceptor.ts      # Bearer token + baseUrl + redirect 401
frontend/src/assets/leaflet/   # Icone marker Leaflet (copiate da node_modules)
frontend/src/global.scss       # CSS globali + import leaflet/dist/leaflet.css
```

## ✅ Checklist pre-commit (per ogni task)

- [ ] Commenti `// TASK-3xx/4xx/5xx:` sulle parti implementate
- [ ] `ng build` senza errori; `ng test` passa
- [ ] URL assoluti, `addIcons`, `standalone: true` rispettati
- [ ] Diff minimo (niente astrazioni non richieste)

## 🌳 File aggiornati Sprint 4

```
frontend/src/app/
  services/therapist.service.ts          # TASK-303/304/305: TherapistService completo
  dashboard/dashboard.page.ts            # TASK-303/304/305: master-detail + modali
  dashboard/dashboard.page.html          # TASK-303/304/305: layout, schede, log, modali
  dashboard/dashboard.page.scss          # TASK-303/304 (fix): layout + modal sizing
  dashboard/card-composer.component.*    # TASK-304 + fix layout: FormArray compositore
  dashboard/feedback-viewer.component.*  # TASK-305: modale feedback + diario
backend/
  controllers/therapistControllers.js    # TASK-305: aggiunto getPatientCards()
  routes/therapistRoutes.js              # TASK-305: GET /patients/:id/cards
```