const { pool } = require('../config/db');

exports.findByUsername = async (username) =>
  (await pool.execute('SELECT * FROM admins WHERE username = ?', [username]))[0][0];

exports.count = async () => (await pool.execute('SELECT COUNT(*) AS n FROM admins'))[0][0].n;

exports.create = async ({ username, password_hash, full_name }) => {
  const [r] = await pool.execute(
    'INSERT INTO admins (username, password_hash, full_name) VALUES (?,?,?)',
    [username, password_hash, full_name || 'Administrator']);
  return r.insertId;
};
