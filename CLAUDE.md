# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"לב התחביב" (Lev Hatahbiv) — a Hebrew (RTL) art-supplies store site for a family shop in Rehovot, open since 1985. The site was rebuilt in 2026 as a **standalone static SPA**: Vite + Preact + TypeScript in `Frontend/`, with no server dependency.

`Backend/` contains the legacy Express + Mongo API from the previous version of the site. **Nothing in the current frontend calls it at runtime.** The local MongoDB (`LevHatahbivDB`, see `Backend/.env`) is still the inventory master: `Backend/dump-products.js` exports it to `products-dump.json`, and `Frontend/scripts/generate-catalog.mjs` turns that into `Frontend/src/data/products.json` (~1,800 products). Re-run both to refresh inventory:

```
cd Backend  && node dump-products.js
cd Frontend && node scripts/generate-catalog.mjs
```

Product photos are served from the store's S3 bucket (`levhatahbiv.s3.eu-north-1.amazonaws.com/images/`); the generator keeps only the first of semicolon-separated filenames, skips invisible/unavailable/uncategorized rows, and converts `discountValue` to `salePrice`.

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
- **Checkout is intentionally serverless**: the cart page composes a WhatsApp message (`wa.me/<store.phoneIntl>`) with the order lines + delivery choice; phone/email are the fallbacks. There is no payment processing.
- **Routes** (`App.tsx`): `/`, `/category/:slug`, `/product/:id`, `/cart`, all under a single `Layout` (Header + Footer + CartSheet + scroll-to-top).

## Design system

All styling is hand-written CSS in `src/App.css` ("Atelier" theme): warm paper background, ink (#2b2440) borders with hard offset shadows, brand purple #5b2d8e + ribbon red from the logo, Amatic SC for display Hebrew (`.display` class) and Assistant for body. Signature elements: rotated "sticker" cards, marker-highlight (`.hl`), paint splats (`components/Splat.tsx`), scribble dividers, marquee ribbon.

**Rendering pitfalls discovered the hard way** (do not reintroduce):
- No SVG `feTurbulence`/filter data-URIs in CSS backgrounds — it froze Chrome's screenshot/compositing pipeline. The paper grain is plain radial-gradient speckle.
- No `mix-blend-mode` on product images — same freeze. Photos get a white `.photo` frame instead.

RTL: `index.html` sets `dir="rtl"`; physical CSS properties are used throughout. Hebrew strings live inline in components and in the catalog.
