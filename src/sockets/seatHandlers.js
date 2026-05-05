const redis     = require('../config/redis');
const Seat      = require('../modules/seats/seat.model');

const LOCK_TTL  = 300; // 5 min
const lockKey   = id => `seat:${id}:lock`;

module.exports = function seatHandlers(io, socket) {
  const userId = socket.user.sub;

  // User joins an event room to receive live seat updates
  socket.on('event:join', async (eventId) => {
    socket.join(`event:${eventId}`);

    // Send current seat map snapshot to this user
    const seats = await Seat.find({ eventId })
      .select('sectionId sectionName tierId price rowLabel seatNumber status bookingId')
      .lean();

    // Enrich with Redis lock state
    const pipeline = redis.pipeline();
    seats.forEach(s => pipeline.get(lockKey(s._id)));
    const results = await pipeline.exec();

    const enriched = seats.map((s, i) => ({
      ...s,
      isLocked: !!results[i][1],
      lockedBy: results[i][1] || null,
    }));

    socket.emit('seat:snapshot', enriched);
  });

  socket.on('event:leave', (eventId) => {
    socket.leave(`event:${eventId}`);
  });

  // User tries to lock a seat (hold it during checkout)
  socket.on('seat:lock', async ({ seatId, eventId }, callback) => {
    try {
      const seat = await Seat.findById(seatId);
      if (!seat || seat.status !== 'available') {
        return callback?.({ success: false, reason: 'Seat not available' });
      }

      // Lua script: atomic check-and-set
      const luaScript = `
        local existing = redis.call('GET', KEYS[1])
        if existing then
          if existing == ARGV[1] then
            redis.call('EXPIRE', KEYS[1], ARGV[2])
            return 'REFRESHED'
          else
            return 'TAKEN'
          end
        end
        redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
        return 'LOCKED'
      `;

      const result = await redis.eval(
        luaScript, 1,
        lockKey(seatId),
        userId.toString(),
        LOCK_TTL.toString()
      );

      if (result === 'TAKEN') {
        return callback?.({ success: false, reason: 'Seat is being held by another user' });
      }

      // Broadcast lock to all users in event room
      io.to(`event:${eventId}`).emit('seat:locked', {
        seatId,
        lockedBy: userId,
        expiresIn: LOCK_TTL,
      });

      // Auto-release after TTL if not confirmed
      setTimeout(async () => {
        const owner = await redis.get(lockKey(seatId));
        if (owner === userId.toString()) {
          await redis.del(lockKey(seatId));
          io.to(`event:${eventId}`).emit('seat:unlocked', { seatId });
        }
      }, LOCK_TTL * 1000);

      callback?.({ success: true, result });

    } catch (err) {
      callback?.({ success: false, reason: err.message });
    }
  });

  // User releases a seat (deselects during checkout)
  socket.on('seat:unlock', async ({ seatId, eventId }, callback) => {
    try {
      const owner = await redis.get(lockKey(seatId));
      if (owner !== userId.toString()) {
        return callback?.({ success: false, reason: 'You do not hold this lock' });
      }

      await redis.del(lockKey(seatId));

      io.to(`event:${eventId}`).emit('seat:unlocked', { seatId });
      callback?.({ success: true });

    } catch (err) {
      callback?.({ success: false, reason: err.message });
    }
  });

  // Release all locks when user disconnects
  socket.on('disconnect', async () => {
    // Find all seats locked by this user across all events
    // Use SCAN to avoid blocking Redis
    let cursor = '0';
    const keysToCheck = [];
    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'seat:*:lock', 'COUNT', 100);
      cursor = newCursor;
      keysToCheck.push(...keys);
    } while (cursor !== '0');

    if (!keysToCheck.length) return;

    const pipeline = redis.pipeline();
    keysToCheck.forEach(k => pipeline.get(k));
    const values = await pipeline.exec();

    const toRelease = keysToCheck.filter((_, i) => values[i][1] === userId.toString());
    if (!toRelease.length) return;

    const delPipeline = redis.pipeline();
    toRelease.forEach(k => delPipeline.del(k));
    await delPipeline.exec();

    // Broadcast releases — extract seatId from key pattern seat:{id}:lock
    toRelease.forEach(k => {
      const seatId = k.split(':')[1];
      // Broadcast to all event rooms this socket was in
      socket.rooms.forEach(room => {
        if (room.startsWith('event:')) {
          io.to(room).emit('seat:unlocked', { seatId });
        }
      });
    });
  });
};