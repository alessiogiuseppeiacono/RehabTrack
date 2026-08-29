'use strict';

const assert = require('assert');
const db = require('../db/db');
const User = require('./userModel');

async function runCheck() {
  // Attendi brevemente per garantire che il seed di db.js abbia terminato l'inizializzazione
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log('Avvio verifica userModel...');

  // 1. Verifica findByEmail con utente seed fisioterapista
  const therapist = await User.findByEmail('dott.rossi@rehabtrack.it');
  assert.ok(therapist, 'Fisioterapista seed deve esistere');
  assert.strictEqual(therapist.role, 'fisioterapista');
  assert.strictEqual(typeof therapist.password, 'string');
  console.log('✓ findByEmail verificato con successo');

  // 2. Verifica findById
  const foundById = await User.findById(therapist.id);
  assert.ok(foundById, 'findById deve trovare il fisioterapista');
  assert.strictEqual(foundById.email, 'dott.rossi@rehabtrack.it');
  assert.strictEqual(foundById.password, undefined, 'findById non deve esporre l\'hash della password');
  console.log('✓ findById verificato con successo');

  // 3. Verifica create per nuovo paziente
  const testEmail = `test.paziente.${Date.now()}@example.com`;
  const created = await User.create({
    email: testEmail,
    password: 'dummy_hashed_password',
    role: 'paziente',
    first_name: 'Mario',
    last_name: 'Verdi',
    pathology: 'Distorsione caviglia',
    therapist_id: therapist.id
  });
  assert.ok(created.id > 0, 'create deve restituire l\'ID generato');
  assert.strictEqual(created.email, testEmail);
  console.log('✓ create verificato con successo');

  // 4. Verifica findPatientsByTherapist
  const therapistPatients = await User.findPatientsByTherapist(therapist.id);
  assert.ok(Array.isArray(therapistPatients), 'Deve restituire un array');
  assert.ok(therapistPatients.some((p) => p.email === testEmail), 'Il nuovo paziente deve essere presente nella lista del terapista');
  console.log('✓ findPatientsByTherapist verificato con successo');

  // 5. Verifica findAllPatients
  const allPatients = await User.findAllPatients();
  assert.ok(Array.isArray(allPatients), 'Deve restituire un array');
  assert.ok(allPatients.length >= 2, 'Devono essere presenti almeno 2 pazienti');
  console.log('✓ findAllPatients verificato con successo');

  // 6. Pulizia del record di test creato
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM users WHERE id = ?', [created.id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  console.log('✓ Pulizia dati di test completata');

  console.log('Tutti i controlli di userModel sono passati con successo!');
}

runCheck().catch((err) => {
  console.error('Errore durante la verifica di userModel:', err);
  process.exit(1);
});
