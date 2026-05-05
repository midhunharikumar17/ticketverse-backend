const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  bookingId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  seatId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Seat', required: true, unique: true },
  ownerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  qrPayload:  { type: String, unique: true, required: true },
  status:     { type: String, enum: ['valid','used','cancelled','resale_listed'], default: 'valid' },
  issuedAt:   { type: Date, default: Date.now },
}, { timestamps: true });

ticketSchema.index({ ownerId: 1, status: 1 });
ticketSchema.index({ eventId: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
