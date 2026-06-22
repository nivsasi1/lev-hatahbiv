# Payments — Grow (Meshulam) integration plan

Status: **decided on Grow, percentage plan. Not built yet.** This is the research +
plan to execute **after** you sign up and receive your Grow API credentials.

## Why Grow (recap)

- **Stripe is out** — Israel is not a supported country for opening a Stripe
  merchant account / payouts to an Israeli bank ([stripe.com/global](https://stripe.com/global),
  [Stripe: open account in another country](https://support.stripe.com/questions/requirements-to-open-a-stripe-account-in-another-country)). Workarounds (US entity via Atlas) add tax/legal/FX burden — not worth it for a small shop.
- **Grow fits**: open to עוסק פטור/מורשה, supports cards + Apple Pay + Google Pay
  (+ Bit/PayBox as free bonuses), hosted checkout, webhooks, auto VAT invoices, and
  works with a serverless backend. ([grow.business/fees](https://grow.business/fees/), [Grow API/devs](https://grow.business/api-developers/))

## Pricing we're taking (pay-per-transaction)

- **1.4% + ₪1 per transaction**, tier 0–5,000 ₪/month, **no setup fee, no monthly fee**
  ([grow.business/fees](https://grow.business/fees/), seen 2026-06). Digital wallets (Apple/Google Pay, Bit) are the **same** 1.4% + ₪1.
- Worked cost at our scale:
  - ₪100 order → 1.4% (₪1.40) + ₪1 = **₪2.40** (2.4%).
  - ₪200 order → ₪2.80 + ₪1 = **₪3.80** (1.9%).
  - ~₪10k/month (say ~60 orders avg ₪165) → ~₪140 (1.4%) + ₪60 (fixed) ≈ **₪200/mo (~2.0%)**.
- There's also a promo **0.6% + ₪59/month** plan — ignore it for now (monthly fee; only
  wins above ~₪7–8k/month). Revisit once volume is steady. ([pay-as-you-grow](https://grow.business/pay-as-you-grow/))

## How Grow's API works (the parts we use)

### 1. Create payment (server-side) — Light API
- Endpoint: `POST /api/light/server/1.0/createPaymentProcess/`
  - Sandbox: `https://sandbox.meshulam.co.il`
  - Production: `https://secure.meshulam.co.il` (some docs show `api.meshulam.co.il` — **confirm the exact prod host in your dashboard**)
- **Form-encoded** body (NOT JSON), **server-side only** (uses secret creds).
- Credentials (from Grow at setup): **`userId`**, **`pageCode`**, and **`apiKey`** (for multi-business).
- Request (typical fields — **confirm exact names against the live ref/Postman**): `sum` (ILS, decimal), `description`, `successUrl`, `cancelUrl`, `pageField[fullName/phone/email]`, custom field(s) to carry **our order id**, optional installments.
- Response: `{ status, data: { url, processId, processToken } }` → **redirect the customer to `data.url`** (Grow's hosted page). ([createPaymentProcess ref](https://grow-il.readme.io/reference/post_api-light-server-1-0-createpaymentprocess-8))

### 2. Finalize / verify — `approveTransaction`
- After payment, call `approveTransaction` (and/or `getPaymentProcessInfo`) server→Grow with `processId`/`processToken` to **confirm the transaction + amount**. Treat this as the source of truth, not the browser redirect. ([server response](https://grow-il.readme.io/reference/server-response-1))

### 3. Webhook (server-to-server callback) → our DB
- **Enabled via Grow support** (you ask them to turn on webhooks + set your callback URL). ([webhooks](https://grow-il.readme.io/docs/overview-7))
- Payload includes: `webhookKey` (your shared secret — **verify it matches**), `transactionId`/`transactionCode`, `paymentSum`, `paymentDate`, `asmachta` (reference), payer name/phone/email, card suffix/brand, `status`, and our custom order id.
- **Auth is a shared key, not an HMAC signature** → so we ALSO re-verify via `approveTransaction` before trusting it.
- Separate **invoice webhook**: transaction code + **invoice number + invoice URL**.

### 4. Invoices (חשבונית)
- Grow auto-issues a VAT invoice/receipt (חשבונית מס/קבלה) when the invoicing module is
  enabled on the account, and pushes the **invoice number + PDF URL** via the invoice webhook.
- **Action at signup:** make sure the **invoice/document module is enabled** on your plan
  (confirm it's included or what it costs).

## How it maps onto OUR architecture (Workers + D1 + static SPA)

This is a near-perfect fit — no always-on server needed.

```
Shopper (static SPA)                Cloudflare Worker (/api/*)            Grow
  cart → "שלם בכרטיס"  ── POST /api/checkout ─▶ recompute totals (server),
                                               re-validate coupon,
                                               INSERT order (status 'new') in D1,
                                               createPaymentProcess ───────────▶ returns hosted URL
                       ◀── { url } ────────────  store processId on order
  redirect to Grow hosted page ───────────────────────────────────────────────▶ customer pays
                                                                                 │
  ◀───────── redirect to /thank-you?order=ID (successUrl) ◀──────────────────────┘
                                               Grow webhook ──▶ POST /api/payment-webhook:
                                                 verify webhookKey,
                                                 approveTransaction (confirm sum),
                                                 mark order 'paid' + payment_ref + invoice URL,
                                                 CONSUME single-use coupon (used_count++),
                                                 return 200
  /thank-you polls /api/order-status?id=ID until 'paid'
```

- The **webhook is authoritative** for "paid" (the browser redirect can be lost/closed).
- Money stays in **agorot (int)** in D1; convert to ILS decimal only for the Grow `sum`.

## What to get / enable at signup (checklist)

- [ ] עוסק details + Israeli bank account for payouts.
- [ ] **Light API access** → receive `userId`, `pageCode`, `apiKey`.
- [ ] **Sandbox credentials** (test before live).
- [ ] **Webhooks enabled** (ask support) + set our callback URL + a **`webhookKey`** (secret).
- [ ] **Invoice/document module enabled** (so VAT invoices auto-issue).
- [ ] Turn on **Apple Pay / Google Pay / Bit** on the payment page (bonus, same fee).
- [ ] Confirm the exact **production base URL** + exact request/response field names (Postman collection: [grow documentation](https://www.postman.com/grey-resonance-944181/documantaion/collection/7afnyaz/grow-documentation)).

## Build plan (after you have credentials)

**Phase 0 — config**
- Add Worker secrets: `GROW_USER_ID`, `GROW_PAGE_CODE`, `GROW_API_KEY`, `GROW_WEBHOOK_KEY`, `GROW_BASE_URL` (sandbox first).
- D1 migration (additive `ALTER TABLE orders ADD COLUMN ...`): `process_id`, `invoice_number`, `invoice_url`, `payer_email`, `payer_name`, `payer_phone`. (`orders` table + `payment_ref` already exist.)

**Phase 1 — `POST /api/checkout`** (worker)
- Input: cart items + delivery + coupon code.
- **Recompute** subtotal/discount/total server-side (never trust client amounts); re-validate the coupon via the existing D1 logic.
- INSERT order (`status:'new'`, agorot), call `createPaymentProcess` (form-encoded, ILS), store `processId`, return `{ url }`.

**Phase 2 — `POST /api/payment-webhook`** (worker)
- Verify `webhookKey === GROW_WEBHOOK_KEY`; look up the order by our id.
- `approveTransaction` to confirm the amount matches the order total.
- **Idempotent**: if already `paid`, return 200 and stop. Else set `status:'paid'`, `payment_ref`, invoice fields; **consume the coupon** (`used_count++`) once.

**Phase 3 — frontend** ([CartPage.tsx](Frontend/src/pages/CartPage.tsx))
- Replace the disabled "💳 תשלום מאובטח באתר — בקרוב" button with a real **"שלם בכרטיס"** that POSTs `/api/checkout` then `window.location = url`.
- Add `/thank-you` (success) + keep WhatsApp/phone as fallback; `/cart` stays the cancel target.

**Phase 4 — invoices**
- Store invoice number/URL from the invoice webhook on the order; show/email it to the customer + surface it in the dashboard orders tab.

**Phase 5 — test (sandbox) → go live**
- Sandbox matrix: success, cancel, failed card, duplicate webhook (idempotency), coupon consumed once, invoice issued, amount-mismatch rejected.
- Flip secrets to production creds, set the live webhook URL, do one small real transaction, then enable for shoppers.

## Security checklist

- Credentials only as **wrangler secrets** (never in code/repo).
- **createPaymentProcess is server-side only** (creds never reach the browser).
- Verify the webhook `webhookKey` **and** re-confirm via `approveTransaction` (shared key ≠ signature).
- **Idempotent** webhook handling (Grow may retry) — guard on order status.
- Recompute amounts server-side; reject if Grow's confirmed sum ≠ our order total.
- Consume single-use coupons exactly once, on payment success only.

## Open items to confirm against the docs/Postman after signup

- Exact production base host (`secure.` vs `api.meshulam.co.il`).
- Exact `createPaymentProcess` request field names + the custom-field used to carry our order id.
- Whether `approveTransaction` is required or `getPaymentProcessInfo` suffices.
- Invoice module: included in the percentage plan or extra?
- Webhook retry/idempotency behavior + exact invoice-webhook fields.

## Sources
- [grow.business/fees](https://grow.business/fees/) · [grow.business/api-developers](https://grow.business/api-developers/) · [pay-as-you-grow](https://grow.business/pay-as-you-grow/)
- [Grow dev docs](https://grow-il.readme.io/) · [Webhooks](https://grow-il.readme.io/docs/overview-7) · [createPaymentProcess ref](https://grow-il.readme.io/reference/post_api-light-server-1-0-createpaymentprocess-8) · [server callback](https://grow-il.readme.io/reference/server-response)
- [Stripe global](https://stripe.com/global) · [Stripe account-country reqs](https://support.stripe.com/questions/requirements-to-open-a-stripe-account-in-another-country)
