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
const Subscriber = require("../../models/newsletter/subscriber.model");
const adminAuth = require("../../middleware/adminAuth");

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
      .select("name price salePercentage isAvailable isActive description category sub_cat third_level img")
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

router.put(
  "/products/:id",
  asyncRoute(async (req, res) => {
    const fields = pickEditable(req.body || {});
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: fields },
      { new: true, runValidators: true }
    ).lean();
    if (!product) return res.status(404).json({ error: "מוצר לא נמצא" });
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
    res.json({ deleted: product._id });
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
// Uploaded files land in Frontend/public/uploads so vite ships them with the
// static site; the product's img is stored as "/uploads/<file>".

const uploadsDir = path.join(__dirname, "..", "..", "..", "Frontend", "public", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif|avif)$/.test(file.mimetype);
    cb(ok ? null : new Error("רק קבצי תמונה (png/jpg/webp)"), ok);
  },
});

router.post("/upload", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "לא נבחר קובץ" });
    res.json({ img: `/uploads/${req.file.filename}` });
  });
});

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
