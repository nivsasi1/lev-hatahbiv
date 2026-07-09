import { useRef, useState } from "react";
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
import { openGrowWallet } from "../data/grow-wallet";

const deliveryOptions = [
  { id: "pickup", title: "איסוף עצמי מהחנות", note: store.address, price: 0 },
  { id: "courier", title: "משלוח עד הבית", note: "1–5 ימי עבודה", price: 35 },
  { id: "mail", title: "דואר רשום", note: "7–14 ימי עסקים", price: 28 },
];

// payer details for the invoice + payment page — remembered between visits
const PAYER_KEY = "lh-payer-v1";
const SHIP_KEY = "lh-ship-v1";
type Payer = { name: string; phone: string; email: string };
type PayerErrors = { name?: string; phone?: string; email?: string };
type Ship = { street: string; city: string; apt: string; zip: string; notes: string };
type ShipErrors = { street?: string; city?: string };

const loadStored = <T,>(key: string, blank: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const p = JSON.parse(raw);
      const out = { ...blank } as Record<string, string>;
      for (const k of Object.keys(out)) if (typeof p?.[k] === "string") out[k] = p[k];
      return out as T;
    }
  } catch {
    /* corrupt storage — start blank */
  }
  return blank;
};

// validation mirrors the Worker's /api/checkout rules EXACTLY (same regexes,
// same Hebrew errors) so nothing passes here and then bounces server-side
const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
const validatePayer = (p: Payer): { errors: PayerErrors; clean: Payer } => {
  const errors: PayerErrors = {};
  const name = p.name.trim().replace(/\s+/g, " ");
  const words = name.split(" ").filter(Boolean);
  if (words.length < 2 || words.some((w) => w.length < 2)) {
    errors.name = "נא למלא שם מלא (פרטי ומשפחה)";
  }
  const phone = p.phone.replace(/[\s-]/g, "");
  if (!/^05\d{8}$/.test(phone)) {
    errors.phone = "מספר נייד לא תקין (05XXXXXXXX)";
  }
  const email = p.email.trim();
  if (email && !isEmail(email)) {
    errors.email = "אימייל לא תקין";
  }
  return { errors, clean: { name, phone, email } };
};

