const router       = require('express').Router();
const controller   = require('./seat.controller');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');

// Public — seat map is visible to anyone browsing the event
router.get('/event/:eventId',                    controller.getSeatMap);
router.get('/:seatId',                           controller.getSeatMap);

// Authenticated — seat stats visible to organizer and admin
router.get('/event/:eventId/stats',
  authenticate, authorize('organizer', 'admin'),
  controller.getSeatStats
);

// Admin only — manual seat overrides
router.patch('/:seatId/override',
  authenticate, authorize('admin'),
  controller.adminOverrideSeat
);
router.patch('/event/:eventId/section/:sectionId/override',
  authenticate, authorize('admin'),
  controller.adminOverrideSection
);

module.exports = router;