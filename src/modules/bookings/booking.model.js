const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const bookingSchema = new mongoose.Schema({
  bookingRef:     { type: String, unique: true, default: () => 'TV' + uuidv4().replace(/-/g,'').slice(0,10).toUpperCase() },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  eventId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Event',   required: true },
  tierName:       { type: String,  default: '' },
  quantity:       { type: Number,  default: 1 },
  status:         { type: String,  enum: ['pending','confirmed','cancelled','refunded'], default: 'pending' },
  totalAmount:    { type: Number,  required: true },
  paymentId:      { type: String, ref: 'Payment', default: null },
  groupSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupSession', default: null },
  confirmedAt:    { type: Date,    default: null },

  // Legacy seat-based items (kept for backward compat)
  items: [{
    seatId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Seat' },
    tierId:         { type: mongoose.Schema.Types.ObjectId },
    priceAtBooking: { type: Number },
  }],
}, { timestamps: true });

bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ eventId: 1, status: 1 });
bookingSchema.index({ paymentId: 1 });

module.exports = mongoose.model('Booking', bookingSchema);