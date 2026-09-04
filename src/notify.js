const nodemailer = require("nodemailer");

// Requires env vars: GMAIL_USER, GMAIL_APP_PASSWORD, NOTIFY_TO
// GMAIL_APP_PASSWORD is a 16-char Google "App Password", NOT your normal
// Gmail password — regular passwords won't authenticate via SMTP.
// Generate one at: https://myaccount.google.com/apppasswords
// (requires 2-Step Verification enabled on the Google account first)
function buildTransport() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

function formatEmail(newLows, config) {
  const rows = newLows
    .map((o) => {
      const drop = o.previousPrice ? ` (was ${config.currency} ${o.previousPrice})` : "";
      return `• ${o.airline}: ${config.currency} ${o.price}${drop} — depart ${o.departureDate}, return ${o.returnDate}`;
    })
    .join("\n");

  return {
    subject: `Flight price drop: ${config.origin}→${config.destination} — ${newLows.length} airline(s)`,
    text: `New lowest fare(s) found for ${config.origin} → ${config.destination}:\n\n${rows}\n\nChecked at ${new Date().toISOString()}.`,
  };
}

async function sendPriceAlert(newLows, config) {
  if (!newLows.length) return;
  const { subject, text } = formatEmail(newLows, config);
  const transport = buildTransport();

  await transport.sendMail({
    from: process.env.GMAIL_USER,
    to: process.env.NOTIFY_TO || process.env.GMAIL_USER,
    subject,
    text,
  });
}

module.exports = { sendPriceAlert };
