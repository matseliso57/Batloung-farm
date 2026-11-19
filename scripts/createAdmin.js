// Usage:  npm run create-admin -- <username> <password> ["Full Name"]
require('dotenv').config();
const { pool } = require('../src/config/db');
const model = require('../src/models/adminModel');
const { hashPassword } = require('../src/utils/auth');

(async () => {
  const [username, password, fullName] = process.argv.slice(2);
  if (!username || !password || password.length < 8) {
    console.error('Usage: npm run create-admin -- <username> <password (8+ characters)> ["Full Name"]');
    process.exit(1);
  }
  try {
    const id = await model.create({ username, password_hash: await hashPassword(password), full_name: fullName });
    console.log(`Admin "${username}" created (id ${id}).`);
  } catch (err) {
    console.error(err.code === 'ER_DUP_ENTRY' ? 'That username already exists.' : `Failed: ${err.code || ''} ${err.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
