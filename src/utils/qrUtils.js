const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

function generateQRPayload({ ticketId, eventId, seatId, ownerId, eventDate }) {
  const privateKey = fs.readFileSync(path.resolve(process.env.JWT_PRIVATE_KEY_PATH));
  const eventTime = new Date(eventDate).getTime() / 1000;
  return jwt.sign(
    { ticketId, eventId, seatId, ownerId },
    privateKey,
    {
      algorithm: 'RS256',
      notBefore: eventTime - 7200,   // valid 2h before event
      expiresIn: '26h',              // expires 2h after a standard 24h event day
    }
  );
}

function verifyQRPayload(qrPayload) {
  const publicKey = fs.readFileSync(path.resolve(process.env.JWT_PUBLIC_KEY_PATH));
  return jwt.verify(qrPayload, publicKey, { algorithms: ['RS256'] });
}

module.exports = { generateQRPayload, verifyQRPayload };
