const model = require('../models/fruitModel');
const { AppError } = require('../middleware/errorHandler');

exports.create = async (req, res, next) => {
  try {
    const id = await model.create(req.body);
    res.status(201).json({ success: true, message: 'Fruit registered with stock rows for all sizes', fruit_id: id });
  } catch (e) { next(e); }
};
exports.getAll = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await model.findAll(req.query.status) }); } catch (e) { next(e); }
};
exports.update = async (req, res, next) => {
  try {
    if (!(await model.findById(req.params.id))) throw new AppError(404, 'Fruit not found');
    await model.update(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Fruit updated' });
  } catch (e) { next(e); }
};
exports.remove = async (req, res, next) => {
  try {
    if (!(await model.findById(req.params.id))) throw new AppError(404, 'Fruit not found');
    await model.remove(req.params.id);
    res.status(200).json({ success: true, message: 'Fruit deleted' });
  } catch (e) { next(e); }
};
exports.getStock = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await model.getStock() }); } catch (e) { next(e); }
};
exports.getLowStock = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await model.getLowStock() }); } catch (e) { next(e); }
};
