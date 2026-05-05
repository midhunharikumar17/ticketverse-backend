const mongoose       = require('mongoose');
const crypto         = require('crypto');
const razorpay       = require('../../config/razorpay');
const Payment        = require('./payment.model');
const Booking        = require('../bookings/booking.model');
const bookingService = require('../bookings/booking.service');

// ── Create Razorpay order ─────────────────────────────────────────────────────
async function createOrder(userId, bookingId, couponCode) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const err = new Error('Booking not found'); err.status = 404; throw err;
  }
  if (booking.userId.toString() !== userId.toString()) {
    const err = new Error('Forbidden'); err.status = 403; throw err;
  }
  // Allow pending OR confirmed (confirmed = already verified via /verify endpoint)
  if (!['pending', 'confirmed'].includes(booking.status)) {
    const err = new Error('Booking is not in a payable state');
    err.status = 400; throw err;
  }

  // Resume existing pending payment order instead of creating duplicate
  const existing = await Payment.findOne({
    bookingId,
    status: { $in: ['pending', 'completed'] },
  });
  if (existing?.status === 'completed') {
    const err = new Error('Booking is already paid'); err.status = 400; throw err;
  }
  if (existing?.status === 'pending') {
    return { payment: existing, razorpayOrderId: existing.razorpayOrderId };
  }

  // Apply coupon discount if provided
  let finalAmount = booking.totalAmount;
  if (couponCode) {
    try {
      const couponService = require('../coupons/coupon.service');
      const result = await couponService.validateCoupon(
        couponCode, userId, booking.totalAmount, booking.eventId
      );
      finalAmount = result.finalAmount;
      await couponService.applyCoupon(result.couponId, userId);
    } catch (e) {
      // Invalid coupon — proceed without discount, don't crash
      console.warn('[createOrder] coupon invalid:', e.message);
    }
  }

  // Minimum Razorpay amount is ₹1 (100 paise)
  const amountInPaise = Math.max(100, Math.round(finalAmount * 100));

  const razorpayOrder = await razorpay.orders.create({
    amount:   amountInPaise,
    currency: 'INR',
    receipt:  bookingId.toString(),
    notes: {
      bookingId: bookingId.toString(),
      userId:    userId.toString(),
    },
  });

  const payment = await Payment.create({
    bookingId,
    userId,
    amount:          amountInPaise,
    currency:        'INR',
    status:          'pending',
    razorpayOrderId: razorpayOrder.id,
  });

  return { payment, razorpayOrderId: razorpayOrder.id };
}

// ── Handle Razorpay webhook ───────────────────────────────────────────────────
async function handleWebhook(rawBody, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (expectedSignature !== signature) {
    const err = new Error('Invalid webhook signature');
    err.status = 400; err.code = 'INVALID_SIGNATURE'; throw err;
  }

  const event = JSON.parse(rawBody);
  if (event.event !== 'payment.captured') return { ignored: true };

  const {
    order_id:  razorpayOrderId,
    id:        razorpayPaymentId,
  } = event.payload.payment.entity;

  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) return { ignored: true };
  if (payment.status === 'completed') return { ignored: true }; // idempotent

  const booking = await Booking.findById(payment.bookingId);
  if (!booking) return { ignored: true };

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await bookingService.confirmBooking(payment.bookingId, payment._id, session);
      payment.status            = 'completed';
      payment.razorpayPaymentId = razorpayPaymentId;
      payment.completedAt       = new Date();
      await payment.save({ session });
    });
  } finally {
    await session.endSession();
  }

  // Emit socket events after transaction
  try {
    const { getIO } = require('../../config/socketServer');
    const io = getIO();
    io.to(`user:${booking.userId}`).emit('booking:confirmed', {
      bookingId: payment.bookingId,
      eventId:   booking.eventId,
    });
  } catch (_) {}

  return { success: true };
}

// ── Get payment by booking ────────────────────────────────────────────────────
async function getPaymentByBooking(bookingId, requesterId, requesterRole) {
  const payment = await Payment.findOne({ bookingId });
  if (!payment) {
    const err = new Error('Payment not found'); err.status = 404; throw err;
  }
  const isOwner = payment.userId.toString() === requesterId.toString();
  if (!isOwner && requesterRole !== 'admin') {
    const err = new Error('Forbidden'); err.status = 403; throw err;
  }
  return payment;
}

module.exports = { createOrder, handleWebhook, getPaymentByBooking };