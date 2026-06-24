import { useState } from "react";
import { Link } from "react-router-dom";
import {
  finalPrice,
  shekel,
  FREE_SHIPPING_FROM,
  store,
} from "../data/catalog";
import { useCart } from "../context/cart-context";
import { ProductThumb } from "../components/ProductThumb";
import { ShipMeter } from "../components/CartSheet";
import { WORKER_API } from "../data/api";

const deliveryOptions = [
  { id: "pickup", title: "איסוף עצמי מהחנות", note: store.address, price: 0 },
  { id: "courier", title: "משלוח עד הבית", note: "1–5 ימי עבודה", price: 35 },
  { id: "mail", title: "דואר רשום", note: "7–14 ימי עסקים", price: 28 },
];

export const CartPage = () => {
  const { items, setQty, remove, clear } = useCart();
  const [delivery, setDelivery] = useState(deliveryOptions[0]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<
    { code: string; percent: number } | null
  >(null);
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState("");

  // All money in AGOROT, mirroring the Worker's checkout math EXACTLY (prices are
  // 1-decimal; discount rounded to the 10-agorot grid) so the total shown here is
  // identical to what PayMe charges.
  const subtotalAg = items.reduce(
    (s, { product, qty }) => s + Math.round(finalPrice(product) * 100) * qty,
    0
  );
  const freeShipping = subtotalAg >= FREE_SHIPPING_FROM * 100;
  const shippingAg = delivery.id === "pickup" || freeShipping ? 0 : Math.round(delivery.price * 100);
  const discountAg = appliedCoupon
    ? Math.round((subtotalAg * appliedCoupon.percent) / 100 / 10) * 10
    : 0;
  const grandTotalAg = subtotalAg - discountAg + shippingAg;
  // shekel views for display (exact — all on the 10-agorot grid)
  const subtotalNis = subtotalAg / 100;
  const shippingCost = shippingAg / 100;
  const discount = discountAg / 100;
  const grandTotal = grandTotalAg / 100;

  // coupons are validated live by the Cloudflare Worker (D1) — the failure
  // response is deliberately vague so it never reveals which codes exist.
  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code || couponBusy) return;
    setCouponBusy(true);
    setCouponError("");
    try {
      const res = await fetch(`${WORKER_API}/validate-coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => null);
      // no JSON body => no Worker reachable (e.g. served without /api): show the
      // retry copy, not "invalid code" — the code might be perfectly valid.
      if (!data) {
        setCouponError("לא הצלחנו לבדוק את הקוד כרגע, נסו שוב");
        return;
      }
      if (!res.ok || !data.valid) {
        setCouponError(data.error || "קוד הקופון אינו תקין");
        return;
      }
      setAppliedCoupon({ code: data.code, percent: data.percent });
      setCouponOpen(false);
    } catch {
      setCouponError("לא הצלחנו לבדוק את הקוד כרגע, נסו שוב");
    } finally {
      setCouponBusy(false);
    }
  };
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  // card checkout: the Worker creates the order + a PayMe sale, then we send the
  // shopper to PayMe's hosted payment page. The order is confirmed by the webhook.
  const payCard = async () => {
    if (payBusy || items.length === 0) return;
    setPayBusy(true);
    setPayError("");
    try {
      const res = await fetch(`${WORKER_API}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ product, qty }) => ({ id: product.id, name: product.name, qty })),
          delivery: delivery.id,
          couponCode: appliedCoupon?.code,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setPayError(data?.error || "לא ניתן לפתוח עמוד תשלום כרגע — נסו שוב מאוחר יותר");
        return;
      }
      window.location.href = data.url; // PayMe hosted payment page
    } catch {
      setPayError("שגיאת רשת — נסו שוב");
    } finally {
      setPayBusy(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="page-main shell cart-page">
        <h1 className="display">העגלה שלי</h1>
        <p className="empty-note">
          העגלה ריקה לגמרי — בואו נתקן את זה. <Link to="/">לחנות ←</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="page-main shell cart-page">
      <h1 className="display">העגלה שלי</h1>

      <div className="cart-layout">
        <div className="cart-list">
          {items.map(({ product, qty }) => (
            <div className="cart-line" key={product.id}>
              <Link to={`/product/${product.id}`} className="thumb">
                <ProductThumb product={product} />
              </Link>
              <div className="mid">
                <Link to={`/product/${product.id}`} className="nm">
                  {product.name}
                </Link>
                <span className="pr">
                  {shekel(finalPrice(product))} ליח' · {shekel(finalPrice(product) * qty)}
                </span>
              </div>
              <div className="qty">
                <button onClick={() => setQty(product.id, qty + 1)} aria-label="הוספה">
                  +
                </button>
                <span>{qty}</span>
                <button onClick={() => setQty(product.id, qty - 1)} aria-label="הפחתה">
                  −
                </button>
              </div>
              <button className="rm" onClick={() => remove(product.id)} aria-label="הסרה">
                ✕
              </button>
            </div>
          ))}

          <div className="sub-chips" style={{ margin: "0.5rem 0 0" }}>
            {deliveryOptions.map((d) => (
              <button
                key={d.id}
                className={`sub-chip ${delivery.id === d.id ? "active" : ""}`}
                onClick={() => setDelivery(d)}
              >
                {d.title}
                {d.price > 0 && !freeShipping ? ` · ${shekel(d.price)}` : " · חינם"}
              </button>
            ))}
          </div>

          <div className="coupon-box">
            {!appliedCoupon && !couponOpen && (
              <button
                type="button"
                className="coupon-toggle"
                onClick={() => setCouponOpen(true)}
              >
                יש לי קופון
              </button>
            )}
            {!appliedCoupon && couponOpen && (
              <form
                className="coupon-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  applyCoupon();
                }}
              >
                <input
                  type="text"
                  className="coupon-input"
                  placeholder="קוד קופון"
                  value={couponInput}
                  onInput={(e) => {
                    setCouponInput((e.target as HTMLInputElement).value);
                    setCouponError("");
                  }}
                  autoFocus
                />
                <button
                  type="submit"
                  className="btn coupon-confirm"
                  disabled={couponBusy}
                >
                  {couponBusy ? "בודק…" : "אישור"}
                </button>
              </form>
            )}
            {couponError && <span className="coupon-err">{couponError}</span>}
            {appliedCoupon && (
              <div className="coupon-applied">
                <span>
                  קופון {appliedCoupon.code} · הנחה {appliedCoupon.percent}% 🎉
                </span>
                <button
                  type="button"
                  className="coupon-remove"
                  onClick={removeCoupon}
                  aria-label="הסרת קופון"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="summary-card">
          <h2 className="display">סיכום הזמנה</h2>
          <ShipMeter total={subtotalNis} />
          <div className="sum-row">
            <span>מוצרים ({items.length})</span>
            <span>{shekel(subtotalNis)}</span>
          </div>
          <div className="sum-row">
            <span>{delivery.title}</span>
            <span>{shippingCost === 0 ? "חינם" : shekel(shippingCost)}</span>
          </div>
          {appliedCoupon && (
            <div className="sum-row">
              <span>
                קופון {appliedCoupon.code} ({appliedCoupon.percent}%-)
              </span>
              <span>−{shekel(discount)}</span>
            </div>
          )}
          <div className="sum-row total">
            <span>סה"כ לתשלום</span>
            <span>{shekel(grandTotal)}</span>
          </div>

          <button
            className="btn pay-card-btn"
            style={{ width: "100%" }}
            onClick={payCard}
            disabled={payBusy}
          >
            {payBusy ? "מעבירים לתשלום מאובטח…" : "💳 תשלום מאובטח בכרטיס"}
          </button>
          {payError && (
            <p className="coupon-err" style={{ textAlign: "center", marginTop: "0.4rem" }}>
              {payError}
            </p>
          )}

          <p className="order-note">
            התשלום מתבצע בעמוד סליקה מאובטח. אפשר גם לאסוף מהחנות — {store.address}.
          </p>
          <button
            className="add-btn"
            style={{ marginTop: "0.8rem" }}
            onClick={() => setConfirmClear(true)}
          >
            ריקון העגלה
          </button>
        </aside>
      </div>

      {confirmClear && (
        <div
          className="confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-clear-title"
          onClick={() => setConfirmClear(false)}
        >
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="display" id="confirm-clear-title">
              לרוקן את כל העגלה?
            </h3>
            <p>כל המוצרים יוסרו מהעגלה. אי אפשר לבטל את הפעולה.</p>
            <div className="confirm-actions">
              <button className="btn ghost" onClick={() => setConfirmClear(false)}>
                ביטול
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  clear();
                  setConfirmClear(false);
                }}
              >
                כן, לרוקן
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
