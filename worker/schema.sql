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
  email        TEXT PRIMARY KEY,
  coupon_code  TEXT,                            -- their welcome code -> coupons.code
  created_at   TEXT NOT NULL
);

-- Orders (WhatsApp now; real card/Bit payments in Phase 3).
-- NOTE: money is stored in AGOROT (integer) to avoid float rounding — 10.30 ILS = 1030.
CREATE TABLE IF NOT EXISTS orders (
  id           TEXT PRIMARY KEY,                -- uuid
  created_at   TEXT NOT NULL,
  items        TEXT NOT NULL,                   -- JSON array of {productId,name,qty,price}
  subtotal     INTEGER NOT NULL,                -- agorot
  coupon_code  TEXT,
  discount     INTEGER NOT NULL DEFAULT 0,      -- agorot
  delivery     TEXT,
  total        INTEGER NOT NULL,                -- agorot
  status       TEXT NOT NULL DEFAULT 'new',     -- new | paid | fulfilled | cancelled
  payment_ref  TEXT                             -- provider transaction id (Phase 3)
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

-- Best-effort per-IP rate limiting for public endpoints (fixed window).
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket     TEXT PRIMARY KEY,                  -- "<route>:<ip>"
  count      INTEGER NOT NULL,
  reset_at   INTEGER NOT NULL                   -- unix seconds when the window resets
);
