# Moving the domain from the Wix site to the new site

Goal: `levhatahbiv.com` should serve the **new** storefront (Cloudflare Worker
`lev-hatahbiv`), and we should stop paying Wix for the site plan — **without ever
losing the domain**.

---

## TL;DR — the answer in five lines

1. At Wix, the **site plan** and the **domain** are two separate subscriptions.
   Cancelling the plan does **not** cancel the domain — you can absolutely keep
   paying only for the domain. ([Wix][cancel-both])
2. **But** for *our* site that isn't enough: Wix does **not** allow changing
   nameservers on a Wix-registered domain ([Wix][ns-request]), and a Cloudflare
   **Workers custom domain requires the zone to be Active in our Cloudflare
   account**, i.e. on Cloudflare nameservers ([Cloudflare][cf-custom-domains]).
   A Wix-hosted DNS zone can't do that.
3. So the move is: **transfer the domain registration away from Wix** → put DNS
   on Cloudflare → attach it to the Worker → then cancel Wix.
4. **Never delete the domain.** A deleted/expired domain is released to the
   public and anyone can take it; getting it back from redemption costs far more
   than a transfer (which is ~$10–15 and *adds a year* to the expiry).
5. Cancel the plan **after** the cut-over, and prefer **turning off auto-renew**
   over cancelling mid-term — Wix only refunds plans within 14 days of purchase
   ([Wix][refund]), so before that deadline you may as well use what's paid for.

---

## What it costs, before and after

| | Today | After |
|---|---|---|
| Wix site plan | the expensive line on the invoice (a Business/commerce plan, billed yearly) | **₪0** |
| Domain registration | ~$15–20/yr at Wix ([pricing][wix-domain-price]) | ~$10–12/yr (Cloudflare Registrar is at-cost; Porkbun/Namecheap similar) |
| Hosting | included in the Wix plan | Cloudflare Workers free tier (Paid $5/mo only if we outgrow it), D1 free tier |
| Admin API | Render (unchanged) | Render (unchanged) |

The domain was never the expensive part — the plan is. Everything below is about
detaching the domain from the plan safely.

---

## Why "just keep the domain at Wix and repoint it" does not work here

It *almost* works, and it's worth knowing exactly where it breaks:

- ✅ Keeping the domain without a plan is fine and supported — Wix explicitly
  says cancelling the plan does not cancel the domain ([Wix][blog-domain]).
- ✅ DNS records (A / CNAME / MX / TXT) stay editable in
  **Wix account → Domains → DNS records**, plan or no plan ([Wix][dns-records]).
- ❌ **NS records can't be changed** on a Wix-registered domain — Wix's own help
  center lists it as a not-currently-possible request ([Wix][ns-request]).
- ❌ Our storefront is a **Cloudflare Worker**. A Worker custom domain needs an
  **Active zone in the same Cloudflare account**; Cloudflare then creates the DNS
  records and issues the certificate itself ([Cloudflare][cf-custom-domains]).
  "Active" means the domain's nameservers point at Cloudflare (full setup).
  Partial/CNAME-only setup is a Business-plan feature.

So: Wix DNS → can't delegate to Cloudflare → can't attach the domain to the
Worker. The registration has to move.

### The Cloudflare Registrar catch-22 (important)

You cannot transfer the domain **directly** from Wix to Cloudflare Registrar:
Cloudflare requires the zone to be **Active on Cloudflare nameservers before**
it will accept the registration transfer ([Cloudflare][cf-transfer]) — and Wix
won't let us change nameservers. Two ways around it:

- **Recommended:** transfer to a normal registrar that allows NS edits
  (**Porkbun**, **Namecheap**, **Spaceship**, GoDaddy…), set the nameservers to
  Cloudflare there, and stop. This is a perfectly good permanent setup.
- **Optional, later:** once 60 days have passed since that transfer, move the
  registration again into Cloudflare Registrar for at-cost renewal. Purely a
  few-dollars-a-year optimization — not required.

---

## Pre-flight — do all of this *before* touching anything

- [ ] **Check the 60-day lock.** ICANN blocks transfers for 60 days after a
      domain is registered, transferred, or after the **registrant contact
      details are changed** ([Wix][icann-60]). If we're inside that window, the
      only option is to wait — so don't "fix" the contact email right before a
      transfer.
