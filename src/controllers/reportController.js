const model = require('../models/reportModel');
const { AppError } = require('../middleware/errorHandler');

const wrap = (fn) => async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await fn(req) }); } catch (e) { next(e); }
};

exports.topFruits = wrap(() => model.topFruits());
exports.topVendor = wrap(() => model.topVendor());
exports.stock = wrap(() => model.stock());
exports.revenue = wrap((req) => {
  const { from, to } = req.query;
  const ok = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '');
  if (!ok(from) || !ok(to)) throw new AppError(400, 'Provide from and to as YYYY-MM-DD');
  return model.revenue(from, to);
});
