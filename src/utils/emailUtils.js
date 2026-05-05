// Placeholder — wire up Nodemailer / SendGrid here in Phase 8
async function sendEmail({ to, subject, html }) {
  console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
  // TODO: implement with nodemailer + SendGrid
}

module.exports = { sendEmail };
