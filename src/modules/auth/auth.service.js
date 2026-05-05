const User         = require('../users/user.model');
const RefreshToken = require('./auth.model');
const {
  signAccessToken,
  generateRefreshToken,
  hashToken,
} = require('../../utils/jwtUtils');

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

async function register({ name, email, password }) {
  // Check duplicate email
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('Email already in use');
    err.status = 409;
    throw err;
  }

  // Create user — passwordHash field is what the model expects
  const user = new User({
    displayName:  name,
    email,
    passwordHash: password,   // pre-save hook will bcrypt this
  });
  await user.save();

  // Issue tokens immediately so frontend can log user in after register
  const accessToken = signAccessToken({
    sub:         user._id,
    email:       user.email,
    role:        user.role,
    displayName: user.displayName,
  });

  const rawRefresh = generateRefreshToken();
  const tokenHash  = hashToken(rawRefresh);
  const expiresAt  = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({ userId: user._id, tokenHash, expiresAt });

  return { user, accessToken, rawRefresh };
}

async function login({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const accessToken = signAccessToken({
    sub:         user._id,
    email:       user.email,
    role:        user.role,
    displayName: user.displayName,
  });

  const rawRefresh = generateRefreshToken();
  const tokenHash  = hashToken(rawRefresh);
  const expiresAt  = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({ userId: user._id, tokenHash, expiresAt });

  return { user, accessToken, rawRefresh };
}

async function refresh(rawToken) {
  if (!rawToken) {
    const err = new Error('Refresh token missing');
    err.status = 401;
    throw err;
  }

  const tokenHash = hashToken(rawToken);
  const stored    = await RefreshToken.findOne({ tokenHash, revoked: false });

  if (!stored || stored.expiresAt < new Date()) {
    const err = new Error('Refresh token invalid or expired');
    err.status = 401;
    throw err;
  }

  // Rotate: revoke old, issue new
  stored.revoked = true;
  await stored.save();

  const user        = await User.findById(stored.userId);
  const accessToken = signAccessToken({
    sub:         user._id,
    email:       user.email,
    role:        user.role,
    displayName: user.displayName,
  });

  const newRaw    = generateRefreshToken();
  const newHash   = hashToken(newRaw);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({ userId: user._id, tokenHash: newHash, expiresAt });

  return { accessToken, rawRefresh: newRaw };
}

async function logout(rawToken) {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await RefreshToken.findOneAndDelete({ tokenHash });
}

module.exports = { register, login, refresh, logout };