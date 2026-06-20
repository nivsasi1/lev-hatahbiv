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

// ---------- admin coupon CRUD (manager dashboard, JWT-protected) ----------
async function listCoupons(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT code, percent, kind, email, max_uses, used_count, active, created_at, expires_at FROM coupons ORDER BY created_at DESC"
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
     ON CONFLICT(code) DO UPDATE SET percent = excluded.percent, max_uses = excluded.max_uses, active = 1`
  )
    .bind(code, percent, maxUses, new Date().toISOString())
    .run();

  return json({ ok: true, code, percent, maxUses });
}

async function deleteCoupon(env: Env, code: string): Promise<Response> {
  await env.DB.prepare("DELETE FROM coupons WHERE code = ?").bind(normCode(code)).run();
  return json({ ok: true });
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
          return deleteCoupon(env, decodeURIComponent(pathname.split("/").pop() || ""));
        }
      }

      // TODO Phase 2: POST /api/subscribe -> generate welcome coupon (format TBD).
      // TODO Phase 3: POST /api/checkout, POST /api/payment-webhook (consume single-use).
      return json({ error: "not found" }, 404);
    }

    // Not an API route -> static storefront (SPA fallback included).
    return env.ASSETS.fetch(request);
  },
};
