// Manager dashboard API — everything the storefront must never be able to do.
// All routes except /login require a valid manager JWT (see middleware/adminAuth).
const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const Product = require("../../models/products/product.model");
const SiteSettings = require("../../models/settings/settings.model");
const Subscriber = require("../../models/newsletter/subscriber.model");
const Order = require("../../models/orders/order.model");
const adminAuth = require("../../middleware/adminAuth");
const s3 = require("../../helpers/s3");

const router = express.Router();

// ---------- helpers ----------

const asyncRoute = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    if (err.name === "CastError") {
      return res.status(400).json({ error: "מזהה מוצר לא תקין" });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ error: err.message });
    }
    console.error("[admin]", err);
    res.status(500).json({ error: "שגיאת שרת" });
  });

// constant-time string compare (avoid leaking credential length/prefix via timing)
const safeEqual = (a, b) => {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- auth ----------

router.post(
  "/login",
  asyncRoute(async (req, res) => {
    const { username, password } = req.body || {};
    const okUser = safeEqual(username || "", process.env.ADMIN_USER || "");
    const okPass = safeEqual(password || "", process.env.ADMIN_PASS || "");
    if (!okUser || !okPass) {
      await sleep(800); // slow down brute-force attempts
      return res.status(401).json({ error: "שם משתמש או סיסמה שגויים" });
    }
    const token = jwt.sign({ role: "manager", sub: username }, process.env.SECRET, {
      expiresIn: "12h",
    });
    res.json({ token });
  })
);

router.use(adminAuth);

// ---------- products CRUD ----------

const EDITABLE_FIELDS = [
  "name",
  "price",
  "description",
  "category",
  "sub_cat",
  "third_level",
  "img",
  "quantity",
];

const pickEditable = (body) => {
  const out = {};
  for (const f of EDITABLE_FIELDS) {
    if (body[f] !== undefined) out[f] = body[f];
  }
  if (out.price !== undefined) {
    out.price = Number(out.price);
    if (!(out.price > 0)) throw Object.assign(new Error("מחיר חייב להיות גדול מ־0"), { name: "ValidationError" });
  }
  return out;
};

router.get(
  "/products",
  asyncRoute(async (_req, res) => {
    const products = await Product.find({})
      .select("name price salePercentage isAvailable isActive description category sub_cat third_level img createdAt updatedAt")
      .sort({ category: 1, name: 1 })
      .lean();
    res.json({ products });
  })
);

router.post(
  "/products",
  asyncRoute(async (req, res) => {
    const fields = pickEditable(req.body || {});
    for (const required of ["name", "price", "category", "img"]) {
      if (!fields[required]) {
        return res.status(400).json({ error: `חסר שדה חובה: ${required}` });
      }
    }
    const duplicate = await Product.findOne({ img: fields.img }).lean();
    if (duplicate) {
      return res.status(409).json({ error: "התמונה כבר משויכת למוצר אחר" });
    }
    const product = await Product.create({ ...fields, isActive: true, isAvailable: true });
    res.status(201).json({ product });
  })
);

// ---------- bulk actions on many products at once ----------
// body: { ids: [...], action: { type, value } }
//   sale   value=0..95   set salePercentage on all
//   active value=bool    show/hide all
//   stock  value=bool    in-stock / sold-out all
//   price  value=±pct    adjust price of all by percentage (rounded to 0.1)
//   delete               permanently delete all (S3 cleanup included)
router.post(
  "/products/bulk",
  asyncRoute(async (req, res) => {
    const { ids, action } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 2000) {
      return res.status(400).json({ error: "רשימת מוצרים לא תקינה" });
    }
    if (!action || !action.type) {
      return res.status(400).json({ error: "לא נבחרה פעולה" });
    }
    const filter = { _id: { $in: ids } };
    let result;

    switch (action.type) {
      case "sale": {
        const pct = Number(action.value);
        if (!Number.isFinite(pct) || pct < 0 || pct > 95) {
          return res.status(400).json({ error: "אחוז הנחה חייב להיות בין 0 ל־95" });
        }
        result = await Product.updateMany(filter, {
          $set: { salePercentage: pct, discountValue: 0 },
        });
        break;
      }
      case "active": {
        result = await Product.updateMany(filter, {
          $set: { isActive: Boolean(action.value) },
        });
        break;
      }
      case "stock": {
        result = await Product.updateMany(filter, {
          $set: { isAvailable: Boolean(action.value) },
        });
        break;
      }
      case "price": {
        const pct = Number(action.value);
        if (!Number.isFinite(pct) || pct < -90 || pct > 500 || pct === 0) {
          return res.status(400).json({ error: "שינוי מחיר חייב להיות באחוזים בין -90 ל־500" });
        }
        const k = 1 + pct / 100;
        // aggregation-pipeline update so each product is multiplied & rounded
        result = await Product.updateMany(filter, [
          { $set: { price: { $round: [{ $multiply: ["$price", k] }, 1] } } },
        ]);
        break;
      }
      case "setPrice": {
        const price = Number(action.value);
        if (!Number.isFinite(price) || price <= 0 || price > 100000) {
          return res.status(400).json({ error: "מחיר חייב להיות מספר בין 0 ל־100000" });
        }
        result = await Product.updateMany(filter, {
          $set: { price: Math.round(price * 10) / 10 },
        });
        break;
      }
      case "delete": {
        const docs = await Product.find(filter).select("img").lean();
        for (const d of docs) s3.cleanupImages(d.img); // fire-and-forget
        result = await Product.deleteMany(filter);
        return res.json({ deleted: result.deletedCount });
      }
      default:
        return res.status(400).json({ error: "פעולה לא מוכרת" });
    }
    res.json({ matched: result.matchedCount, modified: result.modifiedCount });
  })
);

