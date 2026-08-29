'use strict';

const db = require('../db/db');

/**
 * Modello User per l'accesso e la gestione dei dati utente su SQLite.
 * Tutte le query sono incapsulate in Promise native.
 */
const User = {
  /**
   * Inserisce un nuovo utente nel database.
   * @param {Object} data - Dati utente
   * @param {string} data.email
   * @param {string} data.password - Password già hashata
   * @param {'fisioterapista'|'paziente'} data.role
   * @param {string} data.first_name
   * @param {string} data.last_name
   * @param {string|null} [data.pathology=null]
   * @param {number|null} [data.therapist_id=null]
   * @returns {Promise<Object>} Utente creato con il relativo id generato
   */
  create({ email, password, role, first_name, last_name, pathology = null, therapist_id = null }) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO users (email, password, role, first_name, last_name, pathology, therapist_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      db.run(
        sql,
        [email, password, role, first_name, last_name, pathology, therapist_id],
        function (err) {
          if (err) return reject(err);
          resolve({
            id: this.lastID,
            email,
            role,
            first_name,
            last_name,
            pathology,
            therapist_id
          });
        }
      );
    });
  },

  /**
   * Cerca un utente per indirizzo email (inclusa la password per verifica credenziali in fase di login).
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  findByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE email = ?';
      db.get(sql, [email], (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  },

  /**
   * Cerca un utente tramite il suo ID primario (esclude il campo sensibile password).
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  findById(id) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, email, role, first_name, last_name, pathology, therapist_id, created_at
        FROM users
        WHERE id = ?
      `;
      db.get(sql, [id], (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  },

  /**
   * Recupera tutti i pazienti associati a un determinato fisioterapista.
   * @param {number} therapistId
   * @returns {Promise<Array>}
   */
  findPatientsByTherapist(therapistId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, email, role, first_name, last_name, pathology, therapist_id, created_at
        FROM users
        WHERE role = 'paziente' AND therapist_id = ?
        ORDER BY last_name ASC, first_name ASC
      `;
      db.all(sql, [therapistId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  },

  /**
   * Recupera tutti i pazienti o filtra per fisioterapista se fornito.
   * @param {number|null} [therapistId=null]
   * @returns {Promise<Array>}
   */
  findAllPatients(therapistId = null) {
    if (therapistId) {
      return this.findPatientsByTherapist(therapistId);
    }
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT id, email, role, first_name, last_name, pathology, therapist_id, created_at
        FROM users
        WHERE role = 'paziente'
        ORDER BY last_name ASC, first_name ASC
      `;
      db.all(sql, [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }
};

module.exports = User;
