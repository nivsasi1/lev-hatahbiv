/**
 * Cloudflare Worker — lev-hatahbiv dynamic API (Phase 2 scaffold).
 *
 * The SAME Cloudflare project serves the static storefront (Frontend/dist via the
 * ASSETS binding) AND these /api/* endpoints. /api/* runs here; everything else
 * falls through to the static assets (with SPA fallback).
 *
 * Storage = D1 (one SQL DB for coupons + orders + payments — see worker/schema.sql).
 *
 * NOT YET ACTIVE. To turn on (see CLOUDFLARE.md "Phase 2"):
 *   1) npx wrangler d1 create lev            → copy the database_id
 *   2) npx wrangler d1 execute lev --remote --file=worker/schema.sql
 *   3) in wrangler.jsonc: set "main": "worker/index.ts", add "binding":"ASSETS"
 *      inside "assets", and add the "d1_databases" binding (DB) with that id
 *   4) npx wrangler secret put ADMIN_JWT_SECRET   (= the backend's JWT SECRET,
 *      so the same admin login token works here)
 *   5) npx wrangler deploy
 *
 * Implemented now: POST /api/validate-coupon, admin coupon CRUD (JWT).
 * Phase 3 (payments, provider known): /api/checkout + /api/payment-webhook ->
 * record the order in D1 and CONSUME the single-use coupon (bump used_count).
 *
 * Types: npm i -D @cloudflare/workers-types
 */

export interface Env {
  ASSETS: Fetcher; // the static storefront (Frontend/dist)
  DB: D1Database; // coupons / orders / subscribers / rate_limits
  ADMIN_JWT_SECRET: string; // must equal the backend's JWT SECRET (HS256)
}

interface CouponRow {
  code: string;
  percent: number;
  kind: string;
  max_uses: number | null;
  used_count: number;
  active: number;
  expires_at: string | null;
}

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

async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
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
  env: Env,
  ip: string,
  route: string,
  max = 20,
  windowSec = 60
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const bucket = `${route}:${ip}`;
  const row = await env.DB.prepare(
    "SELECT count, reset_at FROM rate_limits WHERE bucket = ?"
  )
    .bind(bucket)
    .first<{ count: number; reset_at: number }>();

  if (!row || now >= row.reset_at) {
    await env.DB.prepare(
      `INSERT INTO rate_limits (bucket, count, reset_at) VALUES (?, 1, ?)
       ON CONFLICT(bucket) DO UPDATE SET count = 1, reset_at = excluded.reset_at`
    )
      .bind(bucket, now + windowSec)
      .run();
    return false;
  }
  if (row.count >= max) return true;
  await env.DB.prepare("UPDATE rate_limits SET count = count + 1 WHERE bucket = ?")
    .bind(bucket)
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
async function getSetting(env: Env, key: string, fallback: string): Promise<string> {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?")
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? fallback;
}
async function setSetting(env: Env, key: string, value: string): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  )
    .bind(key, value)
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
async function validateCoupon(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
  if (await isRateLimited(env, ip, "coupon")) {
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

  const c = await env.DB.prepare(
    "SELECT code, percent, kind, max_uses, used_count, active, expires_at FROM coupons WHERE code = ?"
  )
    .bind(code)
    .first<CouponRow>();

  // Never reveal which codes exist — any failure is just { valid:false }.
  if (!c || !c.active) return json({ valid: false });
  if (c.expires_at && Date.now() > Date.parse(c.expires_at)) return json({ valid: false });
  if (c.max_uses != null && c.used_count >= c.max_uses) return json({ valid: false });

  return json({ valid: true, code: c.code, percent: c.percent });
}

// ---------- GET /api/welcome -> { enabled, percent } (for the signup dialog copy) ----------
async function welcomeInfo(env: Env): Promise<Response> {
  const enabled = (await getSetting(env, "welcome_enabled", "1")) === "1";
  const percent = clampPct(await getSetting(env, "welcome_percent", "10"));
  return json({ enabled, percent });
}

// ---------- POST /api/subscribe { email } -> { subscribed, code?, percent? } ----------
// Stores the subscriber and mints ONE single-use welcome coupon tied to the
// email. Idempotent: the same email always gets back its existing code.
async function subscribe(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
  if (await isRateLimited(env, ip, "subscribe", 10, 60)) {
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
  const claim = await env.DB.prepare(
    "INSERT OR IGNORE INTO subscribers (email, coupon_code, created_at) VALUES (?, NULL, ?)"
  )
    .bind(email, now)
    .run();
  const weCreated = (claim.meta?.changes ?? 0) > 0;

  if (!weCreated) {
    // already subscribed — hand back the existing code (idempotent).
    const row = await env.DB.prepare(
      "SELECT coupon_code FROM subscribers WHERE email = ?"
    )
      .bind(email)
      .first<{ coupon_code: string | null }>();
    if (row?.coupon_code) {
      const c = await env.DB.prepare(
        "SELECT percent FROM coupons WHERE code = ? AND active = 1"
      )
        .bind(row.coupon_code)
        .first<{ percent: number }>();
      if (c) return json({ subscribed: true, code: row.coupon_code, percent: c.percent });
    }
    return json({ subscribed: true });
  }

  // We own a brand-new subscriber row. Mint a welcome coupon if the offer is on.
  const enabled = (await getSetting(env, "welcome_enabled", "1")) === "1";
  if (!enabled) return json({ subscribed: true });

  // Brake against mass email-farming (a real fix needs email verification —
  // see CLOUDFLARE.md). Cap total welcome mints/day; over the cap we still
  // subscribe but skip the code (the shopper falls back to a manual ask).
  if (await isRateLimited(env, "global", "welcome-mint", 500, 86400)) {
    return json({ subscribed: true });
  }

  const percent = clampPct(await getSetting(env, "welcome_percent", "10"));
  // mint a unique single-use code (retry on the rare PK collision)
  let code = "";
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = randomCode();
    try {
      await env.DB.prepare(
        `INSERT INTO coupons (code, percent, kind, email, max_uses, used_count, active, created_at)
         VALUES (?, ?, 'welcome', ?, 1, 0, 1, ?)`
      )
        .bind(candidate, percent, email, now)
        .run();
      code = candidate;
      break;
    } catch {
      /* code already exists — try another */
    }
  }
  if (!code) return json({ subscribed: true }); // subscriber saved; no code this time

  await env.DB.prepare("UPDATE subscribers SET coupon_code = ? WHERE email = ?")
    .bind(code, email)
    .run();
  return json({ subscribed: true, code, percent });
}

// ---------- admin coupon CRUD (manager dashboard, JWT-protected) ----------
// Only manager coupons here — per-subscriber welcome codes are managed via the
// subscribers list, so they don't flood the editor.
async function listCoupons(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT code, percent, kind, email, max_uses, used_count, active, created_at, expires_at FROM coupons WHERE kind = 'manager' ORDER BY created_at DESC"
  ).all();
  return json({ coupons: results });
}

