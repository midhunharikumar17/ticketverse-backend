const { scheduleSeatLockExpiry } = require('./seatLockExpiry.job');

function scheduleJobs() {
  scheduleSeatLockExpiry();
  console.log('Background jobs scheduled');
}

module.exports = { scheduleJobs };
