const { pool, withTransaction } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { calculateTotal } = require('../utils/helpers');

exports.create = ({ supplier_id, items }) =>
  withTransaction(async (conn) => {
    const [sup] = await conn.execute('SELECT supplier_id FROM suppliers WHERE supplier_id=?', [supplier_id]);
    if (!sup.length) throw new AppError(404, 'Supplier not found');

    const total = calculateTotal(items, 'unit_cost'); // automatic total
    const [p] = await conn.execute('INSERT INTO purchases (supplier_id, total_amount) VALUES (?,?)', [supplier_id, total]);

    for (const it of items) {
      await conn.execute(
        'INSERT INTO purchase_details (purchase_id, fruit_id, quantity, unit_cost, packaging_size) VALUES (?,?,?,?,?)',
        [p.insertId, it.fruit_id, it.quantity, it.unit_cost, it.packaging_size]);

      // increase the stock row for this fruit AND packaging size
      const [u] = await conn.execute(
        'UPDATE stock SET available_quantity = available_quantity + ? WHERE fruit_id=? AND packaging_size=?',
        [it.quantity, it.fruit_id, it.packaging_size]);
      if (u.affectedRows === 0)
        throw new AppError(400, `Fruit ${it.fruit_id} (${it.packaging_size}) does not exist. Purchase cancelled.`);
    }
    return { purchase_id: p.insertId, total_amount: total };
  });

exports.findAll = async () =>
  (await pool.execute(
    `SELECT p.purchase_id, p.purchase_date, p.total_amount, s.business_name
     FROM purchases p JOIN suppliers s ON s.supplier_id = p.supplier_id ORDER BY p.purchase_date DESC`))[0];
