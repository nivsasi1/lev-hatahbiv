# Payments — PayMe integration plan

Status: **decided on PayMe** (we already had a PayMe link from the Wix site). Not built
yet. This is the research + plan to execute **after** the Sandbox account is ready.
(Earlier we evaluated Grow/Meshulam; superseded by PayMe.)

## Why PayMe fits us well

- **Already onboarded** — the business has a PayMe relationship from Wix, so no new KYC from scratch.
- **Hosted payment page** (`generate-sale` → `sale_url`) → **no card data touches our site** (no PCI burden), works perfectly from a serverless Worker.
- **Prices are in agורot (integer)** — matches our D1 `orders` table exactly, so **no float conversion** (a real plus vs Grow).
- **Real webhook signature** (`payme_signature`) for verifying callbacks — stronger than a shared key.
- Supports cards + Apple Pay + Google Pay + Bit + installments.

## What PayMe sent us

- Full API docs: <https://docs.payme.io> (mirror <https://payme.stoplight.io>) — **JS-rendered; view in a browser**.
- Sandbox signup: `https://www1.paid.co.il/system/kyc/signup/63badadbc55f75004a8eb326`
- Test cards: <https://payme.stoplight.io/docs/payments/v781p5enpoq9x-test-cards-and-payment-methods>
- Env switch: in the dashboard, click the name top-left → white bar = Test, green bar = Production.
- Webhooks: set `sale_callback_url` in the `generate-sale` call to get real-time status; **PayMe recommends the callback as the primary confirmation mechanism.**
- Tech questions: partners@payme.io
- ⚠️ **Account site update:** moving Wix → standalone requires PayMe to update the site linked to the account (their tech team, 1–2 business days). **Give them our new site URL.**

## How the API works (the parts we use)

### Environments (confirmed in the docs)
- Sandbox/test: `https://sandbox.payme.io/api/`
- Production: `https://live.payme.io/api/`
- Requests are **JSON** (`Content-Type: application/json`). The returned hosted
  `sale_url` lives on `*.paymeservice.com/sale/generate/...` — that's PayMe's page.

### 1. Create a sale (server-side) — `generate-sale`  (confirmed)
- `POST {base}/generate-sale` (JSON), from the Worker with secret credentials.
- Request fields: `seller_payme_id` (our private key/seller id), `sale_price`
  (**agorot, integer; minimum 500 = ₪5**), `currency` `"ILS"`, `product_name`
  (≤500 chars, shown on the invoice), `transaction_id` (**our D1 order id**, ≤50),
  `sale_callback_url` (our webhook), `sale_return_url` (browser redirect),
  `sale_payment_method` (**use `"multi"`** → one page with card + Bit + Apple Pay +
  Google Pay, per enabled services; or `"credit-card"`), `installments` (`"1"`, or
  `"103/106/109/112"` for an up-to range), `language` `"he"`, optional buyer fields
  + `items[]`. (`market_fee` is a marketplace thing — omit for a single seller.)
- Response: `status_code` (0 ok), `sale_url` (**hosted page → redirect the shopper**),
  `payme_sale_id`, `payme_sale_code`, `price`, `transaction_id`.

### 2. Webhook (server-to-server) → our DB  ← primary confirmation  (confirmed)
- PayMe POSTs to our `sale_callback_url` as **`x-www-form-urlencoded`**.
- `notify_type` values: `sale-complete` (paid), `sale-authorized`, `refund`,
  `sale-failure`, `sale-chargeback`, `sale-chargeback-refund`.
- Attributes we use: `notify_type`, `sale_status` (`completed`), `transaction_id`
  (our order id), `price` (agorot), `currency`, `payme_sale_id`,
  `payme_transaction_id` (→ our `payment_ref`), `payme_signature` (MD5),
  `sale_invoice_url` (the PDF, if the invoices module is on), `buyer_key` (token,
  only if `capture_buyer` was set), buyer name/email/phone.
