# ARCHITECTURE — לב התחביב

How the whole system fits together. Read this before touching anything.
Companion doc: [DEPLOY.md](DEPLOY.md) (how to ship changes, env vars, secrets).
Deep-dives that predate this doc and remain useful: [CLOUDFLARE.md](CLOUDFLARE.md)
(migration history + lessons), [PAYMENTS.md](PAYMENTS.md) (PayMe research + API details).

## The one-paragraph version

A Hebrew (RTL) art-supplies storefront for a family shop in Rehovot. The public
site is a **static SPA** (Vite + Preact + TS) with the entire product catalog
**baked in at build time** from MongoDB. Everything dynamic — coupons, newsletter,
**card payments (PayMe)**, orders — runs on a **Cloudflare Worker + D1** at
`/api/*` on the same origin. A separate Express API on Render serves only the
**manager dashboard** (product CRUD, image upload, publish). Shoppers pay by card
on PayMe's hosted page; there is no WhatsApp checkout.

## System map

```
                        ┌────────────────────────────────────────────┐
                        │  Cloudflare (one project: "lev-hatahbiv")  │
  Shopper ──────────────▶  Static Assets (Frontend/dist)             │
                        │   └─ SPA fallback, catalog baked in        │
                        │  Worker (worker/index.ts)  /api/*          │
                        │   └─ D1 "lev": coupons, orders,            │
                        │      subscribers, settings, rate_limits    │──▶ PayMe
                        └────────────────────────────────────────────┘   (hosted
                                                                          payment
  Manager ──▶ /manage (same SPA) ──┬──▶ Worker /api/admin/* (coupons,     page +
                                   │    orders, subscribers, settings)    webhook)
                                   └──▶ Render API (products CRUD,
                                        images→S3, CSV import, publish)
                                              │
                                              ▼
                                   MongoDB Atlas (inventory master)
                                              │  build-time only
                                              ▼
                        dump-products.js → generate-catalog.mjs → vite build
```

## The golden rule

**The storefront is static; the catalog is baked.** Product/price changes go
Mongo → rebuild ("publish") → new static deploy. The shopper's browser never
queries a database for products. Anything that must be live-instant (coupons,
welcome offer, order status) lives in the Worker + D1 instead. When adding a
feature, first decide which side it belongs to — baked or live.

## Components

### 1. Frontend SPA — `Frontend/`

- Preact masquerading as React: `react`/`react-dom` alias to `preact/compat`
  (tsconfig + `@preact/preset-vite`). Import hooks from `"react"`.
- **`src/data/catalog.ts` is the runtime source of truth**: imports the generated
  `data/products.json` (never hand-edit), owns category definitions (9 slugs:
  paints, hobby, drawing, brushes, paper, easels, craft, fiber, jewelry), store
  info, free-shipping threshold, search helpers. Per-category theming via CSS
  custom props (`--cc`, `--pc`, `--chip`).
- Routes (`App.tsx`): `/`, `/category/:slug` (subcategory tiles), 
  `/category/:slug/:sub` (product grid, `a.p-card`, 24/page), `/product/:id`,
  `/cart`, `/sale`, `/thank-you`, `/manage` (dashboard), legal pages, `/designs*`
  (owner design previews — temporary).
- Product photos: full URL → as-is; `/uploads/...` → Render-local; otherwise S3
  (`levhatahbiv.s3.eu-north-1.amazonaws.com/images/`). Missing/404 photo → falls
  back to the category's parametric SVG (`ProductArt.tsx`).
- Cart (`context/cart-context.tsx`): localStorage `"lh-cart-v2"`, slide-over sheet.
- Styling: hand-written `App.css` ("Atelier" theme), Amatic SC display + Assistant
  body, RTL via `dir="rtl"` and physical properties.

### 2. Catalog build pipeline (Mongo → static)

```
Backend/dump-products.js      reads Atlas (DB_URL) → Backend/products-dump.json
                                                   → Backend/settings-dump.json
Frontend/scripts/generate-catalog.mjs →
   src/data/products.json      (the baked catalog; skips visible:false /
                                isActive:false, keeps sold-out w/ soldOut:true,
                                manager salePercentage wins over legacy Wix
                                discountValue, isNew within 14 days)
   src/data/settings.json      (site settings, e.g. shelf images)
   public/checkout-pricing.json  ← CRITICAL: authoritative prices for the
                                payment Worker (see §4). Ships as a static asset.
vite build                     → Frontend/dist (target chrome70; does NOT type-check)
```

