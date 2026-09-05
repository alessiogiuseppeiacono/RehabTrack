# 🧠 AI_MEMORY.md — RehabTrack (Sviluppatore B, branch `feat/sprint-2-retry`)

> Cervello esterno dell'agente. Leggere PRIMA di scrivere codice e aggiornare DOPO ogni task.
> Regole operative: vedere `AGENTS.md` (lazy senior dev — riusare > riscrivere, diff minimo).

---

## 📌 Stato Sprint 2 (Sviluppatore B)

| Task | Stato | Note |
| :--- | :--- | :--- |
| TASK-401 — Controller & Routes Paziente (backend) | ✅ | `GET /today-card`, `POST /session-logs` |
| TASK-402 — Scheda odierna (Tab 1) | ✅ | 404/scheda vuota → stato amichevole; esercizi in `<ion-list>` |
| TASK-403 — Timer sessione + log durata | ✅ | `SessionTimerComponent`; stato 'report' dopo Termina |
| TASK-404 — Form report fine sessione | ✅ | Slider pain_level (1-10) + textarea note; emette `SessionReport` |

## 🏗️ Decisioni architetturali

1. **URL assoluti obbligatori** nell'HttpClient (anti-crash `Invalid base URL`):
   - `PatientService.baseUrl = 'http://localhost:3000/api/patient'`
   - L'interceptor (`http-int.interceptor.ts`) risolve comunque ogni URL verso `http://localhost:3000/api` e inietta `Authorization: Bearer <token>`.
2. **Ionicons**: ogni icona usata nel template va importata da `ionicons/icons` e registrata con `addIcons({...})` nel constructor (Angular 19+ standalone — senza registrazione il rendering si blocca).
   - Fix applicato: `tabs.page.ts` non registrava `fitness-outline` usato nella tab bar → aggiunto `fitnessOutline`.
3. **Standalone components ovunque**: import diretti (`IonList`, `IonItem`, `CommonModule`, ...) nell'array `imports`, niente NgModule.
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

## 🌱 Variabili d'ambiente / credenziali seed

- Backend porta **3000** (`backend/server.js`, script `npm run dev` = `node --watch`).
- Nessuna `.env` richiesta: DB SQLite locale `backend/db/rehabtrack.db` (gitignored, generato dal seed in `db.js`).
- Credenziali seed:
  - Fisioterapista: `dott.rossi@rehabtrack.it` / `terapista123`
  - Paziente: `luigi.bianchi@email.it` / `paziente123`
- Endpoint paziente (JWT Bearer richiesto, ruolo `paziente`):
  - `GET  http://localhost:3000/api/patient/today-card`
  - `POST http://localhost:3000/api/patient/session-logs`

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
  components/timer/timer.component.ts          # TASK-403 parte A: rest countdown
  components/session-timer/session-timer.component.ts  # TASK-403 parte B: cronometro sessione (nuovo)
  tab1/                        # TASK-402: scheda odierna (loading/errore/vuoto/lista)
  http-int.interceptor.ts      # Bearer token + baseUrl + redirect 401
```

## ✅ Checklist pre-commit (per ogni task)

- [ ] Commenti `// TASK-4xx:` sulle parti implementate
- [ ] `ng build` senza errori; `ng test` passa
- [ ] URL assoluti, `addIcons`, standalone rispettati
- [ ] Diff minimo (niente astrazioni non richieste)