// ---------- CSV import: create many products in one shot ----------
// body: { products: [{ name, price, category, sub_cat, third_level,
//                      description, img, salePercentage }] }
// Rows are validated individually; duplicates (by exact name) are skipped so
// re-importing the same file is safe.
router.post(
  "/products/import",
  asyncRoute(async (req, res) => {
    const rows = req.body && req.body.products;
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > 500) {
      return res.status(400).json({ error: "קובץ ריק או גדול מ־500 שורות" });
    }

    const skipped = [];
    const valid = [];
    const seenNames = new Set();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const name = String(r.name || "").trim();
      const price = Number(r.price);
      const category = String(r.category || "").trim();
      const img = String(r.img || "").trim();
      const rowLabel = name || `שורה ${i + 1}`;

      if (!name) { skipped.push({ row: i + 1, name: rowLabel, reason: "חסר שם" }); continue; }
      if (!(price > 0)) { skipped.push({ row: i + 1, name: rowLabel, reason: "מחיר לא תקין" }); continue; }
      if (!category) { skipped.push({ row: i + 1, name: rowLabel, reason: "חסרה קטגוריה" }); continue; }
      if (!img) { skipped.push({ row: i + 1, name: rowLabel, reason: "חסרה תמונה" }); continue; }
      if (seenNames.has(name)) { skipped.push({ row: i + 1, name: rowLabel, reason: "כפול בתוך הקובץ" }); continue; }
      seenNames.add(name);

      let pct = Number(r.salePercentage) || 0;
      if (pct < 0 || pct > 95) pct = 0;

      valid.push({
        name,
        price: Math.round(price * 10) / 10,
        category,
        sub_cat: String(r.sub_cat || "").trim() || "כללי",
        third_level: String(r.third_level || "").trim() || "כללי",
        description: String(r.description || "").trim(),
        img,
        salePercentage: pct,
        isActive: true,
        isAvailable: true,
      });
    }

    // skip products that already exist in the store (same exact name)
    const existing = await Product.find({ name: { $in: valid.map((v) => v.name) } })
      .select("name")
      .lean();
    const existingNames = new Set(existing.map((e) => e.name));
    const toCreate = valid.filter((v) => {
      if (existingNames.has(v.name)) {
        skipped.push({ name: v.name, reason: "כבר קיים בחנות" });
        return false;
      }
      return true;
    });

    const created = toCreate.length
      ? await Product.insertMany(toCreate, { ordered: false })
      : [];

    res.json({
      created: created.length,
      skipped,
      total: rows.length,
    });
  })
);

router.put(
  "/products/:id",
  asyncRoute(async (req, res) => {
    const fields = pickEditable(req.body || {});
    const before = await Product.findById(req.params.id).select("img").lean();
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: fields },
      { new: true, runValidators: true }
    ).lean();
    if (!product) return res.status(404).json({ error: "מוצר לא נמצא" });
    // images removed from the gallery during the edit → clean them off S3
    if (before && fields.img !== undefined) {
      const keep = new Set(String(fields.img).split(";").map((s) => s.trim()));
      const removed = String(before.img || "")
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s && !keep.has(s));
      if (removed.length) s3.cleanupImages(removed); // fire-and-forget
    }
    res.json({ product });
  })
);

// visibility (soft delete) — hidden items disappear from the storefront entirely
router.patch(
  "/products/:id/active",
  asyncRoute(async (req, res) => {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: Boolean(req.body.isActive) } },
      { new: true }
    ).lean();
    if (!product) return res.status(404).json({ error: "מוצר לא נמצא" });
    res.json({ product });
  })
);

