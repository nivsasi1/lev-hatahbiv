// Pull the full Wix catalog + collections to disk. Re-run anytime to refresh.
//   node migration/pull-wix.mjs
import { join } from "path";
import {
  fetchAllProducts, fetchAllCollections, ensureDirs, writeJson, MIG,
} from "./lib.mjs";

(async () => {
  ensureDirs();
  process.stdout.write("Pulling Wix products");
  const { products, total, complete } = await fetchAllProducts({
    onProgress: (n, t) => process.stdout.write(`\rPulling Wix products... ${n}/${t ?? "?"}   `),
  });
  process.stdout.write("\n");

  const collections = await fetchAllCollections();

  writeJson(join(MIG, "wix-products.json"), products);
  writeJson(join(MIG, "wix-collections.json"), collections);

  const noImg = products.filter((p) => !p.img).length;
  const hidden = products.filter((p) => !p.visible).length;
  const oos = products.filter((p) => !p.inStock).length;
  console.log(`\n✓ wrote migration/wix-products.json  (${products.length} products, total reported ${total})`);
  console.log(`✓ wrote migration/wix-collections.json (${Object.keys(collections).length} collections)`);
  console.log(`  hidden: ${hidden} | out-of-stock: ${oos} | no-image: ${noImg}`);
  if (!complete) {
    console.error(`\n⚠ INCOMPLETE: collected ${products.length} but Wix reports ${total}. Re-run before syncing.`);
    process.exit(2);
  }
})().catch((e) => {
  console.error("\n✗ pull failed:", e.message);
  process.exit(1);
});
