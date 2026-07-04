// שומר-חנות — the 15-minute pulse. Plain-fetch checks, no dependencies.
// Compares against the previous run's state (restored from the Actions cache)
// and asks the workflow to alert only on a state CHANGE, plus a reminder
// every ~4h while still down. Local run: `node monitor/check.mjs`.
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = process.env.SITE_URL || "https://lev-hatahbiv.onrender.com";
const API_URL = process.env.API_URL || "https://lev-hatahbiv-api.onrender.com";
const CF_URL = process.env.CF_URL || "https://lev-hatahbiv.nivsasi.workers.dev";

const STATE_DIR = join(dirname(fileURLToPath(import.meta.url)), ".state");
const REMIND_EVERY = 16; // consecutive bad runs between reminders (16 × 15min ≈ 4h)

const get = async (url, timeoutMs = 30_000) => {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": "lev-hatahbiv-watchdog" },
    });
    return { status: res.status, body: await res.text() };
  } catch (err) {
    return { status: 0, body: "", error: err?.cause?.code || err?.name || String(err) };
  }
};

const results = {};

// 1. the storefront answers and serves the SPA shell
const site = await get(SITE);
results.site =
  site.status === 200 && site.body.includes('id="root"')
    ? { ok: true }
    : { ok: false, detail: site.error || `HTTP ${site.status}` };

// 2. the baked catalog bundle exists and actually contains products
// (a "publish" that baked an empty catalog still returns 200 on the page)
results.catalog = { ok: false, detail: "לא נבדק — האתר לא נטען" };
if (results.site.ok) {
  const m = site.body.match(/src="(\/assets\/[^"]+\.js)"/);
  if (!m) {
    results.catalog = { ok: false, detail: "לא נמצא קובץ JS בדף הבית" };
  } else {
    const bundle = await get(SITE + m[1], 60_000);
    if (bundle.status !== 200)
      results.catalog = { ok: false, detail: `הבאנדל החזיר HTTP ${bundle.status}` };
    else if (bundle.body.length < 200_000 || !bundle.body.includes("paints"))
      // the catalog alone is way past 200KB; "paints" is a category slug baked in
      results.catalog = {
        ok: false,
        detail: `הבאנדל חשוד (${Math.round(bundle.body.length / 1024)}KB) — ייתכן קטלוג ריק`,
      };
    else results.catalog = { ok: true };
  }
}

// 3. the manager API — Render free tier sleeps, so the generous timeout
// covers the 30-60s wake-up. Any HTTP answer (even 404) proves it's alive.
const api = await get(API_URL + "/", 95_000);
results.api =
  api.status > 0 && api.status < 500
    ? { ok: true }
    : { ok: false, detail: api.error || `HTTP ${api.status}` };

// 4. the Cloudflare test copy — warning only, never reddens the run
const cf = await get(CF_URL);
results.cf =
  cf.status === 200 && cf.body.includes('id="root"')
    ? { ok: true }
    : { ok: false, detail: cf.error || `HTTP ${cf.status}` };

// --- compare with the previous run ---
const KEYS = ["site", "catalog", "api", "cf"];
let prev = { site: true, catalog: true, api: true, cf: true, fails: 0 };
try {
  prev = { ...prev, ...JSON.parse(readFileSync(join(STATE_DIR, "state.json"), "utf8")) };
} catch {}

const allOk = KEYS.every((k) => results[k].ok);
const critical = !results.site.ok || !results.catalog.ok;
const changed = KEYS.some((k) => prev[k] !== results[k].ok);
const fails = allOk ? 0 : (prev.fails || 0) + 1;
const remind = !allOk && fails % REMIND_EVERY === 0;
const forceTest = process.env.FORCE_NOTIFY === "true";
const notify = changed || remind || forceTest;

// --- compose the Hebrew alert ---
const NAMES = {
  site: "האתר",
  catalog: "הקטלוג",
  api: "שרת הניהול (API)",
  cf: "עותק Cloudflare",
};
const lines = KEYS.map((k) =>
  results[k].ok ? `✅ ${NAMES[k]} תקין` : `❌ ${NAMES[k]}: ${results[k].detail}`
);
const stamp = new Date().toLocaleString("he-IL", {
  timeZone: "Asia/Jerusalem",
  dateStyle: "short",
  timeStyle: "short",
});

let header = allOk
  ? "✅ לב התחביב — הכל חזר לתקין!"
  : critical
    ? "🔴 לב התחביב — האתר בבעיה!"
    : "🟡 לב התחביב — תקלה חלקית";
if (remind && !changed)
  header = `🔴 תזכורת: עדיין לא תקין (כ-${Math.round((fails * 15) / 60)} שעות)`;
if (forceTest && allOk) header = "🔔 בדיקת ערוצי התראה — שומר-החנות מחובר ועובד!";

const message = [header, "", ...lines, "", `🕒 ${stamp} (שעון ישראל)`].join("\n");

// --- persist state + hand results to the workflow ---
mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(
  join(STATE_DIR, "state.json"),
  JSON.stringify({
    ...Object.fromEntries(KEYS.map((k) => [k, results[k].ok])),
    fails,
    updated: new Date().toISOString(),
  })
);
writeFileSync(join(STATE_DIR, "alert.txt"), message);
writeFileSync(join(STATE_DIR, "subject.txt"), header);
if (process.env.GITHUB_OUTPUT)
  appendFileSync(process.env.GITHUB_OUTPUT, `notify=${notify}\n`);

console.log(message);
console.log(`\nnotify=${notify} (changed=${changed}, fails=${fails})`);
process.exit(critical ? 1 : 0);
