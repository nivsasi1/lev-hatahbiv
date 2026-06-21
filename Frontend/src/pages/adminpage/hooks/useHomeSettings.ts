import { useMemo, useState } from "react";
import { useAdmin } from "../context";
import { toRibbonSlots } from "../lib/helpers";

// Home-page content saved to the Express settings singleton: the marquee ribbon
// texts, featured products, the home sale picks, and per-category shelf photos.
// All four save through the SAME settings payload so saving one never wipes the
// others. Changes appear on the site after "publish".
export function useHomeSettings() {
  const { call, act, products } = useAdmin();

  const [ribbonSlots, setRibbonSlots] = useState<string[]>(() => toRibbonSlots([]));
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [featuredSearch, setFeaturedSearch] = useState("");
  const [saleIds, setSaleIds] = useState<string[]>([]);
  const [saleSearch, setSaleSearch] = useState("");
  const [shelfImages, setShelfImages] = useState<Record<string, string>>({});
  const [shelfUploading, setShelfUploading] = useState<string | null>(null);
  const [shelfSaved, setShelfSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const productById = useMemo(
    () => new Map(products.map((p) => [p._id, p])),
    [products]
  );

  const load = () =>
    act(async () => {
      const d = await call(`/settings`);
      setRibbonSlots(toRibbonSlots(d.settings.ribbonTexts || []));
      setFeaturedIds((d.settings.featuredIds || []).filter(Boolean));
      setSaleIds((d.settings.saleIds || []).filter(Boolean));
      setShelfImages(
        d.settings.shelfImages && typeof d.settings.shelfImages === "object"
          ? d.settings.shelfImages
          : {}
      );
      setLoaded(true);
    });

  // every section sends the CURRENT values of all keys so saving one section
  // never wipes the others; ribbon is the non-empty trimmed inputs.
  const settingsPayload = () => ({
    ribbonTexts: ribbonSlots.map((s) => s.trim()).filter(Boolean).slice(0, 8),
    featuredIds,
    saleIds,
    shelfImages,
  });
  const putSettings = (okMsg: string) =>
    act(async () => {
      await call(`/settings`, { method: "PUT", body: JSON.stringify(settingsPayload()) });
    }, okMsg);

  // ── ribbon ──
  const setRibbonSlot = (i: number, v: string) =>
    setRibbonSlots((slots) => slots.map((s, j) => (j === i ? v : s)));
  const saveRibbons = () => putSettings("הטקסטים נשמרו! יופיעו באתר אחרי פרסום");

  // ── featured ──
  const featuredMatches = useMemo(() => {
    const q = featuredSearch.trim();
    if (!q) return [];
    return products.filter((p) => p.name.includes(q) && !featuredIds.includes(p._id)).slice(0, 8);
  }, [featuredSearch, products, featuredIds]);
  const addFeatured = (id: string) =>
    setFeaturedIds((ids) => (ids.includes(id) || ids.length >= 12 ? ids : [...ids, id]));
  const removeFeatured = (id: string) => setFeaturedIds((ids) => ids.filter((x) => x !== id));
  const saveFeatured = () => putSettings("המוצרים הנבחרים נשמרו! יופיעו באתר אחרי פרסום");

  // ── sale picker (candidates are only on-sale products) ──
  const saleMatches = useMemo(() => {
    const q = saleSearch.trim();
    if (!q) return [];
    return products
      .filter((p) => (p.salePercentage || 0) > 0 && p.name.includes(q) && !saleIds.includes(p._id))
      .slice(0, 8);
  }, [saleSearch, products, saleIds]);
  const addSale = (id: string) =>
    setSaleIds((ids) => (ids.includes(id) || ids.length >= 5 ? ids : [...ids, id]));
  const removeSale = (id: string) => setSaleIds((ids) => ids.filter((x) => x !== id));
  const saveSales = () => putSettings("המבצעים נשמרו! יופיעו באתר אחרי פרסום");

  // ── shelf images: per-category home-mosaic photos ──
  // an empty value removes the key so the storefront falls back to its default.
  const setShelfImage = (slug: string, url: string) => {
    setShelfSaved(false);
    setShelfImages((m) => {
      const next = { ...m };
      const v = url.trim();
      if (v) next[slug] = v;
      else delete next[slug];
      return next;
    });
  };
  const resetShelfImage = (slug: string) => setShelfImage(slug, "");
  const uploadShelfImage = (slug: string, file: File) => {
    const body = new FormData();
    body.append("image", file);
    setShelfUploading(slug);
    act(async () => {
      const d = await call(`/upload`, { method: "POST", body });
      setShelfImage(slug, d.img);
    }, "התמונה הועלתה — לחצו על שמירה כדי להחיל").finally(() => setShelfUploading(null));
  };
  const saveShelfImages = () =>
    act(async () => {
      await call(`/settings`, { method: "PUT", body: JSON.stringify(settingsPayload()) });
      setShelfSaved(true);
    }, "תמונות המדפים נשמרו! יופיעו באתר אחרי פרסום");

  return {
    loaded,
    load,
    productById,
    // ribbon
    ribbonSlots,
    setRibbonSlot,
    saveRibbons,
    // featured
    featuredIds,
    featuredSearch,
    setFeaturedSearch,
    featuredMatches,
    addFeatured,
    removeFeatured,
    saveFeatured,
    // sale
    saleIds,
    saleSearch,
    setSaleSearch,
    saleMatches,
    addSale,
    removeSale,
    saveSales,
    // shelf
    shelfImages,
    shelfUploading,
    shelfSaved,
    setShelfImage,
    resetShelfImage,
    uploadShelfImage,
    saveShelfImages,
  };
}
