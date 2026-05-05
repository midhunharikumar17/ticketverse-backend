const ResaleListing = require('./resale.model');
const Booking       = require('../bookings/booking.model');
const Event         = require('../events/event.model');

// ── List a booking for resale ─────────────────────────────────────────────────
async function createListing(sellerId, { bookingId, resalePrice }) {
  const booking = await Booking.findById(bookingId)
    .populate('eventId', 'title startTime status tiers');

  if (!booking) {
    const err = new Error('Booking not found'); err.status = 404; throw err;
  }
  if (booking.userId.toString() !== sellerId.toString()) {
    const err = new Error('This is not your booking'); err.status = 403; throw err;
  }
  if (booking.status !== 'confirmed') {
    const err = new Error('Only confirmed bookings can be listed for resale'); err.status = 400; throw err;
  }

  // Prevent duplicate listing
  const existing = await ResaleListing.findOne({ bookingId, status: 'active' });
  if (existing) {
    const err = new Error('This booking is already listed for resale'); err.status = 409; throw err;
  }

  // Get original price per ticket from event tier
  const event = booking.eventId;
  const tier  = event?.tiers?.find(t => t.name === booking.tierName);
  const originalPrice = tier?.price || (booking.totalAmount / booking.quantity);
  const maxAllowed    = Math.floor(originalPrice * 1.2);

  if (Number(resalePrice) > maxAllowed) {
    const err = new Error(`Max allowed resale price is ₹${maxAllowed} (20% above face value)`);
    err.status = 400; throw err;
  }

  const listing = await ResaleListing.create({
    sellerId,
    eventId:       booking.eventId._id || booking.eventId,
    bookingId:     booking._id,
    tierName:      booking.tierName,
    quantity:      booking.quantity,
    resalePrice:   Number(resalePrice),
    originalPrice,
  });

  // Mark booking as listed
  booking.status = 'cancelled';
  await booking.save();

  return listing;
}

// ── Get all active listings for an event ──────────────────────────────────────
async function getListingsForEvent(eventId) {
  return ResaleListing.find({ eventId, status: 'active' })
    .populate('sellerId', 'displayName')
    .populate('eventId',  'title startTime venueName')
    .sort({ resalePrice: 1 });
}

// ── Buy a resale listing ──────────────────────────────────────────────────────
async function buyListing(listingId, buyerId) {
  const listing = await ResaleListing.findById(listingId)
    .populate('eventId', 'title startTime venueName status');

  if (!listing) {
    const err = new Error('Listing not found'); err.status = 404; throw err;
  }
  if (listing.status !== 'active') {
    const err = new Error('This listing is no longer available'); err.status = 409; throw err;
  }
  if (listing.sellerId.toString() === buyerId.toString()) {
    const err = new Error('You cannot buy your own listing'); err.status = 400; throw err;
  }

  // Mark listing as sold
  listing.status  = 'sold';
  listing.buyerId = buyerId;
  listing.soldAt  = new Date();
  await listing.save();

  // Create a new confirmed booking for the buyer
  const { v4: uuidv4 } = require('uuid');
  const newBooking = await Booking.create({
    userId:      buyerId,
    eventId:     listing.eventId._id || listing.eventId,
    tierName:    listing.tierName,
    quantity:    listing.quantity,
    totalAmount: listing.resalePrice * listing.quantity,
    bookingRef:  'TV' + uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase(),
    status:      'confirmed',
    confirmedAt: new Date(),
  });

  return { listing, booking: newBooking };
}

// ── Cancel a resale listing (seller cancels before it's sold) ─────────────────
async function cancelListing(listingId, sellerId) {
  const listing = await ResaleListing.findById(listingId);
  if (!listing) {
    const err = new Error('Listing not found'); err.status = 404; throw err;
  }
  if (listing.sellerId.toString() !== sellerId.toString()) {
    const err = new Error('Not your listing'); err.status = 403; throw err;
  }
  if (listing.status !== 'active') {
    const err = new Error('Listing is already sold or cancelled'); err.status = 400; throw err;
  }

  listing.status = 'cancelled';
  await listing.save();

  // Restore original booking to confirmed
  await Booking.findByIdAndUpdate(listing.bookingId, {
    status: 'confirmed',
  });

  return listing;
}

// ── Get seller's own listings ─────────────────────────────────────────────────
async function getMyListings(sellerId) {
  return ResaleListing.find({ sellerId })
    .populate('eventId',  'title startTime venueName posterUrl')
    .populate('bookingId','bookingRef quantity tierName totalAmount')
    .sort({ createdAt: -1 });
}

module.exports = {
  createListing, getListingsForEvent,
  buyListing, cancelListing, getMyListings,
};