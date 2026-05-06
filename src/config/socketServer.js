// const { Server }        = require('socket.io');
// const { createAdapter } = require('@socket.io/redis-adapter');
// const { createClient }  = require('redis');

// let io;

// async function initSocketServer(httpServer) {
//   io = new Server(httpServer, {
//     cors: {
//       origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
//       credentials: true,
//     },
//   });

//   // Redis adapter for Socket.IO
//   if (process.env.REDIS_URL) {
//     try {
//       const tlsOptions = process.env.REDIS_URL.startsWith('rediss://')
//         ? { socket: { tls: true, rejectUnauthorized: false } }
//         : {};

//       const pubClient = createClient({
//         url: process.env.REDIS_URL,
//         ...tlsOptions,
//       });
//       const subClient = pubClient.duplicate();

//       pubClient.on('error', e => console.error('Socket pub error:', e.message));
//       subClient.on('error', e => console.error('Socket sub error:', e.message));

//       await Promise.all([pubClient.connect(), subClient.connect()]);
//       io.adapter(createAdapter(pubClient, subClient));
//       console.log('✅ Socket.IO Redis adapter connected');
//     } catch (e) {
//       console.warn('⚠️  Socket.IO Redis adapter failed, using in-memory:', e.message);
//     }
//   }

//   // Auth middleware
//   io.use((socket, next) => {
//     const token = socket.handshake.auth?.token;
//     if (!token) return next(new Error('Authentication required'));
//     try {
//       const { verifyAccessToken } = require('../utils/jwtUtils');
//       const payload = verifyAccessToken(token);
//       socket.user = payload;
//       next();
//     } catch {
//       next(new Error('Invalid token'));
//     }
//   });

//   io.on('connection', (socket) => {
//     require('../sockets/seatHandlers')(io, socket);
//     require('../sockets/sessionHandlers')(io, socket);
//     require('../sockets/notificationSocketHandlers')(io, socket);
//     require('../sockets/chatHandlers')(io, socket);
//   });

//   return io;
// }

// function getIO() {
//   if (!io) throw new Error('Socket.IO not initialized');
//   return io;
// }

// module.exports = { initSocketServer, getIO };
const { Server } = require('socket.io');

let io;

async function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout:   60000,
    pingInterval:  25000,
    transports:    ['websocket', 'polling'],
  });

  // No Redis adapter — single Render instance doesn't need it
  // Add it back only when you scale to multiple instances
  console.log('ℹ️  Socket.IO ready (in-memory)');

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const { verifyAccessToken } = require('../utils/jwtUtils');
      const payload = verifyAccessToken(token);
      socket.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    try { require('../sockets/seatHandlers')(io, socket); }               catch (_) {}
    try { require('../sockets/sessionHandlers')(io, socket); }            catch (_) {}
    try { require('../sockets/notificationSocketHandlers')(io, socket); } catch (_) {}
    try { require('../sockets/chatHandlers')(io, socket); }               catch (_) {}
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

module.exports = { initSocketServer, getIO };