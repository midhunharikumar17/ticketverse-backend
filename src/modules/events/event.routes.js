const router = require('express').Router();
const controller   = require('./event.controller');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');

// Public
router.get('/',                    controller.listEvents);
router.get('/organizer/me',        authenticate, authorize('organizer','admin'), controller.getOrganizerEvents);
router.get('/admin/all',           authenticate, authorize('admin'), controller.getAllEventsAdmin);
router.get('/:id',                 controller.getEvent);
router.get('/:id/seats',           controller.getSeatMap);
router.get('/:id/attendees/count', controller.getAttendeeCount);

// Organizer + admin
router.post('/',            authenticate, authorize('organizer','admin'), controller.createEvent);
router.patch('/:id',        authenticate, authorize('organizer','admin'), controller.updateEvent);
router.post('/:id/publish', authenticate, authorize('organizer','admin'), controller.publishEvent);
router.post('/:id/cancel',  authenticate, authorize('organizer','admin'), controller.cancelEvent);

module.exports = router;