'use strict';

const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { getPatients, createPatient, createCard, updateCard, deleteCard, getPatientLogs, getPatientCards, getCardDetails, getExercises } = require('../controllers/therapistControllers');

const router = express.Router();

// Tutte le rotte richiedono autenticazione + ruolo fisioterapista
router.use(verifyToken, requireRole('fisioterapista'));

router.get('/patients', getPatients);
router.post('/patients', createPatient);
router.post('/cards', createCard);
router.put('/cards/:id', updateCard);
router.delete('/cards/:id', deleteCard);
router.get('/cards/:id', getCardDetails);
router.get('/exercises', getExercises);
router.get('/patients/:id/logs', getPatientLogs);
router.get('/patients/:id/cards', getPatientCards);

module.exports = router;
