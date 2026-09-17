// "Update from CSV": the manager exports the catalogue, edits it in a
// spreadsheet and uploads it back. Every row carries the product's id, so this
// works out exactly what differs from the store — field by field, only over the
// columns the file actually has — instead of skipping rows that "already exist".
//
// planSync() is pure (rows + current products → plan) so it can be shown as a
// preview before anything is written, and tested without a database.
const OBJECT_ID = /^[0-9a-f]{24}$/i;
// "7.57063E+11": Excel turned a barcode into a number and lost its digits
const EXCEL_NUMBER = /^\d+(\.\d+)?e\+?\d+$/i;

const yes = (v) => /^(כן|yes|true|1|y)$/i.test(String(v ?? "").trim());
const str = (v, max = 5000) => String(v ?? "").trim().slice(0, max);

// what a CSV cell becomes, and what the stored product's value looks like on
// the same scale, so the two can be compared
const FIELDS = {
  name: { parse: (v) => str(v, 300), stored: (p) => str(p.name, 300) },
  price: { parse: (v) => Math.round(Number(v) * 10) / 10, stored: (p) => Math.round(Number(p.price) * 10) / 10 },
  category: { parse: (v) => str(v, 200), stored: (p) => str(p.category, 200) },
  sub_cat: { parse: (v) => str(v, 200) || "כללי", stored: (p) => str(p.sub_cat, 200) || "כללי" },
  third_level: { parse: (v) => str(v, 200) || "כללי", stored: (p) => str(p.third_level, 200) || "כללי" },
  description: { parse: (v) => str(v), stored: (p) => str(p.description) },
  img: { parse: (v) => str(v, 2000), stored: (p) => str(p.img, 2000) },
  salePercentage: {
    parse: (v) => { const n = Number(v) || 0; return n < 0 || n > 95 ? 0 : Math.round(n); },
    stored: (p) => Math.round(Number(p.salePercentage) || 0),
  },
  sku: { parse: (v) => str(v, 500), stored: (p) => str(p.sku, 500) },
  searchKeywords: { parse: (v) => str(v, 500), stored: (p) => str(p.searchKeywords, 500) },
  // the CSV says "hidden" / "soldOut"; the product stores the opposite flags
  isActive: { parse: (v) => !yes(v), stored: (p) => p.isActive !== false },
  isAvailable: { parse: (v) => !yes(v), stored: (p) => p.isAvailable !== false },
  noCoupon: { parse: (v) => yes(v), stored: (p) => p.noCoupon === true },
};
const FIELD_NAMES = Object.keys(FIELDS);
// what the preview calls each field
const LABELS = {
  name: "שם", price: "מחיר", category: "קטגוריה", sub_cat: "מדף", third_level: "סדרה",
  description: "תיאור", img: "תמונות", salePercentage: "מבצע %", sku: "ברקוד",
  searchKeywords: "מילות חיפוש", isActive: "מוסתר", isAvailable: "אזל", noCoupon: "בלי קופונים",
};

