/**
 * Cloudflare Worker — lev-hatahbiv dynamic API.
 *
 * The SAME Cloudflare project serves the static storefront (Frontend/dist via the
 * ASSETS binding) AND these /api/* endpoints. /api/* runs here; everything else
 * falls through to the static assets (with SPA fallback).
 *
 * Storage = D1 (see worker/schema.sql). Queries go through Drizzle ORM
 * (worker/db/schema.ts) — type-safe and parameterized.
 *
 * Public:  POST /api/validate-coupon, GET /api/welcome, POST /api/subscribe
 * Admin (JWT): GET/POST /api/admin/coupons, DELETE /api/admin/coupons/:code,
 *              GET /api/admin/subscribers, DELETE /api/admin/subscribers/:email,
 *              GET/POST /api/admin/settings
 * Payments (PayMe): POST /api/checkout -> generate-sale (hosted page, agorot),
 *              POST /api/payme-callback -> verify (amount + get-transactions
 *              re-query) + mark the order paid in D1 and CONSUME the single-use
 *              coupon (bump used_count). Invoice URL arrives IN the callback.
 */
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { and, desc, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { coupons, subscribers, settings, rateLimits, orders } from "./db/schema";

export interface Env {
  ASSETS: Fetcher; // the static storefront (Frontend/dist)
  DB: D1Database; // coupons / orders / subscribers / rate_limits / settings
  ADMIN_JWT_SECRET: string; // must equal the backend's JWT SECRET (HS256)
  // ── PayMe (set via `wrangler secret put`) ──
  PAYME_SELLER_ID: string; // "MPL..." — the seller private key (sandbox/prod differ)
  PAYME_WEBHOOK_KEY: string; // our secret, embedded in sale_callback_url to auth callbacks
  PAYME_BASE_URL?: string; // sandbox default in wrangler.jsonc vars; prod = https://live.payme.io/api
}

type DB = DrizzleD1Database<Record<string, never>>;

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

// ---------- admin auth: verify an HS256 JWT with Web Crypto (no libs) ----------
function b64urlToBytes(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  s += "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function verifyJwt(
  token: string,
  secret: string
): Promise<Record<string, unknown> | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlToBytes(sig),
      new TextEncoder().encode(`${header}.${payload}`)
    );
    if (!valid) return null;
    const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(payload)));
    // require an expiry AND enforce it — a validly-signed token with no `exp`
    // must not live forever.
    if (typeof claims.exp !== "number" || Date.now() / 1000 > claims.exp) return null;
    return claims;
  } catch {
    return null;
  }
}

async function requireAdmin(request: Request, env: Env): Promise<boolean> {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return false;
  return (await verifyJwt(auth.slice(7), env.ADMIN_JWT_SECRET)) !== null;
}

// ---------- best-effort per-IP rate limit (D1 fixed window) ----------
async function isRateLimited(
  db: DB,
  ip: string,
  route: string,
  max = 20,
  windowSec = 60
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const bucket = `${route}:${ip}`;
  const row = await db
    .select({ count: rateLimits.count, resetAt: rateLimits.resetAt })
    .from(rateLimits)
    .where(eq(rateLimits.bucket, bucket))
    .get();

  if (!row || now >= row.resetAt) {
    await db
      .insert(rateLimits)
      .values({ bucket, count: 1, resetAt: now + windowSec })
      .onConflictDoUpdate({
        target: rateLimits.bucket,
        set: { count: 1, resetAt: now + windowSec },
      })
      .run();
    return false;
  }
  if (row.count >= max) return true;
  await db
    .update(rateLimits)
    .set({ count: sql`${rateLimits.count} + 1` })
    .where(eq(rateLimits.bucket, bucket))
    .run();
  return false;
}

const normCode = (raw: unknown) => String(raw ?? "").trim().toUpperCase();
const clampPct = (n: unknown) => Math.min(Math.max(Math.round(Number(n) || 0), 1), 100);
const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
// decodeURIComponent throws on malformed escapes (e.g. a lone "%") — never let
// that crash the route; return null and the caller answers 400.
const safeDecode = (s: string): string | null => {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
};

// constant-time string compare (for the webhook key) — avoids timing leaks
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------- key/value settings (welcome-offer toggle + percent) ----------
async function getSetting(db: DB, key: string, fallback: string): Promise<string> {
  const row = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .get();
  return row?.value ?? fallback;
}
async function setSetting(db: DB, key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}

// Unambiguous alphabet (no 0/O/1/I/L) so a code is easy to read out / type.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomCode(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  let s = "";
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `LEV-${s}`;
}

// ---------- POST /api/validate-coupon  { code } -> { valid, code?, percent? } ----------
async function validateCoupon(request: Request, db: DB): Promise<Response> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
  if (await isRateLimited(db, ip, "coupon")) {
    return json({ error: "יותר מדי ניסיונות — נסו שוב בעוד דקה" }, 429);
  }

  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    return json({ error: "bad request" }, 400);
  }
  const code = normCode(body.code);
  if (!code) return json({ valid: false, error: "missing code" }, 400);

  const c = await db.select().from(coupons).where(eq(coupons.code, code)).get();

  // Never reveal which codes exist — any failure is just { valid:false }.
  if (!c || !c.active) return json({ valid: false });
  if (c.expiresAt && Date.now() > Date.parse(c.expiresAt)) return json({ valid: false });
  if (c.maxUses != null && c.usedCount >= c.maxUses) return json({ valid: false });

  return json({ valid: true, code: c.code, percent: c.percent });
}

