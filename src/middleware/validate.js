const { AppError } = require('./errorHandler');
const { SIZES, PAYMENT_METHODS, PROVINCES } = require('../utils/helpers');

const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const isPosInt = (n) => Number.isInteger(n) && n > 0;
const isPosNum = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

const validateId = (name = 'id') => (req, res, next) => {
  const id = Number(req.params[name]);
  if (!isPosInt(id)) return next(new AppError(400, `${name} must be a positive integer`));
  next();
};

function validateSupplier(req, res, next) {
  const b = req.body || {};
  if (req.method === 'POST')
    for (const f of ['business_name', 'contact_person', 'phone', 'province'])
      if (blank(b[f])) return next(new AppError(400, `${f} is required`));
  if (b.province !== undefined && !PROVINCES.includes(b.province))
    return next(new AppError(400, `province must be one of: ${PROVINCES.join(', ')}`));
  next();
}

function validateFruit(req, res, next) {
  const { fruit_name, status, prices } = req.body || {};
  const isCreate = req.method === 'POST';
  if (isCreate && blank(fruit_name)) return next(new AppError(400, 'fruit_name is required'));
  if (status !== undefined && !['ACTIVE', 'INACTIVE'].includes(status))
    return next(new AppError(400, 'status must be ACTIVE or INACTIVE'));
  if (isCreate && !prices) return next(new AppError(400, 'prices {SMALL, MEDIUM, LARGE} are required'));
  if (prices) {
    if (typeof prices !== 'object') return next(new AppError(400, 'prices must be an object'));
    if (isCreate)
      for (const s of SIZES)
        if (!isPosNum(prices[s])) return next(new AppError(400, `prices.${s} must be a positive number`));
    for (const s of Object.keys(prices))
      if (!SIZES.includes(s) || !isPosNum(prices[s])) return next(new AppError(400, 'Invalid prices object'));
    if (isCreate && new Set(SIZES.map((s) => prices[s])).size !== 3)
      return next(new AppError(400, 'Each packaging size must have a different selling price'));
  }
  next();
}

function validateVendor(req, res, next) {
  const b = req.body || {};
  if (req.method === 'POST')
    for (const f of ['vendor_name', 'phone_number', 'location'])
      if (blank(b[f])) return next(new AppError(400, `${f} is required`));

  // Optional map pin: latitude and longitude must come together and be in range
  const hasLat = !blank(b.latitude);
  const hasLng = !blank(b.longitude);
  if (hasLat || hasLng) {
    if (!hasLat || !hasLng) return next(new AppError(400, 'latitude and longitude must be provided together'));
    const lat = Number(b.latitude);
    const lng = Number(b.longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90)
      return next(new AppError(400, 'latitude must be a number between -90 and 90'));
    if (!Number.isFinite(lng) || lng < -180 || lng > 180)
      return next(new AppError(400, 'longitude must be a number between -180 and 180'));
  }
  next();
}

function checkItems(items, withCost) {
  if (!Array.isArray(items) || items.length === 0) return 'items must be a non-empty array';
  for (const [i, it] of items.entries()) {
    if (!isPosInt(it.fruit_id)) return `items[${i}].fruit_id must be a positive integer`;
    if (!SIZES.includes(it.packaging_size)) return `items[${i}].packaging_size must be SMALL, MEDIUM or LARGE`;
    if (!isPosInt(it.quantity)) return `items[${i}].quantity must be a positive integer`;
    if (withCost && !isPosNum(it.unit_cost)) return `items[${i}].unit_cost must be a positive number`;
  }
  return null;
}

function validatePurchase(req, res, next) {
  const b = req.body || {};
  if (!isPosInt(b.supplier_id)) return next(new AppError(400, 'supplier_id is required'));
  const err = checkItems(b.items, true);
  next(err ? new AppError(400, err) : undefined);
}

function validateSale(req, res, next) {
  const { vendor_id, items, payment } = req.body || {};
  if (!isPosInt(vendor_id)) return next(new AppError(400, 'vendor_id is required'));
  const err = checkItems(items, false);
  if (err) return next(new AppError(400, err));
  if (payment) {
    if (typeof payment.amount !== 'number' || payment.amount < 0)
      return next(new AppError(400, 'payment.amount must be a number >= 0'));
    if (payment.amount > 0 && !PAYMENT_METHODS.includes(payment.method))
      return next(new AppError(400, 'payment.method must be CASH or MOBILE_MONEY'));
  }
  next();
}

function validatePayment(req, res, next) {
  const { sale_id, amount, method } = req.body || {};
  if (!isPosInt(sale_id)) return next(new AppError(400, 'sale_id is required'));
  if (!isPosNum(amount)) return next(new AppError(400, 'amount must be a positive number'));
  if (!PAYMENT_METHODS.includes(method)) return next(new AppError(400, 'method must be CASH or MOBILE_MONEY'));
  next();
}

module.exports = { validateId, validateSupplier, validateFruit, validateVendor, validatePurchase, validateSale, validatePayment };
