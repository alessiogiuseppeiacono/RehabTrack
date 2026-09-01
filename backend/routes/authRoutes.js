'use strict';

const express = require('express');
const { register, login, getProfile } = require('../controllers/authControllers');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Rotte pubbliche
router.post('/register', register);
router.post('/login', login);

// Rotta protetta (richiede token valido)
router.get('/profile', verifyToken, getProfile);

module.exports = router;
