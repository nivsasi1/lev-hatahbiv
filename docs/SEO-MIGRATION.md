# SEO migration — keep the #1 Google ranking + sitelinks after the domain cutover

Owner ask (2026-08-22): after `lev-hatahbiv.com` points at the new site, it must keep
ranking #1 for the shop's name with sitelinks (חומרי יצירה / צור קשר / חוגים / בדי ציור /
צבעים לאמנות), like the Wix site does today. Knowledge panel: 4.7★ / 405 reviews, GBP
"אתר" button already points at lev-hatahbiv.com (survives automatically — same domain).

## Why this mostly works in our favour
Keeping the SAME domain preserves the bulk of the ranking. What we can lose is
**page-level equity**: Google has ~3,000 Wix URLs indexed, and every one of them will 404
on the new site unless redirected. Sitelinks are generated from those pages. So the job is:
(1) redirect old URLs to their new equivalents, (2) give the new site the SEO plumbing the
Wix site had (per-page titles, sitemap, structured data), (3) tell Search Console.

## Phase 0 — DONE 2026-08-22: old URL inventory captured (before it disappears)
`docs/seo/wix-*.xml` — fetched from the live Wix sitemaps:
- `wix-pages-sitemap.xml` — **84** topic/category pages (`/מכחולים`, `/צבע-אקריליק`,
  `/חומרי-יצירה`, `/courses`, `/faq`, `/shipping-returns`, `/store-policy`, …)
- `wix-store-products-sitemap.xml` — **2,548** `/product-page/<slug>` URLs
- `wix-dynamic-collections-{1,2}…` — **216 × 2** `/collections-1|2/<slug>` URLs
- Wix `robots.txt` captured too (nothing special).

## Phase 1 — MUST ship together with the domain cutover (code, ~1 day)

### 1. 301 redirect layer in the Worker (the big one)
Old Wix path → new route, before the static-asset fallthrough in `worker/index.ts`:
- **Topic pages (84)** → hand-written map to `/category/:slug` (+ sub where obvious),
  e.g. `/מכחולים`→brushes, `/צבע-אקריליק`/`/art-paint`/`/oil-paint`/`/צבעים-להובי`→paints,
  `/חומרי-יצירה`/`/יצירה`→crafts, `/כני-ציור`→easels, `/נייר-לציור`/`/בלוקים`→paper,
  `/courses`→workshops anchor, `/faq`·`/shipping-returns`·`/store-policy`→our policy pages,
  `/store`·`/products-1`·`/collections-*/all-products`→`/`. Junk (`blank-2`, `copy-of-11`)
  → real 404, NOT home (blanket home-redirects are treated as soft-404).
- **Product pages (2,548)**: `/product-page/<slug>` → `/product/:id`. No slug field exists in
  our data, but both catalogs come from the same Wix export, so build a
  **slug→id map at generate time** by slugifying `name` the Wix way (lowercase, spaces→`-`,
  strip punctuation, Hebrew kept). Measure the hit-rate against
  `docs/seo/wix-store-products-sitemap.xml`; unmatched slugs → `/search?q=<words>`
  (still relevant, not a 404). Bake the map into an asset the Worker reads (like
  `checkout-pricing.json`), don't hardcode 2.5k lines.
- **Collections (432)** → the closest `/category/:slug` or `/search?q=`.
- Always **301** (permanent), preserve nothing else. Unit-test the map against the captured
  sitemaps: every URL must resolve to 301→2xx or an intentional 404.

### 2. `robots.txt` + `sitemap.xml`
- Generate `sitemap.xml` in `generate-catalog.mjs` (home, categories, all products, policy
  pages; `lastmod` from `updatedAt`) into `Frontend/public/`; `robots.txt` pointing at it.
  Disallow `/manage`, `/designs/*`, `/cart`, `/thank-you`, `/api/`.

### 3. Per-route `<title>` + meta description (SPA currently has ONE global title)
- Tiny `usePageMeta(title, description)` hook; category pages "<category> | לב התחביב",
  product pages "<product> | לב התחביב", home keeps the pattern that ranks today:
  `לב התחביב בע"מ | ציוד לאמנות | המנוף 6, רחובות`. Add `og:title/description/image`.
- Google renders JS fine for this, but titles drive sitelink labels and CTR.

### 4. Structured data (JSON-LD) — feeds the knowledge panel + sitelinks
- Home: `Store`/`LocalBusiness` — name, address (המנוף 6, רחובות), telephone 08-9315213,
  `openingHoursSpecification`, `geo`, `sameAs` [Instagram @levhatahbiv, Facebook], `url`.
  Must MATCH the Google Business Profile exactly (same hours/phone) — consistency is a signal.
- Category pages: `BreadcrumbList`. Product pages: `Product` + `Offer` (price ILS,
  availability, image). `SiteNavigationElement` for the header categories is cheap and
  helps sitelink selection.

## Phase 2 — the day of / week after cutover (no code)
5. **Google Search Console** — the domain is ALREADY verified (the
   `google-site-verification` TXT we preserved in Cloudflare DNS). After cutover: submit the
   new `sitemap.xml`, run URL Inspection on home + 3 category pages, then watch
   **Coverage → 404s** for old Wix URLs we missed; patch the redirect map weekly for a month.
   NO "change of address" needed (same domain).
6. **Google Business Profile** — click "אתר" and confirm it opens the NEW site; keep
   hours/phone identical to the JSON-LD. Add a post announcing the new site (free signal).
7. Watch Search Console → Performance for the queries that currently earn sitelinks.
   Sitelinks can't be forced; they return when Google re-crawls a clear nav + sitemap +
   consistent titles. Expect 2–6 weeks of wobble.

## Phase 3 — only if Search Console shows indexing trouble
8. Prerender top pages (home, 8 categories, top products) at build, or have the Worker
   inject title/meta/JSON-LD server-side for `/category/*` and `/product/*`.
   The SPA is crawlable as-is; this is insurance, not a prerequisite.

## Order of operations with the domain move
Phase 1 must be live on the Worker BEFORE nameservers reach Cloudflare — the redirects must
answer from the first request on the new domain. So: build Phase 1 now while the registrar
transfer is in progress (it takes ~a week anyway), deploy, then flip nameservers.
