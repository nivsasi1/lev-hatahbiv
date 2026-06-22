// Drizzle schema — the TYPE-SAFE mirror of worker/schema.sql.
// schema.sql stays the canonical migration (run via `wrangler d1 execute`);
// keep the two in sync when adding columns. Drizzle gives us compile-time
// checks on column names/types — the queries are still parameterized, so this
// is about type-safety + readability, not a change to injection-safety.
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Coupons — manager-created (reusable) AND welcome (single-use, tied to an email).
export const coupons = sqliteTable("coupons", {
  code: text("code").primaryKey(), // always UPPERCASE, e.g. "SUMMER" or "LEV-7K2A"
  percent: integer("percent").notNull(), // 1..100
  kind: text("kind").notNull().default("manager"), // 'manager' | 'welcome'
  email: text("email"), // welcome coupons: the subscriber's email
  maxUses: integer("max_uses"), // NULL = unlimited; 1 = single-use
  usedCount: integer("used_count").notNull().default(0), // bumped on payment success
  active: integer("active").notNull().default(1), // 0/1
  createdAt: text("created_at").notNull(), // ISO timestamp
  expiresAt: text("expires_at"), // optional ISO timestamp
});

// Newsletter subscribers (one welcome coupon per email).
export const subscribers = sqliteTable("subscribers", {
  email: text("email").primaryKey(),
  couponCode: text("coupon_code"), // their welcome code -> coupons.code
  createdAt: text("created_at").notNull(),
});

// Orders (WhatsApp now; real card/Bit payments in Phase 3). Money in AGOROT.
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  items: text("items").notNull(), // JSON array
  subtotal: integer("subtotal").notNull(),
  couponCode: text("coupon_code"),
  discount: integer("discount").notNull().default(0),
  delivery: text("delivery"),
  total: integer("total").notNull(),
  status: text("status").notNull().default("new"),
  paymentRef: text("payment_ref"),
});

// Best-effort per-IP rate limiting for public endpoints (fixed window).
export const rateLimits = sqliteTable("rate_limits", {
  bucket: text("bucket").primaryKey(), // "<route>:<ip>"
  count: integer("count").notNull(),
  resetAt: integer("reset_at").notNull(), // unix seconds
});

// Key/value config the storefront + dashboard read live (no publish needed).
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});
