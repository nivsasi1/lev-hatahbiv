import { useMemo, useState } from "react";
import { useAdmin } from "../context";
import { toRibbonSlots } from "../lib/helpers";
import { categories, slugOf, rankSeries } from "../../../data/catalog";

// Home-page content saved to the Express settings singleton: the marquee ribbon
// texts, featured products, the home sale picks, and per-category shelf photos.
// All four save through the SAME settings payload so saving one never wipes the
// others. Changes appear on the site after "publish".
// { shelfKey: [id|series, ...] } from the API, shape-checked
const asShelfMap = (raw: any): Record<string, string[]> => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (Array.isArray(v)) {
      const clean = v.map((x) => String(x)).filter(Boolean);
      if (clean.length) out[k] = clean;
    }
  }
  return out;
};

const catSlugByName = new Map(categories.map((c) => [c.name, c.slug]));

export function useHomeSettings() {
  const { call, act, products } = useAdmin();

  const [ribbonSlots, setRibbonSlots] = useState<string[]>(() => toRibbonSlots([]));
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [featuredSearch, setFeaturedSearch] = useState("");
  const [saleIds, setSaleIds] = useState<string[]>([]);
  const [saleSearch, setSaleSearch] = useState("");
  const [shelfImages, setShelfImages] = useState<Record<string, string>>({});
  // per-shelf: which products lead the page, and the order of its series chips
  const [shelfPicks, setShelfPicks] = useState<Record<string, string[]>>({});
  const [shelfOrder, setShelfOrder] = useState<Record<string, string[]>>({});
  const [shelfTitles, setShelfTitles] = useState<Record<string, string>>({});
  const [shelfSel, setShelfSel] = useState("");
  const [shelfSearch, setShelfSearch] = useState("");
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
      setShelfPicks(asShelfMap(d.settings.shelfPicks));
      setShelfOrder(asShelfMap(d.settings.shelfOrder));
      setShelfTitles(
        d.settings.shelfTitles && typeof d.settings.shelfTitles === "object"
          ? d.settings.shelfTitles
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
    shelfPicks,
    shelfOrder,
    shelfTitles,
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
    const q = featuredSearch.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q) && !featuredIds.includes(p._id))
      .slice(0, 8);
  }, [featuredSearch, products, featuredIds]);
  const addFeatured = (id: string) =>
    setFeaturedIds((ids) => (ids.includes(id) || ids.length >= 12 ? ids : [...ids, id]));
  const removeFeatured = (id: string) => setFeaturedIds((ids) => ids.filter((x) => x !== id));
  const saveFeatured = () => putSettings("המוצרים הנבחרים נשמרו! יופיעו באתר אחרי פרסום");

  // ── sale picker (candidates are only on-sale products) ──
  const saleMatches = useMemo(() => {
    const q = saleSearch.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) => (p.salePercentage || 0) > 0 && p.name.toLowerCase().includes(q) && !saleIds.includes(p._id)
      )
      .slice(0, 8);
  }, [saleSearch, products, saleIds]);
  const addSale = (id: string) =>
    setSaleIds((ids) => (ids.includes(id) || ids.length >= 5 ? ids : [...ids, id]));
  const removeSale = (id: string) => setSaleIds((ids) => ids.filter((x) => x !== id));
  const saveSales = () => putSettings("המבצעים נשמרו! יופיעו באתר אחרי פרסום");

  // ── shelves: lead products + series order, per sub-category page ──
  // A shelf is identified the same way the storefront does it: category slug +
  // slugged sub-category name (sub names can contain "/", so never the raw name).
  const shelfKeyOf = (p: { category: string; sub_cat?: string }) => {
    const catSlug = catSlugByName.get(p.category);
    const sub = (p.sub_cat || "").trim();
    return catSlug && sub ? `${catSlug}/${slugOf(sub)}` : "";
  };

  const shelves = useMemo(() => {
    const map = new Map<string, { key: string; cat: string; sub: string; count: number }>();
    for (const p of products) {
      if (p.isActive === false) continue; // hidden products have no shelf page
      const key = shelfKeyOf(p);
      if (!key) continue;
      const row = map.get(key) || { key, cat: p.category, sub: (p.sub_cat || "").trim(), count: 0 };
      row.count++;
      map.set(key, row);
    }
    return [...map.values()].sort(
      (a, b) => a.cat.localeCompare(b.cat, "he") || a.sub.localeCompare(b.sub, "he")
    );
  }, [products]);

  const shelfProducts = useMemo(
    () => (shelfSel ? products.filter((p) => p.isActive !== false && shelfKeyOf(p) === shelfSel) : []),
    [products, shelfSel]
  );

  // Series of the selected shelf in the draft order being edited. The base order
  // MUST match the storefront's (biggest series first — see seriesOfShelf in
  // data/catalog.ts), otherwise the manager reorders a list the shop never shows.
  const shelfSeries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of shelfProducts) {
      const name = (p.third_level || "").trim();
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return rankSeries(counts, shelfOrder[shelfSel]);
  }, [shelfProducts, shelfOrder, shelfSel]);

  const shelfPickIds = shelfSel ? shelfPicks[shelfSel] ?? [] : [];

  const shelfMatches = useMemo(() => {
    const q = shelfSearch.trim().toLowerCase();
    if (!q || !shelfSel) return [];
    return shelfProducts
      .filter((p) => p.name.toLowerCase().includes(q) && !shelfPickIds.includes(p._id))
      .slice(0, 8);
  }, [shelfSearch, shelfProducts, shelfPickIds, shelfSel]);

  const setShelfList = (
    setter: typeof setShelfPicks,
    key: string,
    next: string[]
  ) =>
    setter((prev) => {
      const out = { ...prev };
      if (next.length) out[key] = next;
      else delete out[key]; // an empty list means "no preference", not an empty shelf
      return out;
    });

  const addShelfPick = (id: string) => {
    if (!shelfSel || shelfPickIds.length >= 5 || shelfPickIds.includes(id)) return;
    setShelfList(setShelfPicks, shelfSel, [...shelfPickIds, id]);
  };
  const removeShelfPick = (id: string) =>
    shelfSel && setShelfList(setShelfPicks, shelfSel, shelfPickIds.filter((x) => x !== id));
  const moveShelfPick = (id: string, dir: -1 | 1) => {
    if (!shelfSel) return;
    const i = shelfPickIds.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= shelfPickIds.length) return;
    const next = [...shelfPickIds];
    [next[i], next[j]] = [next[j], next[i]];
    setShelfList(setShelfPicks, shelfSel, next);
  };

  // moving a chip writes the WHOLE current order, so the saved list is always a
  // complete ranking of the shelf rather than a single moved name
  const moveSeries = (name: string, dir: -1 | 1) => {
    if (!shelfSel) return;
    const i = shelfSeries.indexOf(name);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= shelfSeries.length) return;
    const next = [...shelfSeries];
    [next[i], next[j]] = [next[j], next[i]];
    setShelfList(setShelfOrder, shelfSel, next);
  };
  // drag-and-drop: drop the dragged name at another name's position
  const reorderSeries = (from: string, to: string) => {
    if (!shelfSel || from === to) return;
    const i = shelfSeries.indexOf(from);
    const j = shelfSeries.indexOf(to);
    if (i < 0 || j < 0) return;
    const next = [...shelfSeries];
    next.splice(i, 1);
    next.splice(j, 0, from);
    setShelfList(setShelfOrder, shelfSel, next);
  };

  // the common case on a long shelf: "put this one first" without 14 clicks
  const seriesToTop = (name: string) => {
    if (!shelfSel) return;
    const i = shelfSeries.indexOf(name);
    if (i <= 0) return;
    const next = [...shelfSeries];
    next.splice(i, 1);
    next.unshift(name);
    setShelfList(setShelfOrder, shelfSel, next);
  };

  const resetSeriesOrder = () => shelfSel && setShelfList(setShelfOrder, shelfSel, []);

  // heading above this shelf's picks; blank drops the key so the picks simply
  // lead the grid with no label
  const shelfTitle = shelfSel ? shelfTitles[shelfSel] ?? "" : "";
  const setShelfTitle = (text: string) =>
    shelfSel &&
    setShelfTitles((prev) => {
      const out = { ...prev };
      const t = text.trimStart();
      if (t) out[shelfSel] = t;
      else delete out[shelfSel];
      return out;
    });

  const saveShelves = () => putSettings("המדף נשמר! יופיע באתר אחרי פרסום");

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
    // shelves
    shelves,
    shelfSel,
    setShelfSel,
    shelfSearch,
    setShelfSearch,
    shelfMatches,
    shelfPickIds,
    addShelfPick,
    removeShelfPick,
    moveShelfPick,
    shelfTitle,
    setShelfTitle,
    shelfSeries,
    moveSeries,
    reorderSeries,
    seriesToTop,
    resetSeriesOrder,
    shelfOrder,
    saveShelves,
    // shelf images
    shelfImages,
    shelfUploading,
    shelfSaved,
    setShelfImage,
    resetShelfImage,
    uploadShelfImage,
    saveShelfImages,
  };
}
