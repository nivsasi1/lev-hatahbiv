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
 * Phase 3 (payments): /api/checkout + /api/payment-webhook -> record the order
 *              in D1 and CONSUME the single-use coupon (bump used_count).
 */
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import { and, desc, eq, sql } from "drizzle-orm";
import { coupons, subscribers, settings, rateLimits } from "./db/schema";

export interface Env {
  ASSETS: Fetcher; // the static storefront (Frontend/dist)
  DB: D1Database; // coupons / orders / subscribers / rate_limits / settings
  ADMIN_JWT_SECRET: string; // must equal the backend's JWT SECRET (HS256)
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
    if (claims.exp && Date.now() / 1000 > claims.exp) return null; // expired
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
      }

      // TODO Phase 3: POST /api/checkout, POST /api/payment-webhook (consume single-use).
      return json({ error: "not found" }, 404);
    }

    // Not an API route -> static storefront (SPA fallback included).
    return env.ASSETS.fetch(request);
  },
};
