const Joi = require('joi');

const overrideSeatSchema = Joi.object({
  status: Joi.string().valid('available', 'unavailable').required(),
  note:   Joi.string().max(300).allow('', null),
}).options({ stripUnknown: true });

module.exports = { overrideSeatSchema };