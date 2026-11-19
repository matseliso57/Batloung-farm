const { pool, withTransaction } = require('../config/db');
const { SIZES } = require('../utils/helpers');
const { AppError } = require('../middleware/errorHandler');

exports.findAll = async (status) => {
  const sql = 'SELECT * FROM fruits' + (status ? ' WHERE status=?' : '') + ' ORDER BY fruit_name';
  return (await pool.execute(sql, status ? [status] : []))[0];
};
exports.findById = async (id) => (await pool.execute('SELECT * FROM fruits WHERE fruit_id=?', [id]))[0][0];

// Creating a fruit also creates its 3 stock rows (SMALL/MEDIUM/LARGE) with their own prices
exports.create = ({ fruit_name, description, prices }) =>
  withTransaction(async (conn) => {
    const [r] = await conn.execute('INSERT INTO fruits (fruit_name, description) VALUES (?,?)',
      [fruit_name, description ?? null]);
    for (const size of SIZES)
      await conn.execute(
        'INSERT INTO stock (fruit_id, packaging_size, available_quantity, selling_price) VALUES (?,?,0,?)',
        [r.insertId, size, prices[size]]);
    return r.insertId;
  });

exports.update = (id, { fruit_name, description, status, prices }) =>
  withTransaction(async (conn) => {
    await conn.execute(
      `UPDATE fruits SET fruit_name=COALESCE(?,fruit_name), description=COALESCE(?,description),
       status=COALESCE(?,status) WHERE fruit_id=?`,
      [fruit_name ?? null, description ?? null, status ?? null, id]);
    if (prices)
      for (const [size, price] of Object.entries(prices))
        await conn.execute('UPDATE stock SET selling_price=? WHERE fruit_id=? AND packaging_size=?', [price, id, size]);
  });

// A fruit can only be deleted if it was never bought or sold and has no boxes in stock.
// Otherwise the history would be lost, so we refuse (409) and suggest INACTIVE instead.
exports.remove = (id) =>
  withTransaction(async (conn) => {
    const [[used]] = await conn.execute(
      `SELECT (SELECT COUNT(*) FROM purchase_details WHERE fruit_id=?) +
              (SELECT COUNT(*) FROM sales_details WHERE fruit_id=?) AS n`, [id, id]);
    if (used.n > 0)
      throw new AppError(409, 'Cannot delete: this fruit has purchase or sales history. Set its status to INACTIVE instead.');

    const [[left]] = await conn.execute(
      'SELECT COALESCE(SUM(available_quantity),0) AS boxes FROM stock WHERE fruit_id=?', [id]);
    if (Number(left.boxes) > 0)
      throw new AppError(409, `Cannot delete: ${left.boxes} boxes of this fruit are still in stock.`);

    await conn.execute('DELETE FROM stock WHERE fruit_id=?', [id]);   // its 3 empty stock rows
    await conn.execute('DELETE FROM fruits WHERE fruit_id=?', [id]);
  });

exports.getStock = async () =>
  (await pool.execute(
    `SELECT f.fruit_id, f.fruit_name, s.packaging_size, s.available_quantity, s.selling_price, s.low_stock_threshold
     FROM stock s JOIN fruits f ON f.fruit_id = s.fruit_id
     ORDER BY f.fruit_name, FIELD(s.packaging_size,'SMALL','MEDIUM','LARGE')`))[0];

exports.getLowStock = async () =>
  (await pool.execute(
    `SELECT f.fruit_id, f.fruit_name, s.packaging_size, s.available_quantity, s.low_stock_threshold
     FROM stock s JOIN fruits f ON f.fruit_id = s.fruit_id
     WHERE s.available_quantity <= s.low_stock_threshold
     ORDER BY s.available_quantity ASC`))[0];
