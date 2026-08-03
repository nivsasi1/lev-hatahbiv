# DEPLOY — לב התחביב

How to ship every kind of change, where every secret lives, and what breaks if
you get it wrong. Architecture context: [ARCHITECTURE.md](ARCHITECTURE.md).

## Current hosting state (the honest paragraph)

The Cloudflare project (`lev-hatahbiv`) serves the full production stack —
static storefront + `/api/*` Worker + D1 — at
`https://lev-hatahbiv.nivsasi.workers.dev`. The **shop's real domain still
points at Render's static site** (`lev-hatahbiv.onrender.com`); the cut-over
(DNS → Cloudflare, retire the Render static front) is the remaining hosting
step. The Render **API** (`lev-hatahbiv-api.onrender.com`) stays either way —
it's the manager dashboard's product/publish backend, not a shopper service.
Payments run through the Worker, so card checkout works wherever the Worker
origin serves the site.

## What changed → what to deploy

| You changed | Deploy action |
|---|---|
| Products/prices/photos in the dashboard | Dashboard "פרסום" button (or `POST /admin/publish`) — rebuilds the static site with a fresh catalog |
| Frontend code (`Frontend/src/**`) | push to `main` → Cloudflare + Render builds run automatically |
| Worker code (`worker/index.ts`) | push to `main` (Cloudflare deploy command runs `wrangler deploy`) — or manually: `npx wrangler deploy` |
| D1 schema (`worker/schema.sql`) | `npx wrangler d1 execute lev --remote --file=worker/schema.sql` (idempotent) **then** deploy the Worker |
| Backend code (`Backend/**`) | push to `main` → Render auto-deploys `lev-hatahbiv-api` |
| A secret | see the tables below — set it where it lives, then redeploy that service |
| Watchdog (`monitor/**`, workflows) | push to `main`; nothing else (cron picks it up) |

**Every push to `main` = production deploys on both hosts.** Branch first if
you don't mean it.

## 1. Storefront ("publish")

The build is identical everywhere:

```
cd Backend  && npm ci --omit=dev && node dump-products.js
cd ../Frontend && npm ci && node scripts/generate-catalog.mjs && npm run build
```

- **From the dashboard**: the "פרסום" button calls `POST /admin/publish` on the
  Render API → fires the static site's deploy hook. This is how the owner ships
  product changes; no git involved.
- **From git**: any push to `main` triggers the same build on Cloudflare
  (deploy command: `npx wrangler deploy` — upload **and** activate) and on Render.
- Build-time env: `DB_URL` (Atlas — the build bakes the catalog from it),
  `VITE_API_URL` = `https://lev-hatahbiv-api.onrender.com`, optional `VITE_GA_ID`.
- The build also emits **`checkout-pricing.json`** into `dist` — the Worker
  reads it for authoritative checkout prices. A stale storefront = stale
  prices at checkout, which is exactly why price changes require a publish.

