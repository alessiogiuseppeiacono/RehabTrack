'use strict';

const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { getPatients, createPatient, createCard, getPatientLogs } = require('../controllers/therapistControllers');

const router = express.Router();

// Tutte le rotte richiedono autenticazione + ruolo fisioterapista
router.use(verifyToken, requireRole('fisioterapista'));

router.get('/patients', getPatients);
router.post('/patients', createPatient);
router.post('/cards', createCard);
router.get('/patients/:id/logs', getPatientLogs);

module.exports = router;
