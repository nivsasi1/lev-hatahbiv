# Payments — provider research + integration plans

Status (2026-07-12): **Grow is DEAD.** The API team revealed that code/API integration
(Light API + Wallet SDK — the only way to power an automated site checkout) costs
**₪500/month + VAT (≈₪585)** on top of the plan — a fee that appears nowhere on the
special-bid page. The ₪59 + 0.6% bid only covers their no-code products (dashboard
payment links etc.). Owner cancelled the account the same day and requested a refund
of the ₪59 charge.

**Why cancelling was right:** Grow-with-API ≈ ₪644/mo fixed (₪59 + ₪585) + 0.6%.
PayMe ≈ ₪64/mo fixed (₪49 fee-minimum + ₪15 invoices) + 1.2% + ₪1/txn. The ~₪580/mo
fixed gap needs ~₪30–35k/month of ONLINE sales (~400 orders) before Grow's cheaper
percentage catches up — far beyond a neighborhood shop's online channel at launch.

**Current direction: back to PayMe** (plan below, still fully valid; the business
already has a PayMe relationship from Wix). **The `grow` branch work is NOT wasted** —
most of it is provider-agnostic and carries over:
- cart payer form (name/phone/email) + **shipping address** collection ✅ keep as-is
- server-side payer/shipping validation, orders schema (+ `shipping` column) ✅ keep
- the hardened settle architecture (server re-query gate, tri-state paid check, atomic
  `WHERE status IN ('new','failed')` flip, once-only coupon consume, order-status
  self-heal) ✅ port to PayMe (re-query = get sale by `payme_sale_id`)
- swap needed: `createPaymentProcess`→`generate-sale`, `/api/grow-callback`→
  `/api/payme-callback`, drop the Wallet SDK module. (~half a day.)

---

## Rate check — Israeli processors (researched 2026-07-12, 6 providers, sourced)

Criteria: clearing % + fixed/txn + monthly + setup + **API-access fee (the Grow trap)** +
3DS + **invoice generation** + wallets + callback security. Model: avg order ₪80, invoices
on every order, 3DS off, all amounts **excl. VAT**. Quote-based providers (most of them
publish no price list) use best third-party data — marked ⚠️ where unconfirmed.

| Monthly cost (excl VAT) | ₪5k / 63 orders | ₪10k / 125 orders | ₪30k / 375 orders | API fee | Invoices | Callback auth |
|---|---|---|---|---|---|---|
| **Sumit** (clearing via Upay) | ~₪100–180 | **~₪235** | **~₪545** | ₪0 (all plans) | **included** (it IS an invoicing platform) | no signature → re-query |
| **CardCom direct** | ~₪140 ⚠️ | ~₪200 ⚠️ | ~₪440 ⚠️ | **"Low Profile module" must be PURCHASED — price unpublished (Grow-pattern risk!)** | +₪29/mo module ⚠️ | no signature → re-query (their documented pattern) |
| **PayMe** (signed rates ✓) | ~₪155 | ~₪260 | ~₪800 | **₪0 — confirmed** (plan feature + absent from T&C tariff) | ₪0.3/doc or ₪15/mo flat — confirm which | MD5 signature (formula unpublished) + re-query |
| Tranzila | ~₪230 | ~₪310 | ~₪650 | likely ₪0 ⚠️ | bundled in doc-quota tiers | unsigned → re-query |
| Hyp (Yaad Sarig) | ~₪150–250 ⚠️ | ~₪220–310 ⚠️ | ? (% unpublished!) | gateway fee IS the API; webhooks need support enablement | +₪49/mo (Mata, 300 docs) | signed redirect + VERIFY endpoint |
| PayPlus | ~₪295 | ~₪385 | ~₪745 | ₪0 evidence, quote-based ⚠️ | **Invoice+ ~₪145/mo** (auto-invoice needs Professional tier) ⚠️ | **HMAC-SHA256 — best in class** |
| Morning (Green Invoice) | — | ~₪344 | — | plan-gated (Best+) | included in plan | **clearing is GROW underneath — avoid** |
| iCount Pay | — | ~₪310 + ₪249 setup | — | ₪0 | included (doc tiers) | **it's PayMe underneath + 0.85% default fast-payout trap — pointless vs direct PayMe** |

