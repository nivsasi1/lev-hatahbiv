// Notifies the manager about new orders, via WhatsApp and email.
// Both channels are optional: each one activates only when its env vars are
// set (see .env). Failures are logged and never affect the order itself.
const nodemailer = require("nodemailer");

const ils = (n) => {
  const r = Math.round(Number(n) * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

const orderText = (order) => {
  const lines = order.items.map((i) => `• ${i.name} ×${i.qty} — ₪${ils(i.price * i.qty)}`);
  return [
    `הזמנה חדשה באתר לב התחביב! 🎨`,
    ...lines,
    `אספקה: ${order.delivery || "לא צוין"}`,
    `סה"כ: ₪${ils(order.total)}`,
    `(ערוץ: ${order.channel === "card" ? "אשראי" : "וואטסאפ"})`,
  ].join("\n");
};

// --- WhatsApp via CallMeBot (free) ---
// One-time setup on the manager's phone: add +34 644 51 95 23 to contacts and
// send it the WhatsApp message "I allow callmebot to send me messages".
// The reply contains your apikey. Then fill MANAGER_WHATSAPP + CALLMEBOT_APIKEY.
const sendWhatsApp = async (text) => {
  const phone = process.env.MANAGER_WHATSAPP;
  const key = process.env.CALLMEBOT_APIKEY;
  if (!phone || !key) return "whatsapp: skipped (not configured)";
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
    phone
  )}&apikey=${encodeURIComponent(key)}&text=${encodeURIComponent(text)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  return `whatsapp: ${res.ok ? "sent" : `failed (${res.status})`}`;
};

// --- Email via SMTP ---
// With Gmail: turn on 2-step verification, create an "App password"
// (myaccount.google.com/apppasswords) and use it as SMTP_PASS.
const sendEmail = async (text) => {
  const to = process.env.MANAGER_EMAIL;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!to || !user || !pass) return "email: skipped (not configured)";
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user, pass },
  });
  await transporter.sendMail({
    from: `"לב התחביב — אתר" <${user}>`,
    to,
    subject: "🎨 הזמנה חדשה באתר לב התחביב",
    text,
  });
  return "email: sent";
};

// fire-and-forget — called right after an order is saved
exports.notifyNewOrder = (order) => {
  const text = orderText(order);
  Promise.allSettled([sendWhatsApp(text), sendEmail(text)]).then((results) => {
    for (const r of results) {
      if (r.status === "fulfilled") console.log("[notify]", r.value);
      else console.error("[notify] failed:", r.reason?.message);
    }
  });
};
