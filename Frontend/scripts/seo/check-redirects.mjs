// End-to-end check of the old-Wix-URL redirect layer against a running site:
//   node scripts/seo/check-redirects.mjs http://127.0.0.1:8787     (npx wrangler dev)
//   node scripts/seo/check-redirects.mjs https://lev-hatahbiv.nivsasi.workers.dev
// Reads every URL from the captured Wix sitemaps (docs/seo/wix-*.xml), requests each one
// on the target origin and asserts: 301 whose Location answers 200, or 410 for junk.
// Exits 1 on any 200/404/5xx leak so it can gate a deploy.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const origin = (process.argv[2] || "http://127.0.0.1:8787").replace(/\/$/, "");
const here = dirname(fileURLToPath(import.meta.url));
const seoDir = join(here, "..", "..", "..", "docs", "seo");

const urls = [];
for (const f of readdirSync(seoDir)) {
  if (!/^wix-.*sitemap\.xml$/.test(f) || f === "wix-sitemap-index.xml") continue;
  const xml = readFileSync(join(seoDir, f), "utf8");
  for (const m of xml.matchAll(/<loc>(.*?)<\/loc>/g)) {
    const u = new URL(m[1].replace(/&amp;/g, "&"));
    urls.push({ file: f, path: u.pathname + u.search });
  }
}
console.log(`${urls.length} legacy URLs from ${seoDir}, target ${origin}`);

const buckets = { redirected: 0, gone: 0, leak200: 0, leak404: 0, error: 0, badTarget: 0 };
const leaks = [];
const targetCache = new Map();
// wrangler dev's local asset server hiccups (404/500) under load — retry before calling
// a target broken, so only real misses fail the run
const status = async (u, tries = 3) => {
  for (let t = 0; t < tries; t++) {
    const s = await fetch(u, { redirect: "manual" }).then((r) => r.status).catch(() => 0);
    if (s === 200 || s === 301 || s === 410 || t === tries - 1) return s;
    await new Promise((r) => setTimeout(r, 250 * (t + 1)));
  }
  return 0;
};
const checkTarget = async (loc) => {
  const u = new URL(loc, origin);
  const key = u.pathname + u.search;
  if (targetCache.has(key)) return targetCache.get(key);
  const p = status(u);
  targetCache.set(key, p);
  return p;
};

let i = 0;
const worker = async () => {
  while (i < urls.length) {
    const { path, file } = urls[i++];
    try {
      let res = await fetch(origin + path, { redirect: "manual" });
      if (res.status >= 500 || res.status === 0) res = await fetch(origin + path, { redirect: "manual" });
      if (res.status === 301 || res.status === 302 || res.status === 308) {
        const loc = res.headers.get("location") || "";
        const st = await checkTarget(loc);
        if (st === 200) buckets.redirected++;
        else {
          buckets.badTarget++;
          leaks.push(`${res.status} ${path} -> ${loc} (${st})`);
        }
      } else if (res.status === 410) buckets.gone++;
      else if (res.status === 200 && path === "/") buckets.redirected++; // home stays home
      else if (res.status === 200) (buckets.leak200++, leaks.push(`200 ${path} [${file}]`));
      else if (res.status === 404) (buckets.leak404++, leaks.push(`404 ${path} [${file}]`));
      else (buckets.error++, leaks.push(`${res.status} ${path}`));
    } catch (e) {
      buckets.error++;
      leaks.push(`ERR ${path} ${e.message}`);
    }
  }
};
await Promise.all(Array.from({ length: 6 }, worker));

// a few fixed expectations
const expect = async (path, status, contains) => {
  const r = await fetch(origin + path, { redirect: "manual" });
  const ok = r.status === status && (!contains || (r.headers.get("location") || "").includes(contains));
  console.log(`${ok ? "ok " : "!! "} ${path} -> ${r.status}${r.headers.get("location") ? " " + r.headers.get("location") : ""}`);
  return ok;
};
const fixed = [
  await expect("/robots.txt", 200),
  await expect("/sitemap.xml", 200),
  await expect("/product-page/" + encodeURIComponent("מכחול-קולינסקי-סדרה-7-גודל-000"), 301, "/product/66844bfdf2e4e8f572770739"),
  await expect("/" + encodeURIComponent("מכחולים"), 301, "/category/brushes"),
  await expect("/blank-3", 301, "/contact"),
  await expect("/product-page/i-m-a-product-11", 410),
  await expect("/this-path-does-not-exist", 404),
  await expect("/category/hobby/" + encodeURIComponent("צבעי-בד-טקסטיל"), 200),
];

console.log(buckets);
if (leaks.length) console.log("leaks:\n  " + leaks.slice(0, 60).join("\n  ") + (leaks.length > 60 ? `\n  … +${leaks.length - 60}` : ""));
const bad = buckets.leak200 + buckets.leak404 + buckets.error + buckets.badTarget + fixed.filter((x) => !x).length;
console.log(bad ? `FAIL (${bad} problems)` : "PASS");
process.exit(bad ? 1 : 0);
