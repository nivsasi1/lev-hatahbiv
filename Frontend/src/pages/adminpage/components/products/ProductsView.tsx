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
  const { subscribers } = useAdmin();

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
          placeholder="חיפוש לפי שם / קטגוריה / סדרה..."
          value={products.query}
          onInput={(e: any) => {
            products.setQuery(e.target.value);
            products.resetLimit();
          }}
        />
        <button className="btn small" onClick={form.toggleAdd}>
          {form.showAdd ? "סגירה" : "+ מוצר חדש"}
        </button>
        <button className="btn small ghost" onClick={() => csv.setShowImport((v) => !v)}>
          📥 ייבוא CSV
        </button>
        <button className="btn small ghost" onClick={products.exportCsv}>
          📤 ייצוא CSV
        </button>
      </div>

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
