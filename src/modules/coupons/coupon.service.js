const Coupon = require('./coupon.model');

async function validateCoupon(code, userId, amount, eventId) {
  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });

  if (!coupon)          throw Object.assign(new Error('Invalid coupon code'), { status: 404 });
  if (!coupon.isActive) throw Object.assign(new Error('This coupon is no longer active'), { status: 400 });

  const now = new Date();
  if (coupon.validFrom && coupon.validUntil) {
    if (now < coupon.validFrom || now > coupon.validUntil)
      throw Object.assign(new Error('Coupon has expired'), { status: 400 });
  } else if (coupon.validUntil && now > coupon.validUntil) {
    throw Object.assign(new Error('Coupon has expired'), { status: 400 });
  }

  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit)
    throw Object.assign(new Error('Coupon usage limit reached'), { status: 400 });

  const timesUsedByUser = coupon.usedBy.filter(id => id.toString() === userId.toString()).length;
  if (timesUsedByUser >= coupon.userLimit)
    throw Object.assign(new Error('You have already used this coupon'), { status: 400 });

  if (amount < coupon.minOrderValue)
    throw Object.assign(new Error(`Minimum order value is ₹${coupon.minOrderValue}`), { status: 400 });

  if (coupon.eventId && coupon.eventId.toString() !== eventId?.toString())
    throw Object.assign(new Error('Coupon is not valid for this event'), { status: 400 });

  // Calculate discount
  let discount = 0;
  if (coupon.type === 'percent') {
    discount = Math.floor((amount * coupon.value) / 100);
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
  } else {
    discount = Math.min(coupon.value, amount);
  }

  return {
    couponId:    coupon._id,
    code:        coupon.code,
    type:        coupon.type,
    value:       coupon.value,
    discount,
    finalAmount: amount - discount,
    description: coupon.description,
  };
}

async function applyCoupon(couponId, userId) {
  await Coupon.findByIdAndUpdate(couponId, {
    $inc:  { usedCount: 1 },
    $push: { usedBy: userId },
  });
}

async function createCoupon(data, createdBy) {
  const coupon = await Coupon.create({ ...data, code: data.code.toUpperCase(), createdBy });
  return coupon;
}

async function listCoupons() {
  return Coupon.find().sort({ createdAt: -1 });
}

async function deactivateCoupon(couponId) {
  return Coupon.findByIdAndUpdate(couponId, { isActive: false }, { new: true });
}

module.exports = { validateCoupon, applyCoupon, createCoupon, listCoupons, deactivateCoupon };