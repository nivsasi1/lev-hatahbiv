import { useState } from "react";
import { useAdmin } from "../context";
import { ils } from "../lib/helpers";
import { RefundDialog } from "./RefundDialog";
import { OrderDetailsDialog } from "./OrderDetailsDialog";
import type { Order } from "../lib/types";
import { ageLevel, ago, orderWhen, span, useNow, AGING } from "../lib/orderAge";

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
  const { orders, products, workerCall, act, setOrders } = useAdmin();
  // the option's barcode, looked up live — helps picking the right size off the shelf
  const variantSku = (id?: string, key?: string) =>
    key ? products.find((p) => p._id === id)?.variants?.find((v) => v.key === key)?.sku : undefined;
  const [refundTarget, setRefundTarget] = useState<Order | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Order | null>(null);
  const now = useNow();

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

  // paid and still waiting for "טופלה" — the oldest first, for the banner
  const waiting = real
    .filter((o) => o.status === "paid")
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const oldest = waiting[0];
  const oldestLevel = oldest ? ageLevel(oldest, now) : null;
  const lateCount = waiting.filter((o) => ageLevel(o, now) === "late").length;
  const showOldest = () =>
    document.getElementById(`order-${oldest?._id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

  const renderOrder = (o: (typeof orders)[number]) => {
    const level = ageLevel(o, now);
    return (
        <div
          key={o._id}
          id={`order-${o._id}`}
          className={`order-card ${o.status}${isUnpaid(o) ? " unpaid" : ""}${level ? ` aging-${level}` : ""}`}
        >
          <div className="order-head">
            <span className="order-when">
              <b>{orderWhen(o.createdAt)}</b>
              <small className="order-ago">{ago(o.createdAt, now)}</small>
            </span>
            <span className={`order-status ${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span>
            {level && (
              <span className={`order-wait-chip ${level}`} role="status">
                {level === "late" ? "⚠" : "⏳"} ממתינה לטיפול {span(now - Date.parse(o.createdAt))}
              </span>
            )}
            {(o.refundedTotal || 0) > 0 && o.status !== "refunded" && (
              <span className="order-refund-chip">זוכה חלקית ₪{ils(o.refundedTotal!)}</span>
            )}
            <span className="order-total">₪{ils(o.total)}</span>
          </div>
          <div className="order-items">
            {(o.items || []).map((i: any, idx: number) => (
              <span key={idx}>
                {i.name} ×{i.qty}
                {variantSku(i.id, i.variant) && (
                  <small className="order-item-sku"> · ברקוד {variantSku(i.id, i.variant)}</small>
                )}
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
              <button className="btn small ghost order-details-btn" onClick={() => setDetailsTarget(o)}>
                🔍 פרטי הזמנה
              </button>
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
  };

  return (
    <div className="orders-list">
      {real.length === 0 && (
        <p className="empty-note">עוד אין הזמנות — הן יופיעו כאן ברגע שלקוח ישלם</p>
      )}
      {oldest && (
        <div className={`orders-waiting ${oldestLevel || "ok"}`} role="status">
          <span>
            {waiting.length === 1 ? "הזמנה אחת ממתינה" : `${waiting.length} הזמנות ממתינות`} לסימון
            "טופלה"
            {lateCount > 0 && ` · ${lateCount} מעל ${AGING.lateHours / 24} ימים`}
            {" · "}הוותיקה {ago(oldest.createdAt, now)}
          </span>
          <button className="btn small ghost" onClick={showOldest}>
            להזמנה הוותיקה ↓
          </button>
        </div>
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
      {detailsTarget && (
        <OrderDetailsDialog
          order={detailsTarget}
          status={STATUS_LABEL[detailsTarget.status] || detailsTarget.status}
          delivery={DELIVERY_LABEL[detailsTarget.delivery] || detailsTarget.delivery}
          onClose={() => setDetailsTarget(null)}
          onHandled={
            detailsTarget.status !== "handled" && !isUnpaid(detailsTarget)
              ? () => {
                  setStatus(detailsTarget._id, "handled");
                  setDetailsTarget(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
