const { AppError } = require('./errorHandler');
const { verifyToken } = require('../utils/auth');

// Protects every /api route except login. Expects the header:  Authorization: Bearer <token>
// Set AUTH_REQUIRED=false in .env to switch protection off (for example while testing in Postman).
function requireAuth(req, res, next) {
  if (String(process.env.AUTH_REQUIRED).toLowerCase() === 'false') return next();

  const match = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  const payload = match ? verifyToken(match[1]) : null;
  if (!payload) return next(new AppError(401, 'Please log in to continue'));

  req.admin = payload;
  next();
}

module.exports = { requireAuth };
