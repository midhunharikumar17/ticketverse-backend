const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const verificationRequestSchema = new mongoose.Schema({
  fullName:      { type: String, default: '' },
  aadharName:    { type: String, default: '' },
  aadharNumber:  { type: String, default: '' },
  bankName:      { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  ifscCode:      { type: String, default: '' },
  panNumber:     { type: String, default: '' },
  address:       { type: String, default: '' },
  status:        { type: String, enum: ['none','pending','approved','rejected'], default: 'none' },
  submittedAt:   { type: Date, default: null },
  reviewedAt:    { type: Date, default: null },
  rejectionNote: { type: String, default: '' },
}, { _id: false });

const userSchema = new mongoose.Schema({
  email:               { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash:        { type: String, required: true },
  displayName:         { type: String, required: true, trim: true },
  avatarUrl:           { type: String, default: null },
  bio:                 { type: String, default: '' },
  role:                { type: String, enum: ['attendee','organizer','admin'], default: 'attendee' },
  isVerified:          { type: Boolean, default: false },
  phone:               { type: String, default: '' },
  interests:           [{ type: String }],
  following:           [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers:           [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pushTokens:          [{ type: String }],
  verificationRequest: { type: verificationRequestSchema, default: () => ({ status: 'none' }) },
}, { timestamps: true });

userSchema.index({ role: 1 });

userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);