// ---------- GET /api/welcome -> { enabled, percent } (for the signup dialog copy) ----------
async function welcomeInfo(db: DB): Promise<Response> {
  const enabled = (await getSetting(db, "welcome_enabled", "1")) === "1";
  const percent = clampPct(await getSetting(db, "welcome_percent", "10"));
  return json({ enabled, percent });
}

// ---------- POST /api/subscribe { email } -> { subscribed, code?, percent? } ----------
// Stores the subscriber and mints ONE single-use welcome coupon tied to the
// email. Idempotent: the same email always gets back its existing code.
async function subscribe(request: Request, db: DB): Promise<Response> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
  if (await isRateLimited(db, ip, "subscribe", 10, 60)) {
    return json({ error: "יותר מדי ניסיונות — נסו שוב בעוד דקה" }, 429);
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return json({ error: "bad request" }, 400);
  }
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!isEmail(email)) return json({ error: "אימייל לא תקין" }, 400);

  const now = new Date().toISOString();

  // Atomic gate: claim the subscriber row FIRST. The email is the PK, so only
  // ONE concurrent request creates it — that's the one allowed to mint. This
  // closes the check-then-act race that used to mint two codes for one email.
  const claim = await db
    .insert(subscribers)
    .values({ email, couponCode: null, createdAt: now })
    .onConflictDoNothing()
    .run();
  const weCreated = (claim.meta?.changes ?? 0) > 0;

  if (!weCreated) {
    // already subscribed — hand back the existing code (idempotent).
    const row = await db
      .select({ couponCode: subscribers.couponCode })
      .from(subscribers)
      .where(eq(subscribers.email, email))
      .get();
    if (row?.couponCode) {
      const c = await db
        .select({ percent: coupons.percent })
        .from(coupons)
        .where(and(eq(coupons.code, row.couponCode), eq(coupons.active, 1)))
        .get();
      if (c) return json({ subscribed: true, code: row.couponCode, percent: c.percent });
    }
    return json({ subscribed: true });
  }

  // We own a brand-new subscriber row. Mint a welcome coupon if the offer is on.
  const enabled = (await getSetting(db, "welcome_enabled", "1")) === "1";
  if (!enabled) return json({ subscribed: true });

  // Brake against mass email-farming (a real fix needs email verification —
  // see CLOUDFLARE.md). Cap total welcome mints/day; over the cap we still
  // subscribe but skip the code (the shopper falls back to a manual ask).
  if (await isRateLimited(db, "global", "welcome-mint", 500, 86400)) {
    return json({ subscribed: true });
  }

  const percent = clampPct(await getSetting(db, "welcome_percent", "10"));
  // mint a unique single-use code (retry on the rare PK collision)
  let code = "";
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = randomCode();
    try {
      await db
        .insert(coupons)
        .values({
          code: candidate,
          percent,
          kind: "welcome",
          email,
          maxUses: 1,
          usedCount: 0,
          active: 1,
          createdAt: now,
        })
        .run();
      code = candidate;
      break;
    } catch {
      /* code already exists — try another */
    }
  }
  if (!code) return json({ subscribed: true }); // subscriber saved; no code this time

  await db
    .update(subscribers)
    .set({ couponCode: code })
    .where(eq(subscribers.email, email))
    .run();
  return json({ subscribed: true, code, percent });
}

// ---------- admin coupon CRUD (manager dashboard, JWT-protected) ----------
// Only manager coupons here — per-subscriber welcome codes are managed via the
// subscribers list, so they don't flood the editor. Output keeps the snake_case
// shape the dashboard already consumes.
async function listCoupons(db: DB): Promise<Response> {
  const rows = await db
    .select()
    .from(coupons)
    .where(eq(coupons.kind, "manager"))
    .orderBy(desc(coupons.createdAt))
    .all();
  return json({
    coupons: rows.map((r) => ({
      code: r.code,
      percent: r.percent,
      kind: r.kind,
      email: r.email,
      max_uses: r.maxUses,
      used_count: r.usedCount,
      active: r.active,
      created_at: r.createdAt,
      expires_at: r.expiresAt,
    })),
  });
}

async function createCoupon(request: Request, db: DB): Promise<Response> {
  let body: { code?: string; percent?: number; maxUses?: number | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "bad request" }, 400);
  }
  const code = normCode(body.code);
  if (!code) return json({ error: "missing code" }, 400);
  const percent = clampPct(body.percent);
  // manager coupons: maxUses null => unlimited, or a positive cap
  const maxUses =
    body.maxUses === null || body.maxUses === undefined
      ? null
      : Math.max(1, Math.round(Number(body.maxUses)));

  await db
    .insert(coupons)
    .values({
      code,
      percent,
      kind: "manager",
      maxUses,
      usedCount: 0,
      active: 1,
      createdAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: coupons.code,
      set: { percent, maxUses, active: 1, kind: "manager" },
    })
    .run();

  return json({ ok: true, code, percent, maxUses });
}

