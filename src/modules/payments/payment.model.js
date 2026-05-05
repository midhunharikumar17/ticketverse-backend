const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  bookingId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  userId:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:             { type: Number, required: true },     // in paise
  currency:           { type: String, default: 'INR' },
  status:             { type: String, enum: ['pending','processing','completed','failed','refunded'], default: 'pending' },
  razorpayOrderId:    { type: String, unique: true, sparse: true },
  razorpayPaymentId:  { type: String, unique: true, sparse: true },
  razorpaySignature:  { type: String, default: null },
  failureReason:      { type: String, default: null },
  completedAt:        { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
