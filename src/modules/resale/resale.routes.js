const router       = require('express').Router();
const controller   = require('./resale.controller');
const authenticate = require('../../middleware/authenticate');

// Public — anyone can view resale listings for an event
router.get('/event/:eventId', controller.getEventListings);

// Authenticated
router.post('/',              authenticate, controller.createListing);
router.get('/me',             authenticate, controller.getMyListings);
router.post('/:id/buy',       authenticate, controller.buyListing);
router.post('/:id/cancel',    authenticate, controller.cancelListing);

module.exports = router;