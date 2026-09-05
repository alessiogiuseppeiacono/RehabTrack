'use strict';

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const therapistRoutes = require('./routes/therapistRoutes');
const patientRoutes = require('./routes/patientRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware globali
app.use(cors());           // CORS aperto su tutte le origini
app.use(express.json());   // Parsing body JSON

// Mount delle rotte
app.use('/api/auth', authRoutes);
app.use('/api/therapist', therapistRoutes);
app.use('/api/patient', patientRoutes);

// Gestione centralizzata errori (Express 5 passa qui le Promise rigettate)
app.use((err, req, res, next) => {
  console.error('Errore server:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Errore interno del server' });
});

// Avvio server — require di db.js per trigger schema + seed
require('./db/db');

const server = app.listen(PORT, (err) => {
  if (err) {
    console.error(`Errore durante l'avvio del server sulla porta ${PORT}:`, err.message);
    return;
  }
  console.log(`RehabTrack backend in ascolto su http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERRORE] La porta ${PORT} è già occupata da un altro processo.`);
    console.error(`Se il server è già attivo in un altro terminale, chiudilo prima di riavviarlo.\n`);
  } else {
    console.error('Errore server:', err.message);
  }
});

module.exports = app;
