// Password hashing and login tokens using only Node's built-in crypto module
// (no extra packages to install).
//
// Passwords: scrypt with a random salt per password. The database never stores the password itself.
// Tokens:    "header.payload.signature" (the same shape as a JWT), signed with HMAC-SHA256 using JWT_SECRET.
//            The payload holds the admin's id, name and an expiry time. Changing any part breaks the signature.

const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const TOKEN_TTL_SECONDS = 8 * 60 * 60; // a login lasts 8 hours

let cachedSecret = null;
function getSecret() {
  if (cachedSecret) return cachedSecret;
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16) {
    cachedSecret = process.env.JWT_SECRET;
  } else {
    cachedSecret = crypto.randomBytes(32).toString('hex');
    console.warn('JWT_SECRET is missing or shorter than 16 characters in .env. Using a temporary secret: everyone is logged out whenever the server restarts.');
  }
  return cachedSecret;
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(String(password), salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const actual = await scrypt(String(password), salt, expected.length);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function sign(data) {
  return b64url(crypto.createHmac('sha256', getSecret()).update(data).digest());
}

function signToken(payload, ttlSeconds = TOKEN_TTL_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + ttlSeconds }));
  return `${header}.${body}.${sign(`${header}.${body}`)}`;
}

// Returns the payload if the token is genuine and not expired, otherwise null
function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`));
  const given = Buffer.from(parts[2]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// Used when the username does not exist, so a wrong username takes as long as a wrong password
let dummyHash = null;
async function getDummyHash() {
  if (!dummyHash) dummyHash = await hashPassword('not-a-real-password');
  return dummyHash;
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, getDummyHash, TOKEN_TTL_SECONDS };