Before pushing frontend changes: `cd Frontend && npx tsc --noEmit`
(vite build won't catch type errors).

## 2. Worker + D1

```
npx wrangler deploy                 # code changes (upload + activate)
npx wrangler d1 execute lev --remote --file=worker/schema.sql   # schema first
npx wrangler secret put <NAME>      # secrets (triggers a new version)
npx wrangler tail                   # live logs while testing
```

- `wrangler versions upload` only uploads (preview) — it does NOT go live.
- Schema changes must be **additive** (SQLite; the file is `CREATE TABLE IF NOT
  EXISTS` + `INSERT OR IGNORE`). For new columns on live tables: `ALTER TABLE
  ... ADD COLUMN`, run once, ignore "duplicate column" errors.
- D1 database: `lev`, id `b319d68e-ce60-4e79-9395-46744b015160` (bound as `DB`).

### Worker secrets

| Secret | What / where it comes from |
|---|---|
| `ADMIN_JWT_SECRET` | **must equal** Render's `SECRET` — login happens on Render, the JWT is verified here |
| `GROW_USER_ID` | Grow (Meshulam) Light API user id — issued by Grow support/integration (not self-service), separate value per environment |
| `GROW_PAGE_CODE` | Grow payment-page code (Wallet, or standard redirect as fallback) — issued alongside `GROW_USER_ID` |
| `GROW_WEBHOOK_KEY` | our own secret (generate: any long random string), embedded in `notifyUrl`/`invoiceNotifyUrl` to authenticate Grow's callbacks. Rotate = set new secret + redeploy (in-flight payments created with the old URL will fail the key check — rotate in a quiet hour) |

`GROW_BASE_URL` is a **var** in [wrangler.jsonc](wrangler.jsonc), not a secret —
defaults to the sandbox (`https://sandbox.meshulam.co.il/api/light/server/1.0`);
the production base arrives with the live credentials.

## 3. Render API

- Blueprint: [render.yaml](render.yaml). Push to `main` → auto-deploy.
  Free tier: sleeps after ~15 min idle, wakes in 30–60s (the watchdog's 15-min
  ping keeps it warm most of the time).
- Env vars (Render → lev-hatahbiv-api → Environment): `DB_URL`, `SECRET`,
  `ADMIN_USER`, `ADMIN_PASS`, `DEPLOY_HOOK_URL` (the static site's deploy hook —
  powers "פרסום"), `S3_BUCKET`=levhatahbiv, `S3_REGION`=eu-north-1,
  `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `MANAGER_EMAIL`, `SMTP_USER`,
  `SMTP_PASS` (Gmail app password — same pair the watchdog uses).
- Changing `SECRET` invalidates dashboard logins **and** must be mirrored to the
  Worker's `ADMIN_JWT_SECRET`, or the coupons/orders tabs will 401.

## 4. Grow — go-live switch (sandbox → production)

1. Sandbox test matrix (rerun after any checkout/callback change; test cards in
   PAYMENTS.md — ⚠️ Bit / Apple Pay / Google Pay have no sandbox): success,
   decline, duplicate callback (idempotency), forged callback (wrong
   processToken/sum rejected), bad `?key=` rejected (403), coupon consumed
   exactly once.
2. Hand the working sandbox integration to Grow for review — **production
   credentials are only issued after it**.
3. `npx wrangler secret put GROW_USER_ID` / `GROW_PAGE_CODE` — the
   **production** values.
4. Set the production `GROW_BASE_URL` in wrangler.jsonc (arrives with the live
   creds — `secure.meshulam.co.il`), then `npx wrangler deploy`.
5. One small real transaction end-to-end: pay → `/thank-you` flips to "paid" →
   order shows in the dashboard with `payment_ref` (+ `invoiceNumber` once the
   invoice callback lands) → coupon `used_count` bumped → refund from Grow's
   dashboard and mark the order `refunded` in ours.

## 5. Watchdog

Cron workflows under `.github/workflows/` run automatically once on `main`.
Secrets (GitHub → Settings → Secrets → Actions): `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_CHAT_ID`, `SMTP_USER`, `SMTP_PASS`. Channel test: Actions → watchdog →
Run workflow → check "שלח הודעת בדיקה". Full setup: [monitor/README.md](monitor/README.md).
If the site URL ever changes (e.g. DNS cut-over), update `SITE_URL` defaults in
`monitor/*.mjs`.

## 6. Verify after deploying (2 minutes)

1. Load the site → homepage renders, category → subcategory → product cards show.
2. `/api/welcome` returns JSON (Worker alive), coupon field accepts a known code.
3. Cart → fill payer details → "💳 תשלום מאובטח בכרטיס" opens Grow's payment
   page/wallet (sandbox: pay with a test card and watch `/thank-you` flip to paid).
4. Dashboard `/manage`: products load (Render), orders/coupons load (Worker).
5. Or just wait ≤15 min — the watchdog checks 1–2 automatically.

## Rollback

- **Storefront/Worker (Cloudflare)**: Workers dashboard → Deployments → roll
  back to the previous version (instant). Or `git revert` + push.
- **Render API**: Render dashboard → Deploys → Rollback.
- **Catalog data**: the catalog is baked, so a bad publish is fixed by fixing
  Mongo (dashboard) and publishing again — there's no "old catalog" to restore.
- **D1**: no automatic snapshots on our plan — schema changes are additive by
  policy, and destructive data fixes should be done as reversible UPDATEs
  (status flips), never DELETEs.

## Deploy-time danger corners

- `assets.directory` must stay `./Frontend/dist` (the *built* output) — pointing
  it at source serves raw `index.html` with `/src/main.tsx`.
- SPA fallback on Workers = `not_found_handling: "single-page-application"`;
  a `_redirects` file does NOT work there (Workers rejects the `/*` loop).
  On Render it's the `routes: rewrite /* → /index.html` block in render.yaml.
- The old `NODE_ENV=production` static-serving block in `Backend/server.js` was
  removed because it swallowed every GET on Render. Don't bring it back.
- Cloudflare build secrets are *build-time* (`DB_URL` bakes the catalog);
  Worker secrets are *runtime* (`wrangler secret put`). Different stores —
  setting one does not set the other.
- After changing `worker/schema.sql`, remember BOTH steps: execute the SQL on
  the remote D1, then `wrangler deploy` the code that uses it.
