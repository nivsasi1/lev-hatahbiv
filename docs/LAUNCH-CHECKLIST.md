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

### DNS as measured 2026-08-06 (BEFORE the switch)

| Record | Value |
|---|---|
| Nameservers | `ns12.wixdns.net`, `ns13.wixdns.net` (Wix runs DNS) |
| A (apex) | `185.230.63.107`, `.186`, `.171` (Wix hosting) |
| **MX** | `mail.lev-hatahbiv.com` → `66.147.244.98` (mail hosted OUTSIDE Wix) |
| Live site | `https://www.lev-hatahbiv.com` = the OLD Wix site |

### ⚠️ The email trap
A Worker custom domain REQUIRES the zone to live on Cloudflare, so the nameservers must
move off Wix. **If the MX / mail A / SPF-TXT records are not recreated in Cloudflare
BEFORE the nameserver change, the shop stops receiving email.** Copy every record out of
Wix's DNS panel first, verify them in Cloudflare, and only then switch nameservers.

### Exact record plan (captured from Wix 2026-08-06)

**RECREATE in Cloudflare — all mail records must be `DNS only` (grey cloud), never
proxied. Cloudflare does not proxy SMTP/IMAP/POP; an orange cloud here kills email.**

| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `mail` | `66.147.244.98` | **DNS only** |
| CNAME | `imap` | `mail.lev-hatahbiv.com` | **DNS only** |
| CNAME | `pop` | `mail.lev-hatahbiv.com` | **DNS only** |
| CNAME | `smtp` | `mail.lev-hatahbiv.com` | **DNS only** |
| MX | `@` | `mail.lev-hatahbiv.com` (priority 0) | n/a |
| TXT | `@` | `google-site-verification=YYwEMYK045w2iw1lS71DdktvEKyt1UzVK5oxNlSYIYQ` | n/a |

**DELETE / do not recreate** (Wix-only; the Worker custom domain replaces them):

| Type | Name | Old value | Why |
|---|---|---|---|
| A | `@` ×3 | `185.230.63.171 / .186 / .107` | Wix hosting |
| CNAME | `www` | `cdn1.wixdns.net` | Wix CDN |
| CNAME | `m` | `www134.wixdns.net` | Wix mobile site |
| NS | `@` | `ns12/ns13.wixdns.net` | replaced by Cloudflare's |

Cloudflare's import scan will pull the Wix apex/www records in automatically — delete them
after import, or they fight the Worker custom domain.

**Note:** there is NO SPF/DKIM/DMARC record on this domain today (the only TXT is a Google
verification). That is pre-existing, not caused by the move; adding SPF later would improve
deliverability of mail sent from `mail.lev-hatahbiv.com`.

### 🛑 PLAN CORRECTION (2026-08-22) — Wix blocks the nameserver switch

Discovered mid-migration, verified against both vendors' docs:
- **Wix does not allow changing nameservers on a Wix-registered domain** at all
  (support.wix.com "Request: Changing Name Server (NS) Records for a Wix Domain").
- **Cloudflare Registrar refuses inbound transfers until the zone is Active on
  Cloudflare nameservers** — which Wix prevents. Deadlock by design.

**The escape: transfer the registration to an INTERMEDIATE registrar first**
(Namecheap / Porkbun — any registrar that permits arbitrary nameservers):

1. Wix → Domains → ⋯ → **Transfer away from Wix** → get the EPP/auth code.
   ⚠️ Do NOT "Edit contact info" beforehand — registrant changes trigger a 60-day
   transfer lock.
2. At the new registrar: Transfer domain → enter EPP code → pay (~$10–12, which by
   ICANN rules ADDS +1 year: Feb 2027 → Feb 2028).
3. Wait for the transfer (typically up to 5–7 days; Wix may release early).
   **DNS keeps serving from wixdns throughout — site + email unaffected.**
4. At the new registrar: set nameservers → `quentin.ns.cloudflare.com` +
   `rita.ns.cloudflare.com` → the prepared CF zone goes Active.
5. Proceed with the original cutover (delete Wix records, attach Worker domain,
   test site + email).
6. Optional, ≥60 days later (ICANN inter-transfer lock): transfer once more to
   Cloudflare Registrar for at-cost renewals — or simply stay at the intermediate.

Keep **Wix Premium** until the cutover is DONE — the old site must keep serving on
the domain during the transfer window. Cancel it only after step 5 is verified.

The Cloudflare zone we already prepared (all records imported, mail records grey)
stays exactly as-is — it simply waits for the nameservers to arrive.

Why not Wix's "point to external site" option instead: Wix DNS can only point
A/CNAME records, and a Cloudflare Worker cannot be served through external DNS —
Workers custom domains require the zone on Cloudflare. Not viable.

### Order of operations
1. Wix → Domains → lev-hatahbiv.com → DNS records: screenshot / copy EVERY record
   (MX, the `mail` A record, TXT/SPF, any subdomain).
2. Cloudflare → Add a site → `lev-hatahbiv.com` → Free. It auto-scans; **manually verify
   MX + mail + TXT survived**, add anything missing.
3. Wix → domain → Advanced → nameservers → point to the two Cloudflare nameservers.
4. Wait for Cloudflare to report the zone Active (usually <1h).
5. Cloudflare → Workers & Pages → lev-hatahbiv → Settings → Domains & Routes → Add Custom
   Domain for BOTH `lev-hatahbiv.com` and `www.lev-hatahbiv.com` (SSL is automatic).
6. Verify the new site loads on both, and **send a test email to the shop address**.
7. Tell PayMe to update the account's registered site URL (they asked which one to use).

### Money notes (not technical)
- The **Wix Premium plan is $481.44/yr** and the site no longer runs on Wix — cancel it
  once the domain is served from Cloudflare. Confirm with Wix that cancelling Premium does
  NOT cancel the domain registration ($25.19/yr, renewed Jan 3 2026).
- Optional later: **transfer the registration to Cloudflare Registrar** — renewal drops
  $25.19 → ~$10.46/yr. Details: only possible AFTER the zone is active on Cloudflare
  nameservers; the transfer fee buys +1 year of registration (ICANN rule, Feb 2027 →
  Feb 2028) so it's an early renewal, not an extra cost; the EPP/auth code comes from
  Wix → domain → "Transfer away from Wix". Do it after everything is stable — renewal
  deadline is Feb 2, 2027, no rush.
- Decision 2026-08: do NOT switch identity to unhyphenated `levhatahbiv.com` — email,
  SEO history and PayMe registration all live on `lev-hatahbiv.com`. Optionally buy the
  unhyphenated one (~$10/yr) as a typo-catcher redirect; nice-to-have only.

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
