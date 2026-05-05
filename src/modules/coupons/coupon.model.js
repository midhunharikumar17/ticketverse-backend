const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code:          { type: String, required: true, unique: true, uppercase: true, trim: true },
  description:   { type: String, default: '' },
  type:          { type: String, enum: ['percent', 'flat'], required: true },
  value:         { type: Number, required: true },       // 20 = 20% or ₹20 flat off
  minOrderValue: { type: Number, default: 0 },           // minimum booking amount
  maxDiscount:   { type: Number, default: null },         // cap for percent coupons
  usageLimit:    { type: Number, default: null },         // null = unlimited
  usedCount:     { type: Number, default: 0 },
  userLimit:     { type: Number, default: 1 },            // per-user usage limit
  usedBy:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  validFrom:     { type: Date, default: Date.now },
  validUntil:    { type: Date, default: null },            // null = never expires
  isActive:      { type: Boolean, default: true },
  eventId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null }, // null = all events
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);