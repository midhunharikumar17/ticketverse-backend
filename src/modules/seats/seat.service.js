const Seat  = require('./seat.model');
const redis = require('../../config/redis');

const LOCK_TTL = 600; // 10 minutes — matches booking service

// ─── Helpers ─────────────────────────────────────────────────────────────────

function lockKey(seatId) {
  return `seat:${seatId}:lock`;
}

async function getLockOwner(seatId) {
  return redis.get(lockKey(seatId)); // returns userId string or null
}

// ─── Get seat map for an event ────────────────────────────────────────────────

async function getSeatMap(eventId) {
  const seats = await Seat.find({ eventId })
    .select('sectionId sectionName tierId price rowLabel seatNumber status bookingId')
    .lean();

  // Enrich each seat with its Redis lock state
  const pipeline = redis.pipeline();
  for (const seat of seats) {
    pipeline.get(lockKey(seat._id));
  }
  const lockResults = await pipeline.exec();

  return seats.map((seat, i) => {
    const lockedBy = lockResults[i][1]; // null or userId string
    return {
      ...seat,
      isLocked:  !!lockedBy,
      lockedBy:  lockedBy || null,
    };
  });
}

// ─── Get a single seat ────────────────────────────────────────────────────────

async function getSeat(seatId) {
  const seat = await Seat.findById(seatId)
    .populate('bookingId', 'userId status')
    .lean();
  if (!seat) {
    const err = new Error('Seat not found');
    err.status = 404; err.code = 'SEAT_NOT_FOUND';
    throw err;
  }
  const lockedBy = await getLockOwner(seatId);
  return { ...seat, isLocked: !!lockedBy, lockedBy };
}

// ─── Lock seats (called from booking service) ─────────────────────────────────

async function lockSeats(seatIds, userId) {
  const pipeline = redis.pipeline();
  for (const id of seatIds) {
    pipeline.set(lockKey(id), userId.toString(), 'NX', 'EX', LOCK_TTL);
  }
  const results = await pipeline.exec();
  const failed  = seatIds.filter((_, i) => results[i][1] !== 'OK');
  return failed; // empty = all locked successfully
}

// ─── Release locks (called from booking service) ──────────────────────────────

async function releaseSeats(seatIds) {
  if (!seatIds.length) return;
  const pipeline = redis.pipeline();
  for (const id of seatIds) pipeline.del(lockKey(id));
  await pipeline.exec();
}

// ─── Check lock status for a set of seats ────────────────────────────────────

async function getSeatLockStatuses(seatIds) {
  const pipeline = redis.pipeline();
  for (const id of seatIds) pipeline.get(lockKey(id));
  const results = await pipeline.exec();
  return seatIds.reduce((acc, id, i) => {
    acc[id] = results[i][1] || null;
    return acc;
  }, {});
}

// ─── Admin: override seat status ──────────────────────────────────────────────

async function adminOverrideSeat(seatId, adminId, { status, note }) {
  const allowed = ['available', 'unavailable'];
  if (!allowed.includes(status)) {
    const err = new Error(`Admin can only set status to: ${allowed.join(', ')}`);
    err.status = 400; err.code = 'INVALID_STATUS';
    throw err;
  }

  const seat = await Seat.findById(seatId);
  if (!seat) {
    const err = new Error('Seat not found');
    err.status = 404; err.code = 'SEAT_NOT_FOUND';
    throw err;
  }
  if (seat.status === 'booked') {
    const err = new Error('Cannot override a booked seat — cancel the booking first');
    err.status = 400; err.code = 'SEAT_BOOKED';
    throw err;
  }

  // Release any Redis lock on this seat
  await redis.del(lockKey(seatId));

  seat.status       = status;
  seat.overriddenBy = adminId;
  seat.overrideNote = note || null;
  await seat.save();

  return seat;
}

// ─── Admin: bulk override by section ─────────────────────────────────────────

async function adminOverrideSection(eventId, sectionId, adminId, { status, note }) {
  const allowed = ['available', 'unavailable'];
  if (!allowed.includes(status)) {
    const err = new Error(`Admin can only set status to: ${allowed.join(', ')}`);
    err.status = 400; err.code = 'INVALID_STATUS';
    throw err;
  }

  // Only affect non-booked seats
  const seats = await Seat.find({
    eventId,
    sectionId,
    status: { $ne: 'booked' },
  });

  if (!seats.length) {
    const err = new Error('No overridable seats found in this section');
    err.status = 404; err.code = 'NO_SEATS';
    throw err;
  }

  // Release all Redis locks for this section
  const pipeline = redis.pipeline();
  for (const seat of seats) pipeline.del(lockKey(seat._id));
  await pipeline.exec();

  await Seat.updateMany(
    { eventId, sectionId, status: { $ne: 'booked' } },
    { $set: { status, overriddenBy: adminId, overrideNote: note || null } }
  );

  return { updated: seats.length };
}

// ─── Get seat stats for an event (used by admin dashboard) ───────────────────

async function getSeatStats(eventId) {
  const stats = await Seat.aggregate([
    { $match: { eventId: require('mongoose').Types.ObjectId(eventId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Get total locked count from Redis
  const allSeats = await Seat.find({ eventId }).select('_id').lean();
  const pipeline = redis.pipeline();
  for (const seat of allSeats) pipeline.exists(lockKey(seat._id));
  const lockResults  = await pipeline.exec();
  const lockedCount  = lockResults.filter(r => r[1] === 1).length;

  const breakdown = stats.reduce((acc, s) => {
    acc[s._id] = s.count;
    return acc;
  }, {});

  return {
    total:       allSeats.length,
    available:   breakdown.available   || 0,
    booked:      breakdown.booked      || 0,
    unavailable: breakdown.unavailable || 0,
    resale:      breakdown.resale_available || 0,
    locked:      lockedCount, // from Redis — seats currently being held
  };
}

module.exports = {
  getSeatMap, getSeat,
  lockSeats, releaseSeats, getSeatLockStatuses,
  adminOverrideSeat, adminOverrideSection,
  getSeatStats,
};