// Upload migration/images/* to the store's S3 bucket under images/<filename>,
// matching how the original catalog photos are stored (public-read, long cache,
// exact filename). Skips keys that already exist — never overwrites originals.
//   node migration/upload-s3.mjs            # upload missing keys
//   node migration/upload-s3.mjs --dry-run  # just report what would upload
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import { readdirSync, readFileSync } from "fs";
import { IMAGES } from "./lib.mjs"; // also loads Backend/.env (AWS creds, S3_*)

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), "..", "Backend", "package.json"));
const { S3Client, PutObjectCommand, HeadObjectCommand } = require("@aws-sdk/client-s3");

const BUCKET = process.env.S3_BUCKET || "levhatahbiv";
const REGION = process.env.S3_REGION || "eu-north-1";
const DRY = process.argv.includes("--dry-run");
const CONCURRENCY = 8;

const CT = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".bmp": "image/bmp", ".svg": "image/svg+xml" };

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error("✗ AWS creds not found in Backend/.env"); process.exit(1);
}
const s3 = new S3Client({ region: REGION });

const exists = async (Key) => {
  try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key })); return true; }
  catch (e) { if (e?.$metadata?.httpStatusCode === 404 || e.name === "NotFound") return false; throw e; }
};

(async () => {
  const files = readdirSync(IMAGES).filter((f) => !f.startsWith("."));
  console.log(`${files.length} files in migration/images/ -> s3://${BUCKET}/images/  (region ${REGION})`);
  console.log(DRY ? "MODE: DRY-RUN\n" : "MODE: UPLOAD\n");

  let uploaded = 0, skipped = 0, failed = 0;
  const fails = [];
  const queue = [...files];

  async function worker() {
    while (queue.length) {
      const f = queue.shift();
      const Key = `images/${f}`;
      try {
        if (await exists(Key)) { skipped++; continue; }
        if (!DRY) {
          await s3.send(new PutObjectCommand({
            Bucket: BUCKET, Key, Body: readFileSync(join(IMAGES, f)),
            ContentType: CT[extname(f).toLowerCase()] || "application/octet-stream",
            CacheControl: "public, max-age=31536000", ACL: "public-read",
          }));
        }
        uploaded++;
      } catch (e) { failed++; fails.push(`${f}: ${e.message}`); }
      if ((uploaded + skipped + failed) % 50 === 0)
        process.stdout.write(`\r${uploaded} uploaded, ${skipped} existed, ${failed} failed   `);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\n✓ ${DRY ? "would upload" : "uploaded"} ${uploaded} | already on S3 ${skipped} | failed ${failed}`);
  if (fails.length) { console.log("failures:"); fails.slice(0, 20).forEach((x) => console.log("  " + x)); }
})().catch((e) => { console.error("✗ upload failed:", e.message); process.exit(1); });
