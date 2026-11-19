const model = require('../models/saleModel');
const { AppError } = require('../middleware/errorHandler');

exports.create = async (req, res, next) => {
  try {
    const result = await model.create(req.body);
    res.status(201).json({ success: true, message: 'Sale recorded', ...result });
  } catch (e) { next(e); }
};
exports.getAll = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await model.findAll() }); } catch (e) { next(e); }
};
exports.getOne = async (req, res, next) => {
  try {
    const sale = await model.findById(req.params.id);
    if (!sale) throw new AppError(404, 'Sale not found');
    res.status(200).json({ success: true, data: sale });
  } catch (e) { next(e); }
};
