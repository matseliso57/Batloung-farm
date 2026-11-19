const router = require('express').Router();
const c = require('../controllers/supplierController');
const { validateId, validateSupplier } = require('../middleware/validate');

router.post('/', validateSupplier, c.create);
router.get('/', c.getAll);
router.get('/:id', validateId(), c.getOne);
router.put('/:id', validateId(), validateSupplier, c.update);
router.delete('/:id', validateId(), c.remove);
module.exports = router;
