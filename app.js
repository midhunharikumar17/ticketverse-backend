// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const morgan = require('morgan');
// const cookieParser = require('cookie-parser');
// const path = require('path');
// const errorHandler = require('./src/middleware/errorHandler');

// const app = express();

// // ── Security ──
// app.use(helmet());
// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:5173',
//   credentials: true,
// }));

// //webhook route needs raw body, so we apply express.json() only after that route is registered in payment.routes.js
// app.use('/api/payments',        require('./src/modules/payments/payment.routes'));

// // ── Parsing ──
// app.use(express.json());
// app.use(cookieParser());

// // ── Logging ──
// if (process.env.NODE_ENV !== 'test') {
//   app.use(morgan('dev'));
// }

// // ── Health check ──
// app.get('/api/health', (req, res) => {
//   res.json({ status: 'ok', uptime: process.uptime() });
// });

// // ── API Routes ──
// app.use('/api/auth',            require('./src/modules/auth/auth.routes'));
// app.use('/api/users',           require('./src/modules/users/user.routes'));
// app.use('/api/events',          require('./src/modules/events/event.routes'));
// app.use('/api/bookings',        require('./src/modules/bookings/booking.routes'));
// app.use('/api/seats',           require('./src/modules/seats/seat.routes'));
// app.use('/api/tickets',         require('./src/modules/tickets/ticket.routes'));
// app.use('/api/resale',          require('./src/modules/resale/resale.routes'));
// app.use('/api/sessions',        require('./src/modules/sessions/session.routes'));
// app.use('/api/notifications',   require('./src/modules/notifications/notification.routes'));
// app.use('/api/recommendations', require('./src/modules/recommendations/recommendation.routes'));

// // ── Serve React SPA in production ──
// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(__dirname, '../event-ticketing-frontend/dist')));
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../event-ticketing-frontend/dist/index.html'));
//   });
// }

// // ── Central error handler (must be last) ──
// app.use(errorHandler);

// module.exports = app;

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const cookieParser = require('cookie-parser');
const path       = require('path');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



app.use(express.json());
app.use(cookieParser());

// Webhook needs raw body — intercept before JSON parser strips it
app.use('/api/payments/webhook', express.raw({ type: '*/*' }));

// All other routes use parsed JSON body
app.use('/api/auth',            require('./src/modules/auth/auth.routes'));
app.use('/api/users',           require('./src/modules/users/user.routes'));
app.use('/api/events',          require('./src/modules/events/event.routes'));
app.use('/api/bookings',        require('./src/modules/bookings/booking.routes'));
app.use('/api/payments',        require('./src/modules/payments/payment.routes'));
app.use('/api/seats',           require('./src/modules/seats/seat.routes'));
app.use('/api/tickets',         require('./src/modules/tickets/ticket.routes'));
app.use('/api/resale',          require('./src/modules/resale/resale.routes'));
app.use('/api/sessions',        require('./src/modules/sessions/session.routes'));
app.use('/api/notifications',   require('./src/modules/notifications/notification.routes'));
app.use('/api/recommendations', require('./src/modules/recommendations/recommendation.routes'));
app.use('/api/uploads',         require('./src/modules/uploads/upload.routes'));
app.use('/api/venues',          require('./src/modules/venues/venue.routes'));
app.use('/api/coupons',         require('./src/modules/coupons/coupon.routes'));

app.use(errorHandler);

module.exports = app;