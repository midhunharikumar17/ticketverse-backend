const Seat  = require('./seat.model');
const redis = require('../../config/redis');

const LOCK_TTL = 600;
const lockKey  = id => `seat:${id}:lock`;

async function getSeatMap(eventId) {
  const seats = await Seat.find({ eventId })
    .select('sectionId sectionName tierId price rowLabel seatNumber status bookingId')
    .lean();

  // Try to enrich with Redis lock state — fail gracefully
  try {
    const pipeline = redis.pipeline();
    for (const seat of seats) pipeline.get(lockKey(seat._id));
    const lockResults = await pipeline.exec();
    return seats.map((seat, i) => ({
      ...seat,
      isLocked: !!lockResults[i][1],
      lockedBy: lockResults[i][1] || null,
    }));
  } catch (_) {
    // Redis unavailable — return seats without lock info
    return seats.map(seat => ({ ...seat, isLocked: false, lockedBy: null }));
  }
}

async function getSeat(seatId) {
  const seat = await Seat.findById(seatId)
    .populate('bookingId', 'userId status')
    .lean();
  if (!seat) {
    const err = new Error('Seat not found'); err.status = 404; throw err;
  }
  let lockedBy = null;
  try { lockedBy = await redis.get(lockKey(seatId)); } catch (_) {}
  return { ...seat, isLocked: !!lockedBy, lockedBy };
}

async function lockSeats(seatIds, userId) {
  try {
    const pipeline = redis.pipeline();
    for (const id of seatIds) {
      pipeline.set(lockKey(id), userId.toString(), 'NX', 'EX', LOCK_TTL);
    }
    const results = await pipeline.exec();
    return seatIds.filter((_, i) => results[i][1] !== 'OK');
  } catch (_) {
    return []; // Redis down — allow booking to proceed
  }
}

async function releaseSeats(seatIds) {
  if (!seatIds.length) return;
  try {
    const pipeline = redis.pipeline();
    for (const id of seatIds) pipeline.del(lockKey(id));
    await pipeline.exec();
  } catch (_) {}
}

async function getSeatLockStatuses(seatIds) {
  try {
    const pipeline = redis.pipeline();
    for (const id of seatIds) pipeline.get(lockKey(id));
    const results = await pipeline.exec();
    return seatIds.reduce((acc, id, i) => {
      acc[id] = results[i][1] || null;
      return acc;
    }, {});
  } catch (_) {
    return seatIds.reduce((acc, id) => { acc[id] = null; return acc; }, {});
  }
}

async function adminOverrideSeat(seatId, adminId, { status, note }) {
  const allowed = ['available', 'unavailable'];
  if (!allowed.includes(status)) {
    const err = new Error(`Status must be: ${allowed.join(', ')}`);
    err.status = 400; throw err;
  }
  const seat = await Seat.findById(seatId);
  if (!seat) { const err = new Error('Seat not found'); err.status = 404; throw err; }
  if (seat.status === 'booked') {
    const err = new Error('Cannot override a booked seat'); err.status = 400; throw err;
  }
  try { await redis.del(lockKey(seatId)); } catch (_) {}
  seat.status = status; seat.overriddenBy = adminId; seat.overrideNote = note || null;
  await seat.save();
  return seat;
}

async function adminOverrideSection(eventId, sectionId, adminId, { status, note }) {
  const allowed = ['available', 'unavailable'];
  if (!allowed.includes(status)) {
    const err = new Error(`Status must be: ${allowed.join(', ')}`); err.status = 400; throw err;
  }
  const seats = await Seat.find({ eventId, sectionId, status: { $ne: 'booked' } });
  if (!seats.length) {
    const err = new Error('No seats found'); err.status = 404; throw err;
  }
  try {
    const pipeline = redis.pipeline();
    for (const seat of seats) pipeline.del(lockKey(seat._id));
    await pipeline.exec();
  } catch (_) {}
  await Seat.updateMany(
    { eventId, sectionId, status: { $ne: 'booked' } },
    { $set: { status, overriddenBy: adminId, overrideNote: note || null } }
  );
  return { updated: seats.length };
}

async function getSeatStats(eventId) {
  const { Types } = require('mongoose');
  const stats = await Seat.aggregate([
    { $match: { eventId: new Types.ObjectId(eventId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const allSeats = await Seat.find({ eventId }).select('_id').lean();
  let lockedCount = 0;
  try {
    const pipeline = redis.pipeline();
    for (const seat of allSeats) pipeline.exists(lockKey(seat._id));
    const lockResults = await pipeline.exec();
    lockedCount = lockResults.filter(r => r[1] === 1).length;
  } catch (_) {}
  const breakdown = stats.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {});
  return {
    total:       allSeats.length,
    available:   breakdown.available || 0,
    booked:      breakdown.booked || 0,
    unavailable: breakdown.unavailable || 0,
    resale:      breakdown.resale_available || 0,
    locked:      lockedCount,
  };
}

module.exports = {
  getSeatMap, getSeat, lockSeats, releaseSeats,
  getSeatLockStatuses, adminOverrideSeat,
  adminOverrideSection, getSeatStats,
};