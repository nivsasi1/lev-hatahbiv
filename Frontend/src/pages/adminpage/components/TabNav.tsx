export type View = "products" | "orders" | "stats" | "home";

const TABS = (productCount: number, newOrders: number, lateOrders: number): [View, string][] => [
  ["products", `🎨 מוצרים (${productCount})`],
  // the late count shows on every tab, so an order waiting 2+ days is seen
  // even while working on products
  ["orders", `🧾 הזמנות (${newOrders} חדשות${lateOrders ? ` · ⚠ ${lateOrders} באיחור` : ""})`],
  ["stats", "📊 נתונים"],
  ["home", "🏠 דף הבית"],
];

// pills on desktop, a native <select> on phones (admin-mobile.css swaps them)
export function TabNav({
  view,
  setView,
  productCount,
  newOrders,
  lateOrders = 0,
}: {
  view: View;
  setView: (v: View) => void;
  productCount: number;
  newOrders: number;
  lateOrders?: number;
}) {
  const tabs = TABS(productCount, newOrders, lateOrders);
  return (
    <div className="admin-tabs">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          className={`${view === key ? "active" : ""}${key === "orders" && lateOrders ? " has-late" : ""}`}
          onClick={() => setView(key)}
        >
          {label}
        </button>
      ))}
      <select
        className="admin-tabs-select"
        value={view}
        onChange={(e: any) => setView(e.target.value as View)}
        aria-label="מעבר בין אזורי הניהול"
      >
        {tabs.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
