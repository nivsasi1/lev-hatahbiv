# Cloudflare migration — status, setup & plan

## Status
- ✅ **Phase 1 — storefront on Cloudflare (LIVE, test URL):**
  `https://lev-hatahbiv.nivsasi.workers.dev` — static SPA on Cloudflare Workers
  (Static Assets), edge-served, ~0ms cold start, never sleeps.
- 🧱 **Phase 2 — dynamic API (scaffolded, not yet activated):** `worker/index.ts`
  (coupon validation + rate limiting). Needs a KV namespace + wrangler wiring.
- Unchanged: the **real domain / DNS still points at Render**, and the
  **dashboard API is still on Render** (`VITE_API_URL`). Cloudflare is a parallel
  test deploy until Phase 2 is done.

## Architecture (where things run)
- **Cloudflare Pages/Workers Static Assets** = the built storefront (`Frontend/dist`).
- **Cloudflare Worker** (`worker/index.ts`, Phase 2) = the `/api/*` dynamic
  endpoints (coupons now, payments later). Same project serves both: `/api/*`
  hits the Worker, everything else falls through to the static assets.
- **MongoDB** = inventory master; products are **baked at build time** (so product
  changes still need a "publish"/rebuild — that's the right trade-off).
- **Cloudflare KV** = coupon data (Phase 2). **D1** = orders (later).

## Phase 1 setup (how it's deployed — for reference)
Cloudflare → Workers → connected to `github.com/nivsasi1/lev-hatahbiv`:
- **`wrangler.jsonc`** (repo root) — assets-only config:
  `assets.directory = ./Frontend/dist`, `not_found_handling: "single-page-application"`.
- **Production branch:** `main`.
- **Build command:**
  `cd Backend && npm ci --omit=dev && node dump-products.js && cd ../Frontend && npm ci && node scripts/generate-catalog.mjs && npm run build`
- **Deploy command:** `npx wrangler deploy`  ← **upload + activate**.
  (`npx wrangler versions upload` only *uploads* a version without making it live —
  that's for the non-production/preview branches.)
- **Build variables and secrets** (available *during the build*):
  - `DB_URL` = the **Atlas** string, **encrypted** (the build bakes the catalog from it)
  - `VITE_API_URL` = `https://lev-hatahbiv-api.onrender.com`
  - `VITE_GA_ID` = optional

### Lessons learned (so we don't repeat them)
1. **`wrangler deploy` = upload + activate**; `wrangler versions upload` = upload only.
2. **`assets.directory` must be the *built* output** (`Frontend/dist`), not the
   source folder — otherwise it serves `index.html` with `/src/main.tsx`.
3. **SPA fallback on Workers = `not_found_handling: "single-page-application"`**,
   NOT a `_redirects` file (Workers rejects `/* → /index.html` as a loop).

## Does "publish" go away? (only partly)
Storefront is still static → **product/price changes still need a rebuild
("publish")**. What's gone: the 30–60s cold start. What Phase 2 removes: publish
**for coupons** (validated live by the Worker → instant, hidden, single-use-able).

## Phase 2 — activating the coupon Worker (`worker/index.ts`)
1. Install dev deps (once): `npm i -D wrangler @cloudflare/workers-types`.
2. Create the KV namespace: `npx wrangler kv namespace create COUPONS`
   (and copy the returned `id`).
3. Add to `wrangler.jsonc`:
   ```jsonc
   "main": "worker/index.ts",
   "assets": { "directory": "./Frontend/dist", "binding": "ASSETS",
               "not_found_handling": "single-page-application" },
   "kv_namespaces": [{ "binding": "COUPONS", "id": "<the id from step 2>" }]
   ```
   (optional rate-limit counters: a second namespace bound as `RL`).
4. Seed a coupon: `npx wrangler kv key put --binding=COUPONS SUMMER '{"percent":10}'`.
5. Deploy, then point the storefront's checkout at `POST /api/validate-coupon`
   instead of the baked `findCoupon()` (so codes are hidden + server-validated).
6. **Rate limiting** is built into the Worker (per-IP, KV-based). For *strict*
   single-use coupons, move the "used" check to **D1** or a **Durable Object**
   (KV is eventually consistent — fine for lookups, not for exactly-once).

## Phase 3 — payments (after a provider is chosen)
Add Worker endpoints: `POST /api/checkout` (create the payment session with the
secret key) + `POST /api/payment-webhook` (receive the provider's confirmation;
store the order in D1, optionally mirror to Mongo). Rate-limited. No always-on
server needed.

## What stays the same
MongoDB = inventory master; the dashboard product CRUD; the build pipeline
(dump-products → generate-catalog → vite build).
