const logger = require('../utils/logger');

// function errorHandler(err, req, res, next) {
//   const status  = err.status || err.statusCode || 500;
//   const code    = err.code   || 'INTERNAL_ERROR';
//   const message = err.message || 'An unexpected error occurred';

//   if (status >= 500) {
//     logger.error({ code, message, stack: err.stack, path: req.path });
//   }

//   res.status(status).json({
//     error: {
//       code,
//       message,
//       details: err.details || null,
//     },
//   });
// }

// module.exports = errorHandler;
function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message);

  const status  = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ success: false, message });
}

module.exports = errorHandler;