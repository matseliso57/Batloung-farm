const router = require('express').Router();
const c = require('../controllers/fruitController');
const { validateId, validateFruit } = require('../middleware/validate');

router.get('/stock/low', c.getLowStock); // must come before '/:id' routes
router.get('/stock', c.getStock);
router.post('/', validateFruit, c.create);
router.get('/', c.getAll);
router.put('/:id', validateId(), validateFruit, c.update);
router.delete('/:id', validateId(), c.remove);
module.exports = router;
