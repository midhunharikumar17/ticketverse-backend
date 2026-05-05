const paymentService = require('./payment.service');
const crypto         = require('crypto');
const Booking        = require('../bookings/booking.model');
const bookingService = require('../bookings/booking.service');

async function createOrder(req, res, next) {
  try {
    const { bookingId, couponCode } = req.body;
    // Fixed: use req.user.id not req.user.sub
    const result = await paymentService.createOrder(req.user.id, bookingId, couponCode);
    res.status(201).json(result);
  } catch (err) { next(err); }
}
async function verifyPayment(req, res, next) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
    } = req.body;

    const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    if (booking.status === 'pending') {
      // ✅ Use bookingService instead of booking.save() directly
      await bookingService.confirmBooking(bookingId, razorpay_payment_id);

      // ✅ Emit seat:booked for each seat so frontend updates live
      const { getIO } = require('../../config/socketServer');
      const io = getIO();
      if (booking.items?.length) {
        booking.items.forEach(item => {
          io.to(booking.eventId.toString()).emit('seat:booked', {
            seatId: item.seatId.toString(),
          });
        });
      }

      // ✅ Notify the user
      io.to(`user:${booking.userId}`).emit('booking:confirmed', {
        bookingId,
        eventId: booking.eventId,
      });
    }

    res.json({ success: true, message: 'Payment verified and booking confirmed' });
  } catch (err) { next(err); }
}

async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    await paymentService.handleWebhook(req.rawBody, signature);
    res.sendStatus(200);
  } catch (err) {
    if (err.code === 'INVALID_SIGNATURE') return res.sendStatus(400);
    next(err);
  }
}

async function getPaymentByBooking(req, res, next) {
  try {
    // Fixed: use req.user.id not req.user.sub
    const payment = await paymentService.getPaymentByBooking(
      req.params.bookingId, req.user.id, req.user.role
    );
    res.json({ payment });
  } catch (err) { next(err); }
}

module.exports = { createOrder, verifyPayment, handleWebhook, getPaymentByBooking };