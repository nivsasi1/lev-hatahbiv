import { useMemo, useRef, useState } from "react";
import { useAdmin } from "../context";
import { categories } from "../../../data/catalog";
import {
  emptyForm,
  type AdminProduct,
  type AdminVariant,
  type FormVariant,
  type ProductForm,
} from "../lib/types";
import { sortTime } from "./useProducts";

// Mongo variants <-> editable rows (inputs hold strings)
const toFormVariants = (v?: AdminVariant[]): FormVariant[] =>
  (v ?? []).map((x) => ({
    key: x.key,
    price: x.price != null ? String(x.price) : "",
    soldOut: !!x.soldOut,
    swatch: x.swatch ?? "",
    sku: x.sku ?? "",
  }));

const toApiVariants = (rows: FormVariant[]): AdminVariant[] =>
  rows
    .filter((r) => r.key.trim())
    .map((r) => ({
      key: r.key.trim(),
      ...(r.price.trim() !== "" ? { price: Number(r.price) } : {}),
      ...(r.soldOut ? { soldOut: true } : {}),
      ...(r.swatch.trim() ? { swatch: r.swatch.trim() } : {}),
      ...(r.sku.trim() ? { sku: r.sku.trim() } : {}),
    }));

// every barcode a product carries — its own plus its options'
export const skusOf = (p: { sku?: string; variants?: AdminVariant[] }) =>
  [p.sku, ...(p.variants ?? []).map((v) => v.sku)]
    .map((s) => (s || "").trim())
    .filter(Boolean);

