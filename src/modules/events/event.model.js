const mongoose = require('mongoose');

const ticketTierSchema = new mongoose.Schema({
  name:              { type: String, required: true },
  price:             { type: Number, required: true, min: 0 },
  totalQuantity:     { type: Number, required: true, min: 1 },
  remainingQuantity: { type: Number, required: true },
  description:       { type: String, default: '' },
  color:             { type: String, default: '#6c47ff' },
});

const seatSectionSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  tierId:        { type: mongoose.Schema.Types.ObjectId },
  rowCount:      { type: Number, default: 0 },
  seatsPerRow:   { type: Number, default: 0 },
  totalCapacity: { type: Number, default: 0 },  // NOT required — auto-computed
  type:          { type: String, enum: ['seated','standing','vip'], default: 'seated' },
  color:         { type: String, default: '#6c47ff' },
  position: {
    x:      { type: Number, default: 0 },
    y:      { type: Number, default: 0 },
    width:  { type: Number, default: 10 },
    height: { type: Number, default: 10 },
  },
  layoutConfig: { type: mongoose.Schema.Types.Mixed, default: null },
});

const eventSchema = new mongoose.Schema({
  organizerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  venueId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', default: null },
  title:        { type: String, required: true, trim: true },
  description:  { type: String, default: '' },         // NOT required
  category:     { type: String, required: true },
  venueName:    { type: String, required: true },
  venueAddress: { type: String, required: true },
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  startTime:    { type: Date, required: true },
  endTime:      { type: Date, required: true },
  posterUrl:    { type: String, default: null },
  status:       { type: String, enum: ['draft','published','cancelled','completed'], default: 'draft' },
  maxCapacity:  { type: Number, required: true },
  tiers:        [ticketTierSchema],
  sections:     [seatSectionSchema],
}, { timestamps: true });

eventSchema.index({ status: 1, startTime: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ location: '2dsphere' });
eventSchema.index({ title: 'text', description: 'text' });
eventSchema.index({ venueId: 1 });
eventSchema.index({ organizerId: 1 });

module.exports = mongoose.model('Event', eventSchema);