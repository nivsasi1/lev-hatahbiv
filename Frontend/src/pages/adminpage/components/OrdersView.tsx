import { useAdmin } from "../context";
import { ils } from "../lib/helpers";

export function OrdersView() {
  const { orders, call, act, setOrders } = useAdmin();

  const setStatus = (id: string, status: "handled" | "cancelled") =>
    act(async () => {
      const d = await call(`/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((x) => (x._id === id ? d.order : x)));
    });

  return (
    <div className="orders-list">
      {orders.length === 0 && (
        <p className="empty-note">
          עוד אין הזמנות — הן יופיעו כאן ברגע שלקוח ישלח עגלה בוואטסאפ
        </p>
      )}
      {orders.map((o) => (
        <div key={o._id} className={`order-card ${o.status}`}>
          <div className="order-head">
            <b>
              {new Date(o.createdAt).toLocaleDateString("he-IL")}{" "}
              {new Date(o.createdAt).toLocaleTimeString("he-IL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </b>
            <span className={`order-status ${o.status}`}>
              {o.status === "new" ? "חדשה" : o.status === "handled" ? "טופלה" : "בוטלה"}
            </span>
            <span className="order-channel">
              {o.channel === "card" ? "💳 שולם באשראי" : "💬 וואטסאפ"}
            </span>
            <span className="order-total">₪{ils(o.total)}</span>
          </div>
          <div className="order-items">
            {o.items.map((i: any, idx: number) => (
              <span key={idx}>
                {i.name} ×{i.qty}
              </span>
            ))}
          </div>
          <div className="order-foot">
            <span className="meta">{o.delivery}</span>
            <span className="order-actions">
              {o.status !== "handled" && (
                <button className="btn small" onClick={() => setStatus(o._id, "handled")}>
                  ✓ סימון טופלה
                </button>
              )}
              {o.status !== "cancelled" && (
                <button className="btn small ghost" onClick={() => setStatus(o._id, "cancelled")}>
                  ביטול
                </button>
              )}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
