import { useAdmin } from "../context";
import { ils } from "../lib/helpers";

const STATUS_LABEL: Record<string, string> = {
  new: "חדשה",
  paid: "שולם 💳",
  failed: "נכשל",
  refunded: "זוכה",
  handled: "טופלה",
  cancelled: "בוטלה",
};
const DELIVERY_LABEL: Record<string, string> = {
  pickup: "איסוף עצמי מהחנות",
  courier: "משלוח עד הבית",
  mail: "דואר רשום",
};

export function OrdersView() {
  const { orders, workerCall, act, setOrders } = useAdmin();

  // orders live in D1 (PayMe card + WhatsApp), updated via the Worker
  const setStatus = (id: string, status: "handled" | "cancelled") =>
    act(async () => {
      const d = await workerCall(`/orders/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((x) => (x._id === id ? d.order : x)));
    });

  return (
    <div className="orders-list">
      {orders.length === 0 && (
        <p className="empty-note">עוד אין הזמנות — הן יופיעו כאן ברגע שלקוח ישלם או ישלח עגלה</p>
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
            <span className={`order-status ${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span>
            <span className="order-total">₪{ils(o.total)}</span>
          </div>
          <div className="order-items">
            {(o.items || []).map((i: any, idx: number) => (
              <span key={idx}>
                {i.name} ×{i.qty}
              </span>
            ))}
          </div>
          <div className="order-foot">
            <span className="meta">
              {DELIVERY_LABEL[o.delivery] || o.delivery}
              {o.payerName ? ` · ${o.payerName}` : ""}
              {o.payerPhone ? ` · ${o.payerPhone}` : ""}
              {o.couponCode ? ` · קופון ${o.couponCode}` : ""}
              {o.invoiceUrl && /^https:\/\//i.test(o.invoiceUrl) ? (
                <>
                  {" · "}
                  <a href={o.invoiceUrl} target="_blank" rel="noreferrer">
                    חשבונית
                  </a>
                </>
              ) : null}
            </span>
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
