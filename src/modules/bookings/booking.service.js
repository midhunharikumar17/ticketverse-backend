const Booking = require('./booking.model');
const Seat = require('../seats/seat.model');
const Event = require('../events/event.model');

// ── Create booking — supports BOTH tier-based and seat-based ─────────────────
async function createBooking(userId, { eventId, tierName, quantity, seatIds, groupSessionId }) {
  const event = await Event.findById(eventId);
  if (!event) {
    const err = new Error('Event not found'); err.status = 404; throw err;
  }
  if (event.status !== 'published') {
    const err = new Error('Event is not available for booking'); err.status = 400; throw err;
  }

  // ── SEAT-BASED booking ────────────────────────────────────────────────────
  if (seatIds && seatIds.length > 0) {
    const seats = await Seat.find({ _id: { $in: seatIds }, eventId });
    if (seats.length !== seatIds.length) {
      const err = new Error('One or more seats not found'); err.status = 400; throw err;
    }
    const unavailable = seats.filter(s => s.status !== 'available');
    if (unavailable.length) {
      const err = new Error('One or more seats are no longer available'); err.status = 409; throw err;
    }

    const items = seats.map(s => ({
      seatId: s._id, tierId: s.tierId, priceAtBooking: s.price,
    }));
    const totalAmount = items.reduce((sum, i) => sum + i.priceAtBooking, 0);
    const usedTierName = seats[0]?.sectionName || tierName || 'General';

    const booking = await Booking.create({
      userId, eventId,
      tierName: usedTierName,
      quantity: seats.length,
      totalAmount,
      items,
      status: 'pending',
      groupSessionId: groupSessionId || null,
    });

    // In createBooking, seat-based block — add before return booking
    const event2 = await Event.findById(eventId);
    if (event2) {
      const tierCounts = {};
      seats.forEach(s => {
        const id = s.tierId.toString();
        tierCounts[id] = (tierCounts[id] || 0) + 1;
      });
      event2.tiers.forEach(tier => {
        const count = tierCounts[tier._id.toString()];
        if (count) tier.remainingQuantity = Math.max(0, tier.remainingQuantity - count);
      });
      await event2.save();
    }

    return booking;
  }

  // ── TIER-BASED booking ────────────────────────────────────────────────────
  if (!tierName) {
    const err = new Error('tierName or seatIds is required'); err.status = 400; throw err;
  }
  const qty = Number(quantity) || 1;
  const tier = event.tiers.find(t => t.name === tierName);
  if (!tier) {
    const err = new Error(`Tier "${tierName}" not found`); err.status = 400; throw err;
  }
  if (tier.remainingQuantity < qty) {
    const err = new Error('Not enough tickets available'); err.status = 409; throw err;
  }

  // Hold tickets
  tier.remainingQuantity -= qty;
  await event.save();

  try {
    const booking = await Booking.create({
      userId, eventId,
      tierName,
      quantity: qty,
      totalAmount: tier.price * qty,
      status: 'pending',
      groupSessionId: groupSessionId || null,
    });
    return booking;
  } catch (err) {
    // Restore on failure
    tier.remainingQuantity += qty;
    await event.save();
    throw err;
  }
}

// ── Confirm booking after payment ─────────────────────────────────────────────
async function confirmBooking(bookingId, paymentId, session) {
  const opts = session ? { session } : {};
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const err = new Error('Booking not found'); err.status = 404; throw err;
  }
  if (booking.status === 'confirmed') return booking; // idempotent

  // Mark seats as booked if seat-based
  if (booking.items?.length) {
    const seatIds = booking.items.map(i => i.seatId);
    await Seat.updateMany(
      { _id: { $in: seatIds } },
      { $set: { status: 'booked', bookingId: booking._id } },
      opts
    );
  }

  booking.status = 'confirmed';
  booking.paymentId = paymentId;
  booking.confirmedAt = new Date();
  await booking.save(opts);
  return booking;
}

// ── Cancel booking ────────────────────────────────────────────────────────────
async function cancelBooking(bookingId, requesterId, requesterRole) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    const err = new Error('Booking not found'); err.status = 404; throw err;
  }
  const isOwner = booking.userId.toString() === requesterId.toString();
  if (!isOwner && requesterRole !== 'admin') {
    const err = new Error('Forbidden'); err.status = 403; throw err;
  }
  if (!['pending', 'confirmed'].includes(booking.status)) {
    const err = new Error('Booking cannot be cancelled'); err.status = 400; throw err;
  }

  // Restore seats if seat-based
  if (booking.items?.length) {
    const seatIds = booking.items.map(i => i.seatId);
    await Seat.updateMany(
      { _id: { $in: seatIds } },
      { $set: { status: 'available', bookingId: null } }
    );

  }

  // Restore tier quantity if tier-based
  if (booking.tierName && (!booking.items || booking.items.length === 0)) {
    // In cancelBooking, replace the tier restore block with:
    const event = await Event.findById(booking.eventId);
    if (event) {
      if (booking.items?.length) {
        // Seat-based — restore by tierId
        const tierCounts = {};
        booking.items.forEach(item => {
          const id = item.tierId.toString();
          tierCounts[id] = (tierCounts[id] || 0) + 1;
        });
        event.tiers.forEach(tier => {
          const count = tierCounts[tier._id.toString()];
          if (count) tier.remainingQuantity += count;
        });
      } else {
        // Tier-based — restore by tierName
        const tier = event.tiers.find(t => t.name === booking.tierName);
        if (tier) tier.remainingQuantity += booking.quantity;
      }
      await event.save();
    }
  }

  booking.status = 'cancelled';
  await booking.save();
  return booking;
}

// ── Queries ───────────────────────────────────────────────────────────────────
async function getUserBookings(userId) {
  return Booking.find({ userId })
    .populate('eventId', 'title startTime venueName posterUrl category')
    .sort({ createdAt: -1 });
}

async function getBooking(bookingId, requesterId, requesterRole) {
  const booking = await Booking.findById(bookingId)
    .populate('eventId', 'title startTime venueName')
    .populate('userId', 'displayName email');
  if (!booking) {
    const err = new Error('Booking not found'); err.status = 404; throw err;
  }
  const isOwner = booking.userId._id.toString() === requesterId.toString();
  if (!isOwner && requesterRole !== 'admin') {
    const err = new Error('Forbidden'); err.status = 403; throw err;
  }
  return booking;
}

async function getAllBookings() {
  return Booking.find()
    .populate('eventId', 'title startTime')
    .populate('userId', 'displayName email')
    .sort({ createdAt: -1 });
}

module.exports = {
  createBooking, confirmBooking, cancelBooking,
  getUserBookings, getBooking, getAllBookings,
};