// rows: [{ id?, name?, price?, ... }] — a key is present only when the file has
// that column. existing: the store's products (lean docs with _id).
const planSync = (rows, existing) => {
  const byId = new Map(existing.map((p) => [String(p._id), p]));
  const nameOwner = new Map(existing.map((p) => [str(p.name, 300), String(p._id)]));
  const skuOwner = new Map(existing.filter((p) => p.sku).map((p) => [str(p.sku, 500), String(p._id)]));
  const plan = { update: [], create: [], missing: [], errors: [], unchanged: 0, total: rows.length };
  const seenIds = new Set();
  const seenNames = new Set();
  const seenSkus = new Set();
  const err = (i, name, reason) => plan.errors.push({ row: i + 2, name: name || `שורה ${i + 2}`, reason });

  rows.forEach((raw, i) => {
    const r = raw || {};
    const id = str(r.id, 64);
    const label = str(r.name, 300) || (id && byId.get(id) ? byId.get(id).name : "");
    // fields the file carries for this row, parsed
    const has = (f) => r[f] !== undefined;
    const parsed = {};
    for (const f of FIELD_NAMES) if (has(f)) parsed[f] = FIELDS[f].parse(r[f]);

    if (has("price") && !(parsed.price > 0)) return err(i, label, "מחיר לא תקין");
    if (has("name") && !parsed.name) return err(i, label, "חסר שם");
    if (has("sku") && EXCEL_NUMBER.test(str(r.sku, 500))) return err(i, label, `הברקוד "${str(r.sku, 40)}" נהרס על ידי אקסל (E+) — פתחו את עמודת הברקוד כטקסט וייצאו שוב`);
    if (has("sku") && parsed.sku) {
      if (seenSkus.has(parsed.sku)) return err(i, label, `הברקוד ${parsed.sku} מופיע פעמיים בקובץ`);
      seenSkus.add(parsed.sku);
    }

    if (id) {
      if (!OBJECT_ID.test(id)) return err(i, label, `מזהה לא תקין: ${id.slice(0, 30)}`);
      if (seenIds.has(id)) return err(i, label, "המזהה מופיע פעמיים בקובץ");
      seenIds.add(id);
      const p = byId.get(id);
      if (!p) return err(i, label, "המזהה לא קיים בחנות (המוצר נמחק?)");
      if (has("sku") && parsed.sku && skuOwner.has(parsed.sku) && skuOwner.get(parsed.sku) !== id) {
        return err(i, label, `הברקוד ${parsed.sku} כבר משויך למוצר "${byId.get(skuOwner.get(parsed.sku)).name}"`);
      }
      const changes = {};
      for (const f of Object.keys(parsed)) {
        const before = FIELDS[f].stored(p);
        if (before !== parsed[f]) changes[f] = { from: before, to: parsed[f] };
      }
      if (Object.keys(changes).length) plan.update.push({ id, name: p.name, changes });
      else plan.unchanged++;
      return;
    }

    // no id → a new product, validated like the add-only import
    if (!parsed.name) return err(i, label, "חסר שם");
    if (!(parsed.price > 0)) return err(i, label, "מחיר לא תקין");
    if (!parsed.category) return err(i, label, "חסרה קטגוריה");
    if (!parsed.img) return err(i, label, "חסרה תמונה");
    if (seenNames.has(parsed.name)) return err(i, label, "כפול בתוך הקובץ");
    seenNames.add(parsed.name);
    if (nameOwner.has(parsed.name)) return err(i, label, "כבר קיים בחנות (בלי מזהה בשורה)");
    if (parsed.sku && skuOwner.has(parsed.sku)) return err(i, label, `הברקוד ${parsed.sku} כבר משויך למוצר "${byId.get(skuOwner.get(parsed.sku)).name}"`);
    plan.create.push({
      name: parsed.name,
      price: parsed.price,
      category: parsed.category,
      sub_cat: parsed.sub_cat ?? "כללי",
      third_level: parsed.third_level ?? "כללי",
      description: parsed.description ?? "",
      img: parsed.img,
      salePercentage: parsed.salePercentage ?? 0,
      sku: parsed.sku ?? "",
      searchKeywords: parsed.searchKeywords ?? "",
      isActive: parsed.isActive ?? true,
      isAvailable: parsed.isAvailable ?? true,
      ...(parsed.noCoupon ? { noCoupon: true } : {}),
    });
  });

  // in the store but not in the file — deleted only when the manager asks
  for (const [id, p] of byId) if (!seenIds.has(id)) plan.missing.push({ id, name: p.name });
  return plan;
};

// the change list of an update as "$set" for Mongo
const setOf = (changes) => Object.fromEntries(Object.entries(changes).map(([f, c]) => [f, c.to]));

// a lighter copy for the browser: counts always, lists capped
const summarize = (plan, cap = 200) => ({
  total: plan.total,
  unchanged: plan.unchanged,
  counts: { update: plan.update.length, create: plan.create.length, missing: plan.missing.length, errors: plan.errors.length },
  update: plan.update.slice(0, cap).map((u) => ({
    id: u.id, name: u.name,
    changes: Object.entries(u.changes).map(([f, c]) => ({ field: LABELS[f] || f, from: c.from, to: c.to })),
  })),
  create: plan.create.slice(0, cap).map((c) => ({ name: c.name, price: c.price, category: c.category })),
  missing: plan.missing.slice(0, cap),
  errors: plan.errors.slice(0, cap),
});

module.exports = { planSync, setOf, summarize, FIELD_NAMES, EXCEL_NUMBER };
