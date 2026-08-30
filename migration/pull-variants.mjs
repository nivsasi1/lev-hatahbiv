// Pull per-variant data (choices, prices, stock) for every Wix product that
// manages variants. Run AFTER pull-wix.mjs (needs wix-products.json).
//   node migration/pull-variants.mjs
import { join } from "path";
import { readJson, writeJson, ensureDirs, MIG, fetchProductVariants } from "./lib.mjs";

ensureDirs();
const products = readJson(join(MIG, "wix-products.json"));
const managed = products.filter((p) => p.manageVariants && (p.productOptions || []).length);
console.log(`${managed.length} of ${products.length} Wix products manage variants`);

const out = {};
let done = 0;
const queue = [...managed];
const CONC = 5; // polite to Wix rate limits; wixPost retries 429s anyway
await Promise.all(
  Array.from({ length: CONC }, async () => {
    for (;;) {
      const p = queue.shift();
      if (!p) return;
      const variants = await fetchProductVariants(p.wixId);
      out[p.exportProductId || "__noexport_" + p.wixId] = {
        wixId: p.wixId,
        name: p.name,
        sku: p.sku,
        basePrice: p.price,
        options: p.productOptions,
        variants,
      };
      done++;
      process.stdout.write(`\rPulling variants... ${done}/${managed.length}   `);
    }
  })
);
process.stdout.write("\n");

writeJson(join(MIG, "wix-variants.json"), out);
const nVar = Object.values(out).reduce((s, p) => s + p.variants.length, 0);
console.log(`✓ wrote migration/wix-variants.json (${managed.length} products, ${nVar} variants)`);
