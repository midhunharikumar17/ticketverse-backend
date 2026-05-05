const Joi = require('joi');

// ─── Reusable helpers ────────────────────────────────────────────────────────

const objectId = Joi.string()
  .pattern(/^[a-f\d]{24}$/i)
  .message('must be a valid ObjectId');

const CATEGORIES = [
  'music', 'sports', 'arts', 'food', 'tech',
  'comedy', 'theatre', 'fitness', 'conference', 'other',
];

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const tierSchema = Joi.object({
  name:          Joi.string().trim().min(1).max(100).required(),
  price:         Joi.number().min(0).required(),
  totalQuantity: Joi.number().integer().min(1).required(),

  // Must not exceed totalQuantity — defaults to totalQuantity if omitted
  remainingQuantity: Joi.number().integer().min(0)
    .when('totalQuantity', {
      is:        Joi.number().required(),
      then:      Joi.number().max(Joi.ref('totalQuantity')),
    })
    .default(Joi.ref('totalQuantity')),

  description: Joi.string().allow('').max(500).default(''),
});

const sectionSchema = Joi.object({
  name:        Joi.string().trim().min(1).max(100).required(),
  tierId:      objectId.required(),          // was just Joi.string() — now enforced as ObjectId
  rowCount:    Joi.number().integer().min(1).max(50).required(),
  seatsPerRow: Joi.number().integer().min(1).max(100).required(),
  layoutConfig: Joi.object().allow(null).default(null),
});

// ─── Core event fields (shared between create and update) ────────────────────

const eventFields = {
  title:        Joi.string().trim().min(3).max(200),
  description:  Joi.string().min(10).max(5000),
  category:     Joi.string().valid(...CATEGORIES),
  venueName:    Joi.string().trim().min(1).max(200),
  venueAddress: Joi.string().trim().min(1).max(500),

  location: Joi.object({
    type:        Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array()
      .items(Joi.number())
      .length(2)
      .custom((coords, helpers) => {
        const [lng, lat] = coords;
        if (lng < -180 || lng > 180) return helpers.error('any.invalid');
        if (lat < -90  || lat > 90)  return helpers.error('any.invalid');
        return coords;
      })
      .messages({ 'any.invalid': 'coordinates must be [lng (-180–180), lat (-90–90)]' })
      .required(),
  }),

  startTime:   Joi.date().iso().greater('now'),
  endTime:     Joi.date().iso(),
  posterUrl:   Joi.string().uri().allow(null, ''),
  maxCapacity: Joi.number().integer().min(1).max(1_000_000),
  tiers:       Joi.array().items(tierSchema).min(1).max(20),
  sections:    Joi.array().items(sectionSchema).min(1).max(100),
};

// ─── Create schema — all required + endTime > startTime ──────────────────────

const createEventSchema = Joi.object({
  ...eventFields,
  title:        eventFields.title.required(),
  description:  eventFields.description.required(),
  category:     eventFields.category.required(),
  venueName:    eventFields.venueName.required(),
  venueAddress: eventFields.venueAddress.required(),
  location:     eventFields.location.required(),
  startTime:    eventFields.startTime.required(),
  endTime:      eventFields.endTime.required()
    .greater(Joi.ref('startTime'))
    .messages({ 'date.greater': 'endTime must be after startTime' }),
  maxCapacity:  eventFields.maxCapacity.required(),
  tiers:        eventFields.tiers.required(),
  sections:     eventFields.sections.required(),
})
.options({ stripUnknown: true });

// ─── Update schema — everything optional, same cross-field rule if both present

const updateEventSchema = Joi.object(eventFields)
  .and('startTime', 'endTime')          // if you send one, send both
  .when(
    Joi.object({ startTime: Joi.exist(), endTime: Joi.exist() }).unknown(),
    {
      then: Joi.object({
        endTime: eventFields.endTime
          .greater(Joi.ref('startTime'))
          .messages({ 'date.greater': 'endTime must be after startTime' }),
      }),
    },
  )
  .options({ stripUnknown: true });

// ─── Middleware factory ───────────────────────────────────────────────────────

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        code:   'VALIDATION_ERROR',
        errors: error.details.map(d => ({
          field:   d.path.join('.'),
          message: d.message,
        })),
      });
    }
    req.body = value;   // replaces body with stripped + defaulted values
    next();
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  createEventSchema,
  updateEventSchema,
  validate,
};