async function createCoupon(request: Request, env: Env): Promise<Response> {
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

  await env.DB.prepare(
    `INSERT INTO coupons (code, percent, kind, max_uses, used_count, active, created_at)
     VALUES (?, ?, 'manager', ?, 0, 1, ?)
     ON CONFLICT(code) DO UPDATE SET percent = excluded.percent, max_uses = excluded.max_uses, active = 1, kind = 'manager'`
  )
    .bind(code, percent, maxUses, new Date().toISOString())
    .run();

  return json({ ok: true, code, percent, maxUses });
}

async function deleteCoupon(env: Env, code: string): Promise<Response> {
  await env.DB.prepare("DELETE FROM coupons WHERE code = ?").bind(normCode(code)).run();
  return json({ ok: true });
}

// ---------- admin subscribers (JWT) ----------
async function listSubscribers(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT email, coupon_code, created_at FROM subscribers ORDER BY created_at DESC"
  ).all();
  return json({ subscribers: results });
}

async function deleteSubscriber(env: Env, email: string): Promise<Response> {
  await env.DB.prepare("DELETE FROM subscribers WHERE email = ?")
    .bind(String(email).trim().toLowerCase())
    .run();
  return json({ ok: true });
}

// ---------- admin settings: welcome-offer toggle + percent (JWT) ----------
async function getAdminSettings(env: Env): Promise<Response> {
  return json({
    welcomeEnabled: (await getSetting(env, "welcome_enabled", "1")) === "1",
    welcomePercent: clampPct(await getSetting(env, "welcome_percent", "10")),
  });
}

async function saveAdminSettings(request: Request, env: Env): Promise<Response> {
  let body: { welcomeEnabled?: boolean; welcomePercent?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "bad request" }, 400);
  }
  if (typeof body.welcomeEnabled === "boolean") {
    await setSetting(env, "welcome_enabled", body.welcomeEnabled ? "1" : "0");
  }
  if (body.welcomePercent !== undefined) {
    await setSetting(env, "welcome_percent", String(clampPct(body.welcomePercent)));
  }
  return getAdminSettings(env);
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname.startsWith("/api/")) {
      // public
      if (pathname === "/api/validate-coupon" && request.method === "POST") {
        return validateCoupon(request, env);
      }
      if (pathname === "/api/welcome" && request.method === "GET") {
        return welcomeInfo(env);
      }
      if (pathname === "/api/subscribe" && request.method === "POST") {
        return subscribe(request, env);
      }

      // admin (JWT)
      if (pathname.startsWith("/api/admin/")) {
        if (!(await requireAdmin(request, env))) return json({ error: "unauthorized" }, 401);

        if (pathname === "/api/admin/coupons" && request.method === "GET") {
          return listCoupons(env);
        }
        if (pathname === "/api/admin/coupons" && request.method === "POST") {
          return createCoupon(request, env);
        }
        if (pathname.startsWith("/api/admin/coupons/") && request.method === "DELETE") {
          const code = safeDecode(pathname.split("/").pop() || "");
          if (code === null) return json({ error: "bad request" }, 400);
          return deleteCoupon(env, code);
        }
        if (pathname === "/api/admin/subscribers" && request.method === "GET") {
          return listSubscribers(env);
        }
        if (pathname.startsWith("/api/admin/subscribers/") && request.method === "DELETE") {
          const email = safeDecode(pathname.split("/").pop() || "");
          if (email === null) return json({ error: "bad request" }, 400);
          return deleteSubscriber(env, email);
        }
        if (pathname === "/api/admin/settings" && request.method === "GET") {
          return getAdminSettings(env);
        }
        if (pathname === "/api/admin/settings" && request.method === "POST") {
          return saveAdminSettings(request, env);
        }
      }

      // TODO Phase 3: POST /api/checkout, POST /api/payment-webhook (consume single-use).
      return json({ error: "not found" }, 404);
    }

    // Not an API route -> static storefront (SPA fallback included).
    return env.ASSETS.fetch(request);
  },
};