Key per-provider facts (full sources in the research run):
- **PayMe** — HIGH confidence (signed agreement + paid.co.il + T&C all agree): 1.2% + ₪1/txn,
  ₪99 setup, ₪49/mo fee-floor (only >₪500 volume). **3DS = 0.15% min ₪2.5 but auto-triggers
  only on orders >₪499 / >3 installments / foreign cards → at our ₪80 avg it basically never
  fires.** Apple/Google Pay +₪0.5/txn, Bit +0.5%. Withdrawal ₪14.9 in months with <₪5k
  withdrawn. **The ₪1/txn is the killer at ₪80 orders: it's +1.25% → ~2.6% effective all-in.**
- **Sumit** — 1.1% (0.9% clearing + 0.2% no-doc fee, via Upay), **no fixed/txn, no setup**.
  Platform ₪125/mo (Growth, 400 actions; a sale burns 2 — charge + auto-invoice; ₪0.25/extra).
  3DS ₪1/attempt opt-in. Bit 1.6%. Foreign/Amex 4.2%. API included in every plan (quota = 5×
  actions). Ask: payout timing (same-day costs 1.4% total), Apple/Google Pay surcharge,
  callback signature. **~1.8–2.4% effective all-in, invoices included.**
- **CardCom direct** — potentially cheapest (1.2%, maybe 0.9% with monthly payout; percent-only,
  no fixed/txn) + real invoice module (+₪29/mo ⚠️2023 price) + good API (LowProfile/Create,
  WebHookUrl, GetLpResult re-query — exactly our architecture). **BUT: their own docs say the
  API "Low Profile module" must be purchased and its price appears NOWHERE** — demand it in
  writing (one-time + monthly) before believing any total. Bit 1.6% cap ₪5k. Callback IPs to
  allowlist: 82.80.227.17/29, 82.80.222.124/29.
- **Tranzila** — quota-model gotchas (transaction "banks" that auto-open at extra cost, 3DS
  billed per ATTEMPT incl. failures, CPI+3% yearly increases, ₪220 freeze fee, 24-mo lock-in
  on promos). Not worth it at this size.
- **Hyp (Yaad Sarig)** — nothing published, historically gateway-ON-TOP-of-acquirer (two fee
  stacks); webhooks gated behind support. Too murky.
- **PayPlus** — best developer experience (public docs, HMAC-signed callbacks, sandbox), but
  auto-invoicing needs the Professional Invoice+ tier (~₪145/mo ⚠️) → priciest total.

### Verdict
1. **Launch on PayMe** — the only provider with signed, verified rates; API confirmed free;
   3DS structurally ~free at our order size; the code exists (main) + hardened architecture
   ready to port (grow branch, ~½ day). At launch volume the premium vs Sumit is only
   ~₪30–100/mo — certainty and speed are worth more right now.
2. **In parallel, get TWO written quotes** — the swap later costs half a day thanks to the
   adapter architecture:
   - **Sumit**: confirm Upay payout timing, Apple/Google Pay surcharge, callback verification,
     and that 1.1% + ₪125/mo Growth is the whole story → if yes, it wins from ~₪15k/mo volume
     (₪250+/mo cheaper at ₪30k).
   - **CardCom**: itemized quote — Low Profile module (one-time + monthly), documents module +
     per-doc overage, clearing % at monthly payout, 3DS, minimums, lock-in → if the module is
     ≤~₪50/mo it beats everyone.
3. Skip: Tranzila, Hyp, PayPlus, Morning (Grow inside), iCount Pay (PayMe inside, marked up).

## Grow (Meshulam) — ARCHIVED plan (dead 2026-07-12 — ₪500/mo+VAT API fee)

Kept for reference only: if Grow ever offers API access at a sane price, branch `grow`
(commits d86d3a1..b573a80) holds a complete, docs-verified integration.

