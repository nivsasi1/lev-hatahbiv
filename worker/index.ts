/**
 * Cloudflare Worker — lev-hatahbiv dynamic API (Phase 2).
 *
 * The SAME Cloudflare project serves the static storefront (Frontend/dist via the
 * `ASSETS` binding) AND these /api/* endpoints. Requests to /api/* run here;
 * everything else falls through to the static assets (with SPA fallback).
 *
 * NOT YET ACTIVE — this file is a scaffold. To turn it on, see CLOUDFLARE.md
 * "Phase 2", which boils down to adding to wrangler.jsonc:
 *   "main": "worker/index.ts",
 *   "assets": { "directory": "./Frontend/dist", "binding": "ASSETS",
 *               "not_found_handling": "single-page-application" },
 *   "kv_namespaces": [{ "binding": "COUPONS", "id": "<wrangler kv namespace create COUPONS>" }]
 * and seeding a coupon:
 *   npx wrangler kv key put --binding=COUPONS SUMMER '{"percent":10}'
 *
 * Why a Worker (vs the baked client-side coupon list): the codes stay
 * server-side (not visible in the bundle), validation is live (no publish), and
 * it opens the door to single-use / per-user codes (see the note at the bottom).
 *
 * Types: `npm i -D @cloudflare/workers-types` (Fetcher / KVNamespace / etc.).
 */

export interface Env {
  /** the static storefront (Frontend/dist) — bound automatically with assets */
  ASSETS: Fetcher;
  /** coupon store: KEY = code (UPPERCASE), VALUE = JSON `{ "percent": number }` */
  COUPONS: KVNamespace;
  /** optional: per-IP rate-limit counters. If unbound, rate limiting is skipped. */
  RL?: KVNamespace;
}

type CouponRecord = { percent: number };

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

/**
 * Crude per-IP rate limit using KV counters — enough to stop coupon-code
 * brute-forcing / spam. For strict limits use Cloudflare's rate-limiting binding
 * or a Durable Object (KV counters are eventually consistent).
 */
async function isRateLimited(
  env: Env,
  ip: string,
  route: string,
  max = 20,
  windowSec = 60
): Promise<boolean> {
  if (!env.RL) return false; // no RL namespace bound → don't rate limit
  const key = `rl:${route}:${ip}`;
  const current = parseInt((await env.RL.get(key)) ?? "0", 10);
  if (current >= max) return true;
  await env.RL.put(key, String(current + 1), { expirationTtl: windowSec });
  return false;
}

/** POST /api/validate-coupon  { code }  ->  { valid, code?, percent? } */
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

  const code = String(body.code ?? "").trim().toUpperCase();
  if (!code) return json({ valid: false, error: "missing code" }, 400);

  const raw = await env.COUPONS.get(code);
  if (!raw) return json({ valid: false }); // unknown code — never reveal which exist

  let coupon: CouponRecord;
  try {
    coupon = JSON.parse(raw) as CouponRecord;
  } catch {
    return json({ valid: false });
  }

  const percent = Math.min(Math.max(Math.round(coupon.percent) || 0, 1), 100);
  return json({ valid: true, code, percent });
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      if (url.pathname === "/api/validate-coupon" && request.method === "POST") {
        return validateCoupon(request, env);
      }
      return json({ error: "not found" }, 404);
    }

    // Not an API route → hand off to the static storefront (SPA fallback included).
    return env.ASSETS.fetch(request);
  },
};

/*
 * NEXT STEPS (for study / later):
 * - Single-use / per-user: record "used" coupon+order in D1 (a row + transaction)
 *   or a Durable Object; KV alone can't guarantee exactly-once.
 * - Admin write path: an authenticated POST /api/coupons (JWT-checked) so the
 *   dashboard writes coupons to KV directly — then no rebuild/publish for coupons.
 * - Payments: POST /api/checkout (create session w/ secret key) +
 *   POST /api/payment-webhook (verify signature, store order in D1).
 */
