# לב התחביב — Lev Hatahbiv

Online storefront for a family-run art-supplies shop in Rehovot, Israel — open since 1985, rebuilt for the web in 2026. Fully Hebrew, fully RTL, ~2,450 products, real card payments.

**Live site:** [lev-hatahbiv.nivsasi.workers.dev](https://lev-hatahbiv.nivsasi.workers.dev)

![Lev Hatahbiv homepage](docs/screenshot-home.png)

## Why it's built the way it is

- **Static-first storefront.** The entire catalog is baked into the bundle at build time (MongoDB → dump → generator → `products.json` → Vite). Shoppers never wait on an API — pages are instant, and there's no server to fall over on the browse path.
- **Checkout that doesn't trust the client.** The cart calls a Cloudflare Worker that recomputes every total server-side in integer agorot from a build-time pricing snapshot, creates the order in D1, and hands off to a PayMe hosted payment page. The PayMe webhook — not the redirect — is the authoritative "paid" signal, with idempotent callback handling and single-use coupon consumption.
- **A real back office.** `/manage` is a JWT-protected manager dashboard: product CRUD, bulk operations (sale/hide/stock/price ±%), CSV import/export, S3 image uploads, and a one-click "publish" that rebuilds and redeploys the site.
- **Hand-made design system.** No UI framework — the "Atelier" theme is hand-written CSS: paper texture, sticker cards, marker highlights, paint splats. Products without photos get parametric SVG illustrations generated per category.
- **Watchdog.** GitHub Actions cron pings the site and API every 15 minutes and alerts via Telegram/email when something breaks.

## Architecture

```
MongoDB (inventory master)
   │  dump-products.js → generate-catalog.mjs
   ▼
Static SPA (Preact + TypeScript + Vite)
   │  served by
   ▼
Cloudflare Workers ── /api/checkout ──► PayMe (hosted payment page)
   │        │                              │
   │        ▼                              ▼
   │     D1 (orders, coupons)  ◄── webhook (authoritative "paid")
   ▼
Admin dashboard (/manage) ──► Node/Express API (Render) ──► MongoDB + S3
```

## Docs

| Doc | What's in it |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | How everything connects, env-var inventory, danger zones |
| [DEPLOY.md](DEPLOY.md) | Shipping every kind of change, secrets, rollback |
| [CLOUDFLARE.md](CLOUDFLARE.md) | Workers, D1, build pipeline |
| [PAYMENTS.md](PAYMENTS.md) | PayMe integration, webhook flow, test matrix |

## Stack

Preact + TypeScript + Vite · Cloudflare Workers + D1 · Node.js/Express + MongoDB · AWS S3 · PayMe · GitHub Actions

## Running locally

```bash
cd Frontend
npm install
npm run dev        # vite dev server on port 3000
npm run build      # production build
npx tsc --noEmit   # type check
```

The public storefront runs standalone — no backend needed for local development.
