const model = require('../models/adminModel');
const { AppError } = require('../middleware/errorHandler');
const { verifyPassword, signToken, getDummyHash, TOKEN_TTL_SECONDS } = require('../utils/auth');
const limiter = require('../utils/loginLimiter');

// POST /api/auth/login  { username, password }
exports.login = async (req, res, next) => {
  try {
    const username = String((req.body || {}).username || '').trim();
    const password = String((req.body || {}).password || '');
    if (!username || !password) throw new AppError(400, 'Username and password are required');

    const key = `${req.ip}|${username.toLowerCase()}`;
    const wait = limiter.minutesLeft(key);
    if (wait > 0) throw new AppError(429, `Too many failed attempts. Try again in ${wait} minute(s).`);

    const admin = await model.findByUsername(username);
    // always run a hash comparison, even for unknown usernames, so timing does not reveal valid usernames
    const ok = await verifyPassword(password, admin ? admin.password_hash : await getDummyHash());
    if (!admin || !ok) {
      limiter.recordFailure(key);
      throw new AppError(401, 'Incorrect username or password');
    }

    limiter.reset(key);
    const token = signToken({ sub: admin.admin_id, username: admin.username, name: admin.full_name });
    res.status(200).json({
      success: true,
      message: 'Logged in',
      token,
      expires_in: TOKEN_TTL_SECONDS,
      admin: { admin_id: admin.admin_id, username: admin.username, full_name: admin.full_name },
    });
  } catch (e) { next(e); }
};

// GET /api/auth/me  (requires a valid token) - lets the frontend check a stored login
exports.me = (req, res) => {
  const a = req.admin || {};
  res.status(200).json({ success: true, admin: { admin_id: a.sub, username: a.username, full_name: a.name } });
};