Support answers we did get (Darya, 2026-07-10): ₪59+0.6% plan confirmed · Basic track
suffices · 3DS = ₪2.50/checked txn · invoices self-configured in document settings.

Docs: <https://grow-il.readme.io/> (Light API). Verified 2026-07-09.

### How their flow works (Light API, hosted page)
1. Worker POSTs `createPaymentProcess` (server-side only — browser calls are blocked;
   body is **FormData, not JSON**; no special characters in any param).
2. Response returns a hosted payment-page URL (+ `processId`/`processToken`) → redirect
   the shopper (redirect, not iframe — same UX as the PayMe plan).
3. Shopper pays → Grow POSTs a **server-to-server callback** to the `notifyUrl` we
   passed in step 1. Fields include `transactionId`, `transactionToken`, `processId`,
   `processToken`, `asmachta`, `sum`, `status`/`statusCode`, card info
   (`cardSuffix`/`cardBrand`/...), payer (`fullName`/`payerPhone`/`payerEmail`),
   `customFields` (`cField1` — we put our D1 order id there).
4. We must reply by calling **`approveTransaction`** (an ack; the transaction goes
   through even if it fails — so it is NOT the paid/unpaid gate).
5. Shopper is redirected to our `successUrl` with `&response=success` (cancel/decline →
   `cancelUrl`). Browser redirect is not authoritative — the callback is.

### createPaymentProcess — confirmed request/response (from the docs' Postman example)
- `POST https://sandbox.meshulam.co.il/api/light/server/1.0/createPaymentProcess`, body **form-data**.
- Request fields: `pageCode` (req), `userId` (req), `sum` (req — **shekels decimal**, e.g. `10.99`),
  `successUrl` (req, HTTPS; **localhost not supported**), `cancelUrl` (req), `description` (req),
  `pageField[fullName]` (req — min two names), `pageField[phone]` (req — valid Israeli mobile),
  `pageField[email]` (opt), `pageField[invoiceName]` (opt), `paymentNum`/`maxPaymentNum` (opt, 1–12),
  `chargeType` (opt), `notifyUrl`, `cField1...` (opt, must be URL-encoded-safe).
- Response: `{ status: 1, err: "", data: { processId, processToken, authCode | url } }` —
  `data.url` on a redirect pageCode, `data.authCode` on a **Wallet** pageCode.
- ⚠️ `pageField[fullName]` + `pageField[phone]` are **required** → the cart needs a tiny
  details step (name + phone + optional email) before "שלם" — we don't collect these today.

### Growin Wallet SDK (embedded form) vs redirect — DECISION: Wallet, redirect as fallback
- **Wallet flow**: same server-side `createPaymentProcess` but with a **wallet-specific
  `pageCode`** → returns `authCode` (valid **4 min**; opened form lives 9 more min) →
  frontend loads Grow's SDK and calls `growPayment.renderPaymentOptions(authCode)` →
  unified popup ON OUR SITE (cards + Apple Pay + Google Pay + Bit + PayBox) → `onSuccess`
  event + redirect to thank-you. Server callback + `approveTransaction` unchanged
  (**approveTransaction must echo ALL fields from the callback + `pageCode`**).
- **Wallet SDK, verified from the live docs (2026-07-09):**
  - Script: `https://cdn.meshulam.co.il/sdk/gs.min.js` (load async on the checkout page).
  - `onload` → `growPayment.init({ environment: "DEV"|"PRODUCTION", version: 1, events: {…} })`
    **then** `growPayment.renderPaymentOptions(authCode)`. **init() is required first** — skipping
    it silently no-ops the wallet. (Coded in [grow-wallet.ts](Frontend/src/data/grow-wallet.ts);
    flip `GROW_ENV` to `"PRODUCTION"` at go-live.)
  - Events: `onSuccess` (→ /thank-you), `onFailure`/`onError`/`onTimeout` (→ error),
    `onWalletChange`/`onPaymentStart`/`onPaymentCancel`. `onSuccess` payload:
    `{ status:1, data:{ payment_sum, full_name, payment_method, number_of_payments, confirmation_number } }`.
