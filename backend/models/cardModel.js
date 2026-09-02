'use strict';

const db = require('../db/db');

/**
 * Modello Card + Exercise per la gestione delle schede riabilitative.
 * Tutte le query sono incapsulate in Promise native, coerenti con userModel.js.
 */

const Card = {
  /**
   * Crea una nuova scheda riabilitativa.
   * @param {{ patient_id: number, therapist_id: number, title: string }} data
   * @returns {Promise<{ id: number, patient_id: number, therapist_id: number, title: string }>}
   */
  create({ patient_id, therapist_id, title }) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO cards (patient_id, therapist_id, title) VALUES (?, ?, ?)',
        [patient_id, therapist_id, title],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID, patient_id, therapist_id, title });
        }
      );
    });
  },

  /**
   * Recupera tutte le schede di un paziente, ordinate dalla più recente.
   * @param {number} patientId
   * @returns {Promise<Array>}
   */
  findByPatient(patientId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM cards WHERE patient_id = ? ORDER BY created_at DESC',
        [patientId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });
  },

  /**
   * Recupera la scheda assegnata oggi al paziente (ultima creata oggi).
   * Usa DATE('now','localtime') per confronto corretto nel fuso orario locale.
   * @param {number} patientId
   * @returns {Promise<Object|null>}
   */
  findTodayCard(patientId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM cards
         WHERE patient_id = ? AND DATE(created_at) = DATE('now','localtime')
         ORDER BY created_at DESC LIMIT 1`,
        [patientId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        }
      );
    });
  },

  /**
   * Recupera una scheda tramite il suo ID.
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  findById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM cards WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  }
};

const Exercise = {
  /**
   * Inserisce N esercizi collegati a una scheda in una singola transazione SQLite.
   * Se un qualsiasi inserimento fallisce, viene eseguito il ROLLBACK.
   * @param {number} cardId
   * @param {Array<{ name: string, sets: number, reps_or_duration: string, rest_seconds: number, posture_notes?: string, order_index?: number }>} exercises
   * @returns {Promise<number[]>} Array degli ID inseriti
   */
  createBulk(cardId, exercises) {
    return new Promise((resolve, reject) => {
      const ids = [];
      db.run('BEGIN TRANSACTION', (beginErr) => {
        if (beginErr) return reject(beginErr);

        let pending = exercises.length;
        if (pending === 0) {
          return db.run('COMMIT', (err) => err ? reject(err) : resolve([]));
        }

        exercises.forEach((ex, i) => {
          db.run(
            `INSERT INTO exercises (card_id, name, sets, reps_or_duration, rest_seconds, posture_notes, order_index)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [cardId, ex.name, ex.sets, ex.reps_or_duration, ex.rest_seconds, ex.posture_notes || '', ex.order_index ?? i + 1],
            function (err) {
              if (err) {
                return db.run('ROLLBACK', () => reject(err));
              }
              ids.push(this.lastID);
              if (--pending === 0) {
                db.run('COMMIT', (commitErr) => {
                  if (commitErr) return reject(commitErr);
                  resolve(ids);
                });
              }
            }
          );
        });
      });
    });
  },

  /**
   * Recupera tutti gli esercizi di una scheda, ordinati per order_index.
   * @param {number} cardId
   * @returns {Promise<Array>}
   */
  findByCard(cardId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM exercises WHERE card_id = ? ORDER BY order_index ASC',
        [cardId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });
  }
};

module.exports = { Card, Exercise };
