'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rehabtrack_dev_secret';

/**
 * Middleware: verifica il token JWT dall'header Authorization.
 * Inietta req.user = { id, email, role } se valido.
 */
function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token mancante o formato non valido' });
  }

  const token = header.slice(7); // "Bearer ".length === 7

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token non valido o scaduto' });
  }
}

/**
 * Factory middleware: restringe l'accesso ai ruoli specificati.
 * Uso: requireRole('fisioterapista') oppure requireRole('fisioterapista', 'paziente')
 * Deve essere montato DOPO verifyToken.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accesso negato: ruolo non autorizzato' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