- [ ] **Make the registrant email reachable** and turn **domain privacy off**
      temporarily — the EPP/authorization code and the approval emails go to the
      registrant contact address ([Wix][transfer-away]).
- [ ] **Record the entire current DNS zone.** Screenshot every record in
      Wix → Domains → DNS records, especially:
      - **MX records** — miss these and business email dies silently.
      - **TXT** — SPF/DKIM/DMARC, Google/Meta verification.
      - any subdomain A/CNAME records.
- [ ] **Decide about email.** A Wix mailbox / Google Workspace bought through Wix
      is *another* separate subscription. If it exists, it must be migrated or
      kept before the plan goes away.
- [ ] **Final inventory pull from Wix.** Wix Stores is still the catalog source
      of truth (`migration/pull-wix.mjs`, see `migration/README.md`). Run a full
      pull + reconcile into Atlas while the Wix site is definitely alive, and
      confirm nothing in `report-missing.csv` matters.
- [ ] **PayMe first.** The PayMe account still has the *Wix* site linked; their
      tech team needs 1–2 business days to move it to our URL (`PAYMENTS.md`,
      `docs/LAUNCH-CHECKLIST.md`). Send them the final domain (`levhatahbiv.com`)
      **before** the cut-over so live payments don't break on day one.
- [ ] **New site actually ready** — walk `docs/LAUNCH-CHECKLIST.md` to the end.
- [ ] **Lower the TTL** on the current A/CNAME records (to 300s) a day ahead if
      Wix lets you, so the switch propagates fast.

---

## Step 1 — get the domain out of Wix (up to 8 days, site stays up)

At Wix: **Account → Domains → the domain → Domain Actions (⋮) → Transfer away
from Wix → Transfer Domain → I Still Want to Transfer**. Wix emails the
**transfer authorization code (EPP code)** to the registrant contact address, and
unlocks the domain ([Wix][transfer-away]).

At the new registrar (Porkbun / Namecheap / Spaceship): start an incoming
transfer for `levhatahbiv.com`, paste the EPP code, pay for 1 year — **that year
is added on top of the current expiry date, nothing is lost** — then approve the
confirmation email. If Wix sends a "release the domain" email, approving it makes
the transfer finish in hours instead of days.

Notes:
- The site keeps running normally during the whole transfer — DNS doesn't change
  when the registration moves.
- If the transfer is rejected, it's almost always the 60-day lock, a locked
  domain, privacy hiding the contact email, or a typo'd EPP code.

## Step 2 — put DNS on Cloudflare

1. Cloudflare dashboard → **Add a site** → `levhatahbiv.com` → **Free** plan.
2. Cloudflare scans the existing records — **compare them against the screenshots
   from pre-flight** and re-add anything missing, MX and TXT above all.
3. Copy the two Cloudflare nameservers → set them as the domain's nameservers at
   the new registrar (replacing theirs).
4. Wait for the zone to flip to **Active** (usually minutes, up to a few hours).

## Step 3 — attach the domain to the Worker

1. Cloudflare → **Workers & Pages → `lev-hatahbiv` → Settings → Domains & Routes
   → Add → Custom Domain** → add `levhatahbiv.com` **and** `www.levhatahbiv.com`.
   Cloudflare creates the DNS records and issues the TLS certificate itself
   ([Cloudflare][cf-custom-domains]) — no A record to copy by hand.
2. Add a **Redirect Rule**: `www` → apex, 301.
3. Update everything that still says `lev-hatahbiv.nivsasi.workers.dev` or
   `onrender.com`:
   - canonical/OG URLs, `sitemap.xml`, `robots.txt`, GA property URL
   - **PayMe** redirect + webhook callback URLs (`PAYMENTS.md`)
   - **CORS allowlists** — the Worker and the Render admin API
   - the `/manage` dashboard's API base if it's URL-derived
   (`grep -rn "workers.dev\|onrender.com"` before declaring victory)
4. SEO: 301 the old Wix product/category URLs to the new paths in the Worker,
   then resubmit the sitemap in Google Search Console.

## Step 4 — only now, stop paying Wix

Once `https://levhatahbiv.com` serves the new site and a real test order goes
through:

