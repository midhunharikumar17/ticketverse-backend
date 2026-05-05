const Venue = require('./venue.model');

async function createVenue(ownerId, data) {
  const venue = await Venue.create({ ...data, ownerId });
  return venue;
}

async function getVenue(venueId) {
  const venue = await Venue.findById(venueId).populate('ownerId', 'displayName email');
  if (!venue) { const e = new Error('Venue not found'); e.status = 404; throw e; }
  return venue;
}

async function listVenues({ city, search, page = 1, limit = 20 } = {}) {
  const query = { status: 'active' };
  if (city)   query.city   = { $regex: city, $options: 'i' };
  if (search) query.$or = [
    { name:    { $regex: search, $options: 'i' } },
    { address: { $regex: search, $options: 'i' } },
  ];
  const skip  = (page - 1) * limit;
  const total = await Venue.countDocuments(query);
  const venues = await Venue.find(query)
    .populate('ownerId', 'displayName')
    .skip(skip).limit(Number(limit))
    .sort({ createdAt: -1 });
  return { venues, total, page: Number(page) };
}

async function getMyVenues(ownerId) {
  return Venue.find({ ownerId }).sort({ createdAt: -1 });
}

async function updateVenue(venueId, ownerId, data, role) {
  const venue = await Venue.findById(venueId);
  if (!venue) { const e = new Error('Venue not found'); e.status = 404; throw e; }
  if (venue.ownerId.toString() !== ownerId.toString() && role !== 'admin') {
    const e = new Error('Not your venue'); e.status = 403; throw e;
  }
  Object.assign(venue, data);
  await venue.save();
  return venue;
}

// ── Layout management ─────────────────────────────────────────────────────────

async function addLayout(venueId, ownerId, layoutData, role) {
  const venue = await Venue.findById(venueId);
  if (!venue) { const e = new Error('Venue not found'); e.status = 404; throw e; }
  if (venue.ownerId.toString() !== ownerId.toString() && role !== 'admin') {
    const e = new Error('Not your venue'); e.status = 403; throw e;
  }

  // Auto-fix zones — ensure totalCapacity is always set
  const zones = (layoutData.zones || []).map(z => ({
    ...z,
    totalCapacity: Number(z.totalCapacity) || (Number(z.rowCount || 0) * Number(z.seatsPerRow || 0)) || 0,
  }));

  const totalCapacity = zones.reduce((sum, z) => sum + z.totalCapacity, 0);

  venue.layouts.push({ ...layoutData, zones, totalCapacity });
  await venue.save();
  return venue.layouts[venue.layouts.length - 1];
}

async function updateLayout(venueId, layoutId, ownerId, data, role) {
  const venue = await Venue.findById(venueId);
  if (!venue) { const e = new Error('Venue not found'); e.status = 404; throw e; }
  if (venue.ownerId.toString() !== ownerId.toString() && role !== 'admin') {
    const e = new Error('Not your venue'); e.status = 403; throw e;
  }
  const layout = venue.layouts.id(layoutId);
  if (!layout) { const e = new Error('Layout not found'); e.status = 404; throw e; }
  Object.assign(layout, data);
  await venue.save();
  return layout;
}

async function deleteLayout(venueId, layoutId, ownerId, role) {
  const venue = await Venue.findById(venueId);
  if (!venue) { const e = new Error('Venue not found'); e.status = 404; throw e; }
  if (venue.ownerId.toString() !== ownerId.toString() && role !== 'admin') {
    const e = new Error('Not your venue'); e.status = 403; throw e;
  }
  venue.layouts.pull(layoutId);
  await venue.save();
  return { message: 'Layout deleted' };
}

module.exports = {
  createVenue, getVenue, listVenues, getMyVenues,
  updateVenue, addLayout, updateLayout, deleteLayout,
};