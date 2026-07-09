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
 * Payments (Grow/Meshulam Light API): POST /api/checkout -> createPaymentProcess,
 *              POST /api/grow-callback -> verify + mark the order paid in D1 and
 *              CONSUME the single-use coupon (bump used_count),
 *              POST /api/grow-invoice -> store the invoice number/link.
 */
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { and, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { coupons, subscribers, settings, rateLimits, orders } from "./db/schema";

export interface Env {
  ASSETS: Fetcher; // the static storefront (Frontend/dist)
  DB: D1Database; // coupons / orders / subscribers / rate_limits / settings
  ADMIN_JWT_SECRET: string; // must equal the backend's JWT SECRET (HS256)
  // ── Grow / Meshulam (set via `wrangler secret put`) ──
  GROW_USER_ID: string; // our Grow account user id (from Grow support)
  GROW_PAGE_CODE: string; // the payment page we charge through (from Grow support)
  GROW_WEBHOOK_KEY: string; // our secret, embedded in notifyUrl to auth callbacks
  GROW_BASE_URL?: string; // sandbox default in wrangler.jsonc vars; prod URL arrives with live creds
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

// ---------- Grow checkout (createPaymentProcess) + callbacks ----------
// Authoritative prices live in the generated /checkout-pricing.json asset, so we
// recompute totals server-side and never trust client-sent amounts.
// Money rule: D1 keeps AGOROT (integer); Grow's `sum` is shekels decimal —
// convert ONLY at the API boundary. Every Grow request is multipart FormData.
const growBase = (env: Env) =>
  (env.GROW_BASE_URL || "https://sandbox.meshulam.co.il/api/light/server/1.0").replace(/\/$/, "");
type Pricing = {
  freeShippingFrom: number;
  delivery: Record<string, number>;
  prices: Record<string, number>;
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
// (Grow requires fullName with 2+ names and an Israeli mobile on the page fields).
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
    lines.push({ id, name: String(it.name ?? "").slice(0, 120), qty, price: unit });
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
// -> creates a D1 order + a Grow payment process, returns { url } (hosted page)
//    or { authCode } (Growin Wallet popup) — exactly one of the two.
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
      total,
      status: "new",
      payerName: payer.name,
      payerEmail: payer.email || null,
      payerPhone: payer.phone,
    })
    .run();

  // create the Grow payment process (server-side, with secret userId/pageCode)
  const origin = new URL(request.url).origin;
  const fd = new FormData();
  fd.append("pageCode", env.GROW_PAGE_CODE);
  fd.append("userId", env.GROW_USER_ID);
  fd.append("sum", (total / 100).toFixed(2)); // agorot -> shekels, boundary only
  fd.append("paymentNum", "1"); // single payment, no installments
  // Grow forbids special characters in params — keep the description plain (no parentheses)
  fd.append("description", `הזמנה מאתר לב התחביב - ${lines.length} פריטים`);
  fd.append("successUrl", `${origin}/thank-you?order=${id}`);
  fd.append("cancelUrl", `${origin}/cart`);
  fd.append("notifyUrl", `${origin}/api/grow-callback?key=${encodeURIComponent(env.GROW_WEBHOOK_KEY)}`);
  fd.append("invoiceNotifyUrl", `${origin}/api/grow-invoice?key=${encodeURIComponent(env.GROW_WEBHOOK_KEY)}`);
  fd.append("cField1", id); // echoed in the callback -> locates the order
  fd.append("pageField[fullName]", payer.name);
  fd.append("pageField[phone]", payer.phone);
  if (payer.email) fd.append("pageField[email]", payer.email);
  fd.append("pageField[invoiceName]", payer.name);

  let proc: any = null;
  try {
    // no Content-Type header — fetch sets the multipart boundary itself
    const res = await fetch(`${growBase(env)}/createPaymentProcess`, {
      method: "POST",
      body: fd,
    });
    proc = await res.json().catch(() => null);
  } catch {
    proc = null;
  }

  const data = proc?.status === 1 ? proc.data : null;
  if (!data || (!data.url && !data.authCode)) {
    await db.update(orders).set({ status: "failed" }).where(eq(orders.id, id)).run();
    return json({ error: "לא ניתן לפתוח עמוד תשלום כרגע, נסו שוב" }, 502);
  }

  // remember the process pair — the callback must present BOTH to be believed
  await db
    .update(orders)
    .set({ processId: String(data.processId), processToken: String(data.processToken) })
    .where(eq(orders.id, id))
    .run();

  // url -> redirect pageCode (hosted payment page); authCode -> Growin Wallet popup
  return json(
    data.url ? { url: data.url, orderId: id } : { authCode: data.authCode, orderId: id }
  );
}

