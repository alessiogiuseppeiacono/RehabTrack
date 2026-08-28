'use strict';

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// Percorso del file database SQLite
const DB_PATH = path.join(__dirname, 'rehabtrack.db');

// Apertura connessione con abilitazione Foreign Keys
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Errore apertura database:', err.message);
    throw err;
  }
  console.log('Connesso al database SQLite:', DB_PATH);
});

// Abilita il supporto alle chiavi esterne (disattivato di default in SQLite)
db.run('PRAGMA foreign_keys = ON');

/**
 * Creazione dello schema relazionale e seed iniziale.
 * Utilizza db.serialize() per garantire l'esecuzione sequenziale delle query DDL.
 */
db.serialize(() => {

  // ─────────────────────────────────────────────
  // TABELLA: users
  // Ruoli possibili: 'fisioterapista' | 'paziente'
  // therapist_id è NULL per i fisioterapisti,
  // punta a users(id) per i pazienti (il terapista che li segue)
  // ─────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    NOT NULL UNIQUE,
      password      TEXT    NOT NULL,
      role          TEXT    NOT NULL CHECK(role IN ('fisioterapista', 'paziente')),
      first_name    TEXT    NOT NULL,
      last_name     TEXT    NOT NULL,
      pathology     TEXT    DEFAULT NULL,
      therapist_id  INTEGER DEFAULT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (therapist_id) REFERENCES users(id)
    )
  `);

  // ─────────────────────────────────────────────
  // TABELLA: cards (schede riabilitative)
  // Ogni scheda è assegnata a un paziente da un terapista
  // ─────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS cards (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id    INTEGER NOT NULL,
      therapist_id  INTEGER NOT NULL,
      title         TEXT    NOT NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id)   REFERENCES users(id),
      FOREIGN KEY (therapist_id) REFERENCES users(id)
    )
  `);

  // ─────────────────────────────────────────────
  // TABELLA: exercises (esercizi della scheda)
  // Collegati alla scheda tramite card_id (FK)
  // order_index definisce l'ordine di esecuzione
  // ─────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS exercises (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id           INTEGER NOT NULL,
      name              TEXT    NOT NULL,
      sets              INTEGER NOT NULL,
      reps_or_duration  TEXT    NOT NULL,
      rest_seconds      INTEGER NOT NULL,
      posture_notes     TEXT    DEFAULT '',
      order_index       INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (card_id) REFERENCES cards(id)
    )
  `);

  // ─────────────────────────────────────────────
  // TABELLA: session_logs (diari di sessione)
  // Registra il feedback del paziente dopo ogni sessione
  // pain_level: scala 1-10
  // photo_base64: foto posturale opzionale (stringa Base64)
  // ─────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS session_logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id         INTEGER NOT NULL,
      patient_id      INTEGER NOT NULL,
      pain_level      INTEGER NOT NULL CHECK(pain_level BETWEEN 1 AND 10),
      patient_notes   TEXT    DEFAULT '',
      photo_base64    TEXT    DEFAULT NULL,
      completed_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id)    REFERENCES cards(id),
      FOREIGN KEY (patient_id) REFERENCES users(id)
    )
  `);

});

// ─────────────────────────────────────────────
// SEED: Popolamento dati iniziali di prova
// Inserisce un fisioterapista, un paziente, una
// scheda con esercizi e un session_log di esempio.
// Usa bcrypt.hash() a 10 salt rounds come da specifica.
// ─────────────────────────────────────────────

/**
 * putData() — Funzione asincrona di seed.
 * Viene invocata solo se la tabella users è vuota,
 * per evitare inserimenti duplicati ad ogni riavvio.
 */
async function putData() {
  // Verifica se il seed è già stato eseguito
  const count = await new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS cnt FROM users', [], (err, row) => {
      if (err) reject(err);
      else resolve(row.cnt);
    });
  });

  if (count > 0) {
    console.log('Seed già presente — skip inserimento dati di prova.');
    return;
  }

  console.log('Inserimento seed dati di prova...');

  // Hash delle password con bcrypt (10 salt rounds)
  const hashTerapista = await bcrypt.hash('terapista123', 10);
  const hashPaziente  = await bcrypt.hash('paziente123', 10);

  // 1. Inserimento fisioterapista
  const therapistId = await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO users (email, password, role, first_name, last_name)
       VALUES (?, ?, 'fisioterapista', ?, ?)`,
      ['dott.rossi@rehabtrack.it', hashTerapista, 'Marco', 'Rossi'],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });

  // 2. Inserimento paziente (associato al terapista)
  const patientId = await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO users (email, password, role, first_name, last_name, pathology, therapist_id)
       VALUES (?, ?, 'paziente', ?, ?, ?, ?)`,
      ['luigi.bianchi@email.it', hashPaziente, 'Luigi', 'Bianchi', 'Lombalgia cronica', therapistId],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });

  // 3. Inserimento scheda riabilitativa di esempio
  const cardId = await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO cards (patient_id, therapist_id, title)
       VALUES (?, ?, ?)`,
      [patientId, therapistId, 'Protocollo Lombalgia - Settimana 1'],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });

  // 4. Inserimento esercizi collegati alla scheda
  const esercizi = [
    { name: 'Stretching lombare supino',     sets: 3, reps: '30 secondi',   rest: 60, notes: 'Ginocchia al petto, schiena aderente al pavimento', order: 1 },
    { name: 'Bird-dog quadrupedia',          sets: 3, reps: '10 per lato',  rest: 45, notes: 'Mantenere il core attivo, non inarcare la schiena',  order: 2 },
    { name: 'Ponte gluteo (glute bridge)',   sets: 4, reps: '12',           rest: 60, notes: 'Spinta controllata, pausa in alto per 2 secondi',    order: 3 },
    { name: 'Cat-cow mobilità vertebrale',   sets: 2, reps: '8 cicli',     rest: 30, notes: 'Movimenti lenti e fluidi, coordinare col respiro',    order: 4 },
  ];

  for (const ex of esercizi) {
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO exercises (card_id, name, sets, reps_or_duration, rest_seconds, posture_notes, order_index)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [cardId, ex.name, ex.sets, ex.reps, ex.rest, ex.notes, ex.order],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // 5. Inserimento session_log di esempio
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO session_logs (card_id, patient_id, pain_level, patient_notes)
       VALUES (?, ?, ?, ?)`,
      [cardId, patientId, 4, 'Leggero fastidio al terzo set di ponte gluteo, migliorato dopo stretching finale.'],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });

  console.log('Seed completato con successo!');
  console.log(`  Fisioterapista: dott.rossi@rehabtrack.it / terapista123`);
  console.log(`  Paziente:       luigi.bianchi@email.it    / paziente123`);
}

// Esegui il seed (asincrono)
putData().catch((err) => {
  console.error('Errore durante il seed:', err.message);
});

// Esporta l'istanza del database per gli altri moduli
module.exports = db;
