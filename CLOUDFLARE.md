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

## Phase 2 — activating the coupon Worker (`worker/index.ts` + `worker/schema.sql`)
Coupons + orders live in **D1** (one SQL DB — the "same tech for easier fixes"
choice). Single-use is consumed on **payment success** (Phase 3); until card
payments exist, welcome codes validate but aren't auto-consumed, so you honor
them manually (exactly like today).

1. Dev deps (once): `npm i -D wrangler @cloudflare/workers-types`.
2. Create the DB: `npx wrangler d1 create lev` → copy the `database_id`.
3. Create the tables: `npx wrangler d1 execute lev --remote --file=worker/schema.sql`.
4. In `wrangler.jsonc`: set `"main": "worker/index.ts"`, add `"binding": "ASSETS"`
   inside `"assets"`, and add:
   ```jsonc
   "d1_databases": [{ "binding": "DB", "database_name": "lev", "database_id": "<id>" }]
   ```
5. Share the admin token so the existing dashboard login works here:
   `npx wrangler secret put ADMIN_JWT_SECRET` → paste the **same value as the
   backend's JWT `SECRET`** (copy it from Render's env vars).
6. `npx wrangler deploy`.
7. Frontend wiring (next code step): checkout → `POST /api/validate-coupon`;
   dashboard coupon editor → `/api/admin/coupons` (GET/POST/DELETE); then retire
   the baked-Mongo coupon list.

**Implemented now:** `POST /api/validate-coupon`, `GET/POST/DELETE /api/admin/coupons`
(JWT). Per-IP **rate limiting** is built in (D1 fixed window). Welcome-coupon
generation (`POST /api/subscribe`) is stubbed pending the code-format decision.

## Phase 3 — payments (after a provider is chosen)
Add Worker endpoints: `POST /api/checkout` (create the payment session with the
secret key) + `POST /api/payment-webhook` (receive the provider's confirmation;
store the order in D1, optionally mirror to Mongo). Rate-limited. No always-on
server needed.

## What stays the same
MongoDB = inventory master; the dashboard product CRUD; the build pipeline
(dump-products → generate-catalog → vite build).
