'use strict';

const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const { Card, Exercise } = require('../models/cardModel');
const db = require('../db/db');

const SALT_ROUNDS = 10;

/**
 * GET /api/therapist/patients
 * Lista dei pazienti associati al terapista autenticato.
 */
async function getPatients(req, res) {
  const patients = await User.findPatientsByTherapist(req.user.id);
  res.json(patients);
}

/**
 * POST /api/therapist/patients
 * Crea un nuovo paziente associato al terapista autenticato.
 * Genera una password provvisoria cifrata.
 */
async function createPatient(req, res) {
  const { email, password, first_name, last_name, pathology } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'Campi obbligatori: email, password, first_name, last_name' });
  }

  const existing = await User.findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email già registrata' });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const patient = await User.create({
    email,
    password: hashedPassword,
    role: 'paziente',
    first_name,
    last_name,
    pathology: pathology || null,
    therapist_id: req.user.id
  });

  res.status(201).json(patient);
}

/**
 * POST /api/therapist/cards
 * Crea una nuova scheda con N esercizi per un paziente.
 * Body: { patient_id, title, exercises: [{ name, sets, reps_or_duration, rest_seconds, posture_notes?, order_index? }] }
 */
async function createCard(req, res) {
  const { patient_id, title, exercises } = req.body;

  if (!patient_id || !title || !Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({ error: 'Campi obbligatori: patient_id, title, exercises (array non vuoto)' });
  }

  // Verifica che il paziente appartenga al terapista autenticato
  const patient = await User.findById(patient_id);
  if (!patient || patient.role !== 'paziente' || patient.therapist_id !== req.user.id) {
    return res.status(403).json({ error: 'Paziente non associato al terapista autenticato' });
  }

  const card = await Card.create({ patient_id, therapist_id: req.user.id, title });
  const exerciseIds = await Exercise.createBulk(card.id, exercises);

  res.status(201).json({ card, exerciseIds });
}

/**
 * GET /api/therapist/patients/:id/logs
 * Recupera lo storico dei session_logs di un paziente.
 */
