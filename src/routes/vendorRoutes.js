const router = require('express').Router();
const c = require('../controllers/vendorController');
const { validateId, validateVendor } = require('../middleware/validate');

router.get('/search', c.search);    // before '/:id'
router.get('/nearest', c.nearest);  // nearest vendors by walking or driving
router.post('/', validateVendor, c.create);
router.get('/', c.getAll);
router.put('/:id', validateId(), validateVendor, c.update);
router.delete('/:id', validateId(), c.remove);
module.exports = router;
