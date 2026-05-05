const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  color:    { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
});

const groupSessionSchema = new mongoose.Schema({
  eventId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  organizerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [participantSchema],
  status:       { type: String, enum: ['active','expired','completed'], default: 'active' },
  expiresAt:    { type: Date, required: true },
}, { timestamps: true });

groupSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL auto-delete

module.exports = mongoose.model('GroupSession', groupSessionSchema);