- Why Wallet: shopper never leaves the site, one-click Apple/Google Pay on mobile (most
  of our traffic), auto-matches site look. Cost: one external script + a JS call.
- Fallback: standard pageCode → `data.url` → full-page redirect (zero client JS). The
  worker returns whichever of `url`/`authCode` Grow sends, so both work with one endpoint.
- Dev note: `successUrl`/`cancelUrl` can't be localhost → test the full loop against a
  deployed preview, or point success/cancel at the live domain even in sandbox.

### Other API areas that matter to us (from the full sidebar, verified 2026-07-09)
- **Invoice Server Response** — pass `invoiceNotifyUrl` in `createPaymentProcess` and Grow
  POSTs `{ transactionId, processId, invoiceNumber, invoiceUrl }` when the invoice is
  auto-generated → store `invoiceUrl` on the D1 order (dashboard + customer email).
  This is the special bid's "100 documents/month" — **no separate invoicing service needed**
  (PayMe wanted ₪15/mo for this).
- **Payment & Transaction Info** — a query endpoint for transaction status
  (grow-il.readme.io/reference/payment-transaction-info; page is JS-rendered, read in
  browser when building). Use it for **server-side re-query on callback** — the strongest
  verification given there's no callback signature (belt: processToken match + sum match;
  suspenders: re-query status).
- **3DS** — optional, toggled via the API per business needs; applies **only to manual card
  entry** (Apple Pay / Google Pay / Bit buttons are excluded). **Confirmed by Grow support
  (Darya, 2026-07-10): ₪2.50 per transaction that passes the 3DS check.** Trade-off for a
  small shop: on a ₪50 order that's 5%, but 3DS shifts card-fraud/chargeback liability to
  the issuer. Owner decision — lean OFF at launch (low-value orders), revisit if chargebacks
  appear. We keep the code flag ready either way.
- **Refund** — exists in the API → wire into the manager dashboard later (not launch-blocking).
- Not relevant for us: POS/Android SDKs, Bit iOS/Android SDKs, Work with Token, recurring
  payments (maybe someday for חוגים subscriptions), Delayed Payment J4/J5 (auth-then-capture
  for variable amounts — needs special Grow approval; we charge immediately).
- **Payment Request** — Grow sends a payment link by SMS/email; nice future dashboard
  feature for phone orders (owner types an amount → customer gets a link).

### Environments + credentials
- Sandbox base: `https://sandbox.meshulam.co.il/api/light/server/1.0/`
  (prod base is issued with the live credentials — `secure.meshulam.co.il`).
- Credentials = **`userId` + `pageCode`** (pageCode per payment method — card, Bit...).
  Separate values per environment. **Not self-service: Grow support/integration must
  issue them** — having a dashboard user is not enough.
- **Production is gated**: Grow grants live credentials only after reviewing a working
  sandbox integration.
- Test cards: `4580458045804580`, `4580000000000000`, `4580111111111121`.
  ⚠️ Bit / Apple Pay / Google Pay have **no sandbox** — they hit production.
- Callback debugging helper: `sandbox.../updateMyUrl/?url=...` re-fires the callback.

### Security deltas vs the PayMe plan (important)
- **No callback signature** (PayMe had `payme_signature`). So verification is on us:
  store `processId`+`processToken` on the order at creation; on callback accept only if
  both match AND `sum` equals the order total AND **`statusCode === "2"`** (Grow's paid
  code; `status` text = `"שולם"`) — the processId/token identify the *process*, not its
  outcome, so without the statusCode gate a **declined** callback would settle as paid.
  Then a server-side `getPaymentProcessInfo` re-query corroborates. Idempotent via
  `WHERE status IN ('new','failed')`. Code reads the paid amount from the transaction
  record, never the *requested* `data.sum`.
