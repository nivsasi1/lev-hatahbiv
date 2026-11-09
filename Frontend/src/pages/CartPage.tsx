import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  asset,
  linePrice,
  shekel,
  FREE_SHIPPING_FROM,
  REDUCED_SHIPPING_FROM,
  REDUCED_SHIPPING_PRICE,
  store,
} from "../data/catalog";
import { lineKey, useCart, type CartItem } from "../context/cart-context";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ProductThumb } from "../components/ProductThumb";
import { WORKER_API } from "../data/api";
import { usePageMeta, titleFor } from "../lib/seo";
import { trackBeginCheckout, type TrackItem } from "../data/analytics";
import "./checkout.css";

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
  { id: "courier", title: "משלוח עד הבית", note: store.courierEta, price: 35 },
  // registered mail was dropped 2026-10 — old orders still carry delivery "mail"
];

// payer details for the invoice + payment page — remembered between visits
const PAYER_KEY = "lh-payer-v1";
const DELIVERY_KEY = "lh-delivery-v1";
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
  // required: it's where PayMe sends the payment confirmation and the invoice
  // (the site sends nothing itself, and there's no SMS)
  const email = p.email.trim();
  if (!email) {
    errors.email = "נא למלא אימייל לקבלת החשבונית";
  } else if (!isEmail(email)) {
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

// what PayMe's page offers for this account (sale_payment_method "multi")
const PAY_METHODS = ["ויזה", "מאסטרקארד", "Apple Pay", "Google Pay", "Bit", "סליקה מאובטחת PayMe"];

const Icon = {
  arrowBack: (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  arrowNext: (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  ),
  lock: (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  trash: (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  ),
  truck: (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  ),
  store: (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10v10h16V10" />
      <path d="M3 10l2-6h14l2 6z" />
      <path d="M10 20v-5h4v5" />
    </svg>
  ),
};

// "פריט אחד" / "3 פריטים"
const itemsLabel = (n: number) => (n === 1 ? "פריט אחד" : `${n} פריטים`);

export const CartPage = () => {
  usePageMeta({ title: titleFor("העגלה שלי"), path: "/cart", noindex: true });
  const { items, count, setQty, remove, clear } = useCart();
  // two steps, in the URL so the phone's back button goes from details to cart
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const step: "cart" | "details" = params.get("step") === "details" ? "details" : "cart";
  const goDetails = () => setParams({ step: "details" }, { state: { fromCart: true } });
  const goCart = () => {
    // came here from the cart step → back, so history doesn't fill with copies
    if ((location.state as any)?.fromCart) navigate(-1);
    else setParams({}, { replace: true });
  };
  // each step starts at the top, with focus on its heading (also on browser back)
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    window.scrollTo(0, 0);
    titleRef.current?.focus({ preventScroll: true });
  }, [step]);
  // the choice survives a refresh of the details step (same tab only)
  const [delivery, setDeliveryState] = useState(() => {
    try {
      const id = sessionStorage.getItem(DELIVERY_KEY);
      return deliveryOptions.find((d) => d.id === id) ?? deliveryOptions[0];
    } catch {
      return deliveryOptions[0];
    }
  });
  const setDelivery = (d: (typeof deliveryOptions)[number]) => {
    setDeliveryState(d);
    try {
      sessionStorage.setItem(DELIVERY_KEY, d.id);
    } catch {
      /* storage blocked — the choice just isn't remembered */
    }
  };
  const [newsOptIn, setNewsOptIn] = useState(false);
  // the pinned bar's height → --co-bar-h, so the accessibility button floats above it
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bar = barRef.current;
    const root = document.documentElement;
    if (!bar || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => root.style.setProperty("--co-bar-h", `${bar.offsetHeight}px`));
    ro.observe(bar);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--co-bar-h");
    };
  }, [step, items.length === 0]);
  // a product that can't ship takes the courier option off the table
  const hasPickupOnly = items.some(({ product }) => product.pickupOnly);
  useEffect(() => {
    if (hasPickupOnly && delivery.id !== "pickup") setDelivery(deliveryOptions[0]);
  }, [hasPickupOnly, delivery.id]);
  const [confirmClear, setConfirmClear] = useState(false);
  // removing a line always asks first (trash, or "−" at quantity 1)
  const [confirmRemove, setConfirmRemove] = useState<CartItem | null>(null);
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
  // 1-decimal; discount rounded to the 10-agorot grid; noCoupon lines are outside
  // the discount base) so the total shown here is identical to what PayMe charges.
  const subtotalAg = items.reduce(
    (s, { product, qty, variant }) =>
      s + Math.round(linePrice(product, variant) * 100) * qty,
    0
  );
  const discountableAg = items.reduce(
    (s, { product, qty, variant }) =>
      product.noCoupon ? s : s + Math.round(linePrice(product, variant) * 100) * qty,
    0
  );
  // shipping tiers (mirrored in the Worker): free ≥ ₪500, flat ₪20 ≥ ₪300,
  // full method price below
  const freeShipping = subtotalAg >= FREE_SHIPPING_FROM * 100;
  const reducedShipping = !freeShipping && subtotalAg >= REDUCED_SHIPPING_FROM * 100;
  const effectiveShipPrice = (base: number) =>
    freeShipping ? 0 : reducedShipping ? Math.min(REDUCED_SHIPPING_PRICE, base) : base;
  const shippingAg =
    delivery.id === "pickup" ? 0 : Math.round(effectiveShipPrice(delivery.price) * 100);
  const discountAg = appliedCoupon
    ? Math.round((discountableAg * appliedCoupon.percent) / 100 / 10) * 10
    : 0;
  const grandTotalAg = subtotalAg - discountAg + shippingAg;
  // shekel views for display (exact — all on the 10-agorot grid)
  const subtotalNis = subtotalAg / 100;
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
    const { errors, clean } = validatePayer(payer);
    const { errors: sErrors, clean: sClean } = validateShip({ ...ship, zip: "" }, needsAddress);
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

    // newsletter opt-in: fire and forget, so a slow or failed signup never holds
    // up the payment; marked "subscribed" so the signup popup doesn't ask again
    if (newsOptIn) {
      try {
        fetch(`${WORKER_API}/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: clean.email }),
          keepalive: true,
        }).catch(() => {});
        localStorage.setItem("lh-news-v1", "subscribed");
      } catch {
        /* storage blocked — the signup itself still went out */
      }
    }

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
            // also what the thank-you page shows: the server's order-status
            // deliberately returns the status only, so the details come from here
            JSON.stringify({
              valueAgorot: grandTotalAg,
              coupon: appliedCoupon?.code,
              items: trackItems,
              delivery: delivery.id,
              shippingAgorot: shippingAg,
              discountAgorot: discountAg,
              hasEmail: Boolean(clean.email),
            })
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

  // the slim checkout header (the site header is hidden on /cart, see App.tsx)
  const coHeader = (
    <header className="co-head">
      {step === "details" ? (
        <>
          <button type="button" className="co-head-link" onClick={goCart}>
            {Icon.arrowBack}
            חזרה לעגלה
          </button>
          <Link to="/" className="co-logo" aria-label="לב התחביב — דף הבית">
            <img src={asset("/images/LevHatahbivLogo.png")} alt="לב התחביב" />
          </Link>
        </>
      ) : (
        <>
          <Link to="/" className="co-logo" aria-label="לב התחביב — דף הבית">
            <img src={asset("/images/LevHatahbivLogo.png")} alt="לב התחביב" />
          </Link>
          <Link to="/" className="co-head-link">
            {Icon.arrowBack}
            להמשיך לקנות
          </Link>
        </>
      )}
    </header>
  );

  if (items.length === 0) {
    return (
      <main className="page-main co-page">
        {coHeader}
        <div className="co-body">
          <h1 className="display co-title">העגלה שלי</h1>
          <p className="empty-note">
            העגלה ריקה לגמרי — בואו נתקן את זה. <Link to="/">לחנות ←</Link>
          </p>
        </div>
      </main>
    );
  }

  const pendingWarn = payPending && (
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
  );

  // free shipping: ₪20 from ₪300, free from ₪500 (the same tiers as the Worker)
  const toFree = Math.max(0, FREE_SHIPPING_FROM - subtotalNis);
  const shipLine = freeShipping
    ? "🎉 יש לכם משלוח חינם"
    : reducedShipping
    ? `עוד ${shekel(toFree)} למשלוח חינם · המשלוח עכשיו רק ${shekel(REDUCED_SHIPPING_PRICE)}`
    : `עוד ${shekel(toFree)} למשלוח חינם · מעל ${shekel(REDUCED_SHIPPING_FROM)} המשלוח רק ${shekel(REDUCED_SHIPPING_PRICE)}`;
  const shipPct = Math.min(100, (subtotalNis / FREE_SHIPPING_FROM) * 100);
  const tierPct = (REDUCED_SHIPPING_FROM / FREE_SHIPPING_FROM) * 100;
  const deliveryPrice = (d: (typeof deliveryOptions)[number]) =>
    d.price > 0 && effectiveShipPrice(d.price) > 0 ? shekel(effectiveShipPrice(d.price)) : "חינם";

  if (step === "details") {
    return (
      <main className="page-main co-page">
        {coHeader}
        <ol className="co-steps" aria-label="שלבי ההזמנה">
          <li aria-current="step" className="on">
            <span>1</span>פרטים וקבלה
          </li>
          <li>
            <span>2</span>תשלום ב-PayMe
          </li>
        </ol>
        <div className="co-body">
          {pendingWarn}
          <div className="co-title-row">
            <h1 className="display co-title" ref={titleRef} tabIndex={-1}>
              למי ולאן?
            </h1>
            <button type="button" className="co-mini" onClick={goCart} aria-label="חזרה לעגלה">
              <span className="co-mini-thumbs" aria-hidden="true">
                {items.slice(0, 3).map((i) => (
                  <ProductThumb key={lineKey(i)} product={i.product} />
                ))}
              </span>
              <span className="co-mini-text">
                {itemsLabel(count)} · <span dir="ltr">{shekel(grandTotal)}</span>
              </span>
            </button>
          </div>

          <form
            className="co-form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              payCard();
            }}
          >
            <fieldset>
              <legend>פרטי קשר</legend>
              <div className="co-field">
                <label htmlFor="payer-name">שם מלא</label>
                <input
                  id="payer-name"
                  ref={nameRef}
                  type="text"
                  autoComplete="name"
                  placeholder="כמו שרשום באשראי"
                  value={payer.name}
                  aria-invalid={Boolean(payerErrors.name)}
                  onInput={(e) => updatePayer("name", (e.target as HTMLInputElement).value)}
                />
                {payerErrors.name && <span className="payer-err">{payerErrors.name}</span>}
              </div>
              <div className="co-grid">
                <div className="co-field">
                  <label htmlFor="payer-phone">טלפון נייד</label>
                  <input
                    id="payer-phone"
                    ref={phoneRef}
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    dir="ltr"
                    placeholder="050-0000000"
                    value={payer.phone}
                    aria-invalid={Boolean(payerErrors.phone)}
                    onInput={(e) => updatePayer("phone", (e.target as HTMLInputElement).value)}
                  />
                  {payerErrors.phone ? (
                    <span className="payer-err">{payerErrors.phone}</span>
                  ) : (
                    <span className="co-hint">לעדכון כשההזמנה מוכנה</span>
                  )}
                </div>
                <div className="co-field">
                  <label htmlFor="payer-email">אימייל</label>
                  <input
                    id="payer-email"
                    ref={emailRef}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    dir="ltr"
                    placeholder="name@example.com"
                    value={payer.email}
                    aria-invalid={Boolean(payerErrors.email)}
                    onInput={(e) => updatePayer("email", (e.target as HTMLInputElement).value)}
                  />
                  {payerErrors.email ? (
                    <span className="payer-err">{payerErrors.email}</span>
                  ) : (
                    <span className="co-hint">לאישור ההזמנה והקבלה</span>
                  )}
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>קבלת ההזמנה</legend>
              <div className="co-chosen">
                <span className="co-chosen-main">
                  {needsAddress ? Icon.truck : Icon.store}
                  <span>
                    <b>
                      {delivery.title} · {deliveryPrice(delivery)}
                    </b>
                    <small>{delivery.note}</small>
                  </span>
                </span>
                <button type="button" className="co-link" onClick={goCart}>
                  שינוי
                </button>
              </div>
              {needsAddress && (
                <>
                  <div className="co-grid">
                    <div className="co-field">
                      <label htmlFor="ship-city">עיר</label>
                      <input
                        id="ship-city"
                        ref={cityRef}
                        type="text"
                        autoComplete="address-level2"
                        value={ship.city}
                        aria-invalid={Boolean(shipErrors.city)}
                        onInput={(e) => updateShip("city", (e.target as HTMLInputElement).value)}
                      />
                      {shipErrors.city && <span className="payer-err">{shipErrors.city}</span>}
                    </div>
                    <div className="co-field">
                      <label htmlFor="ship-street">רחוב ומספר</label>
                      <input
                        id="ship-street"
                        ref={streetRef}
                        type="text"
                        autoComplete="address-line1"
                        value={ship.street}
                        aria-invalid={Boolean(shipErrors.street)}
                        onInput={(e) => updateShip("street", (e.target as HTMLInputElement).value)}
                      />
                      {shipErrors.street && <span className="payer-err">{shipErrors.street}</span>}
                    </div>
                  </div>
                  <div className="co-grid">
                    <div className="co-field">
                      <label htmlFor="ship-apt">
                        דירה / קומה / כניסה <span className="co-opt">(לא חובה)</span>
                      </label>
                      <input
                        id="ship-apt"
                        type="text"
                        value={ship.apt}
                        onInput={(e) => updateShip("apt", (e.target as HTMLInputElement).value)}
                      />
                    </div>
                    <div className="co-field">
                      <label htmlFor="ship-notes">
                        הערה לשליח <span className="co-opt">(לא חובה)</span>
                      </label>
                      <input
                        id="ship-notes"
                        type="text"
                        placeholder="קוד לבניין, להשאיר אצל השכן…"
                        value={ship.notes}
                        onInput={(e) => updateShip("notes", (e.target as HTMLInputElement).value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </fieldset>

            <label className="co-check">
              <input
                type="checkbox"
                checked={newsOptIn}
                onChange={(e) => {
                  setNewsOptIn((e.target as HTMLInputElement).checked);
                }}
              />
              <span>
                לשלוח לי מדי פעם חדשות וקופונים למייל. <span className="co-muted">אפשר לבטל בכל רגע.</span>
              </span>
            </label>
            <p className="co-muted co-small">
              הפרטים משמשים רק לטיפול בהזמנה ולקבלה. <Link to="/privacy">מדיניות הפרטיות</Link>
            </p>

            <div className="co-bar" ref={barRef}>
              {payError && (
                <p className="coupon-err co-bar-err" role="alert">
                  {payError}
                </p>
              )}
              <div className="co-bar-row">
                <div className="co-bar-total">
                  <span>{needsAddress ? "סה״כ כולל משלוח" : "סה״כ לתשלום"}</span>
                  <b dir="ltr">{shekel(grandTotal)}</b>
                </div>
                <button type="submit" className="co-cta" disabled={payBusy}>
                  {Icon.lock}
                  {payBusy ? "מעבירים לתשלום מאובטח…" : "לתשלום מאובטח"}
                </button>
              </div>
              <p className="co-bar-note">
                בלחיצה על "לתשלום מאובטח" אני מאשר/ת את{" "}
                <Link to="/terms" target="_blank">
                  התקנון
                </Link>{" "}
                ו
                <Link to="/returns" target="_blank">
                  מדיניות הביטולים
                </Link>
                . התשלום בעמוד המאובטח של PayMe.
              </p>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="page-main co-page">
      {coHeader}
      <div className="co-body">
        {pendingWarn}
        <div className="co-title-row">
          <h1 className="display co-title" ref={titleRef} tabIndex={-1}>
            העגלה שלי
          </h1>
          <span className="co-muted">{itemsLabel(count)}</span>
        </div>

        <section className="co-card co-ship" aria-label="התקדמות למשלוח חינם">
          <p>{shipLine}</p>
          <div
            className="co-ship-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={FREE_SHIPPING_FROM}
            aria-valuenow={Math.round(subtotalNis * 10) / 10}
            aria-label={`סכום העגלה מתוך ${FREE_SHIPPING_FROM} שקלים למשלוח חינם`}
          >
            <div className="co-ship-fill" style={{ width: `${shipPct}%` }} />
            <div className="co-ship-tier" style={{ insetInlineStart: `${tierPct}%` }} aria-hidden="true" />
          </div>
          <div className="co-ship-scale" aria-hidden="true">
            <span dir="ltr">₪0</span>
            {/* positioned in the page's RTL (a dir="ltr" span would flip the side) */}
            <span style={{ insetInlineStart: `${tierPct}%` }}>
              <bdi dir="ltr">{shekel(REDUCED_SHIPPING_FROM)}</bdi>
            </span>
            <span dir="ltr">{shekel(FREE_SHIPPING_FROM)}</span>
          </div>
        </section>

        <ul className="co-lines">
          {items.map((item) => {
            const { product, qty, variant } = item;
            const unit = linePrice(product, variant);
            return (
              <li className="co-card co-line" key={lineKey(item)}>
                <Link to={`/product/${product.id}`} className="co-thumb" tabIndex={-1} aria-hidden="true">
                  <ProductThumb product={product} />
                </Link>
                <div className="co-line-main">
                  <div className="co-line-top">
                    <Link to={`/product/${product.id}`} className="co-line-name">
                      {product.name}
                      {variant && <span className="variant-tag">{variant}</span>}
                    </Link>
                    <button
                      type="button"
                      className="co-rm"
                      onClick={() => setConfirmRemove(item)}
                      aria-label={`הסרת ${product.name}${variant ? ` (${variant})` : ""} מהעגלה`}
                      title="הסרה מהעגלה"
                    >
                      {Icon.trash}
                    </button>
                  </div>
                  {appliedCoupon && product.noCoupon && (
                    <span className="variant-tag no-coupon">לא משתתף בהנחת הקופון</span>
                  )}
                  {product.pickupOnly && <span className="variant-tag">איסוף עצמי בלבד</span>}
                  <div className="co-line-bottom">
                    <span className="co-price">
                      <b dir="ltr">{shekel(unit * qty)}</b>
                      {qty > 1 && <small> · {shekel(unit)} ליח׳</small>}
                    </span>
                    <div className="co-qty" role="group" aria-label={`כמות של ${product.name}`}>
                      <button
                        type="button"
                        onClick={() =>
                          qty <= 1 ? setConfirmRemove(item) : setQty(product.id, qty - 1, variant)
                        }
                        aria-label="הפחתת כמות"
                      >
                        −
                      </button>
                      <span aria-live="polite">{qty}</span>
                      <button
                        type="button"
                        onClick={() => setQty(product.id, qty + 1, variant)}
                        aria-label="הוספת כמות"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <fieldset className="co-delivery">
          <legend>איך תרצו לקבל את ההזמנה?</legend>
          {deliveryOptions.map((d) => {
            const off = d.id !== "pickup" && hasPickupOnly;
            return (
              <label key={d.id} className={`co-option${delivery.id === d.id ? " on" : ""}${off ? " off" : ""}`}>
                <input
                  type="radio"
                  name="delivery"
                  checked={delivery.id === d.id}
                  disabled={off}
                  onChange={() => setDelivery(d)}
                />
                <span>
                  <b>
                    {d.id === "pickup" ? "איסוף מהחנות" : d.title} · {deliveryPrice(d)}
                  </b>
                  <small>{off ? "חלק מהמוצרים בעגלה זמינים באיסוף עצמי בלבד" : d.note}</small>
                </span>
              </label>
            );
          })}
        </fieldset>

        <div className="coupon-box">
          {!appliedCoupon && !couponOpen && (
            <button type="button" className="co-link" onClick={() => setCouponOpen(true)}>
              יש לכם קוד קופון?
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
                aria-label="קוד קופון"
                value={couponInput}
                onInput={(e) => {
                  setCouponInput((e.target as HTMLInputElement).value);
                  setCouponError("");
                }}
                autoFocus
              />
              <button type="submit" className="btn coupon-confirm" disabled={couponBusy}>
                {couponBusy ? "בודק…" : "אישור"}
              </button>
            </form>
          )}
          {couponError && <span className="coupon-err">{couponError}</span>}
          {appliedCoupon && (
            <div className="coupon-applied">
              <span>
                קופון {appliedCoupon.code} · הנחה {appliedCoupon.percent}% (−{shekel(discount)}) 🎉
              </span>
              <button type="button" className="coupon-remove" onClick={removeCoupon} aria-label="הסרת קופון">
                ✕
              </button>
            </div>
          )}
        </div>

        <button type="button" className="co-link co-clear" onClick={() => setConfirmClear(true)}>
          ריקון העגלה
        </button>

        <div className="co-bar" ref={barRef}>
          <div className="co-bar-row">
            <div className="co-bar-total">
              <span>סה״כ לתשלום</span>
              <b dir="ltr">{shekel(grandTotal)}</b>
            </div>
            <button type="button" className="co-cta" onClick={goDetails}>
              להמשיך לפרטים
              {Icon.arrowNext}
            </button>
          </div>
          <p className="co-bar-note">שלב 1 מתוך 2 · אחר כך תשלום מאובטח ב-PayMe</p>
          <ul className="co-pay-methods" aria-label="אמצעי תשלום">
            {PAY_METHODS.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      </div>

      {confirmClear && (
        <ConfirmDialog
          title="לרוקן את כל העגלה?"
          confirmLabel="כן, לרוקן"
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            clear();
            setConfirmClear(false);
          }}
        >
          <p>כל המוצרים יוסרו מהעגלה. אי אפשר לבטל את הפעולה.</p>
        </ConfirmDialog>
      )}
      {confirmRemove && (
        <ConfirmDialog
          title="להסיר מהעגלה?"
          confirmLabel="כן, להסיר"
          onCancel={() => setConfirmRemove(null)}
          onConfirm={() => {
            remove(confirmRemove.product.id, confirmRemove.variant);
            setConfirmRemove(null);
          }}
        >
          <p>
            {confirmRemove.product.name}
            {confirmRemove.variant ? ` · ${confirmRemove.variant}` : ""}
          </p>
        </ConfirmDialog>
      )}
    </main>
  );
};
