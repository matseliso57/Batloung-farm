const router = require('express').Router();
const c = require('../controllers/reportController');

router.get('/top-fruits', c.topFruits);
router.get('/revenue', c.revenue); // /api/reports/revenue?from=2026-11-01&to=2026-11-30
router.get('/top-vendor', c.topVendor);
router.get('/stock', c.stock);
module.exports = router;
