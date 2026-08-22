export type View = "products" | "orders" | "stats" | "home";

const TABS = (productCount: number, newOrders: number): [View, string][] => [
  ["products", `🎨 מוצרים (${productCount})`],
  ["orders", `🧾 הזמנות (${newOrders} חדשות)`],
  ["stats", "📊 נתונים"],
  ["home", "🏠 דף הבית"],
];

// pills on desktop, a native <select> on phones (admin-mobile.css swaps them)
export function TabNav({
  view,
  setView,
  productCount,
  newOrders,
}: {
  view: View;
  setView: (v: View) => void;
  productCount: number;
  newOrders: number;
}) {
  const tabs = TABS(productCount, newOrders);
  return (
    <div className="admin-tabs">
      {tabs.map(([key, label]) => (
        <button key={key} className={view === key ? "active" : ""} onClick={() => setView(key)}>
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
