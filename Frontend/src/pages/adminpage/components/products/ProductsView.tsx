import { useState } from "react";
import { useAdmin } from "../../context";
import type { useProducts } from "../../hooks/useProducts";
import type { useProductForm } from "../../hooks/useProductForm";
import type { useCsvImport } from "../../hooks/useCsvImport";
import type { Setter } from "../../lib/types";
import { ProductFilters } from "./ProductFilters";
import { SubscribersPanel } from "./SubscribersPanel";
import { ImportPanel } from "./ImportPanel";
import { ProductForm } from "./ProductForm";
import { BulkBar } from "./BulkBar";
import { ProductTable } from "./ProductTable";
import { BarcodeScanner } from "./BarcodeScanner";

type ProductsApi = ReturnType<typeof useProducts>;
type FormApi = ReturnType<typeof useProductForm>;
type CsvApi = ReturnType<typeof useCsvImport>;

export function ProductsView({
  products,
  form,
  csv,
  showSubs,
  setShowSubs,
}: {
  products: ProductsApi;
  form: FormApi;
  csv: CsvApi;
  showSubs: boolean;
  setShowSubs: Setter<boolean>;
}) {
  const { subscribers, setNotice } = useAdmin();
  const [scanOpen, setScanOpen] = useState(false);

  // a scan lands on one of two outcomes: an existing product opens for editing
  // (and the list filters down to it), or a new-product form opens with the
  // barcode already in place.
  const handleScan = (raw: string) => {
    const code = raw.trim();
    setScanOpen(false);
    if (!code) return;
    const hit = form.openByBarcode(code);
    if (hit) {
      products.setQuery(code);
      products.resetLimit();
      setNotice(`נמצא: ${hit.name} — פתוח לעריכה`);
    } else {
      setNotice(`ברקוד חדש (${code}) — מלאו את פרטי המוצר ושמרו`);
    }
  };

  return (
    <>
      <ProductFilters
        products={products}
        subscriberCount={subscribers.length}
        onToggleSubs={() => setShowSubs((v) => !v)}
      />
      {showSubs && <SubscribersPanel />}

      <div className="admin-toolbar">
        <input
          type="search"
          placeholder="חיפוש לפי שם / קטגוריה / סדרה / ברקוד..."
          value={products.query}
          onInput={(e: any) => {
            products.setQuery(e.target.value);
            products.resetLimit();
          }}
        />
        <button className="btn small" onClick={form.toggleAdd}>
          {form.showAdd ? "סגירה" : "+ מוצר חדש"}
        </button>
        <button className="btn small ghost" onClick={() => setScanOpen(true)}>
          📷 סריקת ברקוד
        </button>
        <button className="btn small ghost" onClick={() => csv.setShowImport((v) => !v)}>
          📥 ייבוא CSV
        </button>
        <button className="btn small ghost" onClick={products.exportCsv}>
          📤 ייצוא CSV
        </button>
      </div>

      {scanOpen && <BarcodeScanner onDetected={handleScan} onClose={() => setScanOpen(false)} />}
      {csv.showImport && <ImportPanel csv={csv} />}
      {form.visible && <ProductForm form={form} />}

      <div className="select-all-row">
        <label>
          <input
            type="checkbox"
            checked={products.allFilteredSelected}
            onChange={() =>
              products.setSelected(
                products.allFilteredSelected
                  ? new Set()
                  : new Set(products.filtered.map((p) => p._id))
              )
            }
          />
          בחירת כל המסוננים ({products.filtered.length})
        </label>
        {products.selected.size > 0 && <b>{products.selected.size} מוצרים נבחרו</b>}
      </div>

      {products.selected.size > 0 && <BulkBar products={products} />}

      <ProductTable products={products} form={form} />
    </>
  );
}
