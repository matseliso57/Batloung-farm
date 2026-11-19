const router = require('express').Router();
const c = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/login', c.login);          // public
router.get('/me', requireAuth, c.me);    // needs a token
module.exports = router;
