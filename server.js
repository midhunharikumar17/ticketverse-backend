const http = require('http');
const app = require('./app');
const { initSocketServer } = require('./src/config/socketServer');
const { connectDB } = require('./src/config/db');
const { scheduleJobs } = require('./src/jobs');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

connectDB().then(() => {
  initSocketServer(server);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  scheduleJobs();
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});
