const router = require('express').Router();
const c = require('../controllers/saleController');
const { validateId, validateSale } = require('../middleware/validate');

router.post('/', validateSale, c.create);
router.get('/', c.getAll);
router.get('/:id', validateId(), c.getOne);
module.exports = router;