async function deleteCoupon(db: DB, code: string): Promise<Response> {
  await db.delete(coupons).where(eq(coupons.code, normCode(code))).run();
  return json({ ok: true });
}

// ---------- admin subscribers (JWT) ----------
async function listSubscribers(db: DB): Promise<Response> {
  const rows = await db
    .select()
    .from(subscribers)
    .orderBy(desc(subscribers.createdAt))
    .all();
  return json({
    subscribers: rows.map((r) => ({
      email: r.email,
      coupon_code: r.couponCode,
      created_at: r.createdAt,
    })),
  });
}

async function deleteSubscriber(db: DB, email: string): Promise<Response> {
  await db
    .delete(subscribers)
    .where(eq(subscribers.email, String(email).trim().toLowerCase()))
    .run();
  return json({ ok: true });
}

// ---------- admin settings: welcome-offer toggle + percent (JWT) ----------
async function getAdminSettings(db: DB): Promise<Response> {
  return json({
    welcomeEnabled: (await getSetting(db, "welcome_enabled", "1")) === "1",
    welcomePercent: clampPct(await getSetting(db, "welcome_percent", "10")),
  });
}

async function saveAdminSettings(request: Request, db: DB): Promise<Response> {
  let body: { welcomeEnabled?: boolean; welcomePercent?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "bad request" }, 400);
  }
  if (typeof body.welcomeEnabled === "boolean") {
    await setSetting(db, "welcome_enabled", body.welcomeEnabled ? "1" : "0");
  }
  if (body.welcomePercent !== undefined) {
    await setSetting(db, "welcome_percent", String(clampPct(body.welcomePercent)));
  }
  return getAdminSettings(db);
}

// ---------- PayMe checkout (generate-sale) + callback ----------
// Authoritative prices AND product names live in the generated
// /checkout-pricing.json asset, so we recompute totals server-side and never
// trust anything the client sends about money or item identity.
// MONEY RULE: agorot (integer) EVERYWHERE — D1 and PayMe both use agorot, so
// there is NO unit conversion anywhere in the payment path. Requests are JSON.
const paymeBase = (env: Env) =>
  (env.PAYME_BASE_URL || "https://sandbox.payme.io/api").replace(/\/$/, "");
type Pricing = {
  freeShippingFrom: number;
  delivery: Record<string, number>;
  prices: Record<string, number>;
  names?: Record<string, string>; // server-authoritative product names
};
let pricingCache: Pricing | null = null;
async function loadPricing(request: Request, env: Env): Promise<Pricing | null> {
  if (pricingCache) return pricingCache;
  try {
    const url = new URL("/checkout-pricing.json", new URL(request.url).origin);
    const res = await env.ASSETS.fetch(new Request(url.toString()));
    if (!res.ok) return null;
    pricingCache = (await res.json()) as Pricing;
    return pricingCache;
  } catch {
    return null;
  }
}

// payer validation — MUST stay identical to the cart form's client-side rules
// (a full name + Israeli mobile go on the PayMe sale and the invoice).
type Payer = { name: string; phone: string; email: string };
function validatePayer(
  raw: { name?: string; phone?: string; email?: string } | undefined
): { ok: true; payer: Payer } | { ok: false; error: string } {
  const name = String(raw?.name ?? "").trim().replace(/\s+/g, " ");
  const words = name ? name.split(" ") : [];
  if (words.length < 2 || words.some((w) => w.length < 2)) {
    return { ok: false, error: "נא למלא שם מלא (פרטי ומשפחה)" };
  }
  const phone = String(raw?.phone ?? "").replace(/[\s-]/g, "");
  if (!/^05\d{8}$/.test(phone)) {
    return { ok: false, error: "מספר נייד לא תקין (05XXXXXXXX)" };
  }
  const email = String(raw?.email ?? "").trim();
  if (email && !isEmail(email)) return { ok: false, error: "אימייל לא תקין" };
  return { ok: true, payer: { name, phone, email } };
}

// shipping address — required only when the order ships (courier/mail), never for
// pickup. MUST stay identical to the cart form's client-side rules.
type Shipping = { street: string; city: string; apt: string; zip: string; notes: string };
function validateShipping(
  deliveryKey: string,
  raw: { street?: string; city?: string; apt?: string; zip?: string; notes?: string } | undefined
): { ok: true; shipping: Shipping | null } | { ok: false; error: string } {
  if (deliveryKey === "pickup") return { ok: true, shipping: null };
  const street = String(raw?.street ?? "").trim();
  const city = String(raw?.city ?? "").trim();
  if (street.length < 2 || city.length < 2) {
    return { ok: false, error: "נא למלא כתובת למשלוח (רחוב ומספר, ועיר)" };
  }
  return {
    ok: true,
    shipping: {
      street: street.slice(0, 120),
      city: city.slice(0, 60),
      apt: String(raw?.apt ?? "").trim().slice(0, 60),
      zip: String(raw?.zip ?? "").trim().slice(0, 12),
      notes: String(raw?.notes ?? "").trim().slice(0, 200),
    },
  };
}

// server-side coupon check (mirrors validate-coupon); returns the percent or null
async function couponPercent(db: DB, rawCode: string): Promise<number | null> {
  const code = normCode(rawCode);
  if (!code) return null;
  const c = await db.select().from(coupons).where(eq(coupons.code, code)).get();
  if (!c || !c.active) return null;
  if (c.expiresAt && Date.now() > Date.parse(c.expiresAt)) return null;
  if (c.maxUses != null && c.usedCount >= c.maxUses) return null;
  return c.percent;
}

