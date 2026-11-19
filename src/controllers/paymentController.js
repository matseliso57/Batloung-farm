const model = require('../models/paymentModel');
const { AppError } = require('../middleware/errorHandler');

exports.add = async (req, res, next) => {
  try {
    const result = await model.add(req.body);
    res.status(201).json({ success: true, message: 'Payment recorded', ...result });
  } catch (e) { next(e); }
};
exports.allOutstanding = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await model.allOutstanding() }); } catch (e) { next(e); }
};
exports.vendorBalance = async (req, res, next) => {
  try {
    const b = await model.vendorBalance(req.params.vendorId);
    if (!b) throw new AppError(404, 'Vendor not found');
    res.status(200).json({ success: true, data: b });
  } catch (e) { next(e); }
};
