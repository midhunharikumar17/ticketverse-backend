const eventService = require('./event.service');

async function createEvent(req, res, next) {
  try {
    const event = await eventService.createEvent(req.user.id, req.body);
    res.status(201).json({ success: true, event });
  } catch (err) { next(err); }
}

async function getEvent(req, res, next) {
  try {
    const event = await eventService.getEvent(req.params.id);
    res.json({ success: true, event });
  } catch (err) { next(err); }
}

async function listEvents(req, res, next) {
  try {
    const result = await eventService.listEvents(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

async function updateEvent(req, res, next) {
  try {
    const event = await eventService.updateEvent(req.params.id, req.user.id, req.body);
    res.json({ success: true, event });
  } catch (err) { next(err); }
}

async function publishEvent(req, res, next) {
  try {
    const event = await eventService.publishEvent(req.params.id, req.user.id);
    res.json({ success: true, message: 'Event published', event });
  } catch (err) { next(err); }
}

async function cancelEvent(req, res, next) {
  try {
    const event = await eventService.cancelEvent(req.params.id, req.user.id, req.user.role);
    res.json({ success: true, message: 'Event cancelled', event });
  } catch (err) { next(err); }
}

async function getOrganizerEvents(req, res, next) {
  try {
    const events = await eventService.getOrganizerEvents(req.user.id);
    res.json({ success: true, events });
  } catch (err) { next(err); }
}

async function getSeatMap(req, res, next) {
  try {
    const Seat = require('../seats/seat.model');
    const seats = await Seat.find({ eventId: req.params.id })
      .select('sectionId sectionName tierId price rowLabel seatNumber status');
    res.json({ success: true, seats });
  } catch (err) { next(err); }
}

async function getAttendeeCount(req, res, next) {
  try {
    const count = await eventService.getAttendeeCount(req.params.id);
    res.json({ success: true, count });
  } catch (err) { next(err); }
}

async function getAllEventsAdmin(req, res, next) {
  try {
    const Event = require('./event.model');
    const events = await Event.find()
      .populate('organizerId', 'displayName email')
      .sort({ createdAt: -1 });
    res.json({ success: true, events });
  } catch (err) { next(err); }
}

module.exports = {
  createEvent, getEvent, listEvents, updateEvent,
  publishEvent, cancelEvent, getOrganizerEvents,
  getSeatMap, getAttendeeCount, getAllEventsAdmin,
};