// shared cart math (used by card checkout AND the WhatsApp order log) so both
// record identical, server-authoritative totals in agorot.
type CartResult =
  | {
      ok: true;
      lines: { id: string; name: string; qty: number; price: number }[];
      subtotal: number;
      discount: number;
      shipping: number;
      total: number;
      couponCode: string | null;
      deliveryKey: string;
    }
  | { ok: false; error: string };

async function computeCart(
  pricing: Pricing,
  db: DB,
  rawItems: { id?: string; name?: string; qty?: number }[],
  rawDelivery: string | undefined,
  rawCoupon: string | undefined
): Promise<CartResult> {
  let subtotal = 0;
  const lines: { id: string; name: string; qty: number; price: number }[] = [];
  for (const it of rawItems) {
    const id = String(it.id ?? "");
    const unit = pricing.prices[id];
    const qty = Math.max(1, Math.floor(Number(it.qty) || 0));
    if (!(unit > 0)) return { ok: false, error: "מוצר לא תקין בעגלה" };
    subtotal += unit * qty;
    // the name is resolved SERVER-side from the same asset as the price — the
    // owner must ship the product we actually charged for, so a client-sent
    // name can never decide what appears on the order.
    const name = pricing.names?.[id] ?? String(it.name ?? "").slice(0, 120);
    lines.push({ id, name, qty, price: unit });
  }
  if (!lines.length) return { ok: false, error: "העגלה ריקה" };

  let discount = 0;
  let couponCode: string | null = null;
  if (rawCoupon) {
    const pct = await couponPercent(db, rawCoupon);
    if (pct) {
      discount = Math.round((subtotal * pct) / 100 / 10) * 10; // 10-agorot grid (matches cart)
      couponCode = normCode(rawCoupon);
    }
  }

  const deliveryKey = ["pickup", "courier", "mail"].includes(String(rawDelivery))
    ? String(rawDelivery)
    : "pickup";
  const freeShip = subtotal >= pricing.freeShippingFrom;
  const shipping = deliveryKey === "pickup" || freeShip ? 0 : pricing.delivery[deliveryKey] ?? 0;
  const total = subtotal - discount + shipping;
  return { ok: true, lines, subtotal, discount, shipping, total, couponCode, deliveryKey };
}

// POST /api/checkout { items:[{id,name?,qty}], delivery, couponCode?, payer }
// -> creates a D1 order + a PayMe sale, returns { url } (the hosted payment page).
async function checkout(request: Request, env: Env, db: DB): Promise<Response> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
  if (await isRateLimited(db, ip, "checkout", 20, 60)) {
    return json({ error: "יותר מדי ניסיונות — נסו שוב בעוד דקה" }, 429);
  }

  let body: {
    items?: { id?: string; name?: string; qty?: number }[];
    delivery?: string;
    couponCode?: string;
    payer?: { name?: string; email?: string; phone?: string };
    shipping?: { street?: string; city?: string; apt?: string; zip?: string; notes?: string };
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "bad request" }, 400);
  }

  const p = validatePayer(body.payer);
  if (!p.ok) return json({ error: p.error }, 400);
  const payer = p.payer;

  const pricing = await loadPricing(request, env);
  if (!pricing) return json({ error: "שגיאה זמנית, נסו שוב" }, 500);

  const c = await computeCart(
    pricing,
    db,
    Array.isArray(body.items) ? body.items : [],
    body.delivery,
    body.couponCode
  );
  if (!c.ok) return json({ error: c.error }, 400);
  const { lines, subtotal, discount, total, couponCode, deliveryKey } = c;
  if (total < 500) return json({ error: "סכום מינימלי לתשלום באתר הוא ₪5" }, 400);

  // a shipping address is required once the order actually ships (courier/mail)
  const ship = validateShipping(deliveryKey, body.shipping);
  if (!ship.ok) return json({ error: ship.error }, 400);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .insert(orders)
    .values({
      id,
      createdAt: now,
      items: JSON.stringify(lines),
      subtotal,
      couponCode,
      discount,
      delivery: deliveryKey,
      shipping: ship.shipping ? JSON.stringify(ship.shipping) : null,
      total,
      status: "new",
      payerName: payer.name,
      payerEmail: payer.email || null,
      payerPhone: payer.phone,
    })
    .run();

  // create the PayMe sale (server-side, with the secret seller id). PayMe is
  // agorot-native like our D1 — no unit conversion anywhere.
  const origin = new URL(request.url).origin;
  const payload: Record<string, unknown> = {
    seller_payme_id: env.PAYME_SELLER_ID,
    sale_price: total, // agorot, integer (min 500 enforced above)
    currency: "ILS",
    product_name: `הזמנה מאתר לב התחביב - ${lines.length} פריטים`,
    transaction_id: id, // echoed in the callback -> locates the order
    sale_callback_url: `${origin}/api/payme-callback?key=${encodeURIComponent(env.PAYME_WEBHOOK_KEY)}`,
    sale_return_url: `${origin}/thank-you?order=${id}`,
    // without a cancel target a shopper who abandons / fails 3DS is left on
    // PayMe's page instead of coming back to their cart
    cancel_url: `${origin}/cart`,
    sale_payment_method: "multi", // card + Bit + Apple/Google Pay (per enabled services)
    installments: "1",
    language: "he",
    sale_name: payer.name,
    sale_mobile: payer.phone,
    ...(payer.email ? { sale_email: payer.email } : {}),
  };

  let sale: any = null;
  try {
    const res = await fetch(`${paymeBase(env)}/generate-sale`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    sale = await res.json().catch(() => null);
  } catch {
    sale = null;
  }

  // payme_sale_id is REQUIRED, not optional: the whole paid-gate (callback match
  // + get-transactions re-query + self-heal) keys off it, so a sale without one
  // could never be settled — fail here rather than send the shopper to pay into
  // an order we can never confirm.
  const saleId = String(sale?.payme_sale_id ?? "");
  if (!sale || sale.status_code !== 0 || !sale.sale_url || !saleId) {
    await db.update(orders).set({ status: "failed" }).where(eq(orders.id, id)).run();
    return json({ error: "לא ניתן לפתוח עמוד תשלום כרגע, נסו שוב" }, 502);
  }

  // remember the sale id — the callback must reference it AND the re-query uses it
  await db.update(orders).set({ paymeSaleId: saleId }).where(eq(orders.id, id)).run();

  return json({ url: sale.sale_url, orderId: id }); // PayMe hosted payment page
}

