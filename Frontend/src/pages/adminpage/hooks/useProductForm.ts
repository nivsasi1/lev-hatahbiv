import { useMemo, useState } from "react";
import { useAdmin } from "../context";
import { categories } from "../../../data/catalog";
import { emptyForm, type AdminProduct, type ProductForm } from "../lib/types";

// The product add/edit form: its state, the cascading category fields with
// data-driven autocomplete, image handling, and create/update submit.
export function useProductForm() {
  const { products, setProducts, call, act, uiConfirm, setError } = useAdmin();

  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const patchLocal = (p: AdminProduct) =>
    setProducts((prev) => prev.map((x) => (x._id === p._id ? { ...x, ...p } : x)));

  const startEdit = (p: AdminProduct) => {
    setEditingId(p._id);
    setShowAdd(false);
    setForm({
      name: p.name,
      price: String(p.price),
      description: p.description || "",
      category: p.category,
      sub_cat: p.sub_cat || "",
      third_level: p.third_level || "",
      imgs: (p.img || "").split(";").map((s) => s.trim()).filter(Boolean),
    });
  };

  const duplicate = (p: AdminProduct) => {
    setEditingId(null);
    setShowAdd(true);
    setForm({
      name: `${p.name} (עותק)`,
      price: String(p.price),
      description: p.description || "",
      category: p.category,
      sub_cat: p.sub_cat || "",
      third_level: p.third_level || "",
      imgs: (p.img || "").split(";").map((s) => s.trim()).filter(Boolean),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleAdd = () => {
    setShowAdd((v) => !v);
    setEditingId(null);
    setForm(emptyForm);
  };

  const cancelEdit = () => {
    setEditingId(null);
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
    const { imgs, ...rest } = form;
    const payload = { ...rest, img: imgs.join(";"), price: Number(form.price) };
    act(async () => {
      if (editingId) {
        const d = await call(`/products/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        patchLocal(d.product);
      } else {
        const d = await call(`/products`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setProducts((prev) => [d.product, ...prev]);
      }
      setEditingId(null);
      setShowAdd(false);
      setForm(emptyForm);
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
    visible: showAdd || editingId !== null,
    startEdit,
    duplicate,
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
