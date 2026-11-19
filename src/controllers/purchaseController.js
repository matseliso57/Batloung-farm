const model = require('../models/purchaseModel');

exports.create = async (req, res, next) => {
  try {
    const result = await model.create(req.body);
    res.status(201).json({ success: true, message: 'Purchase recorded and stock updated', ...result });
  } catch (e) { next(e); }
};
exports.getAll = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await model.findAll() }); } catch (e) { next(e); }
};