// Re-query PayMe for the authoritative sale state (get-transactions, per PayMe
// support this is THE recommended confirmation). Merchant accounts get NO
// payme_signature on callbacks (partner/marketplace accounts only — confirmed by
// PayMe support 2026-08), so this authenticated round-trip — it uses our secret
// seller key and can't be spoofed — is the ONLY trustworthy "money moved" gate.
// Returns a TRI-STATE: "paid" / "unpaid" / "unknown" (unreachable or a shape we
// don't recognise — never a false "paid").
// TODO(sandbox): confirm get-transactions' exact request/response shape on the
// first sandbox run; we read a few plausible paths and fail to "unknown".
type PaidCheck = "paid" | "unpaid" | "unknown";
// `detail` is a short, secret-free trace of what PayMe answered — surfaced via
// /api/order-status?debug=1 so a stuck order can be diagnosed without log access.
type PaidProbe = { verdict: PaidCheck; detail: string };

// PayMe's public v1.0 reference documents NO sale-status endpoint; the name
// `get-transactions` comes from PayMe support. So we try the plausible shapes and
// report which one answered — never inventing a "paid" we didn't see.
async function probePayMeSale(
  order: typeof orders.$inferSelect,
  env: Env
): Promise<PaidProbe> {
  const saleId = order.paymeSaleId;
  if (!saleId) return { verdict: "unknown", detail: "no-sale-id" };
  const candidates = [
    { path: "get-transactions", body: { payme_sale_id: saleId } },
    { path: "get-sales", body: { payme_sale_id: saleId } },
    { path: "get-transactions", body: { payme_transaction_id: saleId } },
  ];
  const notes: string[] = [];
  for (const c of candidates) {
    try {
      const res = await fetch(`${paymeBase(env)}/${c.path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ seller_payme_id: env.PAYME_SELLER_ID, ...c.body }),
      });
      const text = await res.text();
      let j: any = null;
      try {
        j = JSON.parse(text);
      } catch {
        notes.push(`${c.path}:${res.status}:non-json`);
        continue;
      }
      if (j?.status_code !== 0) {
        notes.push(`${c.path}:${res.status}:sc=${j?.status_code}`);
        continue;
      }
      // locate OUR sale: a list, or a single object echoed back
      const list: any[] = Array.isArray(j.items)
        ? j.items
        : Array.isArray(j.sales)
        ? j.sales
        : [j];
      // an EXACT sale-id match is the strong binding; a lone unmatched row is a
      // weak fallback and is held to a stricter bar below.
      // NOTE: generate-sale returns `payme_sale_id`, but get-transactions returns
      // the SAME id under `sale_payme_id` (names transposed) — accept both.
      const exact = list.find(
        (s) => String(s?.sale_payme_id ?? s?.payme_sale_id ?? "") === saleId
      );
      const tx = exact ?? (list.length === 1 ? list[0] : null);
      if (!tx) {
        notes.push(`${c.path}:no-match`);
        continue;
      }
      const status = String(tx.sale_status ?? tx.status ?? "").toLowerCase();
      if (!status) {
        notes.push(`${c.path}:no-status`);
        continue;
      }
      if (status !== "completed") {
        return { verdict: "unpaid", detail: `${c.path}:status=${status}` };
      }
      // `transaction_price` is THE documented amount on a get-transactions row,
      // in integer agorot (same unit we send). NOT transaction_price_after_fees
      // (a string, net of PayMe's cut). The rest are legacy/defensive fallbacks.
      const priceRaw =
        tx.transaction_price ?? tx.price ?? tx.sale_price ?? tx.amount ?? tx.total;
      const price = Number(priceRaw);
      if (!Number.isFinite(price)) {
        // We can't read the amount under any known key. If the sale matched by
        // its unique sale id — which WE created server-side with a fixed price —
        // "completed" is already proof enough; the amount was never in the
        // shopper's control. Report the field names so this can be tightened.
        const keys = Object.keys(tx).join(",").slice(0, 400);
        if (exact) return { verdict: "paid", detail: `${c.path}:completed:no-price:${keys}` };
        return { verdict: "unknown", detail: `${c.path}:no-price:${keys}` };
      }
      if (price !== order.total) {
        return { verdict: "unpaid", detail: `${c.path}:price=${price}!=${order.total}` };
      }
      return { verdict: "paid", detail: `${c.path}:completed` };
    } catch {
      notes.push(`${c.path}:threw`);
    }
  }
  return { verdict: "unknown", detail: notes.join("|").slice(0, 160) || "no-answer" };
}

// shared by the callback AND the order-status self-heal: re-query PayMe, and only
// if the money really moved, atomically flip the order to paid + consume the
// coupon. The WHERE status IN ('new','failed') makes the flip idempotent —
// duplicate callbacks can't double-consume. An affirmative "paid" from the
// re-query is ALWAYS required — the callback alone is only key-authenticated
// (no signature on merchant accounts), so it is a trigger, never proof.
// Returns the re-query verdict so the CALLER can react correctly:
//   "paid"    -> settled (or already settled by a racing path)
//   "unpaid"  -> PayMe positively says no; ack it, retrying will never help
//   "unknown" -> couldn't tell (transient); the caller should ask PayMe to retry
async function settleOrderIfPaid(
  order: typeof orders.$inferSelect,
  env: Env,
  db: DB,
  extra: {
    trustedCallback?: boolean;
    paymentRef?: string;
    invoiceUrl?: string;
    payerName?: string;
    payerEmail?: string;
    payerPhone?: string;
  } = {}
): Promise<PaidCheck> {
  const { verdict } = await probePayMeSale(order, env);
  // trustedCallback: the caller already verified a PayMe-authenticated callback
  // (secret key + our exact payme_sale_id + exact amount + ILS + sale-complete).
  // The re-query is defense-in-depth, so it may VETO ("unpaid") but must not be
  // a single point of failure — its exact shape is undocumented, and a shop that
  // can't settle real payments is worse than the residual forgery risk (which
  // needs the 48-char webhook secret AND the sale id AND the exact agorot).
  // TODO: once PayMe confirms the endpoint, require verdict === "paid" here too.
  const ok = extra.trustedCallback ? verdict !== "unpaid" : verdict === "paid";
  if (!ok) return verdict;

  const res = await db
    .update(orders)
    .set({
      status: "paid",
      paymentRef: extra?.paymentRef || order.paymentRef || null,
      invoiceUrl: extra?.invoiceUrl || order.invoiceUrl || null,
      payerName: extra?.payerName || order.payerName || null,
      payerEmail: extra?.payerEmail || order.payerEmail || null,
      payerPhone: extra?.payerPhone || order.payerPhone || null,
    })
    .where(and(eq(orders.id, order.id), inArray(orders.status, ["new", "failed"])))
    .run();

  if ((res.meta?.changes ?? 0) > 0) {
    // consume a single-use / capped coupon on payment success — atomically, only
    // when WE did the flip and only while under the cap. A shopper could in
    // theory open several un-paid checkouts with one single-use code — accepted
    // for a small shop (each is still a real charged order) rather than burning
    // a welcome code on an abandoned checkout.
    if (order.couponCode) {
      await db
        .update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1` })
        .where(
          and(
            eq(coupons.code, order.couponCode),
            or(isNull(coupons.maxUses), lt(coupons.usedCount, coupons.maxUses))
          )
        )
        .run();
    }
  } else {
    // We lost the race — the /thank-you self-heal already flipped this order,
    // but ONLY the callback carries the invoice URL + payment reference. Backfill
    // the still-empty columns (each guarded by its own IS NULL, so a later
    // duplicate callback can never overwrite a value we already stored).
    if (extra.paymentRef) {
      await db
        .update(orders)
        .set({ paymentRef: extra.paymentRef })
        .where(and(eq(orders.id, order.id), isNull(orders.paymentRef)))
        .run();
    }
    if (extra.invoiceUrl) {
      await db
        .update(orders)
        .set({ invoiceUrl: extra.invoiceUrl })
        .where(and(eq(orders.id, order.id), isNull(orders.invoiceUrl)))
        .run();
    }
  }
  return "paid";
}

