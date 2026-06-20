// Learn the Wix-collection -> (category / sub_cat / third_level) mapping from
// products that already exist in BOTH systems, so brand-new Wix products land
// in the right place in the storefront's 3-level taxonomy instead of being
// dropped (the catalog generator silently skips unknown categories).
import { normalize, KNOWN_CATEGORIES } from "./lib.mjs";

const tripleKey = (t) => `${t.cat}|||${t.sub}|||${t.third}`;
const fromKey = (k) => { const [cat, sub, third] = k.split("|||"); return { cat, sub, third }; };

// tokens for fuzzy name matching (Hebrew words + latin, length>=2)
const tokens = (s) => normalize(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2);

// Build collectionId -> majority taxonomy, using only matched products.
export function buildColToTax(wixProducts, mongoByExportId) {
  const tally = new Map(); // colId -> Map(tripleKey -> count)
  for (const w of wixProducts) {
    const m = mongoByExportId.get(w.exportProductId);
    if (!m || !KNOWN_CATEGORIES.has(m.cat)) continue;
    const key = tripleKey({ cat: m.cat, sub: m.sub || "כללי", third: m.third || "כללי" });
    for (const col of w.collectionIds) {
      if (!tally.has(col)) tally.set(col, new Map());
      const t = tally.get(col);
      t.set(key, (t.get(key) || 0) + 1);
    }
  }
  const colToTax = {};
  for (const [col, t] of tally) {
    let best = null, bestN = 0, totalN = 0;
    for (const [k, n] of t) { totalN += n; if (n > bestN) { bestN = n; best = k; } }
    colToTax[col] = { ...fromKey(best), votes: bestN, total: totalN };
  }
  return colToTax;
}

// All distinct Mongo triples (with counts) -> fuzzy targets for unmapped cols.
export function buildTripleIndex(mongoProducts) {
  const m = new Map();
  for (const p of mongoProducts) {
    if (!KNOWN_CATEGORIES.has(p.cat)) continue;
    const t = { cat: p.cat, sub: p.sub || "כללי", third: p.third || "כללי" };
    const k = tripleKey(t);
    if (!m.has(k)) m.set(k, { ...t, count: 0, toks: new Set([...tokens(t.sub), ...tokens(t.third)]) });
    m.get(k).count++;
  }
  return [...m.values()];
}

// Score a collection name against a triple by shared tokens.
function fuzzyScore(colName, triple) {
  const cn = new Set(tokens(colName));
  if (!cn.size) return 0;
  let shared = 0;
  for (const tk of triple.toks) if (cn.has(tk)) shared++;
  // normalise by collection-name length so short generic names don't dominate
  return shared / Math.max(2, cn.size);
}

// Decide a taxonomy for one missing product.
// Returns { cat, sub, third, source, confidence } or { source:"UNMAPPED" }.
export function assignTaxonomy(missing, { colToTax, collections, tripleIndex, overrides = {} }) {
  // collections ordered most-specific (smallest) first
  const cols = [...missing.collectionIds].sort(
    (a, b) => (collections[a]?.n ?? 1e9) - (collections[b]?.n ?? 1e9)
  );

  // 1) a collection we already learned from matched products
  for (const c of cols) {
    if (colToTax[c]) return { ...colToTax[c], source: `collection-matched:${collections[c]?.name || c}`, confidence: "high" };
  }

  // 1b) a human/agent-approved override for a brand-new collection
  for (const c of cols) {
    const o = overrides[c];
    if (o && o.cat && o.cat !== "REVIEW") {
      return { cat: o.cat, sub: o.sub || "כללי", third: o.third || collections[c]?.name || "כללי",
        source: `override:${collections[c]?.name || c}`, confidence: o.confidence || "medium" };
    }
  }

  // 2) fuzzy: collection name vs known Mongo sub/third
  let best = null, bestScore = 0, bestCol = "";
  for (const c of cols) {
    const name = collections[c]?.name || "";
    for (const tri of tripleIndex) {
      const s = fuzzyScore(name, tri);
      if (s > bestScore) { bestScore = s; best = tri; bestCol = name; }
    }
  }
  if (best && bestScore >= 0.5) {
    return { cat: best.cat, sub: best.sub, third: best.third, source: `name-fuzzy:${bestCol}`, confidence: bestScore >= 0.75 ? "medium" : "low" };
  }

  return { source: "UNMAPPED", confidence: "none",
    collectionNames: cols.map((c) => collections[c]?.name || c).join(" | ") };
}
