const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const privateKey = process.env.JWT_PRIVATE_KEY
  ? process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n')
  : require('fs').readFileSync(process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem', 'utf8');

const publicKey = process.env.JWT_PUBLIC_KEY
  ? process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n')
  : require('fs').readFileSync(process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem', 'utf8');

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
