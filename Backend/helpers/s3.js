// S3 image storage for the manager dashboard.
//
// SAFETY RULE: deletion only touches files the dashboard itself uploaded
// (named "<timestamp>-<hex>.<ext>"). The original catalog photos
// ("733145_...~mv2.jpg" etc.) are irreplaceable — they are NEVER deleted,
// even when their product is removed.
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const BUCKET = process.env.S3_BUCKET || "levhatahbiv";
const REGION = process.env.S3_REGION || "eu-north-1";

const enabled = () =>
  Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

let _client = null;
const client = () => {
  if (!_client) {
    const { S3Client } = require("@aws-sdk/client-s3");
    _client = new S3Client({ region: REGION });
  }
  return _client;
};

// filenames created by newName() below — the only ones we may delete
const OURS_RE = /^\d{13}-[0-9a-f]{8}\.[a-z0-9]+$/;

const newName = (original) => {
  const ext = (path.extname(original).toLowerCase() || ".jpg").replace(/[^.a-z0-9]/g, "");
  return `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
};

const uploadImage = async (buffer, originalName, mimetype) => {
  const name = newName(originalName);
  const { PutObjectCommand } = require("@aws-sdk/client-s3");
  await client().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `images/${name}`,
      Body: buffer,
      ContentType: mimetype,
      CacheControl: "public, max-age=31536000",
      // the bucket exposes photos via object ACLs (like the originals)
      ACL: "public-read",
    })
  );
  return name; // bare filename — storefront/dashboard resolve the S3 URL
};

// uploadsDir is the local-dev fallback location for "/uploads/..." images
const uploadsDir = path.join(__dirname, "..", "..", "Frontend", "public", "uploads");

// Accepts a product's img field (semicolon-separated) or an array of entries.
// Removes dashboard-uploaded images from S3 / local disk; ignores the rest.
const cleanupImages = async (imgField) => {
  const entries = (Array.isArray(imgField) ? imgField : String(imgField || "").split(";"))
    .map((s) => s.trim())
    .filter(Boolean);

  const results = [];
  for (const entry of entries) {
    try {
      if (entry.startsWith("/uploads/")) {
        const base = path.basename(entry);
        if (OURS_RE.test(base)) {
          fs.rmSync(path.join(uploadsDir, base), { force: true });
          results.push(`local removed: ${base}`);
        }
      } else if (OURS_RE.test(entry) && enabled()) {
        const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
        await client().send(
          new DeleteObjectCommand({ Bucket: BUCKET, Key: `images/${entry}` })
        );
        results.push(`s3 removed: ${entry}`);
      } else {
        results.push(`kept (original photo): ${entry.slice(0, 30)}`);
      }
    } catch (e) {
      console.error("[s3] cleanup failed for", entry, e.message);
    }
  }
  if (results.length) console.log("[s3]", results.join(" | "));
  return results;
};

module.exports = { enabled, uploadImage, cleanupImages };
