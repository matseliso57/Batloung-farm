const { pool, withTransaction } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { calculateTotal, calculateOutstanding, computeStatus, round2 } = require('../utils/helpers');

exports.create = ({ vendor_id, items, payment }) =>
  withTransaction(async (conn) => {
    const [v] = await conn.execute('SELECT vendor_id FROM vendors WHERE vendor_id=?', [vendor_id]);
    if (!v.length) throw new AppError(404, 'Vendor not found');

    const [h] = await conn.execute(
      "INSERT INTO sales (vendor_id, payment_status, total_amount, amount_paid) VALUES (?, 'UNPAID', 0, 0)", [vendor_id]);
    const saleId = h.insertId;
    const lines = [];

    for (const it of items) {
      // FOR UPDATE locks the stock row so two sales can't oversell at the same time
      const [rows] = await conn.execute(
        `SELECT s.available_quantity, s.selling_price, f.fruit_name, f.status
         FROM stock s JOIN fruits f ON f.fruit_id = s.fruit_id
         WHERE s.fruit_id=? AND s.packaging_size=? FOR UPDATE`, [it.fruit_id, it.packaging_size]);

      if (!rows.length) throw new AppError(404, `Fruit ${it.fruit_id} (${it.packaging_size}) not found`);
      const st = rows[0];
      if (st.status !== 'ACTIVE') throw new AppError(400, `${st.fruit_name} is inactive and cannot be sold`);
      if (it.quantity > st.available_quantity)
        throw new AppError(400,
          `Insufficient stock for ${st.fruit_name} (${it.packaging_size}): requested ${it.quantity}, available ${st.available_quantity}. Entire sale rejected.`);

      await conn.execute(
        'UPDATE stock SET available_quantity = available_quantity - ? WHERE fruit_id=? AND packaging_size=?',
        [it.quantity, it.fruit_id, it.packaging_size]);
      await conn.execute(
        'INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price) VALUES (?,?,?,?,?)',
        [saleId, it.fruit_id, it.packaging_size, it.quantity, st.selling_price]);

      lines.push({ fruit: st.fruit_name, packaging_size: it.packaging_size, quantity: it.quantity,
        unit_price: st.selling_price, line_total: round2(it.quantity * st.selling_price) });
    }

    const total = calculateTotal(lines, 'unit_price');
    const paid = payment?.amount ?? 0;
    if (paid > total) throw new AppError(400, `Payment (${paid}) exceeds sale total (${total})`);

    if (paid > 0)
      await conn.execute('INSERT INTO payments (sale_id, amount, payment_method) VALUES (?,?,?)',
        [saleId, paid, payment.method]);

    const status = computeStatus(total, paid);
    await conn.execute('UPDATE sales SET total_amount=?, amount_paid=?, payment_status=? WHERE sale_id=?',
      [total, paid, status, saleId]);

    return { sale_id: saleId, total_amount: total, amount_paid: paid,
      outstanding_balance: calculateOutstanding(total, paid), payment_status: status, items: lines };
  });

exports.findAll = async () =>
  (await pool.execute(
    `SELECT s.sale_id, s.sale_date, v.vendor_name, s.total_amount, s.amount_paid,
            (s.total_amount - s.amount_paid) AS outstanding_balance, s.payment_status
     FROM sales s JOIN vendors v ON v.vendor_id = s.vendor_id ORDER BY s.sale_date DESC`))[0];

exports.findById = async (id) => {
  const [[sale]] = await pool.execute(
    `SELECT s.*, v.vendor_name FROM sales s JOIN vendors v ON v.vendor_id=s.vendor_id WHERE s.sale_id=?`, [id]);
  if (!sale) return null;
  const [items] = await pool.execute(
    `SELECT f.fruit_name, d.packaging_size, d.quantity, d.unit_price, (d.quantity*d.unit_price) AS line_total
     FROM sales_details d JOIN fruits f ON f.fruit_id=d.fruit_id WHERE d.sale_id=?`, [id]);
  return { ...sale, items };
};
