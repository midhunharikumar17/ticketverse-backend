// const jwt = require('jsonwebtoken');
// const fs = require('fs');
// const path = require('path');
// const crypto = require('crypto');

// const privateKey = process.env.JWT_PRIVATE_KEY
//   ? process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n')
//   : require('fs').readFileSync(process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem', 'utf8');

// const publicKey = process.env.JWT_PUBLIC_KEY
//   ? process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n')
//   : require('fs').readFileSync(process.env.JWT_PUBLIC_KEY_PATH || './keys/public.pem', 'utf8');

// function signAccessToken(payload) {
//   return jwt.sign(payload, getPrivateKey(), {
//     algorithm: 'RS256',
//     expiresIn: '15m',
//   });
// }

// function verifyAccessToken(token) {
//   return jwt.verify(token, getPublicKey(), { algorithms: ['RS256'] });
// }

// function generateRefreshToken() {
//   return crypto.randomBytes(64).toString('hex');
// }

// function hashToken(token) {
//   return crypto.createHash('sha256').update(token).digest('hex');
// }

// module.exports = { signAccessToken, verifyAccessToken, generateRefreshToken, hashToken };

const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const fs     = require('fs');

// Load keys from env vars (production) or files (local dev)
function loadKey(envVar, filePath) {
  if (process.env[envVar]) {
    // Render stores multiline env vars correctly
    // But if newlines got escaped as \n, fix them
    return process.env[envVar].replace(/\\n/g, '\n');
  }
  // Local dev — read from file
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    throw new Error(`Missing ${envVar} env var or ${filePath} file`);
  }
}

const privateKey = loadKey('JWT_PRIVATE_KEY', './keys/private.pem');
const publicKey  = loadKey('JWT_PUBLIC_KEY',  './keys/public.pem');

const ACCESS_TOKEN_EXPIRY  = '15m';
const REFRESH_TOKEN_BYTES  = 40;

function signAccessToken(payload) {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
}

function generateRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { signAccessToken, verifyAccessToken, generateRefreshToken, hashToken };