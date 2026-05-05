const service = require('./venue.service');

const createVenue    = async (req, res, next) => { try { res.status(201).json({ success: true, venue: await service.createVenue(req.user.id, req.body) }); } catch (e) { next(e); } };
const getVenue       = async (req, res, next) => { try { res.json({ success: true, venue: await service.getVenue(req.params.id) }); } catch (e) { next(e); } };
const listVenues     = async (req, res, next) => { try { res.json({ success: true, ...(await service.listVenues(req.query)) }); } catch (e) { next(e); } };
const getMyVenues    = async (req, res, next) => { try { res.json({ success: true, venues: await service.getMyVenues(req.user.id) }); } catch (e) { next(e); } };
const updateVenue    = async (req, res, next) => { try { res.json({ success: true, venue: await service.updateVenue(req.params.id, req.user.id, req.body, req.user.role) }); } catch (e) { next(e); } };
const addLayout      = async (req, res, next) => { try { res.status(201).json({ success: true, layout: await service.addLayout(req.params.id, req.user.id, req.body, req.user.role) }); } catch (e) { next(e); } };
const updateLayout   = async (req, res, next) => { try { res.json({ success: true, layout: await service.updateLayout(req.params.id, req.params.layoutId, req.user.id, req.body, req.user.role) }); } catch (e) { next(e); } };
const deleteLayout   = async (req, res, next) => { try { res.json({ success: true, ...(await service.deleteLayout(req.params.id, req.params.layoutId, req.user.id, req.user.role)) }); } catch (e) { next(e); } };

module.exports = { createVenue, getVenue, listVenues, getMyVenues, updateVenue, addLayout, updateLayout, deleteLayout };