// The product add/edit form: its state, the cascading category fields with
// data-driven autocomplete, image handling, and create/update submit.
export function useProductForm() {
  const { products, setProducts, call, act, uiConfirm, setError, setNotice } = useAdmin();

  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  // the row that was just saved glows for a moment — the dialog closes in place,
  // so this is the manager's "it worked" cue
  const [savedId, setSavedId] = useState<string | null>(null);
  const savedTimer = useRef<number>();

  const patchLocal = (p: AdminProduct) =>
    setProducts((prev) => prev.map((x) => (x._id === p._id ? { ...x, ...p } : x)));

  // the form dialog shows the banners itself, so start it without stale ones
  const clearBanners = () => {
    setError("");
    setNotice("");
  };

  const startEdit = (p: AdminProduct) => {
    clearBanners();
    setEditingId(p._id);
    setShowAdd(false);
    setForm({
      name: p.name,
      price: String(p.price),
      description: p.description || "",
      category: p.category,
      sub_cat: p.sub_cat || "",
      third_level: p.third_level || "",
      sku: p.sku || "",
      searchKeywords: p.searchKeywords || "",
      imgs: (p.img || "").split(";").map((s) => s.trim()).filter(Boolean),
      variantLabel: p.variantLabel || "",
      variants: toFormVariants(p.variants),
      noCoupon: !!p.noCoupon,
    });
  };

  const duplicate = (p: AdminProduct) => {
    clearBanners();
    setEditingId(null);
    setShowAdd(true);
    setForm({
      name: `${p.name} (עותק)`,
      price: String(p.price),
      description: p.description || "",
      category: p.category,
      sub_cat: p.sub_cat || "",
      third_level: p.third_level || "",
      sku: "", // a copy is a different physical item — it gets its own barcode
      searchKeywords: p.searchKeywords || "",
      imgs: (p.img || "").split(";").map((s) => s.trim()).filter(Boolean),
      variantLabel: p.variantLabel || "",
      variants: toFormVariants(p.variants).map((v) => ({ ...v, sku: "" })),
      noCoupon: !!p.noCoupon,
    });
  };

  // a scanned (or typed) barcode: open the product that carries it (on itself or
  // on one of its options) for editing, otherwise start a new product with the
  // barcode already filled in. Returns the match so the caller can report it.
  const openByBarcode = (raw: string) => {
    const code = raw.trim();
    if (!code) return null;
    const product = products.find((p) => skusOf(p).includes(code));
    const hit = product
      ? { product, variantKey: product.variants?.find((v) => (v.sku || "").trim() === code)?.key }
      : null;
    if (hit) {
      startEdit(hit.product);
    } else {
      clearBanners();
      setEditingId(null);
      setShowAdd(true);
      setForm({ ...emptyForm, sku: code });
    }
    return hit;
  };

  const toggleAdd = () => {
    clearBanners();
    setShowAdd((v) => !v);
    setEditingId(null);
    setForm(emptyForm);
  };

  // closes the dialog, whether it was editing or adding
  const cancelEdit = () => {
    setEditingId(null);
    setShowAdd(false);
    setForm(emptyForm);
  };

  const submitForm = async (e: any) => {
    e.preventDefault();
    if (form.imgs.length === 0) {
      setError("צריך לפחות תמונה אחת למוצר");
      return;
    }
    // new category? warn — it won't show on the public site until the developer
    // adds it to the site's category list (colors, page, theme).
    const knownCats = new Set([
      ...categories.map((c) => c.name),
      ...products.map((p) => p.category),
    ]);
    if (form.category && !knownCats.has(form.category.trim())) {
      const ok = await uiConfirm(
        "קטגוריה חדשה",
        `"${form.category}" היא קטגוריה חדשה שלא קיימת באתר.\n\n` +
          `שימו לב: מוצרים בקטגוריה חדשה יישמרו במערכת אבל לא יופיעו באתר ` +
          `עד שהמתכנת יוסיף אותה לעיצוב האתר.\n\nלהמשיך בכל זאת?`
      );
      if (!ok) return;
    }
    const { imgs, variants, imgInput, ...rest } = form;
    const apiVariants = toApiVariants(variants);
    if (new Set(apiVariants.map((v) => v.key)).size !== apiVariants.length) {
      setError("יש שתי אפשרויות בחירה עם אותו שם — כל אפשרות צריכה שם ייחודי");
      return;
    }
    // one barcode ↔ one item, product and option barcodes alike — the server
    // enforces it too, this just answers before the round-trip with a name
    const mine = skusOf({ sku: form.sku, variants: apiVariants });
    const twice = mine.find((s, i) => mine.indexOf(s) !== i);
    if (twice) {
      setError(`הברקוד ${twice} מופיע פעמיים באותו מוצר`);
      return;
    }
    for (const p of products) {
      if (p._id === editingId) continue;
      const clash = skusOf(p).find((s) => mine.includes(s));
      if (clash) {
        setError(`הברקוד ${clash} כבר משויך למוצר "${p.name}"`);
        return;
      }
    }
    const payload = {
      ...rest,
      img: imgs.join(";"),
      price: Number(form.price),
      variants: apiVariants,
    };
    act(async () => {
      let saved: AdminProduct;
      if (editingId) {
        const d = await call(`/products/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        saved = d.product;
        // the list sorts by last edit, so the fresh timestamp would fling the row
        // to the top — out from under the manager. Pin it where it was instead.
        const before = products.find((p) => p._id === editingId);
        patchLocal(before ? { ...d.product, sortAt: sortTime(before) } : d.product);
      } else {
        const d = await call(`/products`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        saved = d.product;
        setProducts((prev) => [d.product, ...prev]);
      }
      setEditingId(null);
      setShowAdd(false);
      setForm(emptyForm);
      setSavedId(saved?._id ?? null);
      window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setSavedId(null), 2400);
    }, editingId ? "המוצר עודכן" : "המוצר נוסף");
  };

  const uploadImage = (file: File) => {
    const body = new FormData();
    body.append("image", file);
    act(async () => {
      const d = await call(`/upload`, { method: "POST", body });
      setForm((f) => ({ ...f, imgs: [...f.imgs, d.img] }));
    }, "התמונה הועלתה ונוספה לגלריה");
  };

  // cascading category fields (clear children when a parent changes)
  const setCategory = (v: string) =>
    setForm((f) =>
      f.category === v ? { ...f, category: v } : { ...f, category: v, sub_cat: "", third_level: "" }
    );
  const setSubCat = (v: string) =>
    setForm((f) => (f.sub_cat === v ? { ...f, sub_cat: v } : { ...f, sub_cat: v, third_level: "" }));

  // autocomplete suggestions, derived from real data
  const catOptions = useMemo(
    () =>
      [...new Set([...categories.map((c) => c.name), ...products.map((p) => p.category)])].filter(
        Boolean
      ),
    [products]
  );
  const subOptions = useMemo(
    () =>
      [
        ...new Set(
          products
            .filter((p) => !form.category || p.category === form.category)
            .map((p) => p.sub_cat || "")
        ),
      ].filter(Boolean),
    [products, form.category]
  );
  const thirdOptions = useMemo(
    () =>
      [
        ...new Set(
          products
            .filter(
              (p) =>
                (!form.category || p.category === form.category) &&
                (!form.sub_cat || p.sub_cat === form.sub_cat)
            )
            .map((p) => p.third_level || "")
        ),
      ].filter(Boolean),
    [products, form.category, form.sub_cat]
  );

  return {
    form,
    setForm,
    editingId,
    showAdd,
    savedId,
    visible: showAdd || editingId !== null,
    startEdit,
    duplicate,
    openByBarcode,
    toggleAdd,
    cancelEdit,
    submitForm,
    uploadImage,
    setCategory,
    setSubCat,
    catOptions,
    subOptions,
    thirdOptions,
  };
}
