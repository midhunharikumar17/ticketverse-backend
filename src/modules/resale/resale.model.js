const mongoose = require('mongoose');

const resaleListingSchema = new mongoose.Schema({
  sellerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  buyerId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',    default: null },
  eventId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Event',   required: true },
  bookingId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  tierName:      { type: String,  required: true },
  quantity:      { type: Number,  required: true, min: 1 },
  resalePrice:   { type: Number,  required: true },  // per ticket
  originalPrice: { type: Number,  required: true },  // per ticket
  status:        { type: String,  enum: ['active','sold','cancelled'], default: 'active' },
  soldAt:        { type: Date,    default: null },
}, { timestamps: true });

resaleListingSchema.pre('save', function () {
  if (this.resalePrice > this.originalPrice * 1.2) {
    const err = new Error('Resale price cannot exceed 20% above face value');
    err.status = 400;
    throw err;
  }
});

resaleListingSchema.index({ eventId: 1, status: 1 });
resaleListingSchema.index({ sellerId: 1 });
resaleListingSchema.index({ bookingId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('ResaleListing', resaleListingSchema);