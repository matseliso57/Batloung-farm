// One-off helper: loads database/hosted_setup.sql into a hosted MySQL database.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const url = process.env.MYSQL_PUBLIC_URL;
  if (!url) {
    console.error('Set MYSQL_PUBLIC_URL first.');
    process.exit(1);
  }
  const u = new URL(url);
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
    multipleStatements: true,
    connectTimeout: 30000,
    ssl: process.env.NO_SSL ? undefined : { rejectUnauthorized: false },
  });
  console.log('Connected to', u.hostname + ':' + u.port);

  // start clean so a half-finished earlier attempt cannot cause duplicates
  const [tables] = await conn.query('SHOW TABLES');
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const row of tables) {
    const name = Object.values(row)[0];
    await conn.query('DROP TABLE IF EXISTS `' + name + '`');
  }
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'hosted_setup.sql'), 'utf8');
  await conn.query(sql);
  console.log('hosted_setup.sql loaded.');

  const [[stock]] = await conn.query('SELECT COUNT(*) AS n FROM stock');
  const [list] = await conn.query('SHOW TABLES');
  console.log('Tables:', list.length, '| stock rows:', stock.n, '(expected 15)');
  await conn.end();
})().catch((e) => {
  console.error('FAILED:', e.code || '', e.message);
  process.exit(1);
});