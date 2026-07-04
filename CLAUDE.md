# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Start with [ARCHITECTURE.md](ARCHITECTURE.md)** (how everything connects, env-var inventory, danger zone) **and [DEPLOY.md](DEPLOY.md)** (how to ship every kind of change, secrets tables, rollback) — they are the authoritative deep docs; this file is the short version.

## Project Overview

"לב התחביב" (Lev Hatahbiv) — a Hebrew (RTL) art-supplies store site for a family shop in Rehovot, open since 1985. The site was rebuilt in 2026 as a **standalone static SPA**: Vite + Preact + TypeScript in `Frontend/`, with no server dependency.

The local MongoDB (`LevHatahbivDB`, see `Backend/.env`) is the inventory master. The **public storefront stays static** — `Backend/dump-products.js` exports Mongo to `products-dump.json`, `Frontend/scripts/generate-catalog.mjs` turns that into `Frontend/src/data/products.json`, and `vite build` bakes it in. The shopper never talks to a server.

`Backend/` also hosts the **manager dashboard API** (`node server.js`, port **5001** — 5000 belongs to an unrelated local project). `routes/admin/admin.js` exposes JWT-protected CRUD: login (env `ADMIN_USER`/`ADMIN_PASS`), create/edit/delete products, toggle `isActive` (hide from site) and `isAvailable` (sold-out, shown greyed), set `salePercentage`, image upload (S3 when AWS keys configured, local fallback), `POST /admin/products/bulk` (multi-id sale/show/hide/stock/price-±%/delete), `POST /admin/products/import` (CSV rows, dedup by name), `POST /admin/upload-batch` (many images, returns original→stored name map), and `POST /admin/publish` (deploy-hook in cloud, local pipeline otherwise). The dashboard UI lives at `/manage` (`pages/AdminPage.tsx`, token in sessionStorage): checkbox multi-select with a bulk bar, CSV import/export (RFC4180 parser in the page; empty category/sub/third cells inherit from the previous row), product duplication, and datalist autocomplete for category/sub/series with a warning when typing a category the site doesn't know. The legacy passport/session code in `server.js` predates this and is unused — its old `NODE_ENV=production` static-serving block was removed because it swallowed every GET on Render.

Product photos resolve in this order: full URL → used as-is; `/uploads/...` → local; otherwise S3 filename (`levhatahbiv.s3.eu-north-1.amazonaws.com/images/`). The generator skips `visible:false`/`isActive:false` rows, keeps sold-out rows with `soldOut:true`, and prefers manager-set `salePercentage` over legacy Wix `discountValue`.

There are no tests or linters configured. `npx tsc --noEmit` in `Frontend/` is the type gate (`vite build` does not type-check).

## Commands

```
cd Frontend
npm install
npm run dev             # vite dev server on port 3000
npm run build           # production build (target: chrome70)
npx tsc --noEmit        # type check
```

## Architecture

Preact masquerading as React: `tsconfig.json` aliases `react`/`react-dom` to `preact/compat` and sets `jsxImportSource: "preact"`; `@preact/preset-vite` does the same at runtime. Import hooks from `"react"` — they resolve to preact.

Everything lives in `Frontend/src`:

- **`data/catalog.ts` is the runtime source of truth** — it imports the generated `data/products.json` (do not hand-edit that file; re-run the generator), maps rows to `Product`s, and owns the category definitions, store info (address/phone/hours), free-shipping threshold, and search/lookup helpers. Each category has a `color`/`soft` pair that drives per-category theming via CSS custom properties (`--cc`, `--pc`, `--chip`, etc.) set inline on components, plus a fallback `art` kind.
- **Product visuals**: `ProductThumb` renders the S3 photo when `img` exists and falls back to the category's parametric SVG illustration (`components/ProductArt.tsx`) when there's no photo **or the photo 404s** (`onError` state). Category pages paginate (24 at a time) — the paints shelf alone has ~900 products.
- **`context/cart-context.tsx`** — `useReducer`-free simple cart (`items`, `add`, `setQty`, `remove`), persisted to localStorage under `"lh-cart-v2"`, plus the slide-over sheet open state. `add()` auto-opens the sheet.
- **Checkout is card payments via PayMe** (no WhatsApp flow): the cart POSTs `/api/checkout` to the Cloudflare Worker, which recomputes totals server-side from the baked `checkout-pricing.json` (never trusts client prices, integer agorot everywhere), creates a D1 order + a PayMe hosted-page sale, and redirects the shopper. The PayMe webhook (`/api/payme-callback`) is the authoritative "paid" — it also consumes single-use coupons. `/thank-you` just polls `/api/order-status`. Full flow: ARCHITECTURE.md §4.
- **Routes** (`App.tsx`): `/`, `/category/:slug`, `/product/:id`, `/cart`, all under a single `Layout` (Header + Footer + CartSheet + scroll-to-top).

## Design system

All styling is hand-written CSS in `src/App.css` ("Atelier" theme): warm paper background, ink (#2b2440) borders with hard offset shadows, brand purple #5b2d8e + ribbon red from the logo, Amatic SC for display Hebrew (`.display` class) and Assistant for body. Signature elements: rotated "sticker" cards, marker-highlight (`.hl`), paint splats (`components/Splat.tsx`), scribble dividers, marquee ribbon.

**Rendering pitfalls discovered the hard way** (do not reintroduce):
- No SVG `feTurbulence`/filter data-URIs in CSS backgrounds — it froze Chrome's screenshot/compositing pipeline. The paper grain is plain radial-gradient speckle.
- No `mix-blend-mode` on product images — same freeze. Photos get a white `.photo` frame instead.

RTL: `index.html` sets `dir="rtl"`; physical CSS properties are used throughout. Hebrew strings live inline in components and in the catalog.