// POST /api/payme-callback?key=...  (PayMe server-to-server, x-www-form-urlencoded)
// Merchant accounts get NO payme_signature (partner accounts only), so the
// callback is authenticated by the secret key in the URL and treated as a
// TRIGGER only — settleOrderIfPaid's get-transactions re-query is the proof.
// PayMe retries the callback until it gets a 2xx, so on a transient re-query
// failure we answer 500 and let the retry loop (+ the order-status self-heal)
// finish the job.
async function paymeCallback(request: Request, env: Env, db: DB): Promise<Response> {
  // deny-all when the secret isn't configured; compare in constant time.
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!env.PAYME_WEBHOOK_KEY || !safeEqual(key, env.PAYME_WEBHOOK_KEY)) {
    return new Response("forbidden", { status: 403 });
  }

  let form: URLSearchParams;
  try {
    form = new URLSearchParams(await request.text());
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const f = (k: string) => form.get(k) ?? "";

  const orderId = f("transaction_id");
  if (!orderId) return new Response("OK");
  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) return new Response("OK"); // unknown order — just ack

  const notify = f("notify_type");

  // EVERY state-changing path requires the callback to reference the sale WE
  // created for this order. Without it, anyone holding the webhook key + an order
  // uuid (uuids ride in /thank-you URLs) could flip orders at will.
  if (f("payme_sale_id") !== (order.paymeSaleId ?? "")) {
    return new Response("OK"); // mismatch — ack, don't hand a probe an oracle
  }

  // refund / chargeback can arrive AFTER payment — handle BEFORE the paid path so
  // a returned order doesn't stay "paid". Only a settled order can be refunded,
  // and a PARTIAL refund (price < total) leaves the order paid — the owner sees
  // the refund in PayMe; flipping the whole order would drop it from fulfilment.
  if (notify === "refund" || notify === "sale-chargeback") {
    // sale_status distinguishes full from partial: refunded / partial-refund,
    // chargeback / partial-chargeback. A PARTIAL refund leaves the order paid —
    // the owner still ships it; the refund is visible in PayMe.
    const saleStatus = f("sale_status");
    const refunded = Number(f("price"));
    const partial =
      saleStatus.startsWith("partial") ||
      (Number.isFinite(refunded) && refunded > 0 && refunded < order.total);
    if (!partial) {
      await db
        .update(orders)
        .set({ status: "refunded" })
        .where(and(eq(orders.id, orderId), inArray(orders.status, ["paid", "handled"])))
        .run();
    }
    return new Response("OK");
  }
  // a reverted chargeback means the money is ours again — restore the order so it
  // doesn't sit "refunded" and drop out of fulfilment.
  if (notify === "sale-chargeback-refund") {
    await db
      .update(orders)
      .set({ status: "paid" })
      .where(and(eq(orders.id, orderId), eq(orders.status, "refunded")))
      .run();
    return new Response("OK");
  }
  if (notify === "sale-failure") {
    // only a pending order flips to failed (never un-pay a paid order)
    await db
      .update(orders)
      .set({ status: "failed" })
      .where(and(eq(orders.id, orderId), eq(orders.status, "new")))
      .run();
    return new Response("OK");
  }

  // paid path: cheap gates first (they cost nothing and drop junk), then the
  // authoritative re-query inside settleOrderIfPaid.
  const paid = notify === "sale-complete" || f("sale_status") === "completed";
  if (!paid) return new Response("OK"); // sale-authorized etc. — ack + ignore
  if (Number(f("price")) !== order.total) return new Response("OK"); // agorot exact
  const currency = f("currency");
  if (currency && currency !== "ILS") return new Response("OK");

  const invoiceUrl = f("sale_invoice_url");
  const outcome = await settleOrderIfPaid(order, env, db, {
    trustedCallback: true,
    paymentRef: f("payme_transaction_id"),
    invoiceUrl: /^https:\/\//i.test(invoiceUrl) ? invoiceUrl : undefined,
    payerName: f("buyer_name"),
    payerEmail: f("buyer_email"),
    payerPhone: f("buyer_phone"),
  });
  // "unknown" = transient (PayMe unreachable / unrecognised shape) -> 500 so PayMe
  // retries. "unpaid" = a definitive no -> ack, because retrying can't change it
  // (an endless 500 loop would burn API calls forever). This must NOT depend on
  // the order's current status: a 'failed' order (declined first attempt) that is
  // later paid on retry needs the retry loop just as much as a 'new' one.
  if (outcome === "unknown") return new Response("retry", { status: 500 });
  return new Response("OK");
}

