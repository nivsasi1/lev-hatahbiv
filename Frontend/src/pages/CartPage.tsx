import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  linePrice,
  shekel,
  FREE_SHIPPING_FROM,
  store,
} from "../data/catalog";
import { lineKey, useCart } from "../context/cart-context";
import { ProductThumb } from "../components/ProductThumb";
import { ShipMeter } from "../components/CartSheet";
import { WORKER_API } from "../data/api";
import { usePageMeta, titleFor } from "../lib/seo";
import { trackBeginCheckout, type TrackItem } from "../data/analytics";

// A checkout was started within this window → warn the shopper not to pay twice
// if they came back to the cart (closed the PayMe tab, hit back, etc.).
const PENDING_KEY = "lh-pay-pending";
const PENDING_WINDOW_MS = 30 * 60 * 1000;
const recentPendingPayment = (): boolean => {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return false;
    const { at } = JSON.parse(raw);
    return typeof at === "number" && Date.now() - at < PENDING_WINDOW_MS;
  } catch {
    return false;
  }
};

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
  usePageMeta({ title: titleFor("העגלה שלי"), path: "/cart", noindex: true });
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
  const [payPending, setPayPending] = useState(recentPendingPayment);
  const [termsAccepted, setTermsAccepted] = useState(false);
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

  // Back from PayMe usually restores this page from bfcache with the old JS heap
  // (payPending still false) — re-read the flag on pageshow so the "don't pay
  // twice" warning actually shows in its primary scenario.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setPayPending(recentPendingPayment());
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

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
  // identical to what PayMe charges.
  const subtotalAg = items.reduce(
    (s, { product, qty, variant }) =>
      s + Math.round(linePrice(product, variant) * 100) * qty,
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
  // shopper to PayMe's hosted payment page. The order is confirmed by the
  // PayMe callback + server-side re-query, not here.
  // only PayMe's own hosted page is a valid redirect target — never follow a
  // non-https / off-provider URL even if the API somehow returned one.
  // PayMe's API lives on payme.io but the hosted sale pages are served from
  // *.paymeservice.com (PAYMENTS.md) — both are theirs, accept both.
  const isPayMeUrl = (u: string): boolean => {
    try {
      const parsed = new URL(u);
      return (
        parsed.protocol === "https:" &&
        /(^|\.)(payme\.io|paymeservice\.com)$/.test(parsed.hostname)
      );
    } catch {
      return false;
    }
  };

  const payCard = async () => {
    if (payBusy || items.length === 0) return;
    if (!termsAccepted) {
      setPayError("יש לאשר את התקנון ומדיניות הביטולים לפני התשלום");
      return;
    }
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

    // ecommerce items for analytics (money in agorot, mirroring the server total)
    const trackItems: TrackItem[] = items.map(({ product, qty, variant }) => ({
      id: product.id,
      name: variant ? `${product.name} — ${variant}` : product.name,
      priceAgorot: Math.round(linePrice(product, variant) * 100),
      qty,
      category: product.category,
    }));
    trackBeginCheckout(trackItems, grandTotalAg, appliedCoupon?.code);

    try {
      const res = await fetch(`${WORKER_API}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ product, qty, variant }) => ({
            id: product.id,
            name: product.name,
            qty,
            ...(variant ? { variant } : {}),
          })),
          delivery: delivery.id,
          couponCode: appliedCoupon?.code,
          payer: clean,
          ...(needsAddress ? { shipping: sClean } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        setPayError(data?.error || "לא ניתן לפתוח עמוד תשלום כרגע — נסו שוב מאוחר יותר");
        return;
      }
      if (!isPayMeUrl(data.url)) {
        setPayError("שגיאה בפתיחת עמוד התשלום — נסו שוב מאוחר יותר");
        return;
      }
      // snapshot the exact charged order so ThankYou can fire the purchase
      // conversion (the cart is cleared by then), and mark a pending payment so a
      // return to the cart warns against paying twice.
      try {
        if (data.orderId) {
          sessionStorage.setItem(
            `lh-order-${data.orderId}`,
            JSON.stringify({ valueAgorot: grandTotalAg, coupon: appliedCoupon?.code, items: trackItems })
          );
        }
        sessionStorage.setItem(PENDING_KEY, JSON.stringify({ at: Date.now(), orderId: data.orderId }));
      } catch {
        /* storage blocked — payment still proceeds, just no snapshot */
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

      {payPending && (
        <div className="pay-pending-warn" role="alert">
          <span>
            ⚠️ התחלתם תשלום לא מזמן. אם כבר שילמתם — <b>אל תשלמו שוב</b>, ההזמנה בדרך אליכם
            (אישור יופיע בעמוד התודה). רק אם התשלום לא הושלם, אפשר לנסות שוב.
          </span>
          <button
            type="button"
            className="btn small ghost"
            onClick={() => {
              try {
                sessionStorage.removeItem(PENDING_KEY);
              } catch {
                /* ignore */
              }
              setPayPending(false);
            }}
          >
            הבנתי
          </button>
        </div>
      )}

      <div className="cart-layout">
        <div className="cart-list">
          {items.map((item) => {
            const { product, qty, variant } = item;
            const unit = linePrice(product, variant);
            return (
              <div className="cart-line" key={lineKey(item)}>
                <Link to={`/product/${product.id}`} className="thumb">
                  <ProductThumb product={product} />
                </Link>
                <div className="mid">
                  <Link to={`/product/${product.id}`} className="nm">
                    {product.name}
                  </Link>
                  {variant && <span className="variant-tag">{variant}</span>}
                  <span className="pr">
                    {shekel(unit)} ליח' · {shekel(unit * qty)}
                  </span>
                </div>
                <div className="qty">
                  <button onClick={() => setQty(product.id, qty + 1, variant)} aria-label="הוספה">
                    +
                  </button>
                  <span>{qty}</span>
                  <button onClick={() => setQty(product.id, qty - 1, variant)} aria-label="הפחתה">
                    −
                  </button>
                </div>
                <button className="rm" onClick={() => remove(product.id, variant)} aria-label="הסרה">
                  ✕
                </button>
              </div>
            );
          })}

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

          <label className="terms-accept">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted((e.target as HTMLInputElement).checked);
                setPayError("");
              }}
            />
            <span>
              קראתי ואני מאשר/ת את <Link to="/terms" target="_blank">התקנון</Link> ו
              <Link to="/returns" target="_blank">מדיניות הביטולים וההחזרות</Link>
            </span>
          </label>

          <button
            className="btn pay-card-btn"
            style={{ width: "100%" }}
            onClick={payCard}
            disabled={payBusy || !termsAccepted}
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
