// One-off: build the old-Wix-URL → new-site maps from the Wix Stores API.
//
//   node scripts/seo/pull-wix-maps.mjs          (from Frontend/)
//
// Needs WIX_API_KEY in Backend/.env (read at runtime, never written anywhere).
// Writes four committed tables next to this file, consumed by generate-seo.mjs:
//   wix-product-map.json      { "<wix product slug>": "<our product id>" }
//   wix-product-fallback.json { "<wix product slug>": "410" | "/category/..." | "/search?q=..." }
//   collections-map.json      { "<wix collection slug>": "/category/<cat>/<sub>[?third=...]" }
//   topic-map.json            { "/<wix page path>": "/..." }   (hand table below, validated)
//
// The Wix catalog is frozen (all edits happen in /manage now), so these snapshots are final;
// the script stays so the tables can be regenerated / audited.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { slugify } from "./slug.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const META_SITE_ID = "7053be2b-ce06-4c83-a53a-8cedda5182b8"; // public, from the Wix site HTML

const env = readFileSync(join(root, "Backend", ".env"), "utf8");
const key = env
  .split(/\r?\n/)
  .map((l) => l.match(/^\s*WIX_API_KEY\s*=\s*(.+?)\s*$/))
  .filter(Boolean)
  .map((m) => m[1].replace(/^["']|["']$/g, ""))[0];
if (!key) throw new Error("WIX_API_KEY missing in Backend/.env");

const api = async (path, body) => {
  const res = await fetch("https://www.wixapis.com" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: key, "wix-site-id": META_SITE_ID },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
};
const pageAll = async (path, field, extra = {}) => {
  const out = [];
  for (let offset = 0; ; offset += 100) {
    const j = await api(path, { query: { paging: { limit: 100, offset } }, ...extra });
    const rows = j[field] ?? [];
    out.push(...rows);
    if (rows.length < 100) break;
  }
  return out;
};

const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
const bigrams = (s) => {
  const set = new Set();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
};
const dice = (a, b) => {
  const A = bigrams(a), B = bigrams(b);
  let hit = 0;
  for (const x of A) if (B.has(x)) hit++;
  return (2 * hit) / (A.size + B.size || 1);
};

// ---- our side -------------------------------------------------------------
const catalog = JSON.parse(readFileSync(join(root, "Frontend", "src", "data", "products.json"), "utf8"));
const dump = JSON.parse(readFileSync(join(root, "Backend", "products-dump.json"), "utf8"));
const ids = new Set(catalog.map((r) => r.id));
const byId = new Map(catalog.map((r) => [r.id, r]));
const bySku = new Map(), byName = new Map(), bySlug = new Map();
const push = (m, k, v) => (m.get(k) ?? m.set(k, []).get(k)).push(v);
for (const d of dump) {
  const id = String(d._id);
  if (!ids.has(id)) continue;
  const sku = String(d.sku ?? "").trim();
  if (sku.length >= 4) push(bySku, sku, id);
}
for (const r of catalog) {
  push(byName, norm(r.name), r.id);
  push(bySlug, slugify(r.name), r.id);
}
const first = (arr) => [...arr].sort()[0]; // deterministic tie-break: lowest id
const slugKeys = [...bySlug.keys()];

// ---- Wix side -------------------------------------------------------------
console.log("pulling Wix collections + products…");
const collections = await pageAll("/stores/v1/collections/query", "collections");
const products = await pageAll("/stores-reader/v1/products/query", "products", { includeVariants: false });
console.log(`wix: ${collections.length} collections, ${products.length} products`);

// ---- product map ----------------------------------------------------------
const productMap = {}, fallback = {}, how = {};
for (const p of products) {
  const sku = String(p.sku ?? "").trim();
  const n = norm(p.name), sl = slugify(p.name);
  let id = null, via = null;
  if (sku.length >= 4 && bySku.has(sku)) (id = first(bySku.get(sku))), (via = "sku");
  else if (byName.has(n)) (id = first(byName.get(n))), (via = "name");
  else if (bySlug.has(p.slug)) (id = first(bySlug.get(p.slug))), (via = "slug");
  else {
    let best = null, bestScore = 0;
    for (const k of slugKeys) {
      const s = dice(sl, k);
      if (s > bestScore) (bestScore = s), (best = k);
    }
    if (bestScore >= 0.9) (id = first(bySlug.get(best))), (via = "fuzzy");
  }
  if (id) {
    productMap[p.slug] = id;
    how[via] = (how[via] ?? 0) + 1;
    continue;
  }
  // no product on our side — pick the most useful landing
  if (/i'm a product/i.test(p.name)) fallback[p.slug] = "410"; // Wix template demo rows
  else if (/לפי מספר/.test(p.name)) fallback[p.slug] = `/category/hobby/${slugify("מיקס מדיה")}?third=${slugify("צביעה לפי מספר")}`;
  else fallback[p.slug] = `/search?q=${encodeURIComponent(String(p.name).trim())}`;
  how.unmatched = (how.unmatched ?? 0) + 1;
}
console.log("product map:", how, `-> ${Object.keys(productMap).length} mapped, ${Object.keys(fallback).length} fallback`);

// ---- collections map (by member products) ---------------------------------
const target = (cat, sub, third) =>
  `/category/${cat}/${slugify(sub)}` + (third && third !== "כללי" ? `?third=${slugify(third)}` : "");
const byCollection = new Map();
for (const p of products) for (const c of p.collectionIds ?? []) push(byCollection, c, p);
const top = (counter) => [...counter.entries()].sort((a, b) => b[1] - a[1])[0];
const collectionsMap = {};
const HAND_COLLECTIONS = {
  "all-products": "/",
  "נריה-שילה": ["paints", "צבעי אקוורל", "נריה שילה"],
  "עזרים-ומדיומים-לצבע-אקריליק": ["paints", "מדיומים לציור"],
  "עזרים-ומדיומים-לצבע-שמן": ["paints", "מדיומים לציור"],
  "עזרים-ומדיומים-לצבעי-מים": ["paints", "מדיומים לציור"],
  "מכחול-פרינסטון-מיוחדים": ["brushes", "מכחולים"],
  "מכחולי-דה-וינצי-ירוק": ["brushes", "מכחולים"],
  "פסטל-יבש-רק-ריבס": ["paints", "צבעי פסטל"],
  "צבע-אקריליק-אמריקנה-דקוארט": ["hobby", "מיקס מדיה", "אמריקנה דקוארט"],
  "צבע-אקריליק-אפל": ["paints", "צבע אקריליק"],
  "צבע-אקריליק-טריפ": ["paints", "צבע אקריליק", "צבע אקריליק טריפ פרופשיונל"],
  "צבע-זכוכית-שקוף-vitrail": ["hobby", "מיקס מדיה"],
  "צבע-שמן-ויליאמסבורג-37": ["paints", "צבעי שמן"],
  "צבעי-שעווה": ["drawing", "עפרון שמן/שעווה"],
};
let strong = 0, weak = 0, hand = 0;
for (const c of collections) {
  const slug = c.slug;
  if (HAND_COLLECTIONS[slug]) {
    const h = HAND_COLLECTIONS[slug];
    collectionsMap[slug] = typeof h === "string" ? h : target(...h);
    hand++;
    continue;
  }
  const members = byCollection.get(c.id) ?? [];
  const hits = members.map((p) => byId.get(productMap[p.slug])).filter(Boolean);
  if (!hits.length) throw new Error(`collection "${slug}" has no matched products — add it to HAND_COLLECTIONS`);
  const shelf = new Map();
  for (const h of hits) shelf.set(`${h.cat}|${h.sub}`, (shelf.get(`${h.cat}|${h.sub}`) ?? 0) + 1);
  const [key, n] = top(shelf);
  const [cat, sub] = key.split("|");
  const thirds = new Map();
  for (const h of hits) if (h.cat === cat && h.sub === sub) thirds.set(h.third, (thirds.get(h.third) ?? 0) + 1);
  const [third, tn] = top(thirds);
  if (n / hits.length < 0.6) console.warn(`  weak: ${slug} -> ${cat}/${sub} (${n}/${hits.length})`), weak++;
  else strong++;
  collectionsMap[slug] = target(cat, sub, tn / n >= 0.6 ? third : null);
}
console.log(`collections map: ${strong} strong, ${weak} weak, ${hand} hand`);

// ---- topic pages (hand table; names validated against the catalog) --------
// value: "/path" | [cat] | [cat, sub] | [cat, sub, third]
const TOPICS = {
  "/": "/", "/store": "/", "/products-1": "/", "/copy-of-2": "/", "/blank-2": "/",
  "/blank-3": "/contact", "/blank-5": "/workshops", "/courses": "/workshops",
  "/faq": "/returns", "/shipping-returns": "/returns", "/store-policy": "/terms",
  // paper
  "/נייר-לציור": ["paper"], "/גליונות-נייר": ["paper", "גליונות נייר"], "/בלוקים": ["paper", "בלוקי נייר"],
  "/copy-of-14": ["paper", "גליונות נייר"], "/נייר-ליצירה": ["craft", "נייר ליצירה"],
  // oil
  "/oil-color-winsor-newton": ["paints", "צבעי שמן", 'צבע שמן וינטון 37מ"ל'],
  "/copy-of-van-gogh-oil": ["paints", "צבעי שמן"], "/van-gogh-oil-color": ["paints", "צבעי שמן"],
  "/van-gogh-oil-color-200": ["paints", "צבעי שמן", "ואן גוך 200מל"],
  "/שמן-ואן-גוך-20": ["paints", "צבעי שמן", 'צבע שמן ואן גוך- 20מ"ל'], "/oil-paint": ["paints", "צבעי שמן"],
  "/copy-of-צבע-שמן-טאלנס-ואן-גוך-20": ["paints", "צבעי שמן", "דאלר גאורגיאן 38מל"],
  // fiber
  "/מקרמה": ["fiber"], "/מקרמה-טריקו": ["fiber"], "/טריקו": ["fiber", "טריקו"], "/צמר": ["fiber", "צמר"],
  // easels
  "/כן-ציור-שולחני": ["easels", "כני ציור שולחני"], "/כן-ציור-סטודיו": ["easels", "כני ציור סטודיו"],
  "/כן-ציור-נייד": ["easels", "כני ציור ניידים ומזוודות"], "/כני-ציור": ["easels"],
  // brushes
  "/מכחולים": ["brushes"], "/סט-מכחולים": ["brushes", "מכחולים"], "/מכחול-פרינסטון": ["brushes", "מכחולים"],
  "/מכחולי-רוברט-סימונס-סיגנט": ["brushes", "מכחולים"], "/שפכטלים-לציור": ["brushes", "שפכטלים"],
  "/תוספים-ועזרים-לציור": ["brushes", "חומרי עזר"],
  // craft / jewelry
  "/תכשיטנות": ["jewelry"], "/יצירה": ["craft"], "/חומרי-יצירה": ["craft"], "/פיסול": ["craft", "פיסול"],
  "/חימר-פולימרי": ["craft", "פיסול"], "/copy-of-11": ["craft", "לבד"],
  "/copy-of-10": ["hobby", "מיקס מדיה"], "/copy-of-12": ["hobby", "מיקס מדיה"], "/copy-of-18": ["hobby", "מיקס מדיה"],
  // hobby
  "/מיקס-מדיה": ["hobby", "מיקס מדיה"], "/צבעים-להובי": ["hobby"],
  "/צבעי-אקריליק-הובי": ["hobby", "מיקס מדיה", "אמריקנה דקוארט"], "/צבע-לזכוכית-קרמיקה": ["hobby", "מיקס מדיה"],
  "/צבעי-בד-באבקה-באטיק": ["hobby", "צבעי בד/טקסטיל"], "/צבעי-בד-וטאיי-דיי": ["hobby", "צבעי בד/טקסטיל"],
  "/פיגמנטים": ["hobby", "אבקות פיגמנטים"], "/דיו-אלכוהולי": ["hobby", "צבע דיו אלכוהולי"],
  "/ספריי-צבע": ["hobby", "ספריי צבע"], "/צבע-לחידוש-רהיטים": ["hobby", "חידוש רהיטים"],
  "/צביעה-לפי-מספרים": ["hobby", "מיקס מדיה", "צביעה לפי מספר"],
  // drawing
  "/אקוורל-עפרונות": ["drawing", "עפרון אקוורל"], "/טושים-לציור": ["drawing", "טוש לציור"],
  "/טוש-אלכוהול": ["drawing", "טוש אלכוהולי"], "/copy-of-טוש-לציור": ["drawing", "טוש אלכוהולי"],
  "/עזרים-לפחם-ולעפרונות": ["drawing", "חומרי עזר לעפרונות"], "/עפרון-רישום-גרפיט": ["drawing", "עפרון רישום/גרפיט"],
  "/פחם": ["drawing", "פחם"], "/עפרון-פחם": ["drawing", "פחם", "עפרון פחם"], "/מרקרים": ["drawing"],
  "/עפרונות": ["drawing"], "/חומרי-עזר-שרטוט": ["drawing", "שרטוט - חומרי עזר"],
  "/עפרון-פסטל": ["drawing", "עפרון פסטל"], "/טוש-מכחול-מים-zig-clear": ["drawing", "טוש לציור", "טוש ZIG Clear / טושי מים"],
  "/עפרון-שמן-שעווה": ["drawing", "עפרון שמן/שעווה"], "/עפרון-דיו": ["drawing", "עפרון דיו"],
  "/טוש-אקריליק": ["drawing", "טוש אקרילי"],
  // paints
  "/אמסטרדם-amsterdam-120": ["paints", "צבע אקריליק", "צבע אקריליק אמסטרדם 120"],
  "/מדיומים-לצבעים-שונים": ["paints", "מדיומים לציור"], "/art-paint": ["paints"],
  "/צבע-מים-אקוורל": ["paints", "צבעי אקוורל"], "/צבע-גואש": ["paints", "צבעי גואש"],
  "/צבע-אקריליק": ["paints", "צבע אקריליק"],
  "/white-nights": ["paints", "צבעי אקוורל", "אקוורל כפתור בודד - סנט פטרסבורג"],
  "/טריפ-פרופשיונל": ["paints", "צבע אקריליק", "צבע אקריליק טריפ פרופשיונל"],
  "/אקוליין-ecoline": ["paints", "צבעי אקוורל", "צבעי מים נוזליים - ECOLINE"],
  "/copy-of-אקוליין-ecoline-2": ["paints", "צבעי אקוורל", "צבעי פסטל - קארנדאש"],
  "/צבע-פסטל": ["paints", "צבעי פסטל"],
};
const known = new Set(catalog.map((r) => `${r.cat}|${r.sub}|${r.third}`));
const knownSub = new Set(catalog.map((r) => `${r.cat}|${r.sub}`));
const knownCat = new Set(catalog.map((r) => r.cat));
const topicMap = {};
for (const [path, v] of Object.entries(TOPICS)) {
  if (typeof v === "string") {
    topicMap[path] = v;
    continue;
  }
  const [cat, sub, third] = v;
  if (!knownCat.has(cat)) throw new Error(`topic ${path}: unknown category ${cat}`);
  if (sub && !knownSub.has(`${cat}|${sub}`)) throw new Error(`topic ${path}: unknown sub ${cat}/${sub}`);
  if (third && !known.has(`${cat}|${sub}|${third}`)) throw new Error(`topic ${path}: unknown third ${cat}/${sub}/${third}`);
  topicMap[path] = sub ? target(cat, sub, third) : `/category/${cat}`;
}
// every page in the captured Wix sitemap must be covered
const pagesXml = readFileSync(join(root, "docs", "seo", "wix-pages-sitemap.xml"), "utf8");
const pagePaths = [...pagesXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) =>
  decodeURIComponent(m[1].replace(/&amp;/g, "&").replace(/^https?:\/\/[^/]+/, "")) || "/"
);
const missing = pagePaths.filter((p) => !(p in topicMap));
if (missing.length) throw new Error("topic pages without a target: " + missing.join(" "));
console.log(`topic map: ${Object.keys(topicMap).length} entries (${pagePaths.length} sitemap pages covered)`);

const sortObj = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const write = (name, obj) => writeFileSync(join(here, name), JSON.stringify(sortObj(obj), null, 1) + "\n");
write("wix-product-map.json", productMap);
write("wix-product-fallback.json", fallback);
write("collections-map.json", collectionsMap);
write("topic-map.json", topicMap);
console.log("wrote 4 tables to", here);
