// Creates the tables and sample data the first time the app runs against an EMPTY database.
// If the database is already set up, or already holds data, it does nothing.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { pool } = require('../config/db');

async function initDbIfEmpty() {
  try {
    const [done] = await pool.query("SHOW TABLES LIKE 'admins'"); // admins is the last table created
    if (done.length > 0) return; // already set up

    // Old database that has data but predates some tables: leave it alone.
    const [hasSuppliers] = await pool.query("SHOW TABLES LIKE 'suppliers'");
    if (hasSuppliers.length > 0) {
      const [[c]] = await pool.query('SELECT COUNT(*) AS n FROM suppliers');
      if (c.n > 0) {
        console.log('Database already has data; skipping automatic setup.');
        return;
      }
    }

    console.log('Empty database detected: creating tables and sample data...');
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true,
    });
    try {
      // remove any empty leftovers from a half-finished earlier attempt
      const [tables] = await conn.query('SHOW TABLES');
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const row of tables) {
        await conn.query('DROP TABLE IF EXISTS `' + Object.values(row)[0] + '`');
      }
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');

      const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'hosted_setup.sql'), 'utf8');
      await conn.query(sql);
      console.log('Database created: tables and sample data are ready.');
    } finally {
      await conn.end();
    }
  } catch (err) {
    console.error('Automatic database setup failed:', err.code || '', err.message);
  }
}

module.exports = { initDbIfEmpty };