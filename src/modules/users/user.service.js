const User = require('./user.model');

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }
  return user;
}

async function updateProfile(userId, updates) {
  const allowed = ['displayName', 'bio', 'avatarUrl', 'interests', 'phone'];
  const filtered = {};
  allowed.forEach(k => { if (updates[k] !== undefined) filtered[k] = updates[k]; });
  if (updates.name !== undefined) filtered.displayName = updates.name;
  if (updates.phone !== undefined) filtered.phone = updates.phone;
  const user = await User.findByIdAndUpdate(userId, { $set: filtered }, { new: true, runValidators: true });
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }
  return user;
}

async function submitVerification(userId, data) {
  const user = await User.findById(userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }
  if (user.role === 'organizer') { const e = new Error('Already an organizer'); e.status = 400; throw e; }
  if (user.verificationRequest?.status === 'pending') {
    const e = new Error('Verification already pending'); e.status = 400; throw e;
  }
  user.verificationRequest = {
    ...data,
    status: 'pending',
    submittedAt: new Date(),
    reviewedAt: null,
    rejectionNote: '',
  };
  await user.save();
  return user;
}

async function reviewVerification(userId, { action, rejectionNote }, adminId) {
  const user = await User.findById(userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }
  if (user.verificationRequest?.status !== 'pending') {
    const e = new Error('No pending verification request'); e.status = 400; throw e;
  }
  user.verificationRequest.status = action === 'approve' ? 'approved' : 'rejected';
  user.verificationRequest.reviewedAt = new Date();
  user.verificationRequest.rejectionNote = rejectionNote || '';
  if (action === 'approve') {
    user.role = 'organizer';
    user.isVerified = true;
  }
  await user.save();
  return user;
}

async function getPendingVerifications() {
  return User.find({ 'verificationRequest.status': 'pending' })
    .select('displayName email verificationRequest createdAt')
    .sort({ 'verificationRequest.submittedAt': 1 });
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }
  const ok = await user.comparePassword(currentPassword);
  if (!ok) { const e = new Error('Current password is incorrect'); e.status = 400; throw e; }
  user.passwordHash = newPassword;
  await user.save();
  return { message: 'Password changed successfully' };
}

async function listUsers({ page = 1, limit = 20, role, search } = {}) {
  const query = {};
  if (role) query.role = role;
  if (search) query.$or = [
    { displayName: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];
  const skip = (page - 1) * limit;
  const total = await User.countDocuments(query);
  const users = await User.find(query).skip(skip).limit(Number(limit)).sort({ createdAt: -1 });
  return { users, total, page: Number(page), limit: Number(limit) };
}

async function deactivateUser(userId) {
  const user = await User.findByIdAndDelete(userId);
  if (!user) { const e = new Error('User not found'); e.status = 404; throw e; }
  return { message: 'User removed' };
}

module.exports = {
  getProfile, updateProfile, submitVerification, reviewVerification,
  getPendingVerifications, changePassword, listUsers, deactivateUser,
};