const service = require('./resale.service');

const createListing = async (req, res, next) => {
  try {
    const listing = await service.createListing(req.user.id, req.body);
    res.status(201).json({ success: true, listing });
  } catch (e) { next(e); }
};

const getEventListings = async (req, res, next) => {
  try {
    const listings = await service.getListingsForEvent(req.params.eventId);
    res.json({ success: true, listings });
  } catch (e) { next(e); }
};

const buyListing = async (req, res, next) => {
  try {
    const result = await service.buyListing(req.params.id, req.user.id);
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

const cancelListing = async (req, res, next) => {
  try {
    const listing = await service.cancelListing(req.params.id, req.user.id);
    res.json({ success: true, listing });
  } catch (e) { next(e); }
};

const getMyListings = async (req, res, next) => {
  try {
    const listings = await service.getMyListings(req.user.id);
    res.json({ success: true, listings });
  } catch (e) { next(e); }
};

module.exports = { createListing, getEventListings, buyListing, cancelListing, getMyListings };