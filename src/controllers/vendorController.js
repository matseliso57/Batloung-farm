const model = require('../models/vendorModel');
const routing = require('../utils/routing');
const { AppError } = require('../middleware/errorHandler');

exports.create = async (req, res, next) => {
  try {
    const id = await model.create(req.body);
    res.status(201).json({ success: true, message: 'Vendor registered', vendor_id: id });
  } catch (e) { next(e); }
};
exports.getAll = async (req, res, next) => {
  try { res.status(200).json({ success: true, data: await model.findAll() }); } catch (e) { next(e); }
};
exports.search = async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) throw new AppError(400, 'Query parameter q (name or phone) is required');
    res.status(200).json({ success: true, data: await model.search(q) });
  } catch (e) { next(e); }
};
exports.update = async (req, res, next) => {
  try {
    if (!(await model.findById(req.params.id))) throw new AppError(404, 'Vendor not found');
    await model.update(req.params.id, req.body);
    res.status(200).json({ success: true, message: 'Vendor updated' });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    if (!(await model.findById(req.params.id))) throw new AppError(404, 'Vendor not found');
    await model.remove(req.params.id);
    res.status(200).json({ success: true, message: 'Vendor deleted' });
  } catch (e) { next(e); }
};

// GET /api/vendors/nearest?lat=-29.31&lng=27.48&mode=walking|driving&limit=5
exports.nearest = async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const mode = String(req.query.mode || 'walking').toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 5, 1), 10);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180)
      throw new AppError(400, 'lat and lng query parameters must be valid coordinates');
    if (!['walking', 'driving'].includes(mode))
      throw new AppError(400, 'mode must be walking or driving');

    const vendors = await model.findWithCoordinates();
    const result = await routing.findNearest({ lat, lng }, vendors, mode, limit);
    res.status(200).json({ success: true, data: result });
  } catch (e) { next(e); }
};