// address is required only when the order ships (courier/mail) — not for pickup
const validateShip = (s: Ship, needed: boolean): { errors: ShipErrors; clean: Ship } => {
  const clean: Ship = {
    street: s.street.trim(),
    city: s.city.trim(),
    apt: s.apt.trim(),
    zip: s.zip.trim(),
    notes: s.notes.trim(),
  };
  const errors: ShipErrors = {};
  if (needed) {
    if (clean.street.length < 2) errors.street = "נא למלא רחוב ומספר בית";
    if (clean.city.length < 2) errors.city = "נא למלא עיר";
  }
  return { errors, clean };
};

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
  const [payer, setPayer] = useState<Payer>(() =>
    loadStored<Payer>(PAYER_KEY, { name: "", phone: "", email: "" })
  );
  const [payerErrors, setPayerErrors] = useState<PayerErrors>({});
  const [ship, setShip] = useState<Ship>(() =>
    loadStored<Ship>(SHIP_KEY, { street: "", city: "", apt: "", zip: "", notes: "" })
  );
  const [shipErrors, setShipErrors] = useState<ShipErrors>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const streetRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);

  const needsAddress = delivery.id !== "pickup";

  // functional update: browser autofill fires input on all fields in the same
  // tick — spreading a stale closure here would drop the others
  const updatePayer = (field: keyof Payer, value: string) => {
    setPayer((prev) => {
      const next = { ...prev, [field]: value };
      try {
        localStorage.setItem(PAYER_KEY, JSON.stringify(next));
      } catch {
        /* storage full/blocked — form still works, just not remembered */
      }
      return next;
    });
    setPayerErrors((e) => ({ ...e, [field]: undefined }));
  };

  const updateShip = (field: keyof Ship, value: string) => {
    setShip((prev) => {
      const next = { ...prev, [field]: value };
      try {
        localStorage.setItem(SHIP_KEY, JSON.stringify(next));
      } catch {
        /* storage full/blocked — form still works, just not remembered */
      }
      return next;
    });
    if (field === "street" || field === "city") {
      setShipErrors((e) => ({ ...e, [field]: undefined }));
    }
  };

  // All money in AGOROT, mirroring the Worker's checkout math EXACTLY (prices are
  // 1-decimal; discount rounded to the 10-agorot grid) so the total shown here is
  // identical to what Grow charges.
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

  // card checkout: the Worker creates the order + a Grow payment process, then
  // either redirects to Grow's hosted page (url) or opens the Growin Wallet
  // sheet (authCode). The order is confirmed by the Grow callback, not here.
  const payCard = async () => {
    if (payBusy || items.length === 0) return;
    const { errors, clean } = validatePayer(payer);
    const { errors: sErrors, clean: sClean } = validateShip(ship, needsAddress);
    if (errors.name || errors.phone || errors.email || sErrors.street || sErrors.city) {
      setPayerErrors(errors);
      setShipErrors(sErrors);
      // focus the first invalid field, top to bottom (payer then address)
      const first = errors.name
        ? nameRef
        : errors.phone
        ? phoneRef
        : errors.email
        ? emailRef
        : sErrors.street
        ? streetRef
        : cityRef;
      first.current?.focus();
      return;
    }
    setPayerErrors({});
    setShipErrors({});
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
          payer: clean,
          ...(needsAddress ? { shipping: sClean } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || (!data?.url && !data?.authCode)) {
        setPayError(data?.error || "לא ניתן לפתוח עמוד תשלום כרגע — נסו שוב מאוחר יותר");
        return;
      }
      if (data.url) {
        window.location.href = data.url; // Grow hosted payment page
      } else {
        // Growin Wallet popup — success/failure arrive via the SDK's events.
        // onSuccess is a UX signal; /thank-you polls the server callback for the
        // real "paid". (TODO(sandbox): wire onPaymentCancel to keep the button
        // busy while the sheet is open, once the real SDK events are verified.)
        await openGrowWallet(data.authCode, {
          onSuccess: () => {
            window.location.href = `/thank-you?order=${data.orderId}`;
          },
          onFailure: (msg) => setPayError(msg),
        }).catch(() =>
          setPayError("התשלום המהיר אינו זמין כרגע — נסו שוב בעוד רגע")
        );
      }
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

          <div className="payer-fields">
            <h3>פרטים לחשבונית ולעדכונים</h3>
            <div className="payer-field">
              <label htmlFor="payer-name">שם מלא</label>
              <input
                id="payer-name"
                ref={nameRef}
                type="text"
                autoComplete="name"
                value={payer.name}
                onInput={(e) => updatePayer("name", (e.target as HTMLInputElement).value)}
              />
              {payerErrors.name && <span className="payer-err">{payerErrors.name}</span>}
            </div>
            <div className="payer-field">
              <label htmlFor="payer-phone">נייד</label>
              <input
                id="payer-phone"
                ref={phoneRef}
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                dir="ltr"
                placeholder="0501234567"
                value={payer.phone}
                onInput={(e) => updatePayer("phone", (e.target as HTMLInputElement).value)}
              />
              {payerErrors.phone && <span className="payer-err">{payerErrors.phone}</span>}
            </div>
            <div className="payer-field">
              <label htmlFor="payer-email">אימייל — לא חובה</label>
              <input
                id="payer-email"
                ref={emailRef}
                type="email"
                autoComplete="email"
                dir="ltr"
                value={payer.email}
                onInput={(e) => updatePayer("email", (e.target as HTMLInputElement).value)}
              />
              {payerErrors.email && <span className="payer-err">{payerErrors.email}</span>}
            </div>
          </div>

          {needsAddress && (
            <div className="payer-fields">
              <h3>כתובת למשלוח</h3>
              <div className="payer-field">
                <label htmlFor="ship-street">רחוב ומספר בית</label>
                <input
                  id="ship-street"
                  ref={streetRef}
                  type="text"
                  autoComplete="address-line1"
                  value={ship.street}
                  onInput={(e) => updateShip("street", (e.target as HTMLInputElement).value)}
                />
                {shipErrors.street && <span className="payer-err">{shipErrors.street}</span>}
              </div>
              <div className="payer-field">
                <label htmlFor="ship-city">עיר</label>
                <input
                  id="ship-city"
                  ref={cityRef}
                  type="text"
                  autoComplete="address-level2"
                  value={ship.city}
                  onInput={(e) => updateShip("city", (e.target as HTMLInputElement).value)}
                />
                {shipErrors.city && <span className="payer-err">{shipErrors.city}</span>}
              </div>
              <div className="payer-field">
                <label htmlFor="ship-apt">דירה / כניסה / קומה — לא חובה</label>
                <input
                  id="ship-apt"
                  type="text"
                  value={ship.apt}
                  onInput={(e) => updateShip("apt", (e.target as HTMLInputElement).value)}
                />
              </div>
              <div className="payer-field">
                <label htmlFor="ship-zip">מיקוד — לא חובה</label>
                <input
                  id="ship-zip"
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  autoComplete="postal-code"
                  value={ship.zip}
                  onInput={(e) => updateShip("zip", (e.target as HTMLInputElement).value)}
                />
              </div>
              <div className="payer-field">
                <label htmlFor="ship-notes">הערות לשליח — לא חובה</label>
                <input
                  id="ship-notes"
                  type="text"
                  value={ship.notes}
                  onInput={(e) => updateShip("notes", (e.target as HTMLInputElement).value)}
                />
              </div>
            </div>
          )}

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
