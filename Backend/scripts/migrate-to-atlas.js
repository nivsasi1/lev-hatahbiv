// Copies every collection from the local MongoDB to a destination cluster
// (MongoDB Atlas) for the cloud launch. Idempotent: it upserts by _id, so
// re-running it just syncs again without creating duplicates.
//
//   node scripts/migrate-to-atlas.js                 # dry run: counts local docs
//   node scripts/migrate-to-atlas.js "<atlas-url>"   # copies local -> atlas
//
// The atlas URL is the mongodb+srv://... string from Atlas → Connect → Drivers.
const { MongoClient } = require("mongodb");
const path = require("path");
// some home routers refuse the DNS SRV queries Atlas needs — use public DNS
require("dns").setServers(["8.8.8.8", "1.1.1.1"]);
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const SOURCE = process.env.DB_URL; // local LevHatahbivDB
const DEST = process.argv[2]; // atlas connection string (optional)
const DB_NAME = "LevHatahbivDB";

(async () => {
  const src = new MongoClient(SOURCE);
  await src.connect();
  const srcDb = src.db(DB_NAME);
  const collections = await srcDb.listCollections().toArray();

  console.log(`source has ${collections.length} collections:`);
  const data = {};
  for (const { name } of collections) {
    if (name.startsWith("system.")) continue;
    const docs = await srcDb.collection(name).find({}).toArray();
    data[name] = docs;
    console.log(`  ${name}: ${docs.length} documents`);
  }

  if (!DEST) {
    console.log("\ndry run — pass the Atlas connection string to copy.");
    await src.close();
    return;
  }

  const dest = new MongoClient(DEST);
  await dest.connect();
  const destDb = dest.db(DB_NAME);
  console.log("\ncopying to Atlas…");
  for (const [name, docs] of Object.entries(data)) {
    if (docs.length === 0) continue;
    const col = destDb.collection(name);
    // upsert each doc by its _id so re-runs stay clean
    const ops = docs.map((d) => ({
      replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true },
    }));
    const res = await col.bulkWrite(ops, { ordered: false });
    console.log(`  ${name}: ${res.upsertedCount} new, ${res.modifiedCount} updated`);
  }

  await src.close();
  await dest.close();
  console.log("\n✓ migration complete");
})().catch((e) => {
  console.error("migration failed:", e.message);
  process.exit(1);
});
