// Fill hidden search keywords (searchKeywords) for whole brand families at
// once — e.g. "גולדן" on every GOLDEN product — so shoppers and the manager can
// find a brand by its Hebrew name (or an English name a Hebrew listing lacks).
//
// Additive and idempotent: it only APPENDS terms a product is missing — a term
// already present in the product's name / category / shelf / series / keywords
// is skipped — never removes or rewrites what the manager typed, and a second
// run changes nothing. Bulk writes keep updatedAt untouched so the dashboard's
// "last edited" order still means what the manager did.
//
//   node scripts/fill-search-keywords.js           # dry run against Atlas: prints the plan
//   node scripts/fill-search-keywords.js --dump    # dry run against ../products-dump.json (no DB)
//   node scripts/fill-search-keywords.js --apply   # write the changes
//
// Runs in CI as the ops-fill-search-keywords workflow (DB_URL secret). To cover
// another brand, add a rule below and run the workflow again.
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const Product = require("../models/products/product.model");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// A rule fires when `match` hits the product's series (third_level), shelf
// (sub_cat) or name — or only the field named in `field`. Every term in `add`
// the product doesn't already carry somewhere searchable gets appended.
// Terms: the brand in Hebrew + the common English spelling + the maker where a
// line is better known by its parent brand (Amsterdam/Rembrandt/Van Gogh → Talens).
// The search matches each typed word as a substring, so "Koh-I-Noor" already
// answers "koh i noor" — no need for spelling variants that only drop punctuation.
const RULES = [
  { match: /golden/i, field: "third_level", add: ["גולדן", "Golden", "הבי בודי"] },
  { match: /אולד הולנד|old holland/i, add: ["Old Holland", "אולד הולנד"] },
  { match: /סנט פטרסבורג|חלומות לבנים|white nights/i, add: ["St. Petersburg", "White Nights", "Nevskaya Palitra", "וייט נייטס", "נבסקאיה"] },
  { match: /דניאל סמית|daniel smith/i, add: ["Daniel Smith", "דניאל סמית"] },
  { match: /אמסטרדם|amsterdam/i, add: ["Amsterdam", "אמסטרדם", "Talens", "טאלנס"] },
  // series only: "לירה רמברנדט" pencils are Lyra's, not Talens'
  { match: /רמברנדט|renbrandt|rembrandt/i, field: "third_level", add: ["Rembrandt", "רמברנדט", "Talens", "טאלנס"] },
  { match: /ואן גוך|van gogh/i, add: ["Van Gogh", "ואן גוך", "Talens", "טאלנס"] },
  { match: /ecoline|אקולין/i, add: ["Ecoline", "אקולין", "Talens", "טאלנס"] },
  { match: /טאלנס|talens/i, add: ["Talens", "טאלנס"] },
  { match: /\bxtc\b/i, add: ["XTC", "הניג", "Honig"] },
  { match: /ספריי 2x/i, field: "third_level", add: ["Rust-Oleum", "ראסט אוליום", "רסט אוליום", "Painter's Touch"] },
  { match: /וינטון|winton/i, add: ["Winton", "וינטון", "Winsor & Newton", "וינזור ניוטון"] },
  { match: /winsor|וינזור|וינסור/i, add: ["Winsor & Newton", "וינזור ניוטון"] },
  { match: /^FW\b/i, field: "third_level", add: ["FW", "Daler Rowney", "דאלר רוני", "דיו אקרילי"] },
  { match: /דקוארט|אמריקנה|americana|decoart/i, add: ["DecoArt", "Americana", "דקו ארט", "אמריקנה"] },
  { match: /sculpey|סקאלפי|סקלפי/i, add: ["Sculpey", "סקאלפי", "סקלפי", "חימר פולימרי"] },
  { match: /fimo|פימו/i, add: ["Fimo", "פימו", "Staedtler", "שטדלר", "חימר פולימרי"] },
  { match: /staedtler|staedler|שטדלר/i, add: ["Staedtler", "שטדלר"] },
  { match: /מרבו|marabu/i, add: ["Marabu", "מרבו"] },
  { match: /ג'אוונה|גאוונה|javana/i, add: ["Javana", "ג'אוונה", "גאוונה"] },
  { match: /ג'אקרד|jacquard|pearl ex/i, add: ["Jacquard", "ג'אקרד"] },
  { match: /pearl ex/i, add: ["Pearl Ex", "פרל אקס", "אבקת פיגמנט"] },
  { match: /faber|פאבר/i, add: ["Faber-Castell", "פאבר קאסטל", "פאבר קסטל"] },
  { match: /\bpitt\b|פיט/i, field: "third_level", add: ["Pitt", "פיט", "Faber-Castell", "פאבר קאסטל"] },
  { match: /פיגמה|pigma/i, field: "third_level", add: ["Pigma Micron", "מיקרון", "פיגמה", "Sakura", "סקורה"] },
  { match: /סקורה|sakura|\bkoi\b/i, add: ["Sakura", "סקורה"] },
  { match: /posca|פוסקה/i, add: ["Posca", "פוסקה", "Uni Posca"] },
  { match: /promarker|פרומרקר/i, add: ["Promarker", "פרומרקר", "Winsor & Newton", "וינזור ניוטון"] },
  { match: /copic|קופיק/i, add: ["Copic", "קופיק"] },
  { match: /\btouch\b|טאצ/i, field: "third_level", add: ["Touch", "טאצ'", "ShinHan", "שינהאן"] },
  { match: /caran|קארנדאש|קרנדש/i, add: ["Caran d'Ache", "Caran dAche", "קארנדאש", "קרנדש"] },
  { match: /דאלר|daler/i, add: ["Daler Rowney", "דאלר רוני"] },
  { match: /ג'אורג'יאן|georgian/i, add: ["Georgian", "ג'ורג'יאן", "Daler Rowney", "דאלר רוני"] },
  { match: /מונט מרט|mont marte/i, add: ["Mont Marte", "מונט מרט"] },
  { match: /kuretake|gansai|קורטאקה|גנסאי/i, add: ["Kuretake", "Gansai Tambi", "קורטאקה", "גנסאי"] },
  { match: /\bzig\b|זיג/i, field: "third_level", add: ["ZIG", "זיג", "Kuretake", "קורטאקה"] },
  { match: /sonnet|סונט/i, add: ["Sonnet", "סונט", "Nevskaya Palitra", "נבסקאיה"] },
  { match: /giotto|גיאוטו|ג'וטו/i, add: ["Giotto", "ג'וטו", "גיוטו"] },
  { match: /strathmore|סטרטמור/i, add: ["Strathmore", "סטרטמור"] },
  { match: /arches|ארצ'/i, add: ["Arches", "ארש", "ארצ'"] },
  { match: /montval|canson|קנסון/i, add: ["Canson", "קנסון"] },
  { match: /קולינסקי ס(י)?דרה 7/i, add: ["Kolinsky", "Series 7", "Winsor & Newton", "וינזור ניוטון"] },
  { match: /tombow|טומבו/i, add: ["Tombow", "טומבו"] },
  { match: /\buhu\b|אוהו/i, add: ["UHU", "אוהו"] },
  { match: /צביעה לפי מספר/i, add: ["Paint by Numbers", "ציור לפי מספרים"] },
  { match: /שאבי שיק|shabby chic/i, add: ["Shabby Chic", "שאבי שיק"] },
  { match: /princeton|פרינסטון/i, add: ["Princeton", "פרינסטון"] },
  { match: /signet|סיגנט/i, add: ["Signet", "סיגנט"] },
  { match: /koh-i-noor|קוהינור/i, add: ["Koh-I-Noor", "קוהינור"] },
  { match: /derwent|דרוונט/i, add: ["Derwent", "דרוונט"] },
  { match: /\blyra\b|לירה/i, add: ["Lyra", "לירה"] },
  { match: /maimeri|מאימרי/i, add: ["Maimeri", "מאימרי"] },
  { match: /snowman|סנומן/i, add: ["Snowman", "סנומן"] },
  { match: /waldorf|וולדורף/i, add: ["Waldorf", "וולדורף"] },
  { match: /^RIT\b/i, field: "third_level", add: ["RIT", "ריט", "צבע לבד"] },
  { match: /\bnora\b|נורה/i, field: "third_level", add: ["NORA", "נורה"] },
  { match: /pebeo|פביאו/i, add: ["Pebeo", "פביאו"] },
  { match: /schmincke|שמינקה/i, add: ["Schmincke", "שמינקה"] },
  { match: /sennelier|סנלייה/i, add: ["Sennelier", "סנלייה"] },
  { match: /liquitex|ליקוויטקס/i, add: ["Liquitex", "ליקוויטקס"] },
  { match: /holbein|הולביין/i, add: ["Holbein", "הולביין"] },
  { match: /stabilo|סטבילו/i, add: ["Stabilo", "סטבילו"] },
  { match: /cretacolor|קרטה קולור/i, add: ["Cretacolor", "קרטה קולור"] },
  { match: /da vinci|דה וינצ'י/i, add: ["Da Vinci", "דה וינצ'י"] },
  { match: /escoda|אסקודה/i, add: ["Escoda", "אסקודה"] },
  { match: /molotow|מולוטוב/i, add: ["Molotow", "מולוטוב"] },
  { match: /montana|מונטנה/i, add: ["Montana", "מונטנה"] },
];

const MAX_LEN = 500; // same cap as the dashboard's product routes

// everything the search already looks at for this product
const hayOf = (p) =>
  [p.name, p.category, p.sub_cat, p.third_level, p.searchKeywords]
    .map((s) => String(s || ""))
    .join(" | ");

// Rules cascade (Pitt adds "Faber-Castell", which makes the Faber rule fire), so
// iterate to a fixed point: one run then leaves nothing for a second run.
const additionsFor = (p) => {
  const out = [];
  for (let pass = 0; pass < 5; pass++) {
    const hay = [hayOf(p), ...out].join(" | ");
    const hayLc = hay.toLowerCase();
    const fresh = [];
    for (const rule of RULES) {
      const target = rule.field ? String(p[rule.field] || "") : hay;
      if (!rule.match.test(target)) continue;
      for (const term of rule.add) {
        const lc = term.toLowerCase();
        if (hayLc.includes(lc)) continue;
        if (fresh.some((t) => t.toLowerCase() === lc)) continue;
        fresh.push(term);
      }
    }
    if (!fresh.length) break;
    out.push(...fresh);
  }
  return out;
};

const merged = (existing, add) => {
  const base = String(existing || "").trim();
  return base ? `${base}, ${add.join(", ")}` : add.join(", ");
};

const main = async () => {
  const apply = process.argv.includes("--apply");
  const fromDump = process.argv.includes("--dump");

  let products;
  if (fromDump) {
    products = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "products-dump.json"), "utf8"));
    console.log(`source: products-dump.json (${products.length} products) — dry run only`);
  } else {
    if (!process.env.DB_URL) throw new Error("DB_URL is not set");
    await mongoose.connect(process.env.DB_URL);
    products = await Product.find({}).select("name category sub_cat third_level searchKeywords").lean();
    console.log(`source: MongoDB (${products.length} products)`);
  }

  const plan = [];
  const tooLong = [];
  for (const p of products) {
    const add = additionsFor(p);
    if (!add.length) continue;
    const next = merged(p.searchKeywords, add);
    if (next.length > MAX_LEN) { tooLong.push(p); continue; }
    plan.push({ p, add, next });
  }

  // ---- report ----
  const byTerm = new Map();
  const bySeries = new Map();
  let bytes = 0;
  for (const { p, add, next } of plan) {
    for (const t of add) byTerm.set(t, (byTerm.get(t) || 0) + 1);
    const s = String(p.third_level || "כללי");
    bySeries.set(s, (bySeries.get(s) || 0) + 1);
    bytes += Buffer.byteLength(next) - Buffer.byteLength(String(p.searchKeywords || ""));
  }
  console.log(`\n${plan.length} products get new keywords (${products.length - plan.length} already complete or unmatched); +${(bytes / 1024).toFixed(1)} KB of keywords`);
  if (tooLong.length) {
    console.log(`SKIPPED ${tooLong.length} products whose keywords would exceed ${MAX_LEN} chars:`);
    for (const p of tooLong) console.log(`  - ${p.name}`);
  }
  console.log("\nby series / brand:");
  for (const [s, n] of [...bySeries.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${s}`);
  }
  console.log("\nterms added (products):");
  for (const [t, n] of [...byTerm.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${t}`);
  }
  console.log("\nexamples:");
  for (const { p, add } of plan.slice(0, 25)) {
    console.log(`  ${p.name}  [${p.third_level || "כללי"}]  → +${add.join(", ")}`);
  }
  if (plan.length > 25) console.log(`  ... and ${plan.length - 25} more`);

  // ---- write ----
  if (apply && !fromDump) {
    if (!plan.length) {
      console.log("\nnothing to write — already up to date");
    } else {
      const ops = plan.map(({ p, next }) => ({
        updateOne: { filter: { _id: p._id }, update: { $set: { searchKeywords: next } } },
      }));
      // timestamps:false — a keyword fill is not an edit the manager made
      const res = await Product.bulkWrite(ops, { ordered: false, timestamps: false });
      console.log(`\nWROTE keywords to ${res.modifiedCount} products`);
    }
  } else if (apply && fromDump) {
    console.log("\n--apply is ignored with --dump (no database)");
  } else {
    console.log("\ndry run only — re-run with --apply to write");
  }

  if (!fromDump) await mongoose.disconnect();
};

module.exports = { RULES, additionsFor };

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
