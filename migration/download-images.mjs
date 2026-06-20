// Download every image referenced by out/images-manifest.json into
// migration/images/ (named exactly as the storefront/S3 expect). Public CDN —
// no auth. Skips files already present so it's safe to re-run.
//   node migration/download-images.mjs
import { join } from "path";
import { existsSync, writeFileSync } from "fs";
import { readJson, OUT, IMAGES, ensureDirs } from "./lib.mjs";

const CONCURRENCY = 8;

(async () => {
  ensureDirs();
  const manifest = readJson(join(OUT, "images-manifest.json"));
  let done = 0, skipped = 0, failed = 0;
  const fails = [];

  const queue = [...manifest];
  async function worker() {
    while (queue.length) {
      const { filename, url } = queue.shift();
      const dest = join(IMAGES, filename);
      if (existsSync(dest)) { skipped++; continue; }
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const buf = Buffer.from(await res.arrayBuffer());
        writeFileSync(dest, buf);
        done++;
      } catch (e) { failed++; fails.push(`${filename}: ${e.message}`); }
      if ((done + skipped + failed) % 50 === 0)
        process.stdout.write(`\r${done} downloaded, ${skipped} skipped, ${failed} failed   `);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\n✓ images -> migration/images/  (${done} new, ${skipped} already there, ${failed} failed)`);
  if (fails.length) {
    writeFileSync(join(OUT, "image-failures.txt"), fails.join("\n"));
    console.log(`  ⚠ ${fails.length} failures listed in migration/out/image-failures.txt`);
  }
})().catch((e) => { console.error("✗ download failed:", e.message); process.exit(1); });
