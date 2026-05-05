const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getPrivateKey() {
  return fs.readFileSync(path.resolve(process.env.JWT_PRIVATE_KEY_PATH));
}

function getPublicKey() {
  return fs.readFileSync(path.resolve(process.env.JWT_PUBLIC_KEY_PATH));
}

function signAccessToken(payload) {
  return jwt.sign(payload, getPrivateKey(), {
    algorithm: 'RS256',
    expiresIn: '15m',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, getPublicKey(), { algorithms: ['RS256'] });
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { signAccessToken, verifyAccessToken, generateRefreshToken, hashToken };
