export type View = "products" | "orders" | "stats" | "home";

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
  return (
    <div className="admin-tabs">
      <button className={view === "products" ? "active" : ""} onClick={() => setView("products")}>
        🎨 מוצרים ({productCount})
      </button>
      <button className={view === "orders" ? "active" : ""} onClick={() => setView("orders")}>
        🧾 הזמנות ({newOrders} חדשות)
      </button>
      <button className={view === "stats" ? "active" : ""} onClick={() => setView("stats")}>
        📊 נתונים
      </button>
      <button className={view === "home" ? "active" : ""} onClick={() => setView("home")}>
        🏠 דף הבית
      </button>
    </div>
  );
}
