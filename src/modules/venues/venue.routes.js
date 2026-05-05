const router       = require('express').Router();
const controller   = require('./venue.controller');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');

router.get('/',                              controller.listVenues);
router.get('/my',      authenticate, authorize('organizer','admin'), controller.getMyVenues);
router.get('/:id',                           controller.getVenue);
router.post('/',       authenticate, authorize('organizer','admin'), controller.createVenue);
router.patch('/:id',   authenticate, authorize('organizer','admin'), controller.updateVenue);

// Layout management
router.post('/:id/layouts',                  authenticate, authorize('organizer','admin'), controller.addLayout);
router.patch('/:id/layouts/:layoutId',       authenticate, authorize('organizer','admin'), controller.updateLayout);
router.delete('/:id/layouts/:layoutId',      authenticate, authorize('organizer','admin'), controller.deleteLayout);

module.exports = router;