// Slows down password guessing: 5 wrong attempts for the same username from the same
// address locks that login for 15 minutes. Kept in memory (resets when the server restarts).

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;
const attempts = new Map(); // key -> { count, lockedUntil }

function minutesLeft(key) {
  const a = attempts.get(key);
  if (!a || !a.lockedUntil) return 0;
  const ms = a.lockedUntil - Date.now();
  if (ms <= 0) { attempts.delete(key); return 0; }
  return Math.ceil(ms / 60000);
}

function recordFailure(key) {
  const a = attempts.get(key) || { count: 0, lockedUntil: 0 };
  a.count += 1;
  if (a.count >= MAX_FAILURES) { a.lockedUntil = Date.now() + LOCK_MS; a.count = 0; }
  attempts.set(key, a);
}

const reset = (key) => attempts.delete(key);
const clearAll = () => attempts.clear();

module.exports = { minutesLeft, recordFailure, reset, clearAll, MAX_FAILURES };
