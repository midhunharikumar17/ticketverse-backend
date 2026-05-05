const router       = require('express').Router();
const controller   = require('./booking.controller');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');
const validate     = require('../../middleware/validate');
const { createBookingSchema } = require('./booking.validation');

router.use(authenticate);
router.post('/', (req, res, next) => {
  console.log('BOOKING BODY:', JSON.stringify(req.body));
  next();
}, validate(createBookingSchema), controller.createBooking);
router.post('/',             validate(createBookingSchema), controller.createBooking);
router.get('/me',            controller.getUserBookings);
router.get('/all',           authorize('admin'), controller.getAllBookings);
router.get('/:id',           controller.getBooking);
router.post('/:id/cancel',   controller.cancelBooking);

module.exports = router;