- **Verified callback/response shapes (live docs, in-browser 2026-07-09):**
  - **Callback** nests everything under `data`: `{ err, status:"1", data:{ statusCode:"2",
    status:"שולם", sum:"269", processId, processToken, transactionId, fullName,
    payerPhone, payerEmail, customFields:{ cField1 } } }`. Our reader accepts JSON *or*
    form-data and reads `cField1` from `data.customFields`.
  - **getPaymentProcessInfo** → `{ status:1, data:{ processId, processToken,
    transactions:[ { statusCode:"2", sum, transactionId, … } ] } }` — re-query reads
    `data.transactions[0]`.
  - **Invoice callback** is a JSON **array** `[ { transactionId, processId, invoiceNumber,
    invoiceUrl } ]` — **no cField1**, so we locate the order by `processId` (bound +
    write-once).
  - `getPaymentProcessInfo` error → `{ status:0, err:{ id, message }, data:"" }`.
- **Known accepted tradeoff:** a single-use coupon can back at most one *extra* discounted
  order only if the shopper opens two checkouts before paying either and then actually pays
  both (real money, real orders). Consuming the coupon at checkout instead would burn codes
  on abandoned carts; for a neighbourhood shop the current "consume on payment" is the right
  call. Revisit only if coupon abuse shows up.
- **`sum` is in shekels (decimal)**, our D1 is agorot → convert only at the API
  boundary (`(agorot / 100).toFixed(2)` out, `Math.round(sum * 100)` in). PayMe was
  agorot-native; this is the most bug-prone difference.

### Build plan — ✅ built on branch `grow` (awaiting sandbox creds to test)
- Secrets (user sets): `GROW_USER_ID`, `GROW_PAGE_CODE`, `GROW_WEBHOOK_KEY` (our
  callback-auth secret). `GROW_BASE_URL` is a wrangler.jsonc **var** (sandbox default).
- Worker `/api/checkout`: keep all existing logic (server-side totals, coupon check,
  D1 insert) — swap the PayMe `generate-sale` call for `createPaymentProcess`
  (FormData; `sum`, `description`, `successUrl=/thank-you`, `cancelUrl=/cart`,
  `notifyUrl=/api/grow-callback`, `cField1=<order id>`); store
  `processId`/`processToken` on the order; return the page URL.
- New `/api/grow-callback`: parse FormData → load order by `cField1` → verify
  `processId`/`processToken`/`sum` → mark `paid` + `payment_ref=transactionId` →
  consume coupon once → call `approveTransaction` → 200. Idempotent.
- `/thank-you` polling + frontend stay exactly as-is.
- Sandbox matrix: success, decline, duplicate callback, forged callback (wrong
  token/sum rejected), coupon consumed once. Then hand to Grow for the go-live review.

### What the owner does next (code is done; sandbox testing can't start without #2)
1. ✅ Code: worker (`createPaymentProcess`, `/api/grow-callback`, `/api/grow-invoice`,
   `getPaymentProcessInfo` re-query, order-status self-heal), cart payer form + Wallet
   hook — built on branch `grow`.
2. ⏳ Contact Grow support/integration — the exact message (plan confirmation, sandbox
   `userId` + Wallet/redirect pageCodes, account track, 3DS, invoices, Wallet SDK script
   URL) is ready to paste: [docs/grow-support-questions.md](docs/grow-support-questions.md).
3. ⏳ When creds arrive: `wrangler secret put GROW_USER_ID` / `GROW_PAGE_CODE` /
   `GROW_WEBHOOK_KEY` (+ `.dev.vars` for local), fill the Wallet SDK script URL in
   `Frontend/src/data/grow-wallet.ts`, run the sandbox matrix, merge `grow`.
4. ⏳ After sandbox tests pass: Grow reviews → issues production creds → swap secrets →
   one small real transaction → open to shoppers.

---

# PayMe integration plan  ← CURRENT AGAIN (Grow died on the API fee)

Status: back to being the plan of record (2026-07-12). The business already had a PayMe
relationship from Wix. Note: the old PayMe worker code still exists on `main`
(`generate-sale` + `/api/payme-callback`), but the REBUILD should start from the `grow`
branch and swap the provider adapter — that branch has the payer form, shipping address,
and the hardened settle architecture that `main`'s PayMe code lacks.

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
