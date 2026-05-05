const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  eventId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Event',   required: true },
  sectionId:   { type: mongoose.Schema.Types.ObjectId,                  required: true },
  sectionName: { type: String,                                           required: true },
  tierId:      { type: mongoose.Schema.Types.ObjectId,                  required: true },
  price:       { type: Number,                                           required: true },
  rowLabel:    { type: String,                                           required: true },
  seatNumber:  { type: Number,                                           required: true },
  status: {
    type:    String,
    enum:    ['available', 'booked', 'unavailable', 'resale_available'],
    default: 'available',
  },
  // bookingId set when status → booked
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  // overriddenBy — set when admin manually changes status
  overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  overrideNote: { type: String, default: null },
}, { timestamps: true });

seatSchema.index({ eventId: 1, status: 1 });
seatSchema.index({ eventId: 1, sectionId: 1 });
seatSchema.index({ eventId: 1, rowLabel: 1, seatNumber: 1 }, { unique: true });

module.exports = mongoose.model('Seat', seatSchema);