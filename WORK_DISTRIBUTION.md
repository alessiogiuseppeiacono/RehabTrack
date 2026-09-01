# 📋 RehabTrack — Piano di Ripartizione Compiti e Flusso Operativo

**Progetto**: RehabTrack (Esame di Programmazione Web e Mobile - A.A. 2025/2026)  
**Docente**: Ing. Luca Cruciata (UniPA)  
**Ambiente di Sviluppo**: Google Antigravity + GitHub  
**Stack Tecnologico**: Node.js, Express 5, SQLite3, Ionic 8, Angular 19 (Standalone), Capacitor 7, Leaflet

---

## 👥 Suddivisione dei Ruoli e delle Responsabilità

### 🔹 SVILUPPATORE A (Backend Core & Dashboard Clinica Desktop)
*Focus: Gestione del database, API cliniche Express 5 e interfaccia Web Desktop per il Fisioterapista.*

* **TASK-103 — Auth Controllers (`backend/controllers/authControllers.js`)** ✅ Completato
  * `register`: validazione, hash password con bcrypt, creazione utente con ruolo. ✅
  * `login`: verifica credenziali, firma token JWT con payload (`id`, `email`, `role`). ✅
  * `getProfile`: restituzione profilo sicuro. ✅
* **TASK-104 — Auth & Role Middleware (`backend/middleware/authMiddleware.js`)** ✅ Completato
  * `verifyToken`: estrazione Bearer token ed inject di `req.user`. ✅
  * `requireRole(...roles)`: factory middleware per protezione basata su ruolo (`fisioterapista`/`paziente`). ✅
* **TASK-105 — Server Setup & Auth Routes (`backend/server.js`, `backend/routes/authRoutes.js`)** ✅ Completato
  * Configurazione Express 5, CORS (`*`), parsing JSON, gestione centralizzata errori asincroni. ✅
  * Allineamento porta `3000` e script `start`/`dev` in `package.json`. ✅
* **TASK-301 — Modello Card & Exercise (`backend/models/cardModel.js`)**
  * Query Promise-based per creazione schede e inserimento multiplo esercizi in transazione SQLite.
  * Metodi `findByPatient` e `findTodayCard` con gestione timezone (`DATE('now', 'localtime')`).
* **TASK-302 — Controller & Routes Terapista (`backend/controllers/therapistControllers.js`, `backend/routes/therapistRoutes.js`)**
  * API per registrazione pazienti associati al terapista, recupero anagrafiche, creazione schede e storico log.
* **TASK-303 — UI Dashboard Desktop Fisioterapista**
  * Vista web desktop: tabella anagrafica pazienti, filtro di ricerca e pannello di dettaglio clinico.
* **TASK-304 — Compositore Schede Esercizi (Desktop)**
  * Form reattivo con `FormArray` dinamico (nome esercizio, serie, ripetizioni/durata, note tecniche).
* **TASK-305 — Visualizzazione Feedback Dolore & Diario Posturale**
  * Schermata riassuntiva dei log di fine sessione (scala 1–10) e consultazione foto posturali del paziente.

---

### 🔸 SVILUPPATORE B (Paziente Mobile, Moduli Hardware & Client Auth)
*Focus: Flusso Mobile Paziente su Ionic/Angular, autenticazione frontend e integrazione moduli hardware Capacitor.*

* **TASK-202 — Auth Service Client (`src/app/services/auth.service.ts`)**
  * Chiamate HTTP di login/register, decodifica JWT, gestione ruoli e stato di autenticazione.
* **TASK-203 — HTTP Interceptor (`src/app/http-int.interceptor.ts`)**
  * Injection automatica dell'header `Authorization: Bearer <token>`, baseUrl `http://localhost:3000/api`, gestione centralizzata errore 401 con redirect a `/login`.
* **TASK-204 & TASK-205 — Routing Guards & Pagina Login**
  * `authGuard` e `roleGuard` basati su `UrlTree`.
  * UI Login con Reactive Forms e navigazione condizionale post-login (Desktop Dashboard vs Mobile Tabs).
* **TASK-401 — Controller & Routes Paziente (`backend/controllers/patientControllers.js`, `backend/routes/patientRoutes.js`)**
  * Endpoint `GET /api/patient/today-card` (scheda ed esercizi del giorno).
  * Endpoint `POST /api/patient/session-logs` (salvataggio livello dolore 1–10 e note).
* **TASK-402 — Schermata Scheda Mobile (Tab Home Paziente)**
  * Layout a card con elenco sequenziale degli esercizi assegnati per la giornata corrente.
* **TASK-403 — Componente Timer Interattivo**
  * Timer DOM per il conto alla rovescia dei tempi di recupero e pausa prescritti tra le serie.
* **TASK-404 — Form Report Fine Sessione**
  * Form di chiusura allenamento con slider/rating del dolore (1–10), campo note e invio asincrono al backend.
* **TASK-501 & TASK-502 — Modulo Fotocamera Posturale (Tab Camera)**
  * Integrazione `@capacitor/camera` per scatto/selezione foto, anteprima e salvataggio/invio al server.
* **TASK-503 & TASK-504 — Modulo Mappa & GPS (Tab Mappa)**
  * Mappa interattiva Leaflet, geolocalizzazione GPS via `@capacitor/geolocation`, marker clinica e calcolo distanza.

---

## 🚀 Matrice degli Sprint

| Sprint | Obiettivo Sviluppatore A | Obiettivo Sviluppatore B |
| :--- | :--- | :--- |
| **Sprint 1 (Fondamenta)** | ✅ `TASK-103`, `TASK-104`, `TASK-105` (Auth Backend & Server) | `TASK-202`, `TASK-203`, `TASK-204`, `TASK-205` (Auth Frontend) |
| **Sprint 2 (Business Logic)** | `TASK-301`, `TASK-302` (Card Model & Therapist API) | `TASK-401`, `TASK-402`, `TASK-403` (Patient API, Scheda & Timer) |
| **Sprint 3 (Features & Hardware)** | `TASK-303`, `TASK-304`, `TASK-305` (Desktop Dashboard & Reports) | `TASK-404`, `TASK-501/502`, `TASK-503/504` (Report Dolore, Camera, Mappa) |

---

## 🛠️ Regole di Collaborazione (Git & Antigravity)

1. **Branching Strategy**: Non lavorare direttamente su `main`. Creare branch dedicati:
   * Sviluppatore A: `feat/backend-...` o `feat/desktop-...`
   * Sviluppatore B: `feat/mobile-...` o `feat/hardware-...`
2. **Isolamento dei Prompt**: Fornire ad Antigravity contesto e richieste limitati esclusivamente ai file del proprio branch.
3. **Database Locale**: Il file SQLite (`rehabtrack.db` / `database.sqlite`) rimane nel `.gitignore`; viene popolato dai seed di `db.js`.
4. **Contratto REST**: Qualsiasi modifica agli endpoint condivisi va concordata prima dell'implementazione.