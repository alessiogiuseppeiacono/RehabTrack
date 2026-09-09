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

  // Verifica completamento odierno
  const log = await new Promise((resolve, reject) => {
    db.get(
      `SELECT completed_at FROM session_logs 
       WHERE card_id = ? AND patient_id = ? AND DATE(completed_at) = DATE('now', 'localtime')
       ORDER BY completed_at DESC LIMIT 1`,
      [card.id, req.user.id],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });

  card.is_completed_today = !!log;
  if (log) {
    card.last_completed_at = log.completed_at;
  }

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

  if (!card_id) {
    return res.status(400).json({ error: 'Campo obbligatorio: card_id' });
  }

  let parsedPainLevel = pain_level;
  if (pain_level !== undefined && pain_level !== null) {
    parsedPainLevel = parseInt(pain_level);
    if (isNaN(parsedPainLevel) || parsedPainLevel < 0 || parsedPainLevel > 10) {
      return res.status(400).json({ error: 'pain_level deve essere un intero tra 0 e 10' });
    }
  }

  let parsedDuration = duration_seconds;
  if (duration_seconds !== undefined && duration_seconds !== null) {
    parsedDuration = Math.max(0, parseInt(duration_seconds) || 0);
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
      [card_id, req.user.id, parsedPainLevel ?? null, patient_notes || '', parsedDuration ?? 0],
      function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      }
    );
  });

  res.status(201).json({ id, card_id, pain_level: parsedPainLevel ?? null, patient_notes: patient_notes || '', duration_seconds: parsedDuration ?? 0 });
}

module.exports = { getTodayCard, saveSessionLog };
