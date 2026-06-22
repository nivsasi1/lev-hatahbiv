import type { useProductForm } from "../../hooks/useProductForm";
import { imgUrl } from "../../lib/helpers";

type FormApi = ReturnType<typeof useProductForm>;

export function ProductForm({ form }: { form: FormApi }) {
  const {
    form: data,
    setForm,
    editingId,
    catOptions,
    subOptions,
    thirdOptions,
    setCategory,
    setSubCat,
    submitForm,
    uploadImage,
    cancelEdit,
  } = form;

  return (
    <form className="admin-form" onSubmit={submitForm}>
      <h3 className="display">{editingId ? "עריכת מוצר" : "מוצר חדש"}</h3>
      <div className="admin-form-grid">
        <input
          placeholder="שם המוצר *"
          required
          value={data.name}
          onInput={(e: any) => setForm({ ...data, name: e.target.value })}
        />
        <input
          placeholder="מחיר בש״ח *"
          required
          type="number"
          min="0.1"
          step="0.1"
          value={data.price}
          onInput={(e: any) => setForm({ ...data, price: e.target.value })}
        />
        <input
          placeholder="קטגוריה * — בחרו מהרשימה או הקלידו חדשה"
          required
          list="dl-categories"
          value={data.category}
          onInput={(e: any) => setCategory(e.target.value)}
        />
        <input
          placeholder={data.category.trim() ? "תת-קטגוריה (מדף)" : "קודם בוחרים קטגוריה"}
          list="dl-subs"
          disabled={!data.category.trim()}
          value={data.sub_cat}
          onInput={(e: any) => setSubCat(e.target.value)}
        />
        <input
          placeholder={data.sub_cat.trim() ? "סדרה / מותג" : "קודם בוחרים מדף"}
          list="dl-thirds"
          disabled={!data.sub_cat.trim()}
          value={data.third_level}
          onInput={(e: any) => setForm({ ...data, third_level: e.target.value })}
        />
        <datalist id="dl-categories">
          {catOptions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <datalist id="dl-subs">
          {subOptions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <datalist id="dl-thirds">
          {thirdOptions.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <input
          placeholder="קישור לתמונה מהאינטרנט (URL) — ולוחצים Enter"
          value={data.imgInput ?? ""}
          onInput={(e: any) => setForm({ ...data, imgInput: e.target.value })}
          onKeyDown={(e: any) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = (data.imgInput || "").trim();
              if (v) setForm({ ...data, imgs: [...data.imgs, v], imgInput: "" });
            }
          }}
        />
      </div>
      <p className="import-help">
        תמונות אפשר להוסיף בשלוש דרכים: הדבקת קישור (URL) + Enter · העלאת קובץ
        מהמחשב בכפתור למטה · הקלדת שם קובץ שכבר קיים במאגר התמונות (S3) של החנות.
        התמונה הראשונה ברשימה היא התמונה הראשית.
      </p>
      {data.imgs.length > 0 && (
        <div className="img-chips">
          {data.imgs.map((im, i) => (
            <span key={im + i} className="img-chip">
              <img src={imgUrl(im)} alt="" />
              {i === 0 && <b>ראשית</b>}
              <button
                type="button"
                aria-label="הסרת תמונה"
                onClick={() => setForm({ ...data, imgs: data.imgs.filter((_, j) => j !== i) })}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <textarea
        placeholder="תיאור המוצר"
        rows={3}
        value={data.description}
        onInput={(e: any) => setForm({ ...data, description: e.target.value })}
      />
      <div className="admin-form-foot">
        <label className="btn small ghost">
          📷 העלאת תמונה מהמחשב
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(e: any) => e.target.files?.[0] && uploadImage(e.target.files[0])}
          />
        </label>
        <button className="btn small" type="submit">
          {editingId ? "שמירת שינויים" : "הוספת המוצר"}
        </button>
        {editingId && (
          <button type="button" className="btn small ghost" onClick={cancelEdit}>
            ביטול
          </button>
        )}
      </div>
    </form>
  );
}
