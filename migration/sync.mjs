// Apply the reconcile plan to MongoDB. Wix is the source of truth.
// SAFE BY DEFAULT: dry-run unless --apply; always backs up first; removed
// products are HIDDEN (reversible) unless --delete-removed.
//
//   node migration/sync.mjs                      # dry-run on LOCAL
//   node migration/sync.mjs --apply              # apply to LOCAL (+backup)
//   node migration/sync.mjs --target atlas --apply   # apply to ATLAS (+backup)
//   node migration/sync.mjs --apply --delete-removed # hard-delete discontinued
import { join } from "path";
import {
  readJson, OUT, withMongo, backupDocs, LOCAL_DB_URL, ATLAS_DB_URL, round1, ObjectId,
} from "./lib.mjs";

const oid = (id) => { try { return new ObjectId(String(id)); } catch { return id; } };

const arg = (f) => process.argv.includes(f);
const argVal = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };

const target = argVal("--target", "local");
const APPLY = arg("--apply");
const DELETE_REMOVED = arg("--delete-removed");
const uri = argVal("--uri", target === "atlas" ? ATLAS_DB_URL : LOCAL_DB_URL);

if (!uri) { console.error(`✗ No URI for target "${target}". Set ATLAS_DB_URL in Backend/.env or pass --uri.`); process.exit(1); }

(async () => {
  const plan = readJson(join(OUT, "plan.json"));
  console.log(`Target: ${target}  (${uri.replace(/\/\/[^@]*@/, "//***@")})`);
  console.log(`Plan: +${plan.add.length} add | ~${plan.update.length} update | ${plan.removedDocs.length} removed`);
  console.log(APPLY ? "MODE: APPLY (will write)\n" : "MODE: DRY-RUN (no writes — pass --apply to commit)\n");

  await withMongo(uri, async (coll) => {
    // 1) BACKUP (always, even in dry-run, so a snapshot exists before any change)
    const all = await coll.find({}).toArray();
    const backup = backupDocs(all, target);
    console.log(`✓ backup: ${all.length} docs -> ${backup}`);

    // 2) ADD missing (idempotent: skip ids already present)
    const wantIds = plan.add.map((a) => a.id).filter(Boolean);
    const present = new Set((await coll.find({ id: { $in: wantIds } }).project({ id: 1 }).toArray()).map((d) => d.id));
    const now = new Date();
    const toInsert = plan.add.filter((a) => !present.has(a.id)).map((a) => ({
      id: a.id, name: a.name, price: round1(a.price), salePercentage: 0,
      category: a.category, sub_cat: a.sub_cat, third_level: a.third_level,
      description: a.description || "", img: a.img, sku: a.sku || undefined,
      isActive: true, isAvailable: true, visible: true, createdAt: now, updatedAt: now,
    }));
    console.log(`ADD: ${toInsert.length} new (${plan.add.length - toInsert.length} already present)`);
    if (APPLY && toInsert.length) await coll.insertMany(toInsert, { ordered: false });

    // 3) UPDATE matched (price / visibility / stock / image-fix)
    console.log(`UPDATE: ${plan.update.length}`);
    if (APPLY) {
      const ops = plan.update.map((u) => ({
        updateOne: { filter: { _id: oid(u._id) }, update: { $set: { ...u.set, updatedAt: now } } },
      }));
      for (let i = 0; i < ops.length; i += 500) if (ops.slice(i, i + 500).length) await coll.bulkWrite(ops.slice(i, i + 500), { ordered: false });
    }

    // 4) REMOVED (hide by default, delete if asked)
    const removedIds = plan.removedDocs.map((r) => oid(r._id));
    if (DELETE_REMOVED) {
      console.log(`DELETE removed: ${removedIds.length}`);
      if (APPLY && removedIds.length) await coll.deleteMany({ _id: { $in: removedIds } });
    } else {
      console.log(`HIDE removed: ${removedIds.length} (set isActive=false; use --delete-removed to remove)`);
      if (APPLY && removedIds.length) await coll.updateMany({ _id: { $in: removedIds } }, { $set: { isActive: false, updatedAt: now } });
    }

    console.log(APPLY ? "\n✓ APPLIED." : "\n(dry-run complete — nothing written)");
  });

  if (target === "local") {
    console.log("\nNext: regenerate the static catalog so the site reflects this:");
    console.log("  cd Backend  && node dump-products.js");
    console.log("  cd Frontend && node scripts/generate-catalog.mjs");
  }
})().catch((e) => { console.error("✗ sync failed:", e.stack || e.message); process.exit(1); });
