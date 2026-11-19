const { pool } = require('../config/db');

const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

exports.create = async (v) => {
  const [r] = await pool.execute(
    `INSERT INTO vendors (vendor_name, phone_number, location, latitude, longitude, registration_date)
     VALUES (?,?,?,?,?,CURDATE())`,
    [v.vendor_name, v.phone_number, v.location, num(v.latitude), num(v.longitude)]);
  return r.insertId;
};
exports.findAll = async () => (await pool.execute('SELECT * FROM vendors ORDER BY vendor_name'))[0];
exports.findById = async (id) => (await pool.execute('SELECT * FROM vendors WHERE vendor_id=?', [id]))[0][0];
exports.search = async (q) =>
  (await pool.execute('SELECT * FROM vendors WHERE vendor_name LIKE ? OR phone_number LIKE ?',
    [`%${q}%`, `%${q}%`]))[0];
exports.update = async (id, v) =>
  pool.execute(
    `UPDATE vendors SET vendor_name=COALESCE(?,vendor_name), phone_number=COALESCE(?,phone_number),
     location=COALESCE(?,location), latitude=COALESCE(?,latitude), longitude=COALESCE(?,longitude)
     WHERE vendor_id=?`,
    [v.vendor_name ?? null, v.phone_number ?? null, v.location ?? null, num(v.latitude), num(v.longitude), id]);

// Blocked by the foreign key (RESTRICT) if the vendor has sales -> 409 via errorHandler
exports.remove = async (id) => pool.execute('DELETE FROM vendors WHERE vendor_id=?', [id]);

// Only vendors that have a map pin
exports.findWithCoordinates = async () =>
  (await pool.execute(
    `SELECT vendor_id, vendor_name, phone_number, location, latitude, longitude
     FROM vendors WHERE latitude IS NOT NULL AND longitude IS NOT NULL`))[0];
