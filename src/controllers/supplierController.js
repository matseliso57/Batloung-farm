const model = require('../models/supplierModel');
const { AppError } = require('../middleware/errorHandler');

exports.create = async (req, res, next) => {
  try {
    const id = await model.create(req.body);
    res.status(201).json({ success: true, message: 'Supplier registered', supplier_id: id });
  } catch (e) { next(e); }
};
exports.getAll = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await model.findAll() }); } catch (e) { next(e); }
};
exports.getOne = async (req, res, next) => {
  try {
    const s = await model.findById(req.params.id);
    if (!s) throw new AppError(404, 'Supplier not found');
    res.status(200).json({ success: true, data: s });
  } catch (e) { next(e); }
};
exports.update = async (req, res, next) => {
  try {
    if (!(await model.findById(req.params.id))) throw new AppError(404, 'Supplier not found');
    await model.update(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Supplier updated' });
  } catch (e) { next(e); }
};
// Business constraint: a supplier with purchases can't be deleted (FK RESTRICT -> 409 via errorHandler)
exports.remove = async (req, res, next) => {
  try {
    if (!(await model.findById(req.params.id))) throw new AppError(404, 'Supplier not found');
    await model.remove(req.params.id);
    res.status(200).json({ success: true, message: 'Supplier deleted' });
  } catch (e) { next(e); }
};