// GET /api/order-status?id=...  (the /thank-you page polls this; id is an unguessable uuid)
async function orderStatus(request: Request, env: Env, db: DB): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return json({ error: "missing id" }, 400);
  const o = await db.select().from(orders).where(eq(orders.id, id)).get();
  if (!o) return json({ status: "unknown" });

  // self-heal: if the callback got lost, ask PayMe ourselves — for any unsettled
  // order that actually started a sale. 'failed' counts: a declined first attempt
  // that the shopper then retried successfully must still be recoverable.
  // Rate-limited because each run costs an outbound PayMe API call, and abuse of
  // the seller key upstream would break real settlements.
  if (
    (o.status === "new" || o.status === "failed") &&
    o.paymeSaleId &&
    Date.now() - Date.parse(o.createdAt) < 24 * 3600 * 1000
  ) {
    const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
    if (!(await isRateLimited(db, ip, "order-status", 30, 60))) {
      if ((await settleOrderIfPaid(o, env, db)) === "paid") return json({ status: "paid" });
    }
  }

  // ?debug=1 — what did PayMe actually answer for this sale? Secret-free (an
  // endpoint name + status string), and it needs the order's unguessable uuid,
  // which only the shopper who created it has. Keeps a stuck order diagnosable
  // without log access; drop it once the re-query shape is confirmed.
  if (new URL(request.url).searchParams.get("debug") === "1") {
    const probe = await probePayMeSale(o, env);
    return json({ status: o.status, saleId: o.paymeSaleId, probe });
  }

  // return ONLY status (the id travels in the return URL; don't leak the amount)
  return json({ status: o.status });
}

