const Event = require('./event.model');
const Seat = require('../seats/seat.model');

async function createEvent(organizerId, data) {
  const event = new Event({ organizerId, ...data });
  await event.save();
  return event;
}

async function getEvent(eventId) {
  const event = await Event.findById(eventId).populate('organizerId', 'displayName avatarUrl');
  if (!event) {
    const err = new Error('Event not found');
    err.status = 404; err.code = 'EVENT_NOT_FOUND';
    throw err;
  }
  return event;
}

async function listEvents(filters = {}) {
  const query = { status: 'published' };

  if (filters.category) query.category = filters.category;
  if (filters.q) query.$text = { $search: filters.q };

  if (filters.lat && filters.lng && filters.radius) {
    query.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [parseFloat(filters.lng), parseFloat(filters.lat)] },
        $maxDistance: parseFloat(filters.radius) * 1000,
      },
    };
  }

  if (filters.dateFrom || filters.dateTo) {
    query.startTime = {};
    if (filters.dateFrom) query.startTime.$gte = new Date(filters.dateFrom);
    if (filters.dateTo)   query.startTime.$lte = new Date(filters.dateTo);
  }

  const page  = Math.max(1, parseInt(filters.page)  || 1);
  const limit = Math.min(50, parseInt(filters.limit) || 12);
  const skip  = (page - 1) * limit;

  const [events, total] = await Promise.all([
    Event.find(query)
      .sort({ startTime: 1 })
      .skip(skip)
      .limit(limit)
      .populate('organizerId', 'displayName'),
    Event.countDocuments(query),
  ]);

  return { events, total, page, pages: Math.ceil(total / limit) };
}

async function updateEvent(eventId, organizerId, updates) {
  const event = await Event.findById(eventId);
  if (!event) { const e = new Error('Event not found'); e.status = 404; throw e; }
  if (event.organizerId.toString() !== organizerId.toString()) {
    const e = new Error('Not your event'); e.status = 403; throw e;
  }

  // Auto-compute totalCapacity on sections if missing
  if (updates.sections) {
    updates.sections = updates.sections.map(sec => ({
      ...sec,
      totalCapacity: sec.totalCapacity || (Number(sec.rowCount || 0) * Number(sec.seatsPerRow || 0)) || 0,
    }));
  }

  Object.assign(event, updates);
  await event.save();
  return event;
}

async function publishEvent(eventId, organizerId) {
  const event = await Event.findById(eventId);
  if (!event) { const e = new Error('Event not found'); e.status = 404; throw e; }
  if (event.organizerId.toString() !== organizerId.toString()) {
    const e = new Error('Not your event'); e.status = 403; throw e;
  }

  event.status = 'published';

  // Fix sections — ensure totalCapacity is set on every section
  event.sections = event.sections.map(sec => ({
    ...sec.toObject(),
    totalCapacity: sec.totalCapacity || (sec.rowCount * sec.seatsPerRow) || 0,
  }));

  await event.save();
  await seedSeats(event);
  return event;
}

async function publishEventFromVenue(eventId, organizerId, { venueId, layoutId, tierMapping }) {
  const event = await Event.findById(eventId);
  if (!event) { const e = new Error('Event not found'); e.status = 404; throw e; }
  if (event.organizerId.toString() !== organizerId.toString()) {
    const e = new Error('Not your event'); e.status = 403; throw e;
  }

  const venue = await Venue.findById(venueId);
  if (!venue) { const e = new Error('Venue not found'); e.status = 404; throw e; }

  const layout = venue.layouts.id(layoutId);
  if (!layout) { const e = new Error('Layout not found'); e.status = 404; throw e; }

  // Snapshot zones onto event
  event.venueId  = venueId;
  event.layoutId = layoutId;
  event.venueName    = venue.name;
  event.venueAddress = `${venue.address}, ${venue.city}`;

  // Copy zones as snapshot, wiring tier IDs from tierMapping
  // tierMapping: { zoneName: tierId }
  event.sections = layout.zones.map(zone => ({
    venueZoneId:   zone._id,
    name:          zone.name,
    type:          zone.type,
    tierId:        tierMapping?.[zone.name] || event.tiers[0]?._id,
    rowCount:      zone.rowCount,
    seatsPerRow:   zone.seatsPerRow,
    totalCapacity: zone.totalCapacity,
    color:         zone.color,
    position:      zone.position,
  }));

  event.status = 'published';
  event.maxCapacity = layout.totalCapacity;
  await event.save();

  // Seed event-specific seats from snapshot
  await seedSeatsFromSections(event);
  return event;
}

async function cancelEvent(eventId, requesterId, requesterRole) {
  const event = await Event.findById(eventId);
  if (!event) {
    const err = new Error('Event not found');
    err.status = 404; err.code = 'EVENT_NOT_FOUND';
    throw err;
  }
  const isOwner = event.organizerId.toString() === requesterId.toString();
  if (!isOwner && requesterRole !== 'admin') {
    const err = new Error('Forbidden');
    err.status = 403; err.code = 'FORBIDDEN';
    throw err;
  }
  event.status = 'cancelled';
  await event.save();
  return event;
}

async function getOrganizerEvents(organizerId) {
  return Event.find({ organizerId }).sort({ createdAt: -1 });
}

async function getAttendeeCount(eventId) {
  const Booking = require('../bookings/booking.model');
  return Booking.countDocuments({ eventId, status: 'confirmed' });
}

async function seedSeats(event) {
  const seats = [];
  for (const section of event.sections) {
    const tier = event.tiers.id(section.tierId);
    if (!tier) continue;
    for (let row = 0; row < section.rowCount; row++) {
      const rowLabel = String.fromCharCode(65 + row);
      for (let num = 1; num <= section.seatsPerRow; num++) {
        seats.push({
          eventId:     event._id,
          sectionId:   section._id,
          sectionName: section.name,
          tierId:      tier._id,
          price:       tier.price,
          rowLabel,
          seatNumber:  num,
          status:      'available',
        });
      }
    }
  }
  if (seats.length > 0) {
    await Seat.insertMany(seats, { ordered: false });
  }
  return seats.length;
}

module.exports = {
  createEvent, getEvent, listEvents, updateEvent,
  publishEvent,publishEventFromVenue, cancelEvent, getOrganizerEvents, getAttendeeCount,
};