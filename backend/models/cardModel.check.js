'use strict';

const assert = require('assert');
const db = require('../db/db');
const { Card, Exercise } = require('./cardModel');

async function runCheck() {
  // Attendi seed db.js
  await new Promise((r) => setTimeout(r, 500));
  console.log('Avvio verifica cardModel...');

  // Il seed inserisce una card per patient_id=2 (paziente Luigi Bianchi)
  // Verifica findByPatient
  const cards = await Card.findByPatient(2);
  assert.ok(Array.isArray(cards), 'findByPatient deve restituire un array');
  assert.ok(cards.length >= 1, 'Deve esistere almeno una scheda seed');
  console.log('✓ Card.findByPatient verificato');

  // Verifica findById
  const card = await Card.findById(cards[0].id);
  assert.ok(card, 'findById deve trovare la scheda');
  assert.strictEqual(card.id, cards[0].id);
  console.log('✓ Card.findById verificato');

  // Verifica Exercise.findByCard
  const exercises = await Exercise.findByCard(card.id);
  assert.ok(Array.isArray(exercises), 'findByCard deve restituire un array');
  assert.ok(exercises.length >= 1, 'Devono esistere esercizi seed');
  // Verifica ordinamento per order_index
  for (let i = 1; i < exercises.length; i++) {
    assert.ok(exercises[i].order_index >= exercises[i - 1].order_index, 'Esercizi devono essere ordinati per order_index');
  }
  console.log('✓ Exercise.findByCard verificato (ordinamento OK)');

  // Verifica Card.create + Exercise.createBulk (transazione)
  const newCard = await Card.create({ patient_id: 2, therapist_id: 1, title: 'Test Check Card' });
  assert.ok(newCard.id > 0, 'Card.create deve restituire un ID');

  const exList = [
    { name: 'Ex A', sets: 2, reps_or_duration: '10', rest_seconds: 30 },
    { name: 'Ex B', sets: 3, reps_or_duration: '15s', rest_seconds: 45, posture_notes: 'Note test', order_index: 2 }
  ];
  const ids = await Exercise.createBulk(newCard.id, exList);
  assert.strictEqual(ids.length, 2, 'createBulk deve inserire 2 esercizi');
  console.log('✓ Card.create + Exercise.createBulk verificati (transazione OK)');

  // Verifica findTodayCard (la card appena creata è di oggi)
  const today = await Card.findTodayCard(2);
  assert.ok(today, 'findTodayCard deve trovare la scheda appena creata');
  assert.strictEqual(today.id, newCard.id);
  console.log('✓ Card.findTodayCard verificato');

  // Pulizia
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM exercises WHERE card_id = ?', [newCard.id], (err) => err ? reject(err) : resolve());
  });
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM cards WHERE id = ?', [newCard.id], (err) => err ? reject(err) : resolve());
  });
  console.log('✓ Pulizia dati di test completata');

  console.log('Tutti i controlli di cardModel sono passati con successo!');
}

runCheck().catch((err) => {
  console.error('Errore durante la verifica di cardModel:', err);
  process.exit(1);
});
