import { useAdmin } from "../../context";
import type { useProducts } from "../../hooks/useProducts";

type ProductsApi = ReturnType<typeof useProducts>;

// status chips + the dual-handle price range + the newsletter-list toggle.
export function ProductFilters({
  products,
  subscriberCount,
  onToggleSubs,
}: {
  products: ProductsApi;
  subscriberCount: number;
  onToggleSubs: () => void;
}) {
  const { products: all } = useAdmin();
  const total = all.length;
  const {
    statusFilter,
    setStatusFilter,
    saleCount,
    oosCount,
    hiddenCount,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    maxPrice,
    priceHi,
    priceActive,
    resetLimit,
  } = products;

  return (
    <>
      <div className="admin-filters">
        {(
          [
            ["all", `הכל (${total})`],
            ["sale", `% במבצע (${saleCount})`],
            ["oos", `📦 אזלו (${oosCount})`],
            ["hidden", `🚫 מוסתרים (${hiddenCount})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className={`sub-chip ${statusFilter === key ? "active" : ""}`}
            onClick={() => {
              setStatusFilter(key);
              resetLimit();
            }}
          >
            {label}
          </button>
        ))}
        <button className="subs-toggle" onClick={onToggleSubs}>
          💌 רשימת תפוצה ({subscriberCount})
        </button>
      </div>

      {/* price-range filter — drag the handles to hide products outside the range */}
      <div className="price-filter">
        <span className="pf-label">טווח מחיר</span>
        <div className="pf-slider">
          <div className="pf-track" />
          <div
            className="pf-range"
            style={{
              left: `${(priceMin / maxPrice) * 100}%`,
              width: `${((priceHi - priceMin) / maxPrice) * 100}%`,
            }}
          />
          <input
            type="range"
            min={0}
            max={maxPrice}
            step={1}
            value={priceMin}
            aria-label="מחיר מינימלי"
            onInput={(e: any) => {
              const v = Math.min(Number(e.target.value), priceHi);
              setPriceMin(v);
              resetLimit();
            }}
          />
          <input
            type="range"
            min={0}
            max={maxPrice}
            step={1}
            value={priceHi}
            aria-label="מחיר מקסימלי"
            onInput={(e: any) => {
              const v = Math.max(Number(e.target.value), priceMin);
              setPriceMax(v >= maxPrice ? null : v);
              resetLimit();
            }}
          />
        </div>
        <span className="pf-vals">
          ₪{priceMin} – {priceMax === null ? `₪${maxPrice}+` : `₪${priceMax}`}
        </span>
        <button
          className={`pf-clear ${priceActive ? "" : "is-hidden"}`}
          onClick={() => {
            setPriceMin(0);
            setPriceMax(null);
            resetLimit();
          }}
          aria-hidden={!priceActive}
          tabIndex={priceActive ? 0 : -1}
        >
          נקה
        </button>
      </div>
    </>
  );
}
