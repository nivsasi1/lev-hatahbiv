# Project status — where things stand

Last updated: **2026-08-22**. Single source of truth for what is done, what is
waiting, and what is deliberately deferred. Deep detail lives in
[PAYMENTS.md](../PAYMENTS.md), [ARCHITECTURE.md](../ARCHITECTURE.md),
[DEPLOY.md](../DEPLOY.md) and [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md).

## 🟢 LIVE — the shop can take real money

PayMe is integrated, in **production**, and proven with a real purchase.

- **First real sale: 2026-08-03, ₪6.00, paid with Apple Pay, 3DS applied.**
  Order settled `paid` with `payment_ref = TRAN1785-...`, verified in D1.
- Payments: credit card + **Apple Pay** (confirmed live) + Google Pay + Bit (installed
  on the account; no sandbox exists for any of them, so live is their only test).
- Settlement is redundant by design — three independent paths, so no single failure
  can hide a paid order:
  1. PayMe server-to-server callback → `/api/payme-callback`
  2. `/thank-you` polling → order-status self-heal
  3. **Cron every 15 min** → `reconcilePendingOrders`
- Every settle path requires an affirmative `get-transactions` "paid" verdict from
  PayMe. The callback is a trigger, never proof.

## 🔴 Blocking — the merchant account is registered to the WRONG ENTITY

PayMe (2026-08-03) revealed the clearing account was opened under **עוסק מורשה
213070220 — Niv's personal ID — not the company ח.פ 511183279 (לב התחביב בע"מ).**

Why it matters: every shekel customers pay, and every tax document, is currently
attributed to a private individual rather than the business. That is an
accounting/tax problem, not a code problem — **involve the bookkeeper/accountant.**
Nothing in this repo changes because of it, but it should be fixed before real
volume accumulates under the wrong entity.

Open questions with PayMe: can the existing account be re-registered to the ח.פ or
must a new one be opened; **does the MPL key change** (if so we re-run
`wrangler secret put PAYME_SELLER_ID`); what happens to transactions already made;
does clearing keep working during the switch.

Also noted by PayMe: ח.פ 511183279 is already linked to three of their accounts
(one closed, two active **Wix** ones) — leftovers from the old site, worth closing.

⚠️ **Rotate the MPL.** The production seller key was sent by email and pasted into a
chat transcript. It can create sales on the account and read transaction history
(customer names, emails, phones, card masks). Ask PayMe to reissue it — ideally
folded into the entity change above — then `npx wrangler secret put PAYME_SELLER_ID`.

## 🟡 Answered — no longer open

- ~~Automatic invoices~~ → **dropped on purpose (2026-08-03).** The shop already issues
  an invoice by hand per order and encloses it with the shipment, so the iCount module
  is not needed. Saves ₪15/month + ₪0.30/document. Revisit only if order volume makes
  manual invoicing painful.
- ~~`payme_client_key` for refunds~~ → **not required.** PayMe confirmed the API accepts
  the MPL alone, so `refund-sale` can be wired whenever we want it.

- ~~Callback never arrives~~ → **sandbox doesn't send callbacks; production does.**
- ~~3DS not activating~~ → **active**; the live Apple Pay sale carried a 3DS badge.
- ~~payme_signature formula~~ → not sent to merchant accounts; irrelevant to us (we
  verify via the authenticated re-query, which is stronger).
- ~~Invoice pricing ₪0.3 vs ₪15~~ → **both** (₪15/mo + ₪0.30/doc).
- ~~Where is the production MPL~~ → live dashboard → **אדמין → API ואינטגרציה**
  (separate account from sandbox, separate key).

## 🟢 Catalog — final Wix sync done (2026-08-22)

Atlas (the inventory master — the local Mongo is an empty dev instance) now matches the
Wix catalog: 15 price fixes, 3 sold-out flags, 1 rename, 4 new products. Backup
collection `products_backup_2026_08_22` stays until the live site is confirmed. Wix is
frozen; all product edits go through /manage. Details + the placeholder-price oddity:
[LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md#final-product-sync--the-freeze-decided-2026-08-22).

## ⚪ Deferred on purpose (post-launch)

- **SEO migration — keep the #1 ranking + sitelinks after the domain cutover.** Full plan in
  [SEO-MIGRATION.md](SEO-MIGRATION.md). Phase 0 + **Phase 1 DONE and LIVE on workers.dev
  (2026-08-22)**: 301 layer for all ~3,000 Wix URLs (sweep: 3,037 redirected, 27 gone,
  0 leaks), sitemap/robots, per-route titles + JSON-LD, slugged shelf URLs, real 404s.
  Cutover day: set `CANONICAL_HOST`, re-run `npm run check:redirects -- https://www.lev-hatahbiv.com`,
  submit the sitemap in Search Console (Phase 2 = Search Console + GBP checks).

- **Remove the payer form from the cart** and read buyer details from
  `get-transactions` (`sale_buyer_details`). Keep the SHIPPING ADDRESS form — PayMe
  never collects it. Now unblocked (the callback works), but do it after invoices are
  sorted, then re-run the checkout tests.
- **Custom domain `lev-hatahbiv.com`.** No code change needed — the callback/return
  URLs derive from the request origin. Only external dependency: tell PayMe first
  (updating the account's linked site took their team 1–2 business days last time).
- Wire refunds into the dashboard once `payme_client_key` arrives.
- Consider installments (`installments: "103"/"106"/"112"`) for larger baskets;
  note >3 installments auto-triggers 3DS (₪2.50/txn).
- Delete the `?debug=1` probe on `/api/order-status` once things are stable (it needs
  the order's unguessable uuid and leaks nothing secret, but it is a diagnostic).

## 🪤 Traps already hit — don't re-learn these

- **Manual deploys ship a LOCAL build.** Cloudflare's build variables (`VITE_API_URL`)
  do NOT apply, so the dashboard once pointed at `localhost:5001`. Now committed in
  `Frontend/.env.production`. After any build:
  `grep -ro "localhost:5001" Frontend/dist/assets/ | wc -l` must be `0`.
- **`wrangler secret put` fails while a version is undeployed.** Always
  `npx wrangler deploy` FIRST, then set secrets.
- **`ADMIN_JWT_SECRET` (Cloudflare) must equal `SECRET` (Render)** exactly, or the
  dashboard's orders tab silently shows nothing. It now surfaces the error instead.
- **PayMe transposes an id**: `payme_sale_id` in generate-sale/callback vs
  `sale_payme_id` in get-transactions. The amount is `transaction_price` (agorot).
- **Cloudflare's GitHub auto-build stopped firing** (last ~2026-07-01). Every deploy is
  manual: `npm --prefix Frontend run build` then `npx wrangler deploy`. Worth fixing in
  the Cloudflare dashboard → Workers & Pages → lev-hatahbiv → Builds.

## Secrets inventory (names only — values never in the repo)

| Where | Name | Must equal |
|---|---|---|
| Cloudflare | `PAYME_SELLER_ID` | the **production** MPL key |
| Cloudflare | `PAYME_WEBHOOK_KEY` | any long random string |
| Cloudflare | `ADMIN_JWT_SECRET` | Render's `SECRET` |
| Render | `SECRET`, `ADMIN_USER`, `ADMIN_PASS`, AWS/S3, SMTP | — |

⚠️ The exposed Render `SECRET` from earlier in development should still be rotated
(rotate on Render, then re-run `wrangler secret put ADMIN_JWT_SECRET` with the new value).
