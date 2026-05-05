module.exports = function chatHandlers(io, socket) {
  socket.on('join:chat', (eventId) => {
    socket.join(`chat:${eventId}`);
  });

  socket.on('chat:message', ({ eventId, message }) => {
    io.to(`chat:${eventId}`).emit('chat:message', {
      userId: socket.user.sub,
      message,
      timestamp: new Date(),
    });
  });
};
