# Wix → MongoDB inventory sync

Keeps the new storefront's catalog in sync with the **live Wix store** (the source
of truth). Pulls the full Wix catalog, reconciles it against MongoDB, and applies
adds / price+stock updates / removals — to **local** Mongo and (with one flag) to
**Atlas** (production). Re-run anytime to "stay on time" with Wix.

Join key: Mongo `id` (`product_<uuid>`) == Wix `exportProductId` → falls back to
SKU, then normalized name.

## One-time setup

1. **Create a Wix API key** (read-only is enough):
   - Go to <https://manage.wix.com/account/api-keys>
   - **Create API key** → name it `lev-sync` → give it the **Wix Stores → Read Products & Read Stores** permissions (read-only) → restrict it to the **lev-hatahbiv** site.
   - Copy the key (shown once).
2. **Put it in `Backend/.env`** (already gitignored — never commit it):
   ```
   WIX_API_KEY=<the key>
   ```
3. (For production) add your Atlas connection string too, when you want to push to the real site:
   ```
   ATLAS_DB_URL=mongodb+srv://<user>:<pass>@<cluster>/LevHatahbivDB
   ```

Site/account IDs are already baked in (`WIX_SITE_ID`, `WIX_ACCOUNT_ID` override them if needed).

## Run order

```bash
node migration/pull-wix.mjs            # 1. Wix catalog -> migration/wix-products.json (+ collections)
node migration/reconcile.mjs           # 2. diff vs LOCAL Mongo -> reports + CSVs + plan (read-only)
node migration/download-images.mjs     # 3. fetch needed images -> migration/images/

node migration/sync.mjs                # 4. DRY-RUN on local (shows what would change, makes a backup)
node migration/sync.mjs --apply        # 5. apply to LOCAL Mongo (backup first)

cd Backend  && node dump-products.js           # 6. regenerate the static catalog...
cd Frontend && node scripts/generate-catalog.mjs

# when local looks right, push the same plan to production:
node migration/reconcile.mjs --target atlas    # atlas has its own _ids
node migration/sync.mjs --target atlas --apply

node migration/upload-s3.mjs            # upload new product images to S3 (skips existing)
```

`collection-overrides.json` (committed) maps brand-new Wix collections (Golden, Daniel
Smith, DecoArt Americana, FW INK, …) to category/sub/third so re-syncs file them
consistently. Add a line there when a new line appears, or let the classifier re-run.

Flags: `--apply` (commit; default is dry-run) · `--target atlas` · `--delete-removed`
(hard-delete discontinued instead of hiding) · `--uri <mongo-uri>` (override target).

## Outputs (`migration/out/`)

| File | What |
|---|---|
| `report-missing.csv` | Products in Wix but not on the site, with the category we mapped them to |
| `needs-category-review.csv` | Missing products we could **not** confidently categorize — fix these before they go live |
| `report-discontinued.csv` | In the store but gone/hidden/out-of-stock in Wix |
| `report-prices.csv` | Price + sale comparison, mismatches flagged |
| `report-category-map.md` | How each Wix collection maps to category / sub_cat / third_level |
| `add-products*.csv` | Dashboard-import CSV (matches `/manage` CSV import; ≤400 rows/file) |
| `images-manifest.json` | Every image to fetch (new products + broken-existing) |
| `plan.json` | Machine plan `sync.mjs` applies |

## Safety

- `sync.mjs` **backs up the whole products collection** to `migration/backups/` before any write (even dry-run).
- Removed products are **hidden** (`isActive=false`), not deleted, unless `--delete-removed`.
- Only confidently-categorized products are auto-added; the rest wait in `needs-category-review.csv`
  so nothing lands on the site mis-filed.
- The Wix API key is read-only and lives only in `Backend/.env`.
