import { useState } from "react";
import { useAdmin } from "../context";
import { ils } from "../lib/helpers";
import { RefundDialog } from "./RefundDialog";
import type { Order } from "../lib/types";

const STATUS_LABEL: Record<string, string> = {
  new: "ממתין לתשלום",
  paid: "שולם 💳",
  failed: "תשלום נכשל",
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
  const [refundTarget, setRefundTarget] = useState<Order | null>(null);

  // a refund makes sense only after money moved: paid / handled, or a paid
  // order the owner cancelled (a never-paid one gets rejected by PayMe).
  // Hidden once less than the ₪5 PayMe-minimum remains refundable.
  const canRefund = (o: Order) =>
    ["paid", "handled", "cancelled"].includes(o.status) &&
    o.total - (o.refundedTotal || 0) >= 5;

  // orders live in D1 (PayMe card + WhatsApp), updated via the Worker
  const setStatus = (id: string, status: "handled" | "cancelled") =>
    act(async () => {
      const d = await workerCall(`/orders/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((x) => (x._id === id ? d.order : x)));
    });

  // the "delete my data" path — wipes the customer details with the order row
  const removeOrder = (id: string) =>
    act(async () => {
      await workerCall(`/orders/${encodeURIComponent(id)}`, { method: "DELETE" });
      setOrders((prev) => prev.filter((x) => x._id !== id));
    });

  // 'new' = placeholder row created before the shopper reached PayMe, 'failed' =
  // PayMe refused to open a sale. Neither is an order until the callback flips it
  // to 'paid', so they live in a collapsed section instead of the main list.
  const isUnpaid = (o: (typeof orders)[number]) => o.status === "new" || o.status === "failed";
  const real = orders.filter((o) => !isUnpaid(o));
  const unpaid = orders.filter(isUnpaid);

  const renderOrder = (o: (typeof orders)[number]) => (
        <div key={o._id} className={`order-card ${o.status}${isUnpaid(o) ? " unpaid" : ""}`}>
          <div className="order-head">
            <b>
              {new Date(o.createdAt).toLocaleDateString("he-IL", {
                timeZone: "Asia/Jerusalem",
              })}{" "}
              {new Date(o.createdAt).toLocaleTimeString("he-IL", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Jerusalem",
              })}
            </b>
            <span className={`order-status ${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span>
            {(o.refundedTotal || 0) > 0 && o.status !== "refunded" && (
              <span className="order-refund-chip">זוכה חלקית ₪{ils(o.refundedTotal!)}</span>
            )}
            <span className="order-total">₪{ils(o.total)}</span>
          </div>
          <div className="order-items">
            {(o.items || []).map((i: any, idx: number) => (
              <span key={idx}>
                {i.name} ×{i.qty}
              </span>
            ))}
          </div>
          {o.shipping && (o.shipping.street || o.shipping.city) && (
            <div className="order-address">
              📦 {[o.shipping.street, o.shipping.apt, o.shipping.city, o.shipping.zip]
                .filter(Boolean)
                .join(", ")}
              {o.shipping.notes ? ` — ${o.shipping.notes}` : ""}
            </div>
          )}
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
              {o.status !== "handled" && !isUnpaid(o) && (
                <button className="btn small" onClick={() => setStatus(o._id, "handled")}>
                  ✓ סימון טופלה
                </button>
              )}
              {canRefund(o) && (
                <button className="btn small ghost" onClick={() => setRefundTarget(o)}>
                  ↩ זיכוי
                </button>
              )}
              {o.status !== "cancelled" && (
                <button
                  className="btn small ghost"
                  onClick={() => {
                    // one-way for a paid order: money states can't be set by hand,
                    // so a mis-click here would lose the order from fulfilment
                    if (!window.confirm('לבטל את ההזמנה? הזמנה ששולמה לא תוכל לחזור לסטטוס "שולמה".')) return;
                    setStatus(o._id, "cancelled");
                  }}
                >
                  ביטול
                </button>
              )}
              <button
                className="btn small ghost"
                onClick={() => {
                  if (
                    !window.confirm(
                      "למחוק את ההזמנה לצמיתות? כל פרטי ההזמנה והלקוח יימחקו ללא אפשרות שחזור (משמש לבקשות מחיקת מידע)."
                    )
                  )
                    return;
                  removeOrder(o._id);
                }}
              >
                🗑 מחיקה
              </button>
            </span>
          </div>
        </div>
  );

  return (
    <div className="orders-list">
      {real.length === 0 && (
        <p className="empty-note">עוד אין הזמנות — הן יופיעו כאן ברגע שלקוח ישלם</p>
      )}
      {real.map(renderOrder)}
      {unpaid.length > 0 && (
        <details className="orders-unpaid">
          <summary>
            ניסיונות תשלום שלא הושלמו ({unpaid.length}) — לקוח התחיל לשלם ויצא לפני סיום
          </summary>
          {unpaid.map(renderOrder)}
        </details>
      )}
      {refundTarget && (
        <RefundDialog order={refundTarget} onClose={() => setRefundTarget(null)} />
      )}
    </div>
  );
}
