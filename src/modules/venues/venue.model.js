const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  name:        { type: String, required: true },   // "Floor", "VIP Balcony"
  type:        { type: String, enum: ['seated','standing','vip'], default: 'seated' },
  rowCount:    { type: Number, default: 0 },
  seatsPerRow: { type: Number, default: 0 },
  totalCapacity:{ type: Number, required: true },
  color:       { type: String, default: '#7c3aed' }, // for UI rendering
  position: {                                         // grid position for map
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    width:  { type: Number, default: 10 },
    height: { type: Number, default: 10 },
  },
});

const venueLayoutSchema = new mongoose.Schema({
  name:         { type: String, required: true },  // "Main Stage Config", "Theatre Config"
  description:  { type: String, default: '' },
  totalCapacity:{ type: Number, required: true },
  zones:        [zoneSchema],
  mapConfig:    { type: mongoose.Schema.Types.Mixed, default: null }, // SVG/canvas metadata
}, { timestamps: true });

const venueSchema = new mongoose.Schema({
  ownerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:        { type: String, required: true, trim: true },
  address:     { type: String, required: true },
  city:        { type: String, required: true },
  state:       { type: String, required: true },
  pincode:     { type: String, default: '' },
  location: {
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
  capacity:    { type: Number, required: true },
  description: { type: String, default: '' },
  amenities:   [{ type: String }],
  images:      [{ type: String }],
  isVerified:  { type: Boolean, default: false },
  layouts:     [venueLayoutSchema],
  status:      { type: String, enum: ['active','inactive'], default: 'active' },
}, { timestamps: true });

venueSchema.index({ location: '2dsphere' });
venueSchema.index({ ownerId: 1 });
venueSchema.index({ city: 1, status: 1 });

module.exports = mongoose.model('Venue', venueSchema);