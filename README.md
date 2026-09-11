# RehabTrack - Centro di Riabilitazione Motoria
Progetto di Programmazione Web e Mobile (A.A. 2025/2026)
Candidati: Alessio Giuseppe Iacono, Salvatore Virone
Docente: Prof. Ing. Luca Cruciata

==================================================
ISTRUZIONI DI AVVIO (2 TERMINALI)
==================================================

1. TERMINALE BACKEND:
   cd backend
   npm install
   npm start

   Il server partira su http://localhost:3000
   Al primo avvio verra creato e popolato automaticamente il database SQLite (rehabtrack.db).

2. TERMINALE FRONTEND:
   cd frontend
   npm install
   npm start

   L'applicazione si aprira su http://localhost:4200

==================================================
CREDENZIALI DEMO PER IL COLLAUDO
==================================================

A) FISIOTERAPISTA (Web Desktop)
- Email: dott.rossi@rehabtrack.it
- Password: terapista123

Funzionalita:
- Gestione anagrafica: paziente gia associato (Luigi Bianchi).
- Tasto [+]: per associare i pazienti liberi censiti (Anna Neri, Marco Verdi).
- Paziente 2: email: anna.neri@email.it   password: paziente123
- Paziente 3: email: marco.verdi@email.it   password: paziente123
- Tasto [+ NUOVA SCHEDA]: per creare e assegnare una scheda personalizzata con serie, ripetizioni, tempi di recupero e note posturali.
- Tasto [VEDI FEEDBACK & DIARIO]: consultazione dei log del dolore e storico sessioni.

B) PAZIENTE (App Mobile Tabs)
- Email: luigi.bianchi@email.it
- Password: paziente123

Funzionalita:
- Tab Scheda: visualizzazione esercizi assegnati, timer di riposo interattivo ed invio feedback sul dolore (scala 1-10).
- Tab Diario: storico allenamenti e diario fotografico posturale (Capacitor Camera).
- Tab Mappa: localizzazione GPS, sede clinica su mappa Leaflet e calcolo distanza in km.