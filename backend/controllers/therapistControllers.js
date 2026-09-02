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

module.exports = { getPatients, createPatient, createCard, getPatientLogs };
