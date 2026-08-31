import { useMemo, useState } from "react";
import { useAdmin } from "../context";
import { ils } from "../lib/helpers";
import type { Order } from "../lib/types";

// Refund dialog — full refund, or pick items (+ shipping) for a partial one,
// with an optional cancellation-fee (דמי ביטול) deduction so the customer
// bears the processing cost. ALL money math here is integer agorot; shekels
// exist only at the edges (display via ils(), inputs parsed once). The Worker
// re-validates everything against its own agorot ledger, so nothing computed
// here is trusted with money.
const toA = (shekels: number | null | undefined) => Math.round((Number(shekels) || 0) * 100);
const sh = (agorot: number) => ils(agorot / 100);

// legal ceiling for a cancellation fee on a remote sale: 5% or ₪100, the lower
// (rounded to the 10-agorot grid like the coupon math)
const suggestedFee = (baseA: number) =>
  Math.min(Math.round((baseA * 0.05) / 10) * 10, 100_00);

export function RefundDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const { workerCall, setOrders, setNotice } = useAdmin();

  const totalA = toA(order.total);
  const refundedA = toA(order.refundedTotal);
  const poolA = totalA - refundedA; // what's still refundable
  const subtotalA = toA(order.subtotal);
  const discountA = toA(order.discount);
  const shippingA = Math.max(0, totalA - subtotalA + discountA);

  // each order line priced net of its share of the coupon discount, so item
  // refunds return what the customer actually paid for the line
  const lines = useMemo(
    () =>
      (order.items || []).map((i) => {
        const qty = Math.max(1, Math.floor(Number(i.qty) || 1));
        const lineA = toA(i.price) * qty;
        const shareA =
          discountA > 0 && subtotalA > 0 ? Math.round((discountA * lineA) / subtotalA) : 0;
        return { name: i.name || "פריט", qty, netA: lineA - shareA };
      }),
    [order]
  );

  const [mode, setMode] = useState<"full" | "items">("full");
  const [picked, setPicked] = useState<number[]>(() => lines.map(() => 0));
  const [shipPick, setShipPick] = useState(false);
  const [feeOn, setFeeOn] = useState(false);
  const [feeStr, setFeeStr] = useState<string | null>(null); // null = auto (5%/₪100)
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const itemsBaseA =
    lines.reduce(
      (sum, l, idx) => sum + Math.round((l.netA * (picked[idx] || 0)) / l.qty),
      0
    ) + (shipPick ? shippingA : 0);
  const pickedAny = picked.some((q) => q > 0) || shipPick;
  const baseA = mode === "full" ? poolA : Math.min(itemsBaseA, poolA);

  const feeMaxA = Math.max(0, baseA - 500); // the refund itself must stay ≥ ₪5
  const autoFeeA = Math.min(suggestedFee(baseA), feeMaxA);
  const typedFeeA = feeStr === null ? autoFeeA : toA(parseFloat(feeStr));
  const feeA = feeOn ? Math.min(Math.max(0, typedFeeA), feeMaxA) : 0;
  const refundA = baseA - feeA;

  const valid = refundA >= 500 && refundA <= poolA && (mode === "full" || pickedAny);

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setErr("");
    try {
      const d = await workerCall(`/orders/${encodeURIComponent(order._id)}/refund`, {
        method: "POST",
        body: JSON.stringify({
          amount: refundA,
          fee: feeA,
          items:
            mode === "items"
              ? {
                  lines: lines
                    .map((l, idx) => ({ name: l.name, qty: picked[idx] || 0 }))
                    .filter((l) => l.qty > 0),
                  shipping: shipPick,
                }
              : null,
        }),
      });
      if (d.order) setOrders((prev) => prev.map((x) => (x._id === order._id ? d.order : x)));
      setNotice(`בוצע זיכוי של ₪${sh(refundA)} ללקוח`);
      onClose();
    } catch (e: any) {
      setErr(e.message || "שגיאה בזיכוי");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ui-veil" onClick={() => !busy && onClose()}>
      <div className="ui-dialog refund-dialog" onClick={(e: any) => e.stopPropagation()}>
        <h3 className="display">זיכוי הזמנה</h3>
        <p className="ui-dialog-msg">
          שולם ₪{ils(order.total)}
          {refundedA > 0 ? ` · זוכה עד כה ₪${sh(refundedA)} · נותר לזיכוי ₪${sh(poolA)}` : ""}
        </p>

        <div className="refund-modes">
          <label>
            <input
              type="radio"
              name="refund-mode"
              checked={mode === "full"}
              onChange={() => setMode("full")}
            />{" "}
            זיכוי מלא (₪{sh(poolA)})
          </label>
          <label>
            <input
              type="radio"
              name="refund-mode"
              checked={mode === "items"}
              onChange={() => setMode("items")}
            />{" "}
            זיכוי חלקי — לפי פריטים
          </label>
        </div>

        {mode === "items" && (
          <div className="refund-items">
            {lines.map((l, idx) => (
              <label key={idx} className="refund-item">
                <input
                  type="checkbox"
                  checked={(picked[idx] || 0) > 0}
                  onChange={(e: any) =>
                    setPicked((prev) =>
                      prev.map((q, i) => (i === idx ? (e.target.checked ? l.qty : 0) : q))
                    )
                  }
                />
                <span className="refund-item-name">
                  {l.name} ×{l.qty}
                </span>
                {l.qty > 1 && (picked[idx] || 0) > 0 && (
                  <select
                    value={picked[idx]}
                    onChange={(e: any) =>
                      setPicked((prev) =>
                        prev.map((q, i) => (i === idx ? Number(e.target.value) : q))
                      )
                    }
                  >
                    {Array.from({ length: l.qty }, (_, n) => (
                      <option key={n + 1} value={n + 1}>
                        {n + 1} מתוך {l.qty}
                      </option>
                    ))}
                  </select>
                )}
                <b>₪{sh(Math.round((l.netA * (picked[idx] || l.qty)) / l.qty))}</b>
              </label>
            ))}
            {shippingA > 0 && (
              <label className="refund-item">
                <input
                  type="checkbox"
                  checked={shipPick}
                  onChange={(e: any) => setShipPick(!!e.target.checked)}
                />
                <span className="refund-item-name">דמי משלוח</span>
                <b>₪{sh(shippingA)}</b>
              </label>
            )}
          </div>
        )}

        <div className="refund-fee">
          <label>
            <input
              type="checkbox"
              checked={feeOn}
              onChange={(e: any) => setFeeOn(!!e.target.checked)}
            />{" "}
            ניכוי דמי ביטול מהזיכוי
          </label>
          {feeOn && (
            <div className="refund-fee-input">
              ₪{" "}
              <input
                inputMode="decimal"
                value={feeStr === null ? sh(autoFeeA) : feeStr}
                onInput={(e: any) => setFeeStr(e.target.value)}
              />
              <small>
                מותר עד 5% או ₪100 (הנמוך). אסור לגבות כשהביטול בגלל פגם או אי-התאמה.
              </small>
            </div>
          )}
        </div>

        <div className="refund-summary">
          הלקוח יקבל בחזרה <b>₪{sh(Math.max(0, refundA))}</b>
          {feeA > 0 ? ` (אחרי ניכוי ₪${sh(feeA)})` : ""}
          <small>הכסף חוזר לאמצעי התשלום המקורי. זיכוי שבוצע אי אפשר לבטל.</small>
        </div>

        {err && <p className="refund-error">{err}</p>}

        <div className="ui-dialog-foot">
          <button className="btn small" disabled={!valid || busy} onClick={submit}>
            {busy ? "מזכה…" : `אישור זיכוי ₪${sh(Math.max(0, refundA))}`}
          </button>
          <button className="btn small ghost" disabled={busy} onClick={onClose}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
