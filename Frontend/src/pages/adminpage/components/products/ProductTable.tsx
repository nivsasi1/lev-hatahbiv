import type { useProducts } from "../../hooks/useProducts";
import type { useProductForm } from "../../hooks/useProductForm";
import { imgUrl, ils } from "../../lib/helpers";

type ProductsApi = ReturnType<typeof useProducts>;
type FormApi = ReturnType<typeof useProductForm>;

export function ProductTable({ products, form }: { products: ProductsApi; form: FormApi }) {
  const { shown, filtered, selected, toggleSelect, toggleActive, toggleStock, setSale, remove, setLimit } =
    products;

  return (
    <div className="admin-list">
      {shown.map((p) => (
        <div
          key={p._id}
          className={`admin-row ${p.isActive === false ? "inactive" : ""} ${
            p.isAvailable === false ? "oos" : ""
          } ${selected.has(p._id) ? "row-selected" : ""}`}
        >
          <input
            type="checkbox"
            className="row-check"
            checked={selected.has(p._id)}
            onChange={() => toggleSelect(p._id)}
            aria-label={`בחירת ${p.name}`}
          />
          <img src={imgUrl((p.img || "").split(";")[0])} alt="" loading="lazy" />
          <div className="admin-row-mid">
            <span className="nm">{p.name}</span>
            <span className="meta">
              {p.category} › {p.sub_cat || "—"} · ₪{ils(p.price)}
              {(p.salePercentage || 0) > 0 && (
                <b className="sale-tag"> מבצע {p.salePercentage}%-</b>
              )}
              {p.isAvailable === false && <b className="oos-tag"> אזל מהמלאי</b>}
              {p.isActive === false && <b className="hidden-tag"> מוסתר</b>}
              {(p.updatedAt || p.createdAt) && (
                <span className="row-date">
                  {" · עודכן "}
                  {new Date(p.updatedAt || p.createdAt!).toLocaleDateString("he-IL")}
                </span>
              )}
            </span>
          </div>
          <div className="admin-row-actions">
            <button
              data-tip={p.isActive === false ? "הצגה חזרה באתר" : "הסתרה מהאתר"}
              aria-label={p.isActive === false ? "הצגה חזרה באתר" : "הסתרה מהאתר"}
              onClick={() => toggleActive(p)}
            >
              {p.isActive === false ? "🚫" : "👁"}
            </button>
            <button
              data-tip={p.isAvailable === false ? "החזרה למלאי" : "סימון: אזל מהמלאי"}
              aria-label={p.isAvailable === false ? "החזרה למלאי" : "סימון: אזל מהמלאי"}
              onClick={() => toggleStock(p)}
            >
              📦
            </button>
            <button data-tip="עריכת פרטים" aria-label="עריכת פרטים" onClick={() => form.startEdit(p)}>
              ✏️
            </button>
            <button data-tip="שכפול מוצר" aria-label="שכפול מוצר" onClick={() => form.duplicate(p)}>
              📋
            </button>
            <button
              data-tip={
                (p.salePercentage || 0) > 0 ? `מבצע ${p.salePercentage}% — שינוי/ביטול` : "הפעלת מבצע"
              }
              aria-label="הגדרת מבצע"
              onClick={() => setSale(p)}
            >
              %
            </button>
            <button
              data-tip="מחיקה לצמיתות"
              aria-label="מחיקה לצמיתות"
              className="danger"
              onClick={() => remove(p)}
            >
              🗑
            </button>
          </div>
        </div>
      ))}
      {filtered.length > shown.length && (
        <div className="load-more-row">
          <button className="btn small ghost" onClick={() => setLimit((l) => l + 60)}>
            להציג עוד ({filtered.length - shown.length} נוספים)
          </button>
        </div>
      )}
      {filtered.length === 0 && <p className="empty-note">לא נמצאו מוצרים</p>}
    </div>
  );
}
