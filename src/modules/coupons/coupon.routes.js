const router       = require('express').Router();
const controller   = require('./coupon.controller');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');

router.post('/validate', authenticate, controller.validate);

// Admin only
router.get('/',          authenticate, authorize('admin'), controller.list);
router.post('/',         authenticate, authorize('admin'), controller.create);
router.delete('/:id',    authenticate, authorize('admin'), controller.deactivate);

module.exports = router;