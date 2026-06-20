# Cloudflare migration — status, setup & plan

## Status
- ✅ **Phase 1 — storefront on Cloudflare (LIVE, test URL):**
  `https://lev-hatahbiv.nivsasi.workers.dev` — static SPA on Cloudflare Workers
  (Static Assets), edge-served, ~0ms cold start, never sleeps.
- ✅ **Phase 2 — dynamic API on D1 (Worker live + frontend wired):**
  `worker/index.ts` serves `/api/*` from **D1**: coupon validation, manager
  coupon CRUD (JWT), the newsletter welcome offer (`/api/welcome` +
  `/api/subscribe`, mints a per-email single-use code), and the subscriber list
  (`/api/admin/subscribers`). Per-IP rate limiting throughout. The storefront
  (checkout + signup dialog), the dashboard coupon editor, the subscribers tab
  and the admin bell all call the Worker now. The old baked/Mongo coupon
  pipeline was **removed**. Coupons + the welcome offer are live instantly (no
  publish).
- Unchanged: the **real domain / DNS still points at Render**, and the
  **products/orders/publish API is still on Render** (`VITE_API_URL`). Next step
  is the cut-over — merge to `main`, make Cloudflare the storefront host, retire
  the Render front. (Card payments + DNS-from-Wix come later.)

## Architecture (where things run)
- **Cloudflare Pages/Workers Static Assets** = the built storefront (`Frontend/dist`).
- **Cloudflare Worker** (`worker/index.ts`, Phase 2) = the `/api/*` dynamic
  endpoints (coupons now, payments later). Same project serves both: `/api/*`
  hits the Worker, everything else falls through to the static assets.
- **MongoDB** = inventory master; products are **baked at build time** (so product
  changes still need a "publish"/rebuild — that's the right trade-off).
- **Cloudflare D1** = coupons, subscribers, the welcome-offer settings (live now);
  orders + payments later. One SQL DB for everything dynamic ("same tech").

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
7. **After editing `worker/index.ts` or the schema, redeploy:** `npx wrangler deploy`.
   When the schema changes (e.g. the `settings` table), first re-run
   `npx wrangler d1 execute lev --remote --file=worker/schema.sql` (it's idempotent —
   `CREATE TABLE IF NOT EXISTS` + `INSERT OR IGNORE`).

**API surface (all live):**
- Public: `POST /api/validate-coupon`, `GET /api/welcome`, `POST /api/subscribe`.
- Admin (JWT): `GET/POST /api/admin/coupons`, `DELETE /api/admin/coupons/:code`,
  `GET /api/admin/subscribers`, `DELETE /api/admin/subscribers/:email`,
  `GET/POST /api/admin/settings` (welcome toggle + percent).

**Frontend wiring (done):** the storefront calls the Worker at `WORKER_API`
(`/api`, same origin) — see `Frontend/src/data/api.ts`. Welcome codes are
single-use per email, idempotent (same email → same code); manager coupons
support a max-uses cap. The welcome offer percent/toggle is set in the dashboard
(D1 `settings`), not baked.

## Phase 3 — payments (after a provider is chosen)
Add Worker endpoints: `POST /api/checkout` (create the payment session with the
secret key) + `POST /api/payment-webhook` (receive the provider's confirmation;
store the order in D1, optionally mirror to Mongo). Rate-limited. No always-on
server needed.

## What stays the same
MongoDB = inventory master; the dashboard product CRUD; the build pipeline
(dump-products → generate-catalog → vite build).
