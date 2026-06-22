import { useMemo } from "react";
import { useAdmin } from "../context";

// Aggregated dashboard stats, computed from already-loaded data (orders +
// subscribers + products) — no extra fetch.
export function useStats() {
  const { orders, products, subscribers } = useAdmin();

  return useMemo(() => {
    const saleCount = products.filter((p) => (p.salePercentage || 0) > 0).length;
    const oosCount = products.filter((p) => p.isAvailable === false).length;
    const hiddenCount = products.filter((p) => p.isActive === false).length;

    const live = orders.filter((o) => o.status !== "cancelled");
    const revenue = live.reduce((s, o) => s + Number(o.total || 0), 0);
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = live.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
    const recentRevenue = recent.reduce((s, o) => s + Number(o.total || 0), 0);

    // top sellers by total qty across non-cancelled orders
    const qtyByName = new Map<string, number>();
    for (const o of live)
      for (const i of o.items || [])
        qtyByName.set(i.name, (qtyByName.get(i.name) || 0) + Number(i.qty || 0));
    const top = [...qtyByName.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      newOrders: orders.filter((o) => o.status === "new").length,
      totalOrders: orders.length,
      revenue,
      recentCount: recent.length,
      recentRevenue,
      subscribers: subscribers.length,
      onSale: saleCount,
      outOfStock: oosCount,
      hidden: hiddenCount,
      top,
    };
  }, [orders, subscribers, products]);
}
