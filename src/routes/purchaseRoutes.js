const router = require('express').Router();
const c = require('../controllers/purchaseController');
const { validatePurchase } = require('../middleware/validate');

router.post('/', validatePurchase, c.create);
router.get('/', c.getAll);
module.exports = router;
