module.exports = function sessionHandlers(io, socket) {
  socket.on('join:session', (sessionId) => {
    socket.join(`session:${sessionId}`);
  });

  socket.on('leave:session', (sessionId) => {
    socket.leave(`session:${sessionId}`);
    socket.to(`session:${sessionId}`).emit('session:participant_left', { userId: socket.user.sub });
  });

  socket.on('session:chat_message', ({ sessionId, message }) => {
    io.to(`session:${sessionId}`).emit('session:chat_message', {
      userId: socket.user.sub,
      message,
      timestamp: new Date(),
    });
  });
};
