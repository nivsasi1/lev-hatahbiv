// Sends a watchdog alert to the Telegram group + email — mirroring
// Backend/helpers/notify.js: each channel activates only when its env vars
// are set, and one channel failing never blocks the other.
// Usage: node notify.mjs <dir with alert.txt + subject.txt>
import nodemailer from "nodemailer";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] || ".state";
const text = readFileSync(join(dir, "alert.txt"), "utf8");
const subject = readFileSync(join(dir, "subject.txt"), "utf8").trim();

// link to the failing run so you can see the details in one click
const runUrl =
  process.env.GITHUB_RUN_ID &&
  `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const full = runUrl ? `${text}\n\n🔗 ${runUrl}` : text;

const sendTelegram = async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return "telegram: skipped (not configured)";
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: full }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`telegram failed (${res.status}): ${await res.text()}`);
  return "telegram: sent";
};

const sendEmail = async () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return "email: skipped (not configured)";
  const to = process.env.ALERT_EMAILS || "nivsasi@gmail.com,levhatahbiv@gmail.com";
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user, pass },
  });
  await transporter.sendMail({
    from: `"שומר-חנות — לב התחביב" <${user}>`,
    to,
    subject,
    text: full,
  });
  return "email: sent";
};

const outcomes = await Promise.allSettled([sendTelegram(), sendEmail()]);
let failures = 0;
for (const r of outcomes) {
  if (r.status === "fulfilled") console.log("[notify]", r.value);
  else {
    failures++;
    console.error("[notify] failed:", r.reason?.message);
  }
}
// only redden the step when EVERY channel failed — one working channel is enough
process.exit(failures === outcomes.length ? 1 : 0);
