const router       = require('express').Router();
const controller   = require('./user.controller');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');

router.use(authenticate);

router.get('/me',                          controller.getMe);
router.patch('/me',                        controller.updateMe);
router.patch('/me/password',               controller.changePassword);
router.post('/me/verify',                  controller.submitVerification);

// Admin
router.get('/verifications/pending',       authorize('admin'), controller.getPendingVerifications);
router.post('/:id/review-verification',    authorize('admin'), controller.reviewVerification);
router.get('/',                            authorize('admin'), controller.listUsers);
router.delete('/:id',                      authorize('admin'), controller.deactivateUser);

module.exports = router;