Type gate: `cd Frontend && npx tsc --noEmit`. There are no tests or linters.

### 3. Cloudflare Worker + D1 — `worker/`

One Cloudflare project serves both: `/api/*` hits the Worker, everything else
falls through to static assets (`not_found_handling: "single-page-application"`).
Storage is D1 (`worker/schema.sql`), queried via Drizzle (`worker/db/schema.ts`).
Per-IP fixed-window rate limiting (D1 `rate_limits`) on all public endpoints.

| Endpoint | What |
|---|---|
| `POST /api/validate-coupon` | live coupon check; failures are a vague `{valid:false}` (never reveals codes) |
| `GET /api/welcome` | welcome-offer toggle+percent for the signup dialog |
| `POST /api/subscribe` | newsletter signup; mints ONE single-use welcome coupon per email (atomic claim on the PK, idempotent, 500/day global mint cap) |
| `POST /api/checkout` | **card checkout** — see §4 |
| `POST /api/payme-callback?key=…` | PayMe webhook (authoritative "paid") |
| `GET /api/order-status?id=…` | `/thank-you` polls this; returns status only |
| `/api/admin/*` (JWT) | coupons CRUD, subscribers, settings, **orders list + status PATCH** |

Admin JWT: HS256 verified with Web Crypto; **`ADMIN_JWT_SECRET` must equal the
Render backend's `SECRET`** — login happens on Render, the token works on both.
Tokens must carry `exp` (enforced).

### 4. Payments — PayMe (the checkout)

Money is **integer agorot everywhere** (D1, PayMe, cart math) — no floats.
The cart page mirrors the Worker's math exactly (discount rounded to the
10-agorot grid) so the shown total equals the charged total.

```
Cart "💳 תשלום מאובטח בכרטיס"
  → POST /api/checkout {items:[{id,qty}], delivery, couponCode?}
      Worker: recompute totals from /checkout-pricing.json (NEVER trusts client
      prices), re-validate coupon in D1, INSERT order status:'new',
      PayMe generate-sale (sale_price in agorot, transaction_id = order uuid,
      sale_payment_method:"multi" → card+Bit+Apple/Google Pay,
      sale_callback_url = /api/payme-callback?key=WEBHOOK_KEY,
      sale_return_url = /thank-you?order=ID)
  ← { url } → browser redirects to PayMe's hosted page (no card data on our site)
PayMe webhook → /api/payme-callback: constant-time key check, load order by
      transaction_id, verify price == order.total, then mark 'paid'
      + store payment_ref/invoice_url/payer fields + CONSUME the coupon
      (used_count++, exactly once — idempotent via status guard).
      refund/chargeback notifications flip status to 'refunded' even after paid.
Browser lands on /thank-you?order=ID → polls /api/order-status until 'paid'.
      The webhook is authoritative; the redirect is just UX.
```

Order lifecycle: `new → paid | failed`, then `refunded / handled / cancelled`
(manager can PATCH via the dashboard orders tab). Minimum charge ₪5 (PayMe rule).
Env switch: `PAYME_BASE_URL` sandbox `https://sandbox.payme.io/api` ↔ production
`https://live.payme.io/api` (see DEPLOY.md → PayMe go-live).

### 5. Render API (manager dashboard only) — `Backend/`

Express on port **5001** locally (5000 belongs to an unrelated project);
`lev-hatahbiv-api` on Render. JWT-protected `/admin/*`: login
(`ADMIN_USER`/`ADMIN_PASS`), product CRUD, `isActive` (hide) / `isAvailable`
(sold-out) toggles, `salePercentage`, image upload (S3, local fallback),
`/admin/products/bulk`, `/admin/products/import` (CSV; empty category cells
inherit from the previous row), `/admin/upload-batch`, `/admin/settings`
(shelf images etc.), and **`POST /admin/publish`** — triggers the static-site
rebuild via deploy hook.
Legacy: passport/session code in `server.js`, the `/order` newsletter-route
endpoint and its `helpers/notify.js` caller predate the Worker and are unused.
Shopper traffic never hits Render.
**Known gap**: a paid D1 order does NOT push a notification to the manager —
he sees it via the dashboard bell (`AdminBell.tsx` polls the Worker) and the
orders tab. If orders shouldn't wait for a dashboard visit, add a notify call
to the payment webhook.

