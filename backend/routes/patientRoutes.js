'use strict';

const express = require('express');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { getTodayCard, saveSessionLog } = require('../controllers/patientControllers');

const router = express.Router();

// Tutte le rotte richiedono autenticazione + ruolo paziente
router.use(verifyToken, requireRole('paziente'));

router.get('/today-card', getTodayCard);
router.post('/session-logs', saveSessionLog);

module.exports = router;
