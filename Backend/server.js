const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const morgan = require("morgan");

require("dotenv").config({ path: ".env" });

// FAIL CLOSED: never boot the manager API without the secrets that protect it.
// A missing ADMIN_USER/ADMIN_PASS used to let empty credentials mint a manager
// token (safeEqual("","") is true); crashing here makes that impossible.
for (const k of ["SECRET", "ADMIN_USER", "ADMIN_PASS", "DB_URL"]) {
  if (!process.env[k]) {
    console.error(`FATAL: required environment variable ${k} is not set — refusing to start.`);
    process.exit(1);
  }
}

// app config
const app = express();
// Render runs behind a proxy — req.ip must reflect X-Forwarded-For so the
// per-IP rate limiter in routes/newsletter.js doesn't collapse into one bucket.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// Security headers (hand-rolled so we add no new dependency). The dashboard is
// a same-team tool; DENY framing kills clickjacking of the /manage login.
app.use((_req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  next();
});

// CORS restricted to the shop's own origins (auth is Bearer, not cookies, so
// this is defence-in-depth). A request with no Origin (curl / server-to-server /
// mobile) is allowed; a browser from an unknown origin is refused.
const ALLOWED_ORIGINS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https:\/\/([a-z0-9-]+\.)?lev-hatahbiv\.com$/,
  /^https:\/\/lev-hatahbiv\.nivsasi\.workers\.dev$/,
];
app.use(
  cors({
    origin: (origin, cb) =>
      !origin || ALLOWED_ORIGINS.some((re) => re.test(origin))
        ? cb(null, true)
        : cb(null, false),
  })
);

// 5 MB covers the whole-catalog CSV import (~1 MB today, with headroom to grow)
// and bulk-id payloads; images go through multer (5 MB) separately. Far below the
// old 100 MB memory-DoS surface, and the heavy import route is admin-only anyway.
app.use(bodyParser.json({ limit: "5mb" }));
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));
app.use("/uploads", express.static("uploads")); // local image fallback (S3 in prod)

const port = process.env.PORT || 5000;

// Connect to Mongo
mongoose
  .connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() =>
    console.log("MongoDB database connection established successfully")
  )
  .catch((err) => console.log(err));

// JWT-protected manager dashboard API (login, product CRUD, upload, publish).
const admin = require("./routes/admin/admin");
app.use("/admin", admin);

// public newsletter + order log (per-IP rate-limited).
const newsletter = require("./routes/newsletter");
app.use("/", newsletter);

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
