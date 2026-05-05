const seatService = require('./seat.service');

async function getSeatMap(req, res, next) {
  try {
    const seats = await seatService.getSeatMap(req.params.eventId);
    res.json({ seats });
  } catch (err) { next(err); }
}

async function getSeat(req, res, next) {
  try {
    const seat = await seatService.getSeat(req.params.seatId);
    res.json({ seat });
  } catch (err) { next(err); }
}

async function getSeatStats(req, res, next) {
  try {
    const stats = await seatService.getSeatStats(req.params.eventId);
    res.json({ stats });
  } catch (err) { next(err); }
}

async function adminOverrideSeat(req, res, next) {
  try {
    const seat = await seatService.adminOverrideSeat(
      req.params.seatId,
      req.user.sub,
      req.body
    );
    res.json({ seat });
  } catch (err) { next(err); }
}

async function adminOverrideSection(req, res, next) {
  try {
    const result = await seatService.adminOverrideSection(
      req.params.eventId,
      req.params.sectionId,
      req.user.sub,
      req.body
    );
    res.json(result);
  } catch (err) { next(err); }
}

module.exports = {
  getSeatMap, getSeat, getSeatStats,
  adminOverrideSeat, adminOverrideSection,
};