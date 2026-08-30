-- D1 schema for lev-hatahbiv dynamic data (coupons, subscribers, orders).
-- Apply locally:  npx wrangler d1 execute lev --local --file=worker/schema.sql
-- Apply to prod:  npx wrangler d1 execute lev --remote --file=worker/schema.sql

-- Coupons — manager-created (reusable) AND welcome (single-use, tied to an email).
CREATE TABLE IF NOT EXISTS coupons (
  code        TEXT PRIMARY KEY,                 -- always UPPERCASE, e.g. "SUMMER" or "LEV-7K2A"
  percent     INTEGER NOT NULL,                 -- 1..100
  kind        TEXT NOT NULL DEFAULT 'manager',  -- 'manager' | 'welcome'
  email       TEXT,                             -- welcome coupons: the subscriber's email
  max_uses    INTEGER,                          -- NULL = unlimited; 1 = single-use
  used_count  INTEGER NOT NULL DEFAULT 0,       -- bumped on PAYMENT SUCCESS (Phase 3)
  active      INTEGER NOT NULL DEFAULT 1,       -- 0/1
  created_at  TEXT NOT NULL,                    -- ISO timestamp
  expires_at  TEXT                              -- optional ISO timestamp
);
CREATE INDEX IF NOT EXISTS idx_coupons_kind ON coupons(kind);

-- Newsletter subscribers (one welcome coupon per email).
CREATE TABLE IF NOT EXISTS subscribers (
  email           TEXT PRIMARY KEY,
  coupon_code     TEXT,                         -- their welcome code -> coupons.code
  created_at      TEXT NOT NULL,
  unsubscribed_at TEXT                          -- ISO; set by /api/unsubscribe. NULL = subscribed
);
-- Migration for an EXISTING subscribers table (the live D1 predates this column).
-- Run once before sending any marketing campaign (SQLite has no IF NOT EXISTS on
-- ADD COLUMN — a "duplicate column" error just means it's already applied):
--   npx wrangler d1 execute lev --remote --command "ALTER TABLE subscribers ADD COLUMN unsubscribed_at TEXT;"

-- Orders — paid via PayMe (generate-sale).
-- NOTE: money is stored in AGOROT (integer) to avoid float rounding — 10.30 ILS = 1030.
-- PayMe is agorot-native too, so there is no unit conversion anywhere.
CREATE TABLE IF NOT EXISTS orders (
  id             TEXT PRIMARY KEY,               -- uuid
  created_at     TEXT NOT NULL,
  items          TEXT NOT NULL,                  -- JSON array of {id,name,qty,price}
  subtotal       INTEGER NOT NULL,               -- agorot
  coupon_code    TEXT,
  discount       INTEGER NOT NULL DEFAULT 0,     -- agorot
  delivery       TEXT,
  shipping       TEXT,                           -- JSON {street,city,apt,zip,notes} for courier/mail
  total          INTEGER NOT NULL,               -- agorot
  status         TEXT NOT NULL DEFAULT 'new',    -- new | paid | failed | refunded | handled | cancelled
  payment_ref    TEXT,                           -- PayMe payme_transaction_id
  payme_sale_id  TEXT,                           -- from generate-sale; keys the re-query
  invoice_url    TEXT,                           -- sale_invoice_url from the callback
  payer_name     TEXT,
  payer_email    TEXT,
  payer_phone    TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

-- Migration for an EXISTING orders table. VERIFIED against the live D1 on
-- 2026-08-02 (PRAGMA table_info): it had only id/created_at/items/subtotal/
-- coupon_code/discount/delivery/total/status/payment_ref/shipping, so ALL of
-- these were still required:
--   ALTER TABLE orders ADD COLUMN payme_sale_id TEXT;
--   ALTER TABLE orders ADD COLUMN invoice_url TEXT;
--   ALTER TABLE orders ADD COLUMN payer_name TEXT;
--   ALTER TABLE orders ADD COLUMN payer_email TEXT;
--   ALTER TABLE orders ADD COLUMN payer_phone TEXT;
--   ALTER TABLE orders ADD COLUMN shipping TEXT;   -- applied 2026-08-02
-- SQLite has no "ADD COLUMN IF NOT EXISTS" — a "duplicate column" error just
-- means it is already there, ignore it. ALWAYS confirm with:
--   npx wrangler d1 execute lev --remote --command "PRAGMA table_info(orders);"
-- (A dev DB created from the grow branch may also carry unused process_id /
--  process_token / invoice_number columns — harmless, leave them.)
-- (a legacy payme_sale_id column may exist on the live D1 — harmless, ignore it.)

-- Best-effort per-IP rate limiting for public endpoints (fixed window).
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket     TEXT PRIMARY KEY,                  -- "<route>:<ip>"
  count      INTEGER NOT NULL,
  reset_at   INTEGER NOT NULL                   -- unix seconds when the window resets
);

-- Key/value config the storefront + dashboard read live (no publish needed).
-- Currently: the newsletter welcome-offer toggle + percent.
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('welcome_enabled', '1'),
  ('welcome_percent', '10');
