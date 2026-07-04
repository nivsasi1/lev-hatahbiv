// שומר-חנות — the morning deep check. Loads the live site in real Chromium
// and verifies products actually render, with no JS errors. Catches what
// HTTP checks can't: a broken bundle, an empty catalog that still ships,
// a runtime error that blanks the page.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = process.env.SITE_URL || "https://lev-hatahbiv.onrender.com";
const STATE_DIR = join(dirname(fileURLToPath(import.meta.url)), ".state");

// noise we deliberately tolerate:
// - images: missing S3 photos fall back to the category illustration by design
// - /api/*: on the Render host the Worker API soft-fails on purpose (see api.ts)
// - analytics/fonts: third-party hiccups aren't the shop's health
const IGNORE = [
  /\.(png|jpe?g|webp|gif|svg|avif|ico)(\?|$)/i,
  /s3[.-][a-z0-9-]*\.?amazonaws\.com/i,
  new RegExp(`${SITE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/api/`, "i"),
  /google-analytics|googletagmanager|gtag/i,
  /fonts\.g(static|oogleapis)\.com/i,
];
const ignorable = (url = "") => IGNORE.some((re) => re.test(url));

const problems = [];
const warnings = [];
const consoleErrors = [];

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => problems.push(`שגיאת JS: ${String(e).slice(0, 200)}`));
page.on("console", (msg) => {
  if (msg.type() !== "error") return;
  const url = msg.location()?.url || "";
  if (ignorable(url) || ignorable(msg.text())) return;
  consoleErrors.push(msg.text().slice(0, 200));
});
page.on("requestfailed", (req) => {
  if (ignorable(req.url())) return;
  warnings.push(`בקשה נכשלה: ${req.url().slice(0, 120)} (${req.failure()?.errorText})`);
});

try {
  // homepage renders its shell
  await page.goto(SITE, { waitUntil: "load", timeout: 60_000 });
  await page.waitForSelector("header", { timeout: 15_000 });
  console.log("home: loaded");

  // the paints shelf: /category/paints shows subcategory tiles; products
  // render one level deeper at /category/paints/<sub> — follow the first tile
  await page.goto(`${SITE}/category/paints`, { waitUntil: "load", timeout: 60_000 });
  await page.waitForSelector("a.sub-card, a.p-card", { timeout: 30_000 }).catch(() => {});
  let cards = await page.locator("a.p-card").count();
  if (cards === 0) {
    const sub = await page.locator("a.sub-card").first().getAttribute("href").catch(() => null);
    if (!sub) {
      problems.push("דף הקטגוריה 'צבעים' לא מציג תתי-קטגוריות ולא מוצרים");
    } else {
      await page.goto(SITE + sub, { waitUntil: "load", timeout: 60_000 });
      await page.waitForSelector("a.p-card", { timeout: 30_000 }).catch(() => {});
      cards = await page.locator("a.p-card").count();
      if (cards === 0) problems.push(`תת-הקטגוריה ${decodeURIComponent(sub)} לא מציגה אף מוצר`);
    }
  }
  if (cards > 0) console.log(`products rendered: ${cards} cards`);

  // let late async errors surface before we judge
  await page.waitForTimeout(3_000);
} catch (err) {
  problems.push(`הדף לא נטען בדפדפן: ${String(err).slice(0, 200)}`);
} finally {
  await browser.close();
}

if (consoleErrors.length)
  problems.push(
    `${consoleErrors.length} שגיאות קונסול:\n` +
      consoleErrors.slice(0, 3).map((e) => `  • ${e}`).join("\n")
  );

const stamp = new Date().toLocaleString("he-IL", {
  timeZone: "Asia/Jerusalem",
  dateStyle: "short",
  timeStyle: "short",
});
const failed = problems.length > 0;
const header = failed
  ? "🟠 בדיקת העומק הבוקר מצאה בעיות באתר"
  : "בדיקת עומק — תקין";
const message = [
  header,
  "",
  ...problems.map((p) => `❌ ${p}`),
  ...(warnings.length ? ["", "אזהרות (לא קריטי):", ...warnings.slice(0, 5).map((w) => `⚠️ ${w}`)] : []),
  "",
  `🕒 ${stamp} (שעון ישראל)`,
].join("\n");

mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(join(STATE_DIR, "alert.txt"), message);
writeFileSync(join(STATE_DIR, "subject.txt"), header);
if (process.env.GITHUB_OUTPUT)
  appendFileSync(process.env.GITHUB_OUTPUT, `notify=${failed}\n`);

console.log(message);
process.exit(failed ? 1 : 0);