// stock — sold-out items stay visible but greyed out ("אזל מהמלאי")
router.patch(
  "/products/:id/stock",
  asyncRoute(async (req, res) => {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { isAvailable: Boolean(req.body.isAvailable) } },
      { new: true }
    ).lean();
    if (!product) return res.status(404).json({ error: "מוצר לא נמצא" });
    res.json({ product });
  })
);

// sale — percentage between 0 (no sale) and 95
router.patch(
  "/products/:id/sale",
  asyncRoute(async (req, res) => {
    const pct = Number(req.body.salePercentage);
    if (!Number.isFinite(pct) || pct < 0 || pct > 95) {
      return res.status(400).json({ error: "אחוז הנחה חייב להיות בין 0 ל־95" });
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      // clear legacy Wix discount fields so the new percentage is authoritative
      { $set: { salePercentage: pct, discountValue: 0 } },
      { new: true }
    ).lean();
    if (!product) return res.status(404).json({ error: "מוצר לא נמצא" });
    res.json({ product });
  })
);

router.delete(
  "/products/:id",
  asyncRoute(async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id).lean();
    if (!product) return res.status(404).json({ error: "מוצר לא נמצא" });
    // remove its dashboard-uploaded images from S3 (originals are kept)
    s3.cleanupImages(product.img); // fire-and-forget
    res.json({ deleted: product._id });
  })
);

// ---------- orders ----------

router.get(
  "/orders",
  asyncRoute(async (_req, res) => {
    const orders = await Order.find({}).sort({ createdAt: -1 }).limit(300).lean();
    res.json({ orders });
  })
);

router.patch(
  "/orders/:id/status",
  asyncRoute(async (req, res) => {
    const status = String(req.body.status);
    if (!["new", "handled", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "סטטוס לא חוקי" });
    }
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    ).lean();
    if (!order) return res.status(404).json({ error: "הזמנה לא נמצאה" });
    res.json({ order });
  })
);

router.delete(
  "/orders/:id",
  asyncRoute(async (req, res) => {
    const order = await Order.findByIdAndDelete(req.params.id).lean();
    if (!order) return res.status(404).json({ error: "הזמנה לא נמצאה" });
    res.json({ deleted: order._id });
  })
);

// ---------- newsletter subscribers ----------

router.get(
  "/subscribers",
  asyncRoute(async (_req, res) => {
    const subscribers = await Subscriber.find({}).sort({ createdAt: -1 }).lean();
    res.json({ subscribers });
  })
);

router.delete(
  "/subscribers/:id",
  asyncRoute(async (req, res) => {
    const sub = await Subscriber.findByIdAndDelete(req.params.id).lean();
    if (!sub) return res.status(404).json({ error: "כתובת לא נמצאה" });
    res.json({ deleted: sub._id });
  })
);

// ---------- image upload ----------
// With AWS credentials configured (the cloud setup), uploads go straight to
// the store's S3 bucket and the product stores the bare filename — the same
// format as every existing photo. Without credentials (local dev), files land
// in Frontend/public/uploads and the product stores "/uploads/<file>".

const uploadsDir = path.join(__dirname, "..", "..", "..", "Frontend", "public", "uploads");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif|avif)$/.test(file.mimetype);
    cb(ok ? null : new Error("רק קבצי תמונה (png/jpg/webp)"), ok);
  },
});

router.post("/upload", (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "לא נבחר קובץ" });
    try {
      if (s3.enabled()) {
        const name = await s3.uploadImage(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
        // bare filename — the storefront resolves it to the S3 URL
        return res.json({ img: name });
      }
      if (process.env.RENDER) {
        // cloud without S3 keys: a disk file would vanish — fail loudly
        return res.status(400).json({
          error: "להעלאת תמונות בענן צריך להגדיר מפתחות AWS (אפשר בינתיים להדביק כתובת URL של תמונה)",
        });
      }
      const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${path.extname(req.file.originalname).toLowerCase() || ".jpg"}`;
      fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, name), req.file.buffer);
      res.json({ img: `/uploads/${name}` });
    } catch (e) {
      console.error("[upload]", e);
      res.status(500).json({ error: "העלאת התמונה נכשלה" });
    }
  });
});

// ---------- batch image upload (for CSV imports) ----------
// Accepts up to 60 images; returns original-name -> stored-name mapping so a
// CSV can reference pictures by the filename the manager has on their disk.
router.post("/upload-batch", (req, res) => {
  upload.array("images", 60)(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "לא נבחרו קבצים" });
    }
    if (!s3.enabled() && process.env.RENDER) {
      return res.status(400).json({
        error: "להעלאת תמונות בענן צריך להגדיר מפתחות AWS",
      });
    }
    const files = [];
    for (const f of req.files) {
      try {
        if (s3.enabled()) {
          const name = await s3.uploadImage(f.buffer, f.originalname, f.mimetype);
          files.push({ original: f.originalname, img: name });
        } else {
          const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${path.extname(f.originalname).toLowerCase() || ".jpg"}`;
          fs.mkdirSync(uploadsDir, { recursive: true });
          fs.writeFileSync(path.join(uploadsDir, name), f.buffer);
          files.push({ original: f.originalname, img: `/uploads/${name}` });
        }
      } catch (e) {
        console.error("[upload-batch]", f.originalname, e.message);
        files.push({ original: f.originalname, error: "ההעלאה נכשלה" });
      }
    }
    res.json({ files });
  });
});

