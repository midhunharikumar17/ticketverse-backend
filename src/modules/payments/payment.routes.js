const express      = require('express');
const router       = express.Router();
const controller   = require('./payment.controller');
const authenticate = require('../../middleware/authenticate');

// Webhook — raw body needed for signature verification
// express.raw is applied in app.js for /api/payments/webhook
router.post('/webhook', (req, res, next) => {
  req.rawBody = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8')
    : typeof req.body === 'string'
    ? req.body
    : JSON.stringify(req.body);
  controller.handleWebhook(req, res, next);
});

// Authenticated routes
router.post('/create-order',         authenticate, controller.createOrder);
router.post('/verify',               authenticate, controller.verifyPayment);
router.get('/booking/:bookingId',    authenticate, controller.getPaymentByBooking);

module.exports = router;