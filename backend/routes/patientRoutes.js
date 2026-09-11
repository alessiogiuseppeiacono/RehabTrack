'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { getTodayCard, saveSessionLog, getSessionLogs } = require('../controllers/patientControllers');

// Configurazione storage Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/diaries'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const router = express.Router();

// Tutte le rotte richiedono autenticazione + ruolo paziente
router.use(verifyToken, requireRole('paziente'));

router.get('/today-card', getTodayCard);
router.post('/session-logs', upload.single('photo_file'), saveSessionLog);
router.get('/session-logs', getSessionLogs);

module.exports = router;
