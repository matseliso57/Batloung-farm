const router = require('express').Router();
const c = require('../controllers/paymentController');
const { validateId, validatePayment } = require('../middleware/validate');

router.post('/', validatePayment, c.add);
router.get('/outstanding', c.allOutstanding);
router.get('/vendor/:vendorId', validateId('vendorId'), c.vendorBalance);
module.exports = router;
