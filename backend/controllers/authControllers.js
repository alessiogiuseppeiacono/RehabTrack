'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'rehabtrack_dev_secret';
const TOKEN_EXPIRY = '1h';
const SALT_ROUNDS = 10;

/**
 * POST /api/auth/register
 * Registra un nuovo utente (fisioterapista o paziente).
 * Express 5: le Promise rigettate vengono catturate automaticamente dal router.
 */
async function register(req, res) {
  const { email, password, role, first_name, last_name, pathology, therapist_id } = req.body;

  // Validazione campi obbligatori
  if (!email || !password || !role || !first_name || !last_name) {
    return res.status(400).json({ error: 'Campi obbligatori: email, password, role, first_name, last_name' });
  }

  if (!['fisioterapista', 'paziente'].includes(role)) {
    return res.status(400).json({ error: "Il ruolo deve essere 'fisioterapista' o 'paziente'" });
  }

  // Controlla unicità email
  const existing = await User.findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email già registrata' });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    email,
    password: hashedPassword,
    role,
    first_name,
    last_name,
    pathology: pathology || null,
    therapist_id: therapist_id || null
  });

  res.status(201).json({
    id: user.id,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name
  });
}

/**
 * POST /api/auth/login
 * Autentica un utente e restituisce un token JWT.
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password sono obbligatori' });
  }

  const user = await User.findByEmail(email);
  // ponytail: messaggio volutamente generico per non rivelare se l'email esiste
  if (!user) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  res.json({ token, role: user.role, userId: user.id });
}

/**
 * GET /api/auth/profile
 * Restituisce il profilo dell'utente autenticato (richiede verifyToken).
 */
async function getProfile(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'Utente non trovato' });
  }
  res.json(user);
}

module.exports = { register, login, getProfile };