- **How we verify (the signature formula isn't published):** match `transaction_id`
  to our order, confirm `price == order total` + `currency`, then **re-query PayMe
  server-side** (List Sales / get sale by `payme_sale_id`) to confirm
  `sale_status == completed` — that round-trip uses our seller key and can't be
  spoofed. (Also verify `payme_signature` once we get the exact formula from
  partners@payme.io.) Only then mark the order paid.

### 3. Browser return — `sale_return_url`
- PayMe redirects the shopper back to our `/thank-you` after payment. **Not authoritative** (can be lost/closed) — the webhook is the source of truth.

### 4. Refunds
- A refund endpoint exists (confirm exact name, e.g. `refund-sale` / via `get-sales`) — wire later for the dashboard.

## How it maps onto OUR architecture (Workers + D1 + static SPA)

```
Shopper (static SPA)              Cloudflare Worker (/api/*)                 PayMe
 cart → "שלם בכרטיס" ─ POST /api/checkout ─▶ recompute totals (agorot),
                                            re-validate coupon,
                                            INSERT order 'new' in D1,
                                            generate-sale (sale_callback_url=our hook,
                                              sale_return_url=/thank-you,
                                              transaction_id=order id) ──────▶ returns sale_url
                     ◀── { url } ───────────  store payme_sale_id on order
 redirect to PayMe hosted sale_url ───────────────────────────────────────▶ shopper pays
                                                                            │
 ◀──── redirect to /thank-you?order=ID (sale_return_url) ◀───────────────────┘
                                            PayMe webhook ──▶ POST /api/payme-callback:
                                              verify payme_signature,
                                              confirm price == order total,
                                              mark order 'paid' + payment_ref,
                                              CONSUME single-use coupon (used_count++),
                                              return 200
 /thank-you polls /api/order-status?id=ID until 'paid'
```

- **Webhook is authoritative** for "paid"; the browser redirect just shows a thank-you.
- **No agorot↔shekel conversion** — PayMe and our D1 both use agorot.

## What to do / confirm at signup (checklist)

- [ ] Finish **Sandbox** signup → get **`seller_payme_id`** (+ any API key/secret PayMe issues).
- [ ] **Give PayMe our new site URL** so they move the account off Wix (1–2 days).
- [ ] Note the **test cards** + how to simulate success/failure.
- [ ] Confirm in docs.payme.io (in-browser): exact `generate-sale` field names, the **`payme_signature`** formula, and the refund endpoint.

## Build plan (after Sandbox credentials)

**Phase 0 — config**
- Worker secrets: `PAYME_SELLER_ID` (+ API key if issued), `PAYME_BASE_URL` (preprod first).
- D1 (additive `ALTER TABLE orders ADD COLUMN ...`): `payme_sale_id`, `payer_email`, `payer_name`, `payer_phone`. (`orders` + `payment_ref` already exist; `sale_price` already agorot.)

**Phase 1 — `POST /api/checkout`** (worker)
- Recompute subtotal/discount/total server-side (never trust the client); re-validate the coupon via existing D1 logic.
- INSERT order ('new'), call `generate-sale` (agorot), store `payme_sale_id`, return `{ url }`.

**Phase 2 — `POST /api/payme-callback`** (worker)
- Verify `payme_signature`; load the order by `transaction_id`.
- Confirm `price` == order total and `payme_status` == success.
- **Idempotent**: if already `paid`, 200 and stop. Else set `status:'paid'`, `payment_ref=payme_transaction_id`; **consume the coupon** (`used_count++`) once.

**Phase 3 — frontend** ([CartPage.tsx](Frontend/src/pages/CartPage.tsx))
- Replace the disabled "💳 תשלום מאובטח באתר — בקרוב" with a real **"שלם בכרטיס"** that POSTs `/api/checkout` then `window.location = url`.
- Add `/thank-you` (success) + keep WhatsApp/phone as fallback; `/cart` is the cancel target.

**Phase 4 — invoices / dashboard**
- Surface paid orders + reference in the dashboard orders tab; wire refunds later. (Invoices: confirm whether PayMe issues them or we add a חשבונית service.)

**Phase 5 — test (sandbox) → go live**
- Sandbox matrix with PayMe test cards: success, failure, duplicate callback (idempotency), coupon consumed once, signature-invalid rejected, amount-mismatch rejected.
- Flip the dashboard to Production (green bar), switch secrets/base to `ng.paymeservice.com`, confirm the live `sale_callback_url` is set, do one small real transaction, then enable for shoppers.

## Security checklist

- Credentials only as **wrangler secrets** (never in code/repo).
- `generate-sale` is **server-side only** (creds never reach the browser).
- **Verify `payme_signature`** on every callback **and** confirm the amount matches the order.
- **Idempotent** callback handling (PayMe may retry) — guard on order status.
- Recompute amounts server-side; reject if the callback's `price` ≠ our order total.
- Consume single-use coupons exactly once, on payment success only.

## Open items (most now resolved via the live docs)

- ✅ `generate-sale` fields + response, env URLs, callback attributes — confirmed.
- ✅ Refunds exist ("Refund Sale", Post Sale Actions); invoices exist (`sale_invoice_url`
  in the callback + a Create Document API) — just **enable the invoices module** on the account.
- ⏳ Exact **`payme_signature`** formula — not published; ask partners@payme.io.
  (We verify via server-side re-query meanwhile, so it isn't a blocker.)
- ⏳ Confirm whether the account needs anything **beyond `seller_payme_id`** (the docs
  call it "your private key", so likely that's the only credential).

## Sources
- PayMe docs: <https://docs.payme.io> · <https://payme.stoplight.io> · test cards: <https://payme.stoplight.io/docs/payments/v781p5enpoq9x-test-cards-and-payment-methods>
- Endpoints seen: [Generate Payment](https://docs.payme.io/docs/payments/d7da26bb42da8-generate-payment) · [Generate Sale with Token](https://docs.payme.io/docs/payments/708014a14cc25-generate-sale-with-token) · [Payment Methods](https://docs.payme.io/docs/payments/zqjehf9tm2jnk-payment-methods)
- SDK: [PayMeService/payme-jsapi](https://github.com/PayMeService/payme-jsapi) · base URLs (preprod/ng .paymeservice.com/api) per PayMe API references.
