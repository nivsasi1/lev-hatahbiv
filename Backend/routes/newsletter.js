// Public newsletter signup — the only write the storefront is allowed to do.
const express = require("express");
const Subscriber = require("../models/newsletter/subscriber.model");

const router = express.Router();

// crude in-memory rate limit: 5 attempts per IP per 10 minutes
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const attempts = new Map();

const limited = (ip) => {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.since > WINDOW_MS) {
    attempts.set(ip, { since: now, count: 1 });
    return false;
  }
  rec.count++;
  return rec.count > MAX_PER_WINDOW;
};

// occasionally drop stale entries so the map can't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of attempts) {
    if (now - rec.since > WINDOW_MS) attempts.delete(ip);
  }
}, WINDOW_MS).unref();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

router.post("/newsletter", async (req, res) => {
  try {
    if (limited(req.ip)) {
      return res.status(429).json({ error: "יותר מדי ניסיונות — נסו שוב מאוחר יותר" });
    }
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 120) {
      return res.status(400).json({ error: "כתובת אימייל לא תקינה" });
    }
    await Subscriber.create({ email });
    res.status(201).json({ ok: true });
  } catch (err) {
    if (err.code === 11000) {
      // already subscribed — treat as success so the dialog says thanks
      return res.json({ ok: true, already: true });
    }
    console.error("[newsletter]", err);
    res.status(500).json({ error: "שגיאת שרת" });
  }
});

module.exports = router;
