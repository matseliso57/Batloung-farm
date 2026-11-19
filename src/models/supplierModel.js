const { pool } = require('../config/db');

exports.create = async (s) => {
  const [r] = await pool.execute(
    'INSERT INTO suppliers (business_name, contact_person, phone, province, address) VALUES (?,?,?,?,?)',
    [s.business_name, s.contact_person, s.phone, s.province, s.address ?? null]);
  return r.insertId;
};
exports.findAll = async () => (await pool.execute('SELECT * FROM suppliers ORDER BY business_name'))[0];
exports.findById = async (id) => (await pool.execute('SELECT * FROM suppliers WHERE supplier_id=?', [id]))[0][0];
exports.update = async (id, s) => {
  await pool.execute(
    `UPDATE suppliers SET business_name=COALESCE(?,business_name), contact_person=COALESCE(?,contact_person),
     phone=COALESCE(?,phone), province=COALESCE(?,province), address=COALESCE(?,address) WHERE supplier_id=?`,
    [s.business_name ?? null, s.contact_person ?? null, s.phone ?? null, s.province ?? null, s.address ?? null, id]);
};
exports.remove = async (id) => pool.execute('DELETE FROM suppliers WHERE supplier_id=?', [id]);
