# Go-live checklist — PayMe payments

Status 2026-08-03: sandbox integration COMPLETE and tested end-to-end (real sandbox
payment settled, order marked paid). Branch `payme`. This file is the remaining path
to taking real money.

## 1. Before flipping the switch

- [ ] **Production MPL key** — dashboard (the live one, not sandbox) → **אדמין → API
      ואינטגרציה** (or הגדרות → API). It is a different `MPL...` value from the sandbox
      key Daniel emailed. Sandbox and production are separate accounts.
- [ ] **Confirm the account's linked site was moved off Wix** to
      `https://lev-hatahbiv.nivsasi.workers.dev` (Daniel passed this to their tech team —
      get confirmation, a stale linked site can get live sales flagged).
- [ ] **3DS** — registered (₪100 setup + ~₪2.50/txn, only fires above ₪499 / foreign
      cards / >3 installments). Confirm it is ACTIVE before the first real sale.
- [ ] **Invoices** — blocked on the iCount "ח.פ already in use" issue (see the support
      message). Not launch-blocking: without it `sale_invoice_url` stays empty and orders
      still settle, but no tax document is issued automatically.
- [ ] Merge `payme` → `main` so main is the source of truth.

## 1b. Custom domain (lev-hatahbiv.com) — planned after launch

**No code change needed.** `sale_callback_url` / `sale_return_url` / `cancel_url` are all
built from `new URL(request.url).origin`, so they follow whatever domain serves the Worker.
Attach the domain in Cloudflare (Workers & Pages → lev-hatahbiv → Settings → Domains &
Routes) and the payment URLs adapt automatically. Both domains can serve the Worker at once.

The ONLY external dependency: PayMe links a site URL to the account (moving off the Wix
site took their tech team 1–2 business days), so **tell PayMe BEFORE the switch** and ask
whether prior approval is required — it is asked in the support message.

## 2. The switch (in this order)

```bash
# 1. point the worker at production
#    edit wrangler.jsonc: "PAYME_BASE_URL": "https://live.payme.io/api"

# 2. deploy FIRST (secrets can't be edited while a version is undeployed)
npx wrangler deploy

# 3. overwrite the seller key with the PRODUCTION MPL (paste at the prompt, alone)
npx wrangler secret put PAYME_SELLER_ID

# 4. confirm
npx wrangler secret list
```

## 3. Immediately after — one small REAL purchase

- [ ] Buy the cheapest item (~₪3–12) with a real card, delivery = pickup.
- [ ] Confirm the order lands in D1 as `paid` with `payment_ref` populated.
- [ ] Confirm it appears in the manager dashboard (`/manage` → orders).
- [ ] **This is also the first time Bit / Apple Pay / Google Pay appear** — they have no
      sandbox. Check the hosted page shows them (Apple Pay needs Safari, Google Pay needs
      Chrome on Android).
- [ ] Refund that purchase to test the refund path — **needs `payme_client_key` first**.

## 4. Deferred until after launch (deliberate)

- [ ] **Remove the payer form from the cart** and read buyer details from
      `get-transactions` (`sale_buyer_details`: buyer_name / buyer_email / buyer_phone)
      instead. Keep the SHIPPING ADDRESS form — PayMe never collects that.
      **Why after launch:** right now the callback is not arriving, so the cart form is
      our only guaranteed source of buyer contact details. Removing it before the callback
      works could leave paid orders with no name or phone. Do it once the callback is
      confirmed working, then re-run the checkout tests.
- [ ] Tighten `probePayMeSale` back to requiring `verdict === "paid"` on the callback path
      once the `get-transactions` shape is fully confirmed (it currently treats an
      unreadable re-query as non-blocking — see the TODO in worker/index.ts).
- [ ] Wire refunds into the dashboard (`refund-sale`) once `payme_client_key` arrives.
- [ ] Consider installments (`installments: "103"/"106"/"112"`) — a conversion lever for
      bigger baskets; note >3 installments auto-triggers 3DS.

## Safety nets already in place

Payment settles through THREE independent paths, so no single failure hides a paid order:
1. PayMe callback → `/api/payme-callback`
2. `/thank-you` polling → order-status self-heal
3. **Cron every 15 min** → `reconcilePendingOrders` re-queries any unsettled order (<24h)
