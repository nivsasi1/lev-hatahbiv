# Moving to Cloudflare — plan & settings

Goal: free, fast, never-sleeps storefront + serverless functions for the few
"secret" tasks (coupon validation, payments) — **no paid always-on server**.

## Mental model (important)
- **Cloudflare Pages** = hosts STATIC files (our built storefront). It does NOT
  run our Express server.
- **Cloudflare Workers / Pages Functions** = small serverless functions, ~0ms
  cold start, billed per request (not 24/7). This is how we get secure
  server-side logic WITHOUT a paid always-on box.
- Our current backend is **Express + MongoDB (Mongoose)**. That stack does NOT
  lift-and-shift onto Workers (Workers aren't Node; the Mongo driver needs TCP
  the Workers runtime doesn't give it the normal way). So the backend is a
  *rewrite*, not a copy — see Phase 2.

## Does "publish" go away? (partly)
- The storefront stays **static** — the product catalog is still **baked at
  build time** from Mongo. So **product/price changes still need a rebuild
  ("publish")**. That's the right trade-off (≈900 products load instantly, free).
- What changes: **no more 30–60s cold start** (Pages/Workers are instant), and
  anything we move to a Worker (coupons, payments) is **live — no publish**,
  codes **hidden**, and **single-use / per-user** becomes possible.

## Phase 1 — Storefront on Cloudflare Pages (safe, do first)
Connect the GitHub repo in the Cloudflare dashboard → Pages → with:
- **Build command:**
  `cd Backend && npm ci --omit=dev && node dump-products.js && cd ../Frontend && npm ci && node scripts/generate-catalog.mjs && npm run build`
- **Build output directory:** `Frontend/dist`
- **Root directory:** `/`
- **Environment variables:**
  - `DB_URL` = the **Atlas** connection string (the build reads products from it;
    NOT the local `mongodb://127.0.0.1` one — Cloudflare's builder can't reach
    your laptop)
  - `VITE_API_URL` = the backend/Worker URL (see Phase 2)
  - `VITE_GA_ID` = optional GA4 id
- SPA deep links handled by `Frontend/public/_redirects` (already added).
- "publish" = trigger a Pages **Deploy Hook** (same idea as the Render hook).

## Phase 2 — Workers for the dynamic bits (after Phase 1 + payment provider chosen)
Add Pages Functions (Workers) for ONLY the public dynamic endpoints:
- `POST /api/validate-coupon` → checks code, returns discount (codes stay
  server-side; supports single-use / per-user).
- `POST /api/checkout` + `POST /api/payment-webhook` → create the payment
  session with the secret key + receive the provider's confirmation.
- **Rate limiting** on these (per-IP) so they can't be abused/brute-forced.
- **Data store decision (NEEDED):** where does coupon/order data live for the
  Worker? Options:
  1. Cloudflare **KV** (coupons) / **D1** (orders) — native to Workers, simplest.
  2. Keep **Mongo** and have the Worker call the existing Express backend.
- Mongo stays the **inventory master** (products), baked at build — unchanged.

## What stays the same
- MongoDB = inventory master; dashboard product CRUD; the build pipeline
  (dump-products → generate-catalog → vite build).
