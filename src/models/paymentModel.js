const { pool, withTransaction } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { computeStatus, calculateOutstanding, round2 } = require('../utils/helpers');

// Record a later payment (cash or mobile money) against a credit sale
exports.add = ({ sale_id, amount, method }) =>
  withTransaction(async (conn) => {
    const [rows] = await conn.execute('SELECT total_amount, amount_paid FROM sales WHERE sale_id=? FOR UPDATE', [sale_id]);
    if (!rows.length) throw new AppError(404, 'Sale not found');
    const { total_amount, amount_paid } = rows[0];
    const outstanding = calculateOutstanding(total_amount, amount_paid);
    if (outstanding <= 0) throw new AppError(400, 'This sale is already fully paid');
    if (amount > outstanding) throw new AppError(400, `Payment exceeds outstanding balance of ${outstanding}`);

    await conn.execute('INSERT INTO payments (sale_id, amount, payment_method) VALUES (?,?,?)', [sale_id, amount, method]);
    const newPaid = round2(amount_paid + amount);
    const status = computeStatus(total_amount, newPaid);
    await conn.execute('UPDATE sales SET amount_paid=?, payment_status=? WHERE sale_id=?', [newPaid, status, sale_id]);
    return { sale_id, amount_paid: newPaid, outstanding_balance: calculateOutstanding(total_amount, newPaid), payment_status: status };
  });

const BASE = `SELECT v.vendor_id, v.vendor_name, v.phone_number,
  COALESCE(SUM(s.total_amount),0) AS total_billed,
  COALESCE(SUM(s.amount_paid),0)  AS total_paid,
  COALESCE(SUM(s.total_amount - s.amount_paid),0) AS outstanding_balance
  FROM vendors v LEFT JOIN sales s ON s.vendor_id = v.vendor_id`;

exports.allOutstanding = async () =>
  (await pool.execute(`${BASE} GROUP BY v.vendor_id, v.vendor_name, v.phone_number
    HAVING outstanding_balance > 0 ORDER BY outstanding_balance DESC`))[0];

exports.vendorBalance = async (vendorId) =>
  (await pool.execute(`${BASE} WHERE v.vendor_id=? GROUP BY v.vendor_id, v.vendor_name, v.phone_number`, [vendorId]))[0][0];