// ---------- site settings ----------
// Singleton controlling the public homepage (marquee ribbon + featured ids).
// Router is mounted at /admin, so these are /admin/settings to the client.

router.get(
  "/settings",
  asyncRoute(async (_req, res) => {
    const doc = await SiteSettings.findOne({}).lean();
    const base = doc || { ribbonTexts: [], featuredIds: [] };
    // Older singletons predate saleIds — always return [] when absent.
    res.json({ settings: { ...base, saleIds: base.saleIds || [] } });
  })
);

router.put(
  "/settings",
  asyncRoute(async (req, res) => {
    const body = req.body || {};

    if (!Array.isArray(body.ribbonTexts) || !Array.isArray(body.featuredIds)) {
      return res.status(400).json({ error: "מבנה הגדרות לא תקין" });
    }
    // saleIds is optional in the request body; default to [] when missing.
    if (body.saleIds !== undefined && !Array.isArray(body.saleIds)) {
      return res.status(400).json({ error: "מבנה הגדרות לא תקין" });
    }

    const ribbonTexts = body.ribbonTexts.map((t) => String(t).trim());
    if (ribbonTexts.length > 8) {
      return res.status(400).json({ error: "עד 8 כיתובים בסרט" });
    }
    if (ribbonTexts.some((t) => !t || t.length > 80)) {
      return res.status(400).json({ error: "כל כיתוב חייב להיות לא ריק ועד 80 תווים" });
    }

    const featuredIds = body.featuredIds.map((id) => String(id));
    if (featuredIds.length > 12) {
      return res.status(400).json({ error: "עד 12 מוצרים מומלצים" });
    }

    const saleIds = (body.saleIds || []).map((id) => String(id));
    if (saleIds.length > 12) {
      return res.status(400).json({ error: "עד 12 מוצרים במבצע" });
    }

    const settings = await SiteSettings.findOneAndUpdate(
      {},
      { $set: { ribbonTexts, featuredIds, saleIds } },
      { upsert: true, new: true }
    ).lean();
    res.json({ settings });
  })
);

// ---------- publish ----------
// Re-exports MongoDB to the static catalog and rebuilds the site, so the
// public storefront (tunnel / static hosting) reflects dashboard changes.

const backendDir = path.join(__dirname, "..", "..");
const frontendDir = path.join(backendDir, "..", "Frontend");

const run = (cmd, args, cwd) =>
  new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { cwd, timeout: 180000, shell: process.platform === "win32" },
      (err, stdout, stderr) =>
        err ? reject(new Error(stderr || err.message)) : resolve(stdout)
    );
  });

let publishing = false;
router.post(
  "/publish",
  asyncRoute(async (_req, res) => {
    if (publishing) return res.status(409).json({ error: "פרסום כבר רץ, חכו רגע" });
    publishing = true;
    try {
      // Cloud mode: the storefront is a separate static site whose build
      // reads straight from Atlas — publishing = triggering its deploy hook.
      if (process.env.DEPLOY_HOOK_URL) {
        const hookRes = await fetch(process.env.DEPLOY_HOOK_URL, { method: "POST" });
        if (!hookRes.ok) throw new Error(`deploy hook failed (${hookRes.status})`);
        return res.json({
          ok: true,
          summary: "האתר נבנה מחדש בענן — השינויים יעלו תוך כ-3 דקות",
        });
      }
      // Local mode: rebuild the static site on this machine.
      await run("node", ["dump-products.js"], backendDir);
      const gen = await run("node", ["scripts/generate-catalog.mjs"], frontendDir);
      await run("npx", ["vite", "build"], frontendDir);
      res.json({ ok: true, summary: gen.trim().split("\n")[0] });
    } finally {
      publishing = false;
    }
  })
);

module.exports = router;
