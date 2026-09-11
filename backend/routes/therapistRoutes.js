'use strict';

const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { getPatients, createPatient, createCard, getPatientLogs, getPatientCards, getCardDetails } = require('../controllers/therapistControllers');

const router = express.Router();

// Tutte le rotte richiedono autenticazione + ruolo fisioterapista
router.use(verifyToken, requireRole('fisioterapista'));

router.get('/patients', getPatients);
router.post('/patients', createPatient);
router.post('/cards', createCard);
router.get('/cards/:id', getCardDetails); // Dettaglio scheda
router.get('/patients/:id/logs', getPatientLogs);
router.get('/patients/:id/cards', getPatientCards); // TASK-305

module.exports = router;
