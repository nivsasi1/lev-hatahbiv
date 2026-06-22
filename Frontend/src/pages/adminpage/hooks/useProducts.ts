import { useMemo, useState } from "react";
import { useAdmin } from "../context";
import type { AdminProduct } from "../lib/types";
import { ils } from "../lib/helpers";
import { CSV_HEADERS } from "../lib/constants";
import { csvEscape, downloadFile } from "../lib/csv";

// The products tab's list: search/status/price filters, derived counts, the
// selection set + bulk actions, and the single-row actions. Reads the product
// list from the shared context; owns only the view-local filter/selection state.
export function useProducts() {
  const { products, setProducts, call, act, uiConfirm, uiPrompt, setError, setNotice, refresh } =
    useAdmin();

  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(30);
  const [statusFilter, setStatusFilter] = useState<"all" | "sale" | "hidden" | "oos">("all");
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const patchLocal = (p: AdminProduct) =>
    setProducts((prev) => prev.map((x) => (x._id === p._id ? { ...x, ...p } : x)));

  // ---- single-product actions ----
  const toggleActive = (p: AdminProduct) =>
    act(async () => {
      const d = await call(`/products/${p._id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: p.isActive === false }),
      });
      patchLocal(d.product);
    });

  const toggleStock = (p: AdminProduct) =>
    act(async () => {
      const d = await call(`/products/${p._id}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: p.isAvailable === false }),
      });
      patchLocal(d.product);
    });

  const setSale = async (p: AdminProduct) => {
    const input = await uiPrompt(
      "הגדרת מבצע",
      `אחוז הנחה עבור "${p.name}" (0 לביטול המבצע):`,
      String(p.salePercentage || 0)
    );
    if (input === null) return;
    const pct = Number(input);
    if (!Number.isFinite(pct) || pct < 0 || pct > 95) {
      setError("אחוז הנחה חייב להיות מספר בין 0 ל־95");
      return;
    }
    act(async () => {
      const d = await call(`/products/${p._id}/sale`, {
        method: "PATCH",
        body: JSON.stringify({ salePercentage: pct }),
      });
      patchLocal(d.product);
    }, pct > 0 ? `המוצר במבצע ${pct}%` : "המבצע בוטל");
  };

  const remove = async (p: AdminProduct) => {
    const ok = await uiConfirm("מחיקת מוצר", `למחוק לצמיתות את "${p.name}"?\nאין דרך חזרה.`);
    if (!ok) return;
    act(async () => {
      await call(`/products/${p._id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((x) => x._id !== p._id));
    }, "המוצר נמחק");
  };

  // ---- bulk actions on the selection ----
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulk = (action: { type: string; value?: any }, okMsg: string) =>
    act(async () => {
      await call(`/products/bulk`, {
        method: "POST",
        body: JSON.stringify({ ids: [...selected], action }),
      });
      setSelected(new Set());
      await refresh();
    }, okMsg);

  const bulkSale = async () => {
    const n = selected.size;
    const input = await uiPrompt("מבצע לכולם", `אחוז הנחה עבור ${n} מוצרים (0 לביטול מבצע):`, "10");
    if (input === null) return;
    const pct = Number(input);
    if (!Number.isFinite(pct) || pct < 0 || pct > 95) {
      setError("אחוז הנחה חייב להיות מספר בין 0 ל־95");
      return;
    }
    bulk(
      { type: "sale", value: pct },
      pct > 0 ? `מבצע ${pct}% הופעל על ${n} מוצרים` : `המבצע בוטל ל־${n} מוצרים`
    );
  };

  const bulkPrice = async () => {
    const n = selected.size;
    const input = await uiPrompt(
      "שינוי מחיר באחוזים",
      `שינוי מחיר באחוזים עבור ${n} מוצרים\n(למשל 10 = ייקור ב־10%, ‎-5 = הוזלה ב־5%):`,
      "10"
    );
    if (input === null) return;
    const pct = Number(input);
    if (!Number.isFinite(pct) || pct === 0 || pct < -90 || pct > 500) {
      setError("יש להזין אחוז שינוי בין -90 ל־500 (לא 0)");
      return;
    }
    bulk({ type: "price", value: pct }, `המחיר של ${n} מוצרים עודכן ב־${pct}%`);
  };

  const bulkSetPrice = async () => {
    const n = selected.size;
    const input = await uiPrompt("מחיר אחיד", `כל המוצרים שנבחרו יקבלו את אותו מחיר (${n} מוצרים):`, "");
    if (input === null) return;
    const price = Number(input);
    if (!Number.isFinite(price) || price <= 0) {
      setError("המחיר חייב להיות מספר גדול מ־0");
      return;
    }
    bulk({ type: "setPrice", value: price }, `${n} מוצרים תומחרו ל־₪${ils(price)}`);
  };

  const bulkDelete = async () => {
    const n = selected.size;
    const ok = await uiConfirm("מחיקה מרובה", `למחוק לצמיתות ${n} מוצרים?\nאין דרך חזרה!`);
    if (!ok) return;
    bulk({ type: "delete" }, `${n} מוצרים נמחקו`);
  };

  // ---- CSV export (also doubles as a backup) ----
  const exportCsv = () => {
    const lines = [CSV_HEADERS.join(",")];
    for (const p of products) {
      lines.push(
        [
          csvEscape(p.name),
          p.price,
          csvEscape(p.category),
          csvEscape(p.sub_cat || ""),
          csvEscape(p.third_level || ""),
          csvEscape(p.description || ""),
          csvEscape(p.img || ""),
          p.salePercentage || 0,
        ].join(",")
      );
    }
    downloadFile(`lev-hatahbiv-products-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\n"));
    setNotice(`יוצאו ${products.length} מוצרים לקובץ CSV`);
  };

  // ---- derived list ----
  // newest-edited first; undated products keep their relative order (stable).
  const sortedProducts = useMemo(() => {
    const t = (p: AdminProduct) => {
      const d = p.updatedAt || p.createdAt;
      return d ? new Date(d).getTime() : -1;
    };
    return [...products]
      .map((p, i) => [p, i] as const)
      .sort((a, b) => {
        const diff = t(b[0]) - t(a[0]);
        return diff !== 0 ? diff : a[1] - b[1];
      })
      .map(([p]) => p);
  }, [products]);

  const maxPrice = useMemo(() => {
    const m = products.reduce((mx, p) => Math.max(mx, Number(p.price) || 0), 0);
    return Math.max(10, Math.ceil(m / 10) * 10);
  }, [products]);
  const priceHi = priceMax ?? maxPrice;
  const priceActive = priceMin > 0 || priceMax !== null;

  const filtered = useMemo(() => {
    const q = query.trim();
    let list = sortedProducts;
    if (statusFilter === "sale") list = list.filter((p) => (p.salePercentage || 0) > 0);
    if (statusFilter === "hidden") list = list.filter((p) => p.isActive === false);
    if (statusFilter === "oos") list = list.filter((p) => p.isAvailable === false);
    if (priceActive)
      list = list.filter((p) => {
        const price = Number(p.price) || 0;
        return price >= priceMin && price <= priceHi;
      });
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.includes(q) ||
        p.category.includes(q) ||
        (p.sub_cat || "").includes(q) ||
        (p.third_level || "").includes(q)
    );
  }, [sortedProducts, query, statusFilter, priceActive, priceMin, priceHi]);

  const shown = filtered.slice(0, limit);
  const hiddenCount = products.filter((p) => p.isActive === false).length;
  const oosCount = products.filter((p) => p.isAvailable === false).length;
  const saleCount = products.filter((p) => (p.salePercentage || 0) > 0).length;

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p._id));

  const selProducts = useMemo(
    () => products.filter((p) => selected.has(p._id)),
    [products, selected]
  );
  const anyHidden = selProducts.some((p) => p.isActive === false);
  const anyVisible = selProducts.some((p) => p.isActive !== false);
  const anyOos = selProducts.some((p) => p.isAvailable === false);
  const anyInStock = selProducts.some((p) => p.isAvailable !== false);

  // reset pagination to the first page (called by every filter change)
  const resetLimit = () => setLimit(30);

  return {
    // filter state
    query,
    setQuery,
    limit,
    setLimit,
    statusFilter,
    setStatusFilter,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    maxPrice,
    priceHi,
    priceActive,
    resetLimit,
    // derived
    filtered,
    shown,
    hiddenCount,
    oosCount,
    saleCount,
    // selection
    selected,
    setSelected,
    toggleSelect,
    allFilteredSelected,
    anyHidden,
    anyVisible,
    anyOos,
    anyInStock,
    // actions
    toggleActive,
    toggleStock,
    setSale,
    remove,
    bulk,
    bulkSale,
    bulkPrice,
    bulkSetPrice,
    bulkDelete,
    exportCsv,
  };
}
