// Public storefront writes: newsletter signup + order logging.
const express = require("express");
const Subscriber = require("../models/newsletter/subscriber.model");
const Order = require("../models/orders/order.model");
const { notifyNewOrder } = require("../helpers/notify");

const router = express.Router();

// These two PUBLIC write routes (/newsletter, /order) are the legacy path from
// the old WhatsApp-order + Mongo-newsletter flow. The live storefront no longer
// calls them — newsletter signup and card checkout both go to the Cloudflare
// Worker (D1). Left in place (not deleted) but DISABLED by default so they can't
// be abused as an unauthenticated spam vector into the manager's WhatsApp/email.
// Flip ENABLE_LEGACY_PUBLIC_WRITES=1 on Render to re-enable if ever needed.
const LEGACY_ENABLED = process.env.ENABLE_LEGACY_PUBLIC_WRITES === "1";
router.use((req, res, next) => {
  if (LEGACY_ENABLED) return next();
  // Express matches routes case-insensitively and ignores trailing slashes, so
  // the guard must normalize the same way — "/Order/" would otherwise slip past
  // an exact-equality check and still hit the handler.
  const p = req.path.toLowerCase().replace(/\/+$/, "");
  if (p === "/newsletter" || p === "/order") {
    return res.status(410).json({ error: "endpoint retired" });
  }
  return next();
});

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

// Logs an order at the moment the shopper sends it via WhatsApp.
// Fire-and-forget from the cart — failures must never block the order.
router.post("/order", async (req, res) => {
  try {
    if (limited(req.ip)) {
      return res.status(429).json({ error: "יותר מדי ניסיונות" });
    }
    const { items, total, delivery } = req.body || {};
    if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
      return res.status(400).json({ error: "הזמנה ריקה או גדולה מדי" });
    }
    const clean = items.map((i) => ({
      productId: String(i.productId || "").slice(0, 40),
      name: String(i.name || "").slice(0, 200),
      qty: Math.max(1, Math.min(999, Number(i.qty) || 1)),
      price: Math.max(0, Number(i.price) || 0),
    }));
    if (clean.some((i) => !i.name)) {
      return res.status(400).json({ error: "פריט לא תקין" });
    }
    const order = await Order.create({
      items: clean,
      total: Math.max(0, Number(total) || 0),
      delivery: String(delivery || "").slice(0, 60),
    });
    notifyNewOrder(order); // WhatsApp + email to the manager, fire-and-forget
    res.status(201).json({ ok: true, orderId: order._id });
  } catch (err) {
    console.error("[order]", err);
    res.status(500).json({ error: "שגיאת שרת" });
  }
});

module.exports = router;
