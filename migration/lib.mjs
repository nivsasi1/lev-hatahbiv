// Shared helpers for the Wix -> MongoDB inventory sync.
// Pure ESM. Loads mongodb/dotenv from Backend/node_modules so nothing extra
// needs installing. Wix is the source of truth; we mirror it into Mongo.
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import dns from "dns";

// Some Windows/VPN setups can't do mongodb+srv DNS SRV lookups via the default
// resolver (Node querySrv ECONNREFUSED) even though the record resolves fine.
// Point Node at public DNS so Atlas (mongodb+srv) connects.
try { dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]); } catch {}

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, "..");
export const BACKEND = join(ROOT, "Backend");
export const MIG = __dirname;
export const OUT = join(MIG, "out");
export const IMAGES = join(MIG, "images");
export const BACKUPS = join(MIG, "backups");

// resolve packages + .env from the Backend project
const require = createRequire(join(BACKEND, "package.json"));
export const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config({ path: join(BACKEND, ".env") });

// ---- identifiers (defaults are the live lev-hatahbiv site/account) ----
export const SITE_ID = process.env.WIX_SITE_ID || "7053be2b-ce06-4c83-a53a-8cedda5182b8";
export const ACCOUNT_ID = process.env.WIX_ACCOUNT_ID || "7331454c-f595-4b00-8cba-5f25a0c14ea6";
export const WIX_API_KEY = process.env.WIX_API_KEY || "";

// Mongo targets: local for dev/catalog generation, atlas for the real site.
// LOCAL uses .env DB_URL (it's the local connection on this machine).
// ATLAS must be set explicitly — never fall back to DB_URL, or --target atlas
// would silently hit local.
export const LOCAL_DB_URL =
  process.env.LOCAL_DB_URL || process.env.DB_URL || "mongodb://127.0.0.1:27017/LevHatahbivDB";
export const ATLAS_DB_URL = process.env.ATLAS_DB_URL || "";
export const DB_NAME = process.env.DB_NAME || "LevHatahbivDB";

// the nine real storefront categories (generator drops anything else)
export const KNOWN_CATEGORIES = new Set([
  "צבעים לאמנות", "צבעים להובי", "רישום ועפרונות", "מכחולים ואביזרים",
  "נייר לאמנות", "כני ציור", "חומרי יצירה", "מקרמה וטריקו", "תכשיטנות",
]);

const SENTINEL_COLLECTION = "00000000-000000-000000-000000000001"; // "All Products"
const WIX_BASE = "https://www.wixapis.com";

export const ensureDirs = () => [OUT, IMAGES, BACKUPS].forEach((d) => mkdirSync(d, { recursive: true }));

// name matching: case-fold latin, drop Hebrew/ascii quotes, collapse spaces
export const normalize = (s) =>
  (s || "").toString().toLowerCase().replace(/["'`״׳]/g, "").replace(/\s+/g, " ").trim();

export const round1 = (n) => Math.round(Number(n) * 10) / 10;

// ---------- Wix REST (API key) ----------
function wixHeaders() {
  if (!WIX_API_KEY) {
    throw new Error(
      "WIX_API_KEY is not set. Add it to Backend/.env (see migration/README.md)."
    );
  }
  return { Authorization: WIX_API_KEY, "wix-site-id": SITE_ID, "Content-Type": "application/json" };
}

async function wixPost(path, body, tries = 4) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(WIX_BASE + path, {
      method: "POST",
      headers: wixHeaders(),
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    const text = await res.text();
    // 429/5xx -> back off and retry; everything else is fatal
    if ((res.status === 429 || res.status >= 500) && attempt < tries) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      continue;
    }
    throw new Error(`Wix ${path} ${res.status}: ${text.slice(0, 300)}`);
  }
}

// the wixstatic media filename (e.g. 733145_<hash>~mv2.png) doubles as the
// S3 key the storefront expects, so we keep it verbatim.
function mediaFilename(m) {
  if (!m) return "";
  if (m.id) return m.id;
  const url = m?.image?.url || m?.url || "";
  const hit = url.match(/\/media\/([^/]+)/);
  return hit ? hit[1] : "";
}

export function projectProduct(p) {
  const pd = p.priceData || p.price || {};
  const main = p.media?.mainMedia;
  const imgId = mediaFilename(main);
  const gallery = (p.media?.items || [])
    .map(mediaFilename)
    .filter((f) => f && f !== imgId);
  return {
    exportProductId: p.exportProductId || "", // == Mongo `id`
    wixId: p.id || "",
    numericId: p.numericId || "",
    name: (p.name || "").trim(),
    slug: p.slug || "",
    sku: (p.sku || "").trim(),
    price: pd.price ?? null,
    discountedPrice: pd.discountedPrice ?? pd.price ?? null,
    discountType: p.discount?.type || "NONE",
    discountValue: p.discount?.value || 0,
    visible: p.visible !== false,
    inStock: !!(p.stock?.inStock),
    inventoryStatus: p.stock?.inventoryStatus || "",
    collectionIds: (p.collectionIds || []).filter((c) => c !== SENTINEL_COLLECTION),
    img: imgId,
    gallery,
    brand: p.brand || "",
    ribbon: p.ribbon || "",
    description: p.description || "",
    lastUpdated: p.lastUpdated || "",
    createdDate: p.createdDate || "",
  };
}

// Pull the FULL catalog. Stable sort by numericId makes offset paging safe;
// we still dedup by exportProductId and verify the count to be certain.
export async function fetchAllProducts({ onProgress } = {}) {
  const byId = new Map();
  let total = null;
  for (let offset = 0; ; offset += 100) {
    const r = await wixPost("/stores/v1/products/query", {
      query: { sort: '[{"numericId":"asc"}]', paging: { limit: 100, offset } },
    });
    total = r.totalResults ?? total;
    const items = r.products || [];
    for (const p of items) {
      const proj = projectProduct(p);
      if (proj.exportProductId) byId.set(proj.exportProductId, proj);
      else byId.set("__noexport_" + proj.wixId, proj); // keep, flag later
    }
    if (onProgress) onProgress(byId.size, total);
    if (items.length < 100) break;
    if (offset > 20000) break; // safety
  }
  const products = [...byId.values()];
  return { products, total, complete: total == null || products.length >= total };
}

export async function fetchAllCollections() {
  const map = {};
  for (let offset = 0; ; offset += 100) {
    const r = await wixPost("/stores/v1/collections/query", {
      query: { paging: { limit: 100, offset } },
      includeNumberOfProducts: true,
    });
    const items = r.collections || [];
    for (const c of items) map[c.id] = { name: c.name, n: c.numberOfProducts ?? null };
    if (items.length < 100) break;
  }
  return map;
}

// ---------- Mongo ----------
export async function withMongo(uri, fn) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  try {
    const db = uri.includes("/") && uri.split("/").pop().split("?")[0]
      ? client.db(uri.split("/").pop().split("?")[0] || DB_NAME)
      : client.db(DB_NAME);
    return await fn(db.collection("products"), db);
  } finally {
    await client.close().catch(() => {});
  }
}

export function backupDocs(docs, tag) {
  ensureDirs();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(BACKUPS, `products-${tag}-${stamp}.json`);
  writeFileSync(file, JSON.stringify(docs));
  return file;
}

// ---------- CSV ----------
export const csvEscape = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (headers, rows) =>
  "﻿" + [headers.join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");

export const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
export const writeJson = (file, obj) => writeFileSync(file, JSON.stringify(obj));

// strip Wix description HTML the same way the catalog generator does
export const stripHtml = (html) =>
  (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
