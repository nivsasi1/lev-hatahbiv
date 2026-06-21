import type { useProducts } from "../../hooks/useProducts";

type ProductsApi = ReturnType<typeof useProducts>;

export function BulkBar({ products }: { products: ProductsApi }) {
  const {
    selected,
    setSelected,
    bulk,
    bulkSale,
    bulkPrice,
    bulkSetPrice,
    bulkDelete,
    anyHidden,
    anyVisible,
    anyOos,
    anyInStock,
  } = products;
  const n = selected.size;

  return (
    <div className="bulk-bar">
      <span className="bulk-count">{n} נבחרו:</span>
      <button className="btn small" onClick={bulkSale}>
        % מבצע לכולם
      </button>
      <button className="btn small" onClick={bulkPrice}>
        💰 שינוי מחיר ב-%
      </button>
      <button className="btn small" onClick={bulkSetPrice}>
        ₪ מחיר אחיד
      </button>
      <button
        className="btn small ghost"
        disabled={!anyHidden}
        title={anyHidden ? "" : "כל הנבחרים כבר מוצגים"}
        onClick={() => bulk({ type: "active", value: true }, `${n} מוצרים הוצגו באתר`)}
      >
        👁 הצגה
      </button>
      <button
        className="btn small ghost"
        disabled={!anyVisible}
        title={anyVisible ? "" : "כל הנבחרים כבר מוסתרים"}
        onClick={() => bulk({ type: "active", value: false }, `${n} מוצרים הוסתרו`)}
      >
        🚫 הסתרה
      </button>
      <button
        className="btn small ghost"
        disabled={!anyInStock}
        title={anyInStock ? "" : "כל הנבחרים כבר מסומנים כאזלו"}
        onClick={() => bulk({ type: "stock", value: false }, `${n} מוצרים סומנו: אזל`)}
      >
        📦 אזל מהמלאי
      </button>
      <button
        className="btn small ghost"
        disabled={!anyOos}
        title={anyOos ? "" : "כל הנבחרים כבר במלאי"}
        onClick={() => bulk({ type: "stock", value: true }, `${n} מוצרים חזרו למלאי`)}
      >
        ✅ חזרה למלאי
      </button>
      <button className="btn small bulk-danger" onClick={bulkDelete}>
        🗑 מחיקה
      </button>
      <button className="bulk-clear" onClick={() => setSelected(new Set())}>
        ביטול בחירה
      </button>
    </div>
  );
}
