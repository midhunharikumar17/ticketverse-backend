const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const { verifyAccessToken } = require('../utils/jwtUtils');

let io;

async function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Redis adapter for multi-process scaling
  try {
    const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.IO Redis adapter connected');
  } catch (err) {
    console.warn('Socket.IO Redis adapter failed, using in-memory:', err.message);
  }

  // Authenticate every socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      socket.user = verifyAccessToken(token);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Join personal notification room automatically
    socket.join(`user:${socket.user.sub}`);
    console.log(`Socket connected: ${socket.user.sub}`);

    require('../sockets/seatHandlers')(io, socket);
    require('../sockets/sessionHandlers')(io, socket);
    require('../sockets/chatHandlers')(io, socket);
    require('../sockets/notificationSocketHandlers')(io, socket);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user.sub}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

module.exports = { initSocketServer, getIO };
