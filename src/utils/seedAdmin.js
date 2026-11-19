// On startup: if there are no admins yet, create the first one from ADMIN_USERNAME / ADMIN_PASSWORD in .env.
const model = require('../models/adminModel');
const { hashPassword } = require('./auth');

async function seedAdmin() {
  try {
    if ((await model.count()) > 0) return;
    const username = (process.env.ADMIN_USERNAME || '').trim();
    const password = process.env.ADMIN_PASSWORD || '';
    if (!username || password.length < 8) {
      console.warn('No admin account exists. Set ADMIN_USERNAME and ADMIN_PASSWORD (8+ characters) in .env and restart, or run: npm run create-admin -- <username> <password>');
      return;
    }
    await model.create({ username, password_hash: await hashPassword(password), full_name: 'Administrator' });
    console.log(`First admin account created: "${username}". Change the password in .env / create a new admin once you are in.`);
  } catch (err) {
    console.error('Could not check or create the admin account:', err.code || '', err.message);
    if (err.code === 'ER_NO_SUCH_TABLE')
      console.error('The admins table is missing. Run database/migration_admins.sql in MySQL Workbench.');
  }
}

module.exports = { seedAdmin };
