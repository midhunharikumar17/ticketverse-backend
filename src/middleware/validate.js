function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          })),
        },
      });
    }

    next();
  };
}

module.exports = validate;