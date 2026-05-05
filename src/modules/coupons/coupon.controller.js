const service = require('./coupon.service');

const validate = async (req, res, next) => {
  try {
    const { code, amount, eventId } = req.body;
    const result = await service.validateCoupon(code, req.user.id, Number(amount), eventId);
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const coupon = await service.createCoupon(req.body, req.user.id);
    res.status(201).json({ success: true, coupon });
  } catch (e) { next(e); }
};

const list = async (req, res, next) => {
  try {
    const coupons = await service.listCoupons();
    res.json({ success: true, coupons });
  } catch (e) { next(e); }
};

const deactivate = async (req, res, next) => {
  try {
    const coupon = await service.deactivateCoupon(req.params.id);
    res.json({ success: true, coupon });
  } catch (e) { next(e); }
};

module.exports = { validate, create, list, deactivate };