async function getPatientLogs(req, res) {
  const patientId = Number(req.params.id);

  // Verifica che il paziente appartenga al terapista autenticato
  const patient = await User.findById(patientId);
  if (!patient || patient.role !== 'paziente' || patient.therapist_id !== req.user.id) {
    return res.status(403).json({ error: 'Paziente non associato al terapista autenticato' });
  }

  const logs = await new Promise((resolve, reject) => {
    db.all(
      `SELECT sl.*, c.title AS card_title
       FROM session_logs sl
       JOIN cards c ON c.id = sl.card_id
       WHERE sl.patient_id = ?
       ORDER BY sl.completed_at DESC`,
      [patientId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });

  res.json(logs);
}

/**
 * GET /api/therapist/patients/:id/cards
 * TASK-305: schede assegnate a un paziente con conteggio esercizi.
 */
async function getPatientCards(req, res) {
  const patientId = Number(req.params.id);
  const patient = await User.findById(patientId);
  if (!patient || patient.role !== 'paziente' || patient.therapist_id !== req.user.id) {
    return res.status(403).json({ error: 'Paziente non associato al terapista autenticato' });
  }
  const cards = await new Promise((resolve, reject) => {
    db.all(
      `SELECT c.*, COUNT(e.id) AS exercise_count
       FROM cards c
       LEFT JOIN exercises e ON e.card_id = c.id
       WHERE c.patient_id = ?
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [patientId],
      (err, rows) => { if (err) return reject(err); resolve(rows || []); }
    );
  });
  res.json(cards);
}

/**
 * GET /api/therapist/cards/:id
 * Recupera i dettagli di una scheda e i suoi esercizi.
 */
async function getCardDetails(req, res) {
  const cardId = Number(req.params.id);
  const card = await Card.findById(cardId);
  if (!card || card.therapist_id !== req.user.id) {
    return res.status(403).json({ error: 'Scheda non trovata o non autorizzata' });
  }
  const exercises = await Exercise.findByCard(cardId);
  res.json({ card, exercises });
}

/**
 * PUT /api/therapist/patients/:id/notes
 * Aggiorna le note cliniche e la patologia del paziente.
 */
async function updatePatientNotes(req, res) {
  const patientId = Number(req.params.id);
  const patient = await User.findById(patientId);
  if (!patient || patient.role !== 'paziente' || patient.therapist_id !== req.user.id) {
    return res.status(403).json({ error: 'Paziente non trovato o non autorizzato' });
  }

  const { condition, notes } = req.body;
  await User.updatePatientNotes(patientId, { pathology: condition, clinical_notes: notes });
  const updated = await User.findById(patientId);
  res.json(updated);
}

/**
 * POST /api/therapist/assign-patient
 * Assegna un paziente esistente al terapista (via email).
 */
async function assignPatient(req, res) {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email obbligatoria' });
  }

  const patient = await User.findByEmail(email);
  if (!patient || patient.role !== 'paziente') {
    return res.status(404).json({ error: 'Paziente non trovato' });
  }
  if (patient.therapist_id === req.user.id) {
    return res.status(400).json({ error: 'Paziente già assegnato a te' });
  }
  if (patient.therapist_id) {
    return res.status(400).json({ error: 'Paziente già assegnato a un altro terapista' });
  }

  await User.updateTherapist(patient.id, req.user.id);
  const updated = await User.findById(patient.id);
  res.json(updated);
}

/**
 * DELETE /api/therapist/patients/:id/unassign
 * Dissocia un paziente dal terapista (imposta therapist_id a NULL).
 */
async function unassignPatient(req, res) {
  const patientId = Number(req.params.id);
  const patient = await User.findById(patientId);
  if (!patient || patient.role !== 'paziente' || patient.therapist_id !== req.user.id) {
    return res.status(403).json({ error: 'Paziente non trovato o non autorizzato' });
  }

  await User.updateTherapist(patientId, null);
  res.json({ success: true, message: 'Paziente dissociato' });
}

module.exports = { getPatients, createPatient, createCard, updateCard, deleteCard, getPatientLogs, getPatientCards, getCardDetails, getExercises, updatePatientNotes, assignPatient, unassignPatient };
/**
 * PUT /api/therapist/cards/:id
 * Aggiorna titolo, date e (opzionalmente) esercizi di una scheda.
 * Se exercises è fornito, cancella e reinserisce in transazione.
 */
async function updateCard(req, res) {
  const cardId = Number(req.params.id);
  const card = await Card.findById(cardId);
  if (!card || card.therapist_id !== req.user.id) {
    return res.status(403).json({ error: 'Scheda non trovata o non autorizzata' });
  }

  const { title, start_date, end_date, exercises } = req.body;
  await Card.update(cardId, {
    title: title || card.title,
    start_date: start_date || card.start_date,
    end_date: end_date !== undefined ? end_date : card.end_date
  });

  if (Array.isArray(exercises)) {
    await Exercise.deleteByCard(cardId);
    if (exercises.length > 0) {
      await Exercise.createBulk(cardId, exercises);
    }
  }

  const updated = await Card.findById(cardId);
  const updatedExercises = await Exercise.findByCard(cardId);
  res.json({ card: updated, exercises: updatedExercises });
}

/**
 * DELETE /api/therapist/cards/:id
 * Elimina esercizi e scheda. I session_logs restano orfani (storico).
 */
async function deleteCard(req, res) {
  const cardId = Number(req.params.id);
  const card = await Card.findById(cardId);
  if (!card || card.therapist_id !== req.user.id) {
    return res.status(403).json({ error: 'Scheda non trovata o non autorizzata' });
  }

  // 1. Rimuovi i log delle sessioni (session_logs ha NOT NULL su card_id)
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM session_logs WHERE card_id = ?', [cardId], function (err) {
      if (err) return reject(err);
      resolve();
    });
  });

  // 2. Elimina gli esercizi associati
  await Exercise.deleteByCard(cardId);

  // 3. Elimina la scheda
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM cards WHERE id = ?', [cardId], function (err) {
      if (err) return reject(err);
      resolve();
    });
  });

  res.json({ success: true, message: 'Scheda eliminata' });
}

/**
 * GET /api/therapist/exercises
 * Lista di tutti gli esercizi distinti nel database (per il selettore a tendina).
 */
async function getExercises(req, res) {
  const exercises = await new Promise((resolve, reject) => {
    db.all(
      'SELECT DISTINCT name FROM exercises ORDER BY name ASC',
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
  res.json(exercises);
}