### 6. Dashboard — `/manage` (`Frontend/src/pages/adminpage/`)

Same SPA, token in sessionStorage (`lh-admin-jwt`). Talks to **both** APIs:
products/publish/uploads → Render; coupons/orders/subscribers/welcome-settings →
Worker. Checkbox multi-select + bulk bar, CSV import/export (RFC4180 parser in
the page), product duplication, datalist autocomplete for category/sub/series.

### 7. Watchdog — `monitor/` + `.github/workflows/watchdog*.yml`

"שומר-חנות": 15-min pulse (site up, catalog bundle sane, API alive), daily
Chromium deep-check (products actually render, no console errors), Friday weekly
digest. Alerts to a Telegram group + email on state change only. Setup + details:
[monitor/README.md](monitor/README.md).

## Env vars & secrets — complete inventory

Values live in [DEPLOY.md](DEPLOY.md) tables (where to set each). Names only here:

- **Cloudflare Worker secrets**: `ADMIN_JWT_SECRET`, `PAYME_SELLER_ID`,
  `PAYME_WEBHOOK_KEY`, `PAYME_BASE_URL` (optional; defaults to sandbox).
- **Cloudflare build vars**: `DB_URL` (Atlas, encrypted), `VITE_API_URL`,
  `VITE_GA_ID` (optional).
- **Render (lev-hatahbiv-api)**: `DB_URL`, `SECRET` (JWT — must match
  `ADMIN_JWT_SECRET`), `ADMIN_USER`, `ADMIN_PASS`, `DEPLOY_HOOK_URL`,
  `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  `MANAGER_EMAIL`, `SMTP_USER`, `SMTP_PASS` (+ legacy `MANAGER_WHATSAPP`,
  `CALLMEBOT_APIKEY` — unused).
- **GitHub Actions (watchdog)**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
  `SMTP_USER`, `SMTP_PASS`, optional `ALERT_EMAILS`.
- **Local `Backend/.env`**: mirrors Render + `WIX_API_KEY` (migration tooling).

## Danger zone — learned the hard way, do not reintroduce

1. **No SVG `feTurbulence`/filter data-URIs in CSS** and **no `mix-blend-mode`
   on product images** — both froze Chrome's compositing/screenshot pipeline.
   Paper grain is plain radial-gradient speckle; photos get a white `.photo` frame.
2. **Never hand-edit `src/data/products.json`** — regenerate via the pipeline.
3. **Never trust client prices.** All checkout math goes through
   `checkout-pricing.json` + `computeCart` in the Worker. If you change cart
   math on one side, change the mirror (CartPage ↔ worker) identically.
4. **`wrangler deploy` = upload + activate; `wrangler versions upload` = upload
   only.** `assets.directory` must point at the *built* `Frontend/dist`.
5. **Every push to `main` triggers production builds** (Cloudflare, Render).
   Don't commit state files or experiments to main casually.
6. **The webhook must stay idempotent** (PayMe retries): status guard before
   marking paid, coupon consumed exactly once, refund handled before the guard.
7. **Port 5001** for the local backend, not 5000.
8. **`vite build` does not type-check** — run `npx tsc --noEmit` yourself.
9. Coupons: never reveal whether a code exists; welcome mint is atomic on the
   subscriber PK (don't "check-then-insert").
10. GitHub disables cron workflows after 60 days of repo inactivity — the
    weekly watchdog digest detects and reports this.

## Directory map

```
Frontend/            the SPA (see §1); scripts/generate-catalog.mjs = bake step
worker/              Cloudflare Worker API + D1 schema + Drizzle schema
Backend/             Render dashboard API + dump-products.js + notify helper
monitor/             watchdog scripts (GitHub Actions runs them)
migration/           Wix → Mongo sync toolchain (inventory import; WIX_API_KEY)
docs/specs/          design specs (per-feature decision records)
wrangler.jsonc       the Cloudflare project (assets + worker + D1 binding)
render.yaml          the Render blueprint (api + static site — legacy host)
```
