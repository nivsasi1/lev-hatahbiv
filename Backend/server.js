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

// Liveness + which commit Render is running (RENDER_GIT_COMMIT is set by
// Render), so a rollout can be confirmed from outside without credentials.
// Also the state of the GitHub token behind "פרסום": fine-grained tokens expire
// (max 1 year) and when one did, publishing silently died for a day. GitHub
// returns the expiry in a response header, so the watchdog can warn a week early.
let tokenCache = { at: 0, value: null };
const publishTokenStatus = async () => {
  if (!process.env.GH_PUBLISH_TOKEN) return { configured: false };
  if (Date.now() - tokenCache.at < 30 * 60_000) return tokenCache.value; // 30-min cache
  let value;
  try {
    const r = await fetch(
      "https://api.github.com/repos/nivsasi1/lev-hatahbiv/actions/workflows/publish-catalog.yml",
      {
        headers: {
          Authorization: `Bearer ${process.env.GH_PUBLISH_TOKEN}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "lev-hatahbiv-health",
        },
        signal: AbortSignal.timeout(8_000),
      }
    );
    const exp = r.headers.get("github-authentication-token-expiration"); // e.g. "2027-10-03 12:00:00 UTC"
    const expiresAt = exp ? new Date(exp.replace(" UTC", "Z").replace(" ", "T")) : null;
    const daysLeft =
      expiresAt && !isNaN(expiresAt) ? Math.floor((expiresAt - Date.now()) / 86_400_000) : null;
    value = {
      configured: true,
      ok: r.status === 200,
      status: r.status,
      expiresAt: expiresAt && !isNaN(expiresAt) ? expiresAt.toISOString() : null,
      daysLeft,
    };
  } catch (e) {
    value = { configured: true, ok: null, error: e.name === "TimeoutError" ? "timeout" : "unreachable" };
  }
  tokenCache = { at: Date.now(), value };
  return value;
};

app.get("/health", async (_req, res) =>
  res.json({
    ok: true,
    commit: (process.env.RENDER_GIT_COMMIT || "").slice(0, 7) || null,
    publishToken: await publishTokenStatus(),
  })
);

// JWT-protected manager dashboard API (login, product CRUD, upload, publish).
const admin = require("./routes/admin/admin");
app.use("/admin", admin);

// public newsletter + order log (per-IP rate-limited).
const newsletter = require("./routes/newsletter");
app.use("/", newsletter);

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
