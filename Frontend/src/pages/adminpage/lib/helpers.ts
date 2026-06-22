import { S3, DEFAULT_RIBBONS } from "./constants";

// resolve a product/shelf image: full URL or "/..." path used as-is, otherwise
// it's a bare S3 filename.
export const imgUrl = (img: string) =>
  !img ? "" : img.startsWith("http") || img.startsWith("/") ? img : S3 + img;

// one-decimal price display (4.333 -> 4.3), same as the storefront
export const ils = (n: number) => {
  const r = Math.round(Number(n) * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

// pads/truncates a saved ribbon list to exactly 8 input slots; empty saved
// list falls back to the example defaults.
export const toRibbonSlots = (saved: string[]): string[] => {
  const base = saved.filter((t) => t.trim() !== "").length ? saved : DEFAULT_RIBBONS;
  return Array.from({ length: 8 }, (_, i) => base[i] ?? "");
};