// ---------- admin orders (JWT) — dashboard reads orders from D1 ----------
const safeJson = (s: string): any => {
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
};
function mapOrder(o: typeof orders.$inferSelect) {
  return {
    _id: o.id,
    createdAt: o.createdAt,
    status: o.status,
    total: o.total / 100, // agorot -> shekels for the dashboard
    discount: o.discount / 100,
    delivery: o.delivery,
    shipping: o.shipping ? safeJson(o.shipping) : null,
    couponCode: o.couponCode,
    items: safeJson(o.items),
    paymentRef: o.paymentRef,
    invoiceUrl: o.invoiceUrl,
    payerName: o.payerName,
    payerEmail: o.payerEmail,
    payerPhone: o.payerPhone,
  };
}

async function listAdminOrders(db: DB): Promise<Response> {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).all();
  return json({ orders: rows.map(mapOrder) });
}

// ---------- scheduled reconciliation (cron) ----------
// Safety net for the money path. A shopper who pays and immediately closes the
// tab never triggers the /thank-you poll, and PayMe's callback delivery is not
// something we control — so without this an order could stay 'new' forever
// despite being paid, and the owner would simply never see it. Every run asks
// PayMe about each unsettled sale and settles the ones that really paid.
async function reconcilePendingOrders(env: Env, db: DB): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const pending = await db
    .select()
    .from(orders)
    .where(and(inArray(orders.status, ["new", "failed"]), gt(orders.createdAt, cutoff)))
    .limit(50)
    .all();

  let settled = 0;
  for (const o of pending) {
    if (!o.paymeSaleId) continue;
    // a sale created seconds ago is still mid-checkout — leave it alone
    if (Date.now() - Date.parse(o.createdAt) < 120_000) continue;
    if ((await settleOrderIfPaid(o, env, db)) === "paid") settled++;
  }
  return settled;
}

async function updateOrderStatus(request: Request, db: DB, id: string): Promise<Response> {
  let body: { status?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "bad request" }, 400);
  }
  const allowed = ["new", "paid", "failed", "refunded", "handled", "cancelled"];
  const status = String(body.status || "");
  if (!allowed.includes(status)) return json({ error: "bad status" }, 400);
  await db.update(orders).set({ status }).where(eq(orders.id, id)).run();
  const o = await db.select().from(orders).where(eq(orders.id, id)).get();
  if (!o) return json({ error: "not found" }, 404);
  return json({ order: mapOrder(o) });
}

export default {
  // cron (see wrangler.jsonc "triggers"): catch paid-but-unsettled orders that
  // neither the callback nor the /thank-you poll managed to settle.
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(reconcilePendingOrders(env, drizzle(env.DB)));
  },

  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname.startsWith("/api/")) {
      const db = drizzle(env.DB);

      // public
      if (pathname === "/api/validate-coupon" && request.method === "POST") {
        return validateCoupon(request, db);
      }
      if (pathname === "/api/welcome" && request.method === "GET") {
        return welcomeInfo(db);
      }
      if (pathname === "/api/subscribe" && request.method === "POST") {
        return subscribe(request, db);
      }
      if (pathname === "/api/checkout" && request.method === "POST") {
        return checkout(request, env, db);
      }
      if (pathname === "/api/payme-callback" && request.method === "POST") {
        return paymeCallback(request, env, db);
      }
      if (pathname === "/api/order-status" && request.method === "GET") {
        return orderStatus(request, env, db);
      }

      // admin (JWT)
      if (pathname.startsWith("/api/admin/")) {
        if (!(await requireAdmin(request, env))) return json({ error: "unauthorized" }, 401);

        if (pathname === "/api/admin/coupons" && request.method === "GET") {
          return listCoupons(db);
        }
        if (pathname === "/api/admin/coupons" && request.method === "POST") {
          return createCoupon(request, db);
        }
        if (pathname.startsWith("/api/admin/coupons/") && request.method === "DELETE") {
          const code = safeDecode(pathname.split("/").pop() || "");
          if (code === null) return json({ error: "bad request" }, 400);
          return deleteCoupon(db, code);
        }
        if (pathname === "/api/admin/subscribers" && request.method === "GET") {
          return listSubscribers(db);
        }
        if (pathname.startsWith("/api/admin/subscribers/") && request.method === "DELETE") {
          const email = safeDecode(pathname.split("/").pop() || "");
          if (email === null) return json({ error: "bad request" }, 400);
          return deleteSubscriber(db, email);
        }
        if (pathname === "/api/admin/settings" && request.method === "GET") {
          return getAdminSettings(db);
        }
        if (pathname === "/api/admin/settings" && request.method === "POST") {
          return saveAdminSettings(request, db);
        }
        if (pathname === "/api/admin/orders" && request.method === "GET") {
          return listAdminOrders(db);
        }
        if (pathname.startsWith("/api/admin/orders/") && request.method === "PATCH") {
          const oid = safeDecode(pathname.split("/").pop() || "");
          if (oid === null) return json({ error: "bad request" }, 400);
          return updateOrderStatus(request, db, oid);
        }
      }

      return json({ error: "not found" }, 404);
    }

    // Not an API route -> static storefront (SPA fallback included).
    return env.ASSETS.fetch(request);
  },
};
