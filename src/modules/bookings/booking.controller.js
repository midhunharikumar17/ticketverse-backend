const bookingService = require('./booking.service');

async function createBooking(req, res, next) {
  try {
    const { eventId, tierName, quantity, seatIds, groupSessionId } = req.body;
    const booking = await bookingService.createBooking(req.user.id, {
      eventId, tierName, quantity, seatIds, groupSessionId,
    });
    res.status(201).json({ success: true, booking });
  } catch (err) { next(err); }
}

async function getBooking(req, res, next) {
  try {
    const booking = await bookingService.getBooking(req.params.id, req.user.id, req.user.role);
    res.json({ success: true, booking });
  } catch (err) { next(err); }
}

async function getUserBookings(req, res, next) {
  try {
    const bookings = await bookingService.getUserBookings(req.user.id);
    res.json({ success: true, bookings });
  } catch (err) { next(err); }
}

async function cancelBooking(req, res, next) {
  try {
    const booking = await bookingService.cancelBooking(req.params.id, req.user.id, req.user.role);
    res.json({ success: true, message: 'Booking cancelled', booking });
  } catch (err) { next(err); }
}

async function getAllBookings(req, res, next) {
  try {
    const bookings = await bookingService.getAllBookings();
    res.json({ success: true, bookings });
  } catch (err) { next(err); }
}

module.exports = { createBooking, getBooking, getUserBookings, cancelBooking, getAllBookings };