// Re-query Grow for the authoritative transaction state. Returns a TRI-STATE so
// callers can tell "Grow says paid" from "Grow says NOT paid" from "couldn't tell"
// (endpoint unreachable / a response shape we don't recognise). Grow marks a paid
// transaction with statusCode 2 (status text "שולם"); the actual charged amount
// lives on the transaction record — NOT data.sum, which is the *requested* amount
// that exists the moment a process is created, before any money moves.
// TODO(sandbox): confirm getPaymentProcessInfo's exact response shape + where the
// paid transaction's statusCode/sum live; today we read a few plausible paths and
// fall back to "unknown" (never a false "paid") when we don't recognise the shape.
type PaidCheck = "paid" | "unpaid" | "unknown";
async function confirmPaidWithGrow(
  order: typeof orders.$inferSelect,
  env: Env
): Promise<PaidCheck> {
  if (!order.processId || !order.processToken) return "unknown";
  try {
    const fd = new FormData();
    fd.append("pageCode", env.GROW_PAGE_CODE);
    fd.append("processId", order.processId);
    fd.append("processToken", order.processToken);
    const res = await fetch(`${growBase(env)}/getPaymentProcessInfo`, {
      method: "POST",
      body: fd,
    });
    const j: any = await res.json().catch(() => null);
    if (j?.status !== 1) return "unknown"; // envelope failed — can't tell
    // the charged transaction (a paid process has one; an abandoned/declined one
    // does not). Read status + sum from HERE, never from data.sum.
    const tx =
      j.data?.transaction ??
      (Array.isArray(j.data?.transactions) ? j.data.transactions[0] : null);
    const code = tx ? String(tx.statusCode ?? tx.status ?? "") : "";
    if (!code) return "unknown"; // shape not recognised — let the caller decide
    if (code !== "2") return "unpaid"; // Grow positively says not-paid
    const sum = tx.sum;
    if (sum === undefined || sum === null) return "unknown";
    // amount must match to the agora, else treat as tampering, not payment
    return Math.round(parseFloat(String(sum)) * 100) === order.total ? "paid" : "unpaid";
  } catch {
    return "unknown";
  }
}

// shared by the callback AND the order-status self-heal: re-query Grow, and only
// if the money really moved, atomically flip the order to paid + consume the
// coupon. The WHERE status IN ('new','failed') makes the flip idempotent —
// duplicate callbacks can't double-consume.
//   trustedCallback: the caller already verified a paid callback (statusCode "2"
//   + matching processToken, un-forgeable without our secret key) — so the
//   re-query only VETOES a positively-unpaid result and an "unknown" re-query
//   still settles. Without it (self-heal, no callback) an affirmative "paid" is
//   REQUIRED, so a lost callback never invents a payment.
async function settleOrderIfPaid(
  order: typeof orders.$inferSelect,
  env: Env,
  db: DB,
  opts: {
    trustedCallback?: boolean;
    paymentRef?: string;
    payerName?: string;
    payerEmail?: string;
    payerPhone?: string;
  } = {}
): Promise<boolean> {
  const check = await confirmPaidWithGrow(order, env);
  const ok = opts.trustedCallback ? check !== "unpaid" : check === "paid";
  if (!ok) return false;
  const extra = opts;

  const res = await db
    .update(orders)
    .set({
      status: "paid",
      paymentRef: extra?.paymentRef || order.paymentRef || null,
      payerName: extra?.payerName || order.payerName || null,
      payerEmail: extra?.payerEmail || order.payerEmail || null,
      payerPhone: extra?.payerPhone || order.payerPhone || null,
    })
    .where(and(eq(orders.id, order.id), inArray(orders.status, ["new", "failed"])))
    .run();

  // consume a single-use / capped coupon on payment success — atomically, only
  // when WE did the flip (changes > 0) and only while under the cap. A shopper
  // could in theory open several un-paid checkouts with one single-use code —
  // accepted for a small shop (each is still a real charged order) rather than
  // burning a welcome code on an abandoned checkout.
  if ((res.meta?.changes ?? 0) > 0 && order.couponCode) {
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
  return true;
}

// POST /api/grow-callback?key=...  (Grow server-to-server, multipart FormData)
// Authenticated by the secret key in the URL (only our server + Grow know it),
// then the callback must MATCH the stored processId+processToken and the sum.
async function growCallback(request: Request, env: Env, db: DB): Promise<Response> {
  // deny-all when the secret isn't configured; compare in constant time.
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!env.GROW_WEBHOOK_KEY || !safeEqual(key, env.GROW_WEBHOOK_KEY)) {
    return new Response("forbidden", { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const f = (k: string) => String(form.get(k) ?? "");

  const orderId = f("cField1") || f("customFields[cField1]");
  if (!orderId) return new Response("OK");
  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) return new Response("OK"); // unknown order — just ack

  // the callback must prove it belongs to OUR process — a mismatch is acked and
  // ignored (never explain why; don't hand a probe an oracle).
  if (
    !safeEqual(f("processToken"), order.processToken ?? "") ||
    f("processId") !== order.processId
  ) {
    return new Response("OK");
  }
  if (Math.round(parseFloat(f("sum")) * 100) !== order.total) return new Response("OK");
  // only a PAID notification settles an order — a decline callback carries the
  // same processId/token/sum (they identify the process, not its outcome), so
  // without this a declined payment would flip the order to paid. Grow: 2 = paid.
  // TODO(sandbox): confirm statusCode "2" is the paid value on a real callback.
  if (f("statusCode") !== "2") return new Response("OK");

  // corroborate with a server-side re-query, then atomically flip. The callback
  // is trusted (statusCode + un-forgeable processToken), so an "unknown" re-query
  // still settles; only a positively-unpaid re-query vetoes it.
  const settled = await settleOrderIfPaid(order, env, db, {
    trustedCallback: true,
    paymentRef: f("transactionId"),
    payerName: f("fullName"),
    payerEmail: f("payerEmail"),
    payerPhone: f("payerPhone"),
  });
  if (!settled) return new Response("OK"); // re-query says not paid — ack + ignore

  // best-effort ACK back to Grow: echo every callback field + pageCode. It's an
  // acknowledgement only — the transaction succeeds even if this fails.
  try {
    const ack = new FormData();
    for (const [k, v] of form.entries()) ack.append(k, typeof v === "string" ? v : String(v));
    ack.set("pageCode", env.GROW_PAGE_CODE);
    await fetch(`${growBase(env)}/approveTransaction`, { method: "POST", body: ack });
  } catch {
    /* non-fatal */
  }

  return new Response("OK");
}

// POST /api/grow-invoice?key=...  (Grow invoice module -> invoiceNumber + invoiceUrl)
async function growInvoice(request: Request, env: Env, db: DB): Promise<Response> {
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!env.GROW_WEBHOOK_KEY || !safeEqual(key, env.GROW_WEBHOOK_KEY)) {
    return new Response("forbidden", { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const f = (k: string) => String(form.get(k) ?? "");

  // locate the order: by our cField1 when echoed, else by the Grow processId
  const orderId = f("cField1");
  const order = orderId
    ? await db.select().from(orders).where(eq(orders.id, orderId)).get()
    : await db.select().from(orders).where(eq(orders.processId, f("processId"))).get();
  // bind the invoice to the SAME process that paid (processId must match) and
  // write once — so a leaked webhook key can't repoint a real order's invoice
  // link at a phishing URL. A real invoice arrives once, right after payment.
  const invoiceUrl = f("invoiceUrl");
  if (
    order &&
    f("processId") === order.processId &&
    !order.invoiceUrl &&
    /^https:\/\//i.test(invoiceUrl)
  ) {
    await db
      .update(orders)
      .set({ invoiceUrl, invoiceNumber: f("invoiceNumber") || null })
      .where(and(eq(orders.id, order.id), isNull(orders.invoiceUrl)))
      .run();
  }
  return new Response("OK"); // always ack
}

// GET /api/order-status?id=...  (the /thank-you page polls this; id is an unguessable uuid)
async function orderStatus(request: Request, env: Env, db: DB): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return json({ error: "missing id" }, 400);
  const o = await db.select().from(orders).where(eq(orders.id, id)).get();
  if (!o) return json({ status: "unknown" });

  // self-heal: if the callback got lost, ask Grow ourselves — but only for a
  // fresh pending order that actually started a payment process.
  if (
    o.status === "new" &&
    o.processToken &&
    Date.now() - Date.parse(o.createdAt) < 24 * 3600 * 1000
  ) {
    if (await settleOrderIfPaid(o, env, db)) return json({ status: "paid" });
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
    couponCode: o.couponCode,
    items: safeJson(o.items),
    paymentRef: o.paymentRef,
    invoiceUrl: o.invoiceUrl,
    invoiceNumber: o.invoiceNumber,
    payerName: o.payerName,
    payerEmail: o.payerEmail,
    payerPhone: o.payerPhone,
  };
}

async function listAdminOrders(db: DB): Promise<Response> {
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).all();
  return json({ orders: rows.map(mapOrder) });
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
      if (pathname === "/api/grow-callback" && request.method === "POST") {
        return growCallback(request, env, db);
      }
      if (pathname === "/api/grow-invoice" && request.method === "POST") {
        return growInvoice(request, env, db);
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
