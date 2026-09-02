'use strict';

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const therapistRoutes = require('./routes/therapistRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware globali
app.use(cors());           // CORS aperto su tutte le origini
app.use(express.json());   // Parsing body JSON

// Mount delle rotte
app.use('/api/auth', authRoutes);
app.use('/api/therapist', therapistRoutes);
// ponytail: mount per /api/patient aggiunto in Sprint 2 Dev B

// Gestione centralizzata errori (Express 5 passa qui le Promise rigettate)
app.use((err, req, res, next) => {
  console.error('Errore server:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Errore interno del server' });
});

// Avvio server — require di db.js per trigger schema + seed
require('./db/db');

app.listen(PORT, () => {
  console.log(`RehabTrack backend in ascolto su http://localhost:${PORT}`);
});

module.exports = app;