- Wix → **Account → Subscriptions** → the **site plan** → **turn off auto-renew**
  (keeps the old site as a read-only reference until the paid term ends, at no
  extra cost) — or **Cancel** for an immediate refund if we're still inside the
  14-day window ([Wix][refund]).
- Check the same page for **other** subscriptions: mailboxes, paid apps, Wix
  Payments. Each one cancels separately ([Wix][cancel-both]).
- The domain line should no longer be there at all (it moved in Step 1). If for
  any reason it still is, **leave its auto-renew ON** until the transfer shows
  complete at the new registrar.
- Cancelling doesn't delete the Wix site — it reverts to a free
  `*.wixsite.com` URL with Wix branding, which is a fine archive of the old
  catalog.

---

## Verification checklist

- [ ] `curl -sI https://levhatahbiv.com` → 200, and the HTML is the new SPA
- [ ] `https://www.levhatahbiv.com` → 301 → apex
- [ ] Valid certificate, no mixed-content warnings
- [ ] `/manage` login works (JWT against the Worker + Render API)
- [ ] A real ₪1 order end-to-end: PayMe page → payment → webhook marks it paid
- [ ] Email to/from the domain still delivers (MX intact)
- [ ] Old deep links 301 to the new pages
- [ ] Search Console: new sitemap submitted, no coverage crash after 48h

## Rollback

Until Wix's paid term actually ends, the old site is still there — pointing DNS
back is a records change in Cloudflare (that's why the pre-flight screenshots of
the original Wix A/CNAME values matter). Note that Wix's own "pointing" method
requires an active plan, so rollback only works while the plan hasn't lapsed.

---

## Options we rejected, and why

| Option | Verdict |
|---|---|
| Keep the domain at Wix, edit A/CNAME to the new site | ❌ Impossible for a Cloudflare Worker — needs Cloudflare nameservers, which Wix blocks |
| Move the storefront to a host that works with A/CNAME only | ❌ Would mean giving up Workers + D1 + the payments Worker |
| Cloudflare for SaaS custom hostname | ❌ Works in theory, but it's a SaaS-provider feature with extra cost and a fallback-origin setup — wrong tool |
| **Delete the domain and buy it again elsewhere** | ❌ **Never.** The moment it's released anyone can register it; we'd lose the name, the email and 40 years of brand recognition. A transfer costs less than the re-registration would |
| Transfer out → Cloudflare NS → Worker custom domain | ✅ Recommended |

## Timeline

| When | What |
|---|---|
| Day 0 | Pre-flight, PayMe notified, final Wix catalog pull, TTLs lowered |
| Day 1 | Request the EPP code, start the transfer at the new registrar |
| Day 1–8 | Transfer completes (site stays up the whole time) |
| Day 8 | Cloudflare zone + nameservers + Worker custom domain + URL updates (~2h) |
| Day 8–9 | Verify, then turn off auto-renew at Wix |

---

## Sources

[cancel-both]: https://support.wix.com/en/article/canceling-your-premium-plan-and-domain
[blog-domain]: https://www.wix.com/blog/what-happens-to-wix-domain
[refund]: https://support.wix.com/en/article/requesting-a-refund-for-a-premium-plan
[dns-records]: https://support.wix.com/en/article/managing-dns-records-in-your-wix-account
[ns-request]: https://support.wix.com/en/article/request-changing-name-server-ns-records-for-a-wix-domain
[transfer-away]: https://support.wix.com/en/article/transferring-your-wix-domain-away-from-wix-2477749
[icann-60]: https://support.wix.com/en/article/icanns-60-day-lock-policy
[wix-domain-price]: https://www.wix.com/domains/domain-pricing
[cf-custom-domains]: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
[cf-transfer]: https://developers.cloudflare.com/registrar/get-started/transfer-domain-to-cloudflare/

- Wix — [Canceling your site plan and domain][cancel-both] · [What happens to my domain if I cancel][blog-domain] · [Plan refunds (14 days)][refund] · [Managing DNS records][dns-records] · [Changing NS records for a Wix domain][ns-request] · [Transferring your domain away from Wix][transfer-away] · [ICANN 60-day lock][icann-60] · [Domain pricing][wix-domain-price]
- Cloudflare — [Workers custom domains][cf-custom-domains] · [Transfer a domain to Cloudflare Registrar][cf-transfer]
