'use strict';

const { Card, Exercise } = require('../models/cardModel');
const db = require('../db/db');

/**
 * GET /api/patient/today-card
 * Restituisce la scheda odierna del paziente autenticato con i relativi esercizi.
 */
async function getTodayCard(req, res) {
  const card = await Card.findTodayCard(req.user.id);
  if (!card) {
    return res.json({ card: null, exercises: [] });
  }

  const exercises = await Exercise.findByCard(card.id);
  res.json({ card, exercises });
}

/**
 * POST /api/patient/session-logs
 * Salva il log di fine sessione.
 * Body: { card_id, duration_seconds, pain_level?, patient_notes? }
 * pain_level (1-10) è opzionale: arriva dal timer di sessione (TASK-403)
 * e sarà reso obbligatorio dal form di report TASK-404.
 */
async function saveSessionLog(req, res) {
  const { card_id, pain_level, patient_notes, duration_seconds } = req.body;

  if (!card_id || (pain_level == null && duration_seconds == null)) {
    return res.status(400).json({ error: 'Campi obbligatori: card_id e almeno uno tra pain_level, duration_seconds' });
  }

  if (pain_level != null && (!Number.isInteger(pain_level) || pain_level < 1 || pain_level > 10)) {
    return res.status(400).json({ error: 'pain_level deve essere un intero tra 1 e 10' });
  }

  if (duration_seconds != null && (!Number.isInteger(duration_seconds) || duration_seconds < 0)) {
    return res.status(400).json({ error: 'duration_seconds deve essere un intero >= 0' });
  }

  // Verifica che la scheda appartenga al paziente autenticato
  const card = await Card.findById(card_id);
  if (!card || card.patient_id !== req.user.id) {
    return res.status(403).json({ error: 'Scheda non associata al paziente autenticato' });
  }

  // TASK-403: log con durata della sessione dal timer (pain_level può mancare)
  const id = await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO session_logs (card_id, patient_id, pain_level, patient_notes, duration_seconds)
       VALUES (?, ?, ?, ?, ?)`,
      [card_id, req.user.id, pain_level ?? null, patient_notes || '', duration_seconds ?? 0],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });

  res.status(201).json({ id, card_id, pain_level: pain_level ?? null, patient_notes: patient_notes || '', duration_seconds: duration_seconds ?? 0 });
}

module.exports = { getTodayCard, saveSessionLog };
