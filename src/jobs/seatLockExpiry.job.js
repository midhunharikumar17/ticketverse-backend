const cron = require('node-cron');
const logger = require('../utils/logger');

// Seat model loaded lazily to avoid circular dependency at startup
function scheduleSeatLockExpiry() {
  cron.schedule('*/30 * * * * *', async () => {
    try {
      const Seat = require('../modules/seats/seat.model');
      const expired = await Seat.find({
        status: 'locked',
        lockExpiresAt: { $lt: new Date() },
      }).select('_id eventId');

      if (expired.length === 0) return;

      const ids = expired.map(s => s._id);
      await Seat.updateMany(
        { _id: { $in: ids } },
        { $set: { status: 'available', lockedByUserId: null, lockExpiresAt: null } }
      );

      // Group by eventId and broadcast via Socket.IO
      const byEvent = expired.reduce((acc, s) => {
        const key = s.eventId.toString();
        (acc[key] = acc[key] || []).push({ seatId: s._id.toString(), status: 'available' });
        return acc;
      }, {});

      try {
        const { getIO } = require('../config/socketServer');
        const io = getIO();
        for (const [eventId, seats] of Object.entries(byEvent)) {
          io.to(`event:${eventId}`).emit('seat:bulk_update', { seats });
        }
      } catch {
        // Socket.IO may not be ready yet during early startup
      }

      logger.info(`Released ${ids.length} expired seat locks`);
    } catch (err) {
      logger.error('seatLockExpiry job error:', err.message);
    }
  });
}

module.exports = { scheduleSeatLockExpiry };
