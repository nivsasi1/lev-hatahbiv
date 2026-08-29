# Moving lev-hatahbiv.com to the new site (and dropping the Wix plan)

Goal: `lev-hatahbiv.com` should serve the **new** storefront (Cloudflare Worker
`lev-hatahbiv`), and we should stop paying Wix — without ever losing the domain
or the business email.

## The situation

| | Where it is | What to do |
|---|---|---|
| **Domain registration** | **Namecheap** — `lev-hatahbiv.com`, ACTIVE, auto-renew ON, expires **Feb 2 2028**, privacy ON | **Nothing.** Leave it exactly as it is |
| **DNS / nameservers** | Namecheap BasicDNS *or* Wix nameservers — check before touching anything | Move to **Cloudflare** nameservers |
| **The site the domain shows** | old Wix store (or Render) | the Worker, via a Workers Custom Domain |
| **Wix site plan** | the expensive subscription | turn off auto-renew **after** the cut-over |

The domain was **never** tied to Wix — it's registered at Namecheap, so there is
**no domain transfer, no EPP code, no 60-day ICANN lock** to worry about. The only
thing Wix has is the site plan, and cancelling it does not touch the domain.

Why Cloudflare nameservers: a Workers **Custom Domain** requires the zone to be
**Active in the same Cloudflare account** — Cloudflare then creates the DNS
records and issues the TLS certificate itself.
See <https://developers.cloudflare.com/workers/configuration/routing/custom-domains/>.

## Step 0 — find out where DNS actually lives (5 minutes)

Namecheap → **Domain List → MANAGE → Domain tab → NAMESERVERS**:

- **"Namecheap BasicDNS"** → the records are in the **Advanced DNS** tab, right there.
- **"Custom DNS" with `ns*.wixdns.net`** → the records live at **Wix → Domains →
  DNS records**, and they disappear from view the moment we cut over. Screenshot
  them first.

Either way, **write down every record before changing anything**:

- `A` / `CNAME` for the apex and `www` (needed for rollback)
- **`MX`** — business email dies silently if these are lost
- **`TXT`** — SPF / DKIM / DMARC, Google / Meta site verification
- any other subdomain records

## Step 1 — add the zone to Cloudflare (no downtime yet)

1. Cloudflare dashboard → **Add a site** → `lev-hatahbiv.com` → **Free** plan.
2. Cloudflare scans and imports what it can find. **Compare the imported list
   against the screenshots from Step 0** and re-add anything missing — MX and TXT
   above all.
3. **Leave the existing A/CNAME pointing where they point today** (Wix/Render).
   Nothing has changed yet: Cloudflare is not authoritative until Step 2.
4. Copy the two assigned nameservers (`something.ns.cloudflare.com`).

## Step 2 — switch the nameservers at Namecheap

Namecheap → **Domain List → MANAGE → Domain tab → NAMESERVERS** → dropdown →
**Custom DNS** → paste the two Cloudflare nameservers → save (the green ✓).

Propagation is usually minutes, up to 48h worst case. The zone flips to **Active**
in Cloudflare when it's done.

**Verify before moving on:** the *old* site still loads and email still arrives.
If that holds, the DNS move was clean and everything after this is reversible.

## Step 3 — point the domain at the Worker

1. Cloudflare → **Workers & Pages → `lev-hatahbiv` → Settings → Domains & Routes
   → Add → Custom Domain** → add `lev-hatahbiv.com` **and** `www.lev-hatahbiv.com`.
   Cloudflare replaces the DNS records and issues the certificate automatically.
2. Add a **Redirect Rule**: `www` → apex, 301.
3. Update everything that still hardcodes the old hosts —
   `grep -rn "workers.dev\|onrender.com"`:
   - canonical / OG URLs, `sitemap.xml`, `robots.txt`, GA property
   - **PayMe** redirect + webhook callback URLs (`PAYMENTS.md`)
   - **CORS allowlists** — the Worker and the Render admin API
   - the `/manage` dashboard API base, if URL-derived
4. 301 the old Wix product/category URLs to the new paths in the Worker, then
   resubmit the sitemap in Google Search Console.

## Step 4 — only now, stop paying Wix

Once `https://lev-hatahbiv.com` serves the new site and a real test order clears:

- Before pulling the plug: **final catalog pull from Wix**
  (`migration/pull-wix.mjs` — Wix Stores is still the inventory source of truth),
  and confirm **PayMe** has moved the account off the Wix site to our URL
  (1–2 business days — `PAYMENTS.md`, `docs/LAUNCH-CHECKLIST.md`).
- Wix → **Account → Subscriptions** → the **site plan** → **turn off auto-renew**
  (keeps the old site as a reference until the paid term ends, at no extra cost),
  or **Cancel** for a refund if still inside the 14-day window
  (<https://support.wix.com/en/article/requesting-a-refund-for-a-premium-plan>).
- Check the same page for other Wix subscriptions — mailboxes, paid apps — each
  cancels separately
  (<https://support.wix.com/en/article/canceling-your-premium-plan-and-domain>).
- If Wix mailboxes were the business email, migrate them **before** this, and keep
  the MX records in Cloudflare pointing at whatever replaces them.
- The Wix site itself isn't deleted — it reverts to a free `*.wixsite.com` URL.

At the end, the only recurring cost for the domain is Namecheap's ~$15/yr renewal
in Feb 2028.

## Verification checklist

- [ ] `curl -sI https://lev-hatahbiv.com` → 200, and the HTML is the new SPA
- [ ] `www.lev-hatahbiv.com` → 301 → apex, valid certificate
- [ ] `/manage` login works (JWT against the Worker + Render API)
- [ ] A real ₪1 order end to end: PayMe page → payment → webhook marks it paid
- [ ] Email to/from the domain still delivers (MX intact)
- [ ] Old deep links 301 to the new pages; sitemap resubmitted in GSC

## Rollback

DNS is now ours in Cloudflare: restore the original A/CNAME values from the Step 0
screenshots and the old site is back — as long as the Wix plan hasn't lapsed yet.
That's the reason for turning off auto-renew rather than cancelling immediately.

## Things that are NOT needed (previously assumed)

- ~~Transferring the domain away from Wix~~ — it was never at Wix.
- ~~EPP/authorization code, unlocking, disabling privacy, the ICANN 60-day lock~~ —
  all transfer-only concerns.
- ~~Deleting and re-buying the domain~~ — never an option: once released, anyone
  can register it.

## Optional, later

Namecheap renews at roughly $15/yr; Cloudflare Registrar sells at cost (~$10–12
for `.com`). Once the zone is Active on Cloudflare, moving the *registration*
there is a normal transfer (needs an auth code from Namecheap and no contact
changes in the previous 60 days). Worth a few dollars a year, not urgent —
and there is nothing wrong with staying at Namecheap.
