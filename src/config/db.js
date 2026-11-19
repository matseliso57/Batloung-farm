require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true, // return DECIMAL columns as numbers, not strings
  // If your host requires SSL, uncomment:
  // ssl: { rejectUnauthorized: false },
});

// Called at startup. Logs a clear message but NEVER crashes the app.
async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('MySQL connected');
    conn.release();
    return true;
  } catch (err) {
    console.error('MySQL connection failed:', err.code, '-', err.message);
    console.error('Check your .env values and that MySQL is running.');
    return false;
  }
}

// Runs callback inside BEGIN ... COMMIT; any error triggers ROLLBACK.
async function withTransaction(callback) {
  const conn = await pool.getConnection();
  try {
    await conn.query('BEGIN');
    const result = await callback(conn);
    await conn.query('COMMIT');
    return result;
  } catch (err) {
    await conn.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, testConnection, withTransaction };
