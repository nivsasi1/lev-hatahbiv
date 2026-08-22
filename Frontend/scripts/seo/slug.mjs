// URL slug rule shared by the SEO build scripts. Mirrors `slugOf` in
// Frontend/src/data/catalog.ts and `slugifyWix` in worker/seo.ts — keep all three identical.
// Wix's store-product slugs follow exactly this: lowercase, every run of anything that is not
// a latin letter / digit / Hebrew letter becomes "-", no leading/trailing dashes.
export const slugify = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9֐-׿]+/g, "-")
    .replace(/^-+|-+$/g, "");
