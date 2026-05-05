const Joi = require('joi');

const createBookingSchema = Joi.object({
  eventId:  Joi.string().required(),
  tierName: Joi.string().required(),
  quantity: Joi.number().integer().min(1).max(10).required(),
  seatIds:  Joi.array().items(Joi.string()).default([]),
  groupSessionId: Joi.string().allow(null, '').default(null),
}).options({ stripUnknown: true });

module.exports = { createBookingSchema };