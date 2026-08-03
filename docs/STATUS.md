# Project status — where things stand

Last updated: **2026-08-03**. Single source of truth for what is done, what is
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

## 🔴 Blocking public launch (waiting on PayMe support — Daniel)

1. **Automatic invoices — iCount says ח.פ 511183279 "already in use".**
   Real sales currently produce **no tax document**. Until this is resolved an invoice
   must be issued manually for every order, so the site should not be promoted yet.
   Cost once enabled: ₪15/month + ₪0.30 per document.
2. **`payme_client_key`** — needed for API-driven refunds. *Not urgent*: refunds work
   today from PayMe's dashboard ("בטל מכירה והחזר כסף" on the transaction).

## 🟡 Answered — no longer open

- ~~Callback never arrives~~ → **sandbox doesn't send callbacks; production does.**
- ~~3DS not activating~~ → **active**; the live Apple Pay sale carried a 3DS badge.
- ~~payme_signature formula~~ → not sent to merchant accounts; irrelevant to us (we
  verify via the authenticated re-query, which is stronger).
- ~~Invoice pricing ₪0.3 vs ₪15~~ → **both** (₪15/mo + ₪0.30/doc).
- ~~Where is the production MPL~~ → live dashboard → **אדמין → API ואינטגרציה**
  (separate account from sandbox, separate key).

## ⚪ Deferred on purpose (post-launch)

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
