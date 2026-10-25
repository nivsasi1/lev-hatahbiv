import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { WORKER_API } from "../data/api";
import { store } from "../data/catalog";
import { useCart } from "../context/cart-context";
import { usePageMeta, titleFor } from "../lib/seo";
import { trackPurchase, type TrackItem } from "../data/analytics";
import { orderCode } from "../lib/orderCode";

// The exact charged order, snapshotted by CartPage right before the PayMe
// redirect (keyed by the order id the checkout API returned). Read here so the
// purchase conversion carries the real total/items even though the cart is
// cleared. trackPurchase de-dupes by transaction id, so a refresh is safe.
const firePurchase = (orderId: string) => {
  try {
    const raw = sessionStorage.getItem(`lh-order-${orderId}`);
    if (!raw) return;
    const snap = JSON.parse(raw) as {
      valueAgorot: number;
      coupon?: string;
      items: TrackItem[];
    };
    if (!snap || !Array.isArray(snap.items)) return;
    trackPurchase({
      transactionId: orderId,
      valueAgorot: Number(snap.valueAgorot) || 0,
      coupon: snap.coupon,
      items: snap.items,
    });
  } catch {
    /* no usable snapshot — skip tracking rather than send bad data */
  }
};

// Same key CartPage writes before the PayMe redirect ("lh-pay-pending") — once
// the order reaches a terminal status here, the cart's double-charge warning is
// moot and must not scare the next purchase.
const clearPendingFlag = () => {
  try {
    sessionStorage.removeItem("lh-pay-pending");
  } catch {
    /* ignore */
  }
};

type Status = "pending" | "paid" | "failed" | "unknown";

// what this tab saved at checkout — items, money, how it's delivered. Absent
// when the shopper comes back in another browser; the page then shows the
// order number and contact options only.
type Snapshot = {
  valueAgorot: number;
  items: TrackItem[];
  delivery?: string;
  shippingAgorot?: number;
  discountAgorot?: number;
  coupon?: string;
  hasEmail?: boolean;
};
const readSnapshot = (orderId: string): Snapshot | null => {
  try {
    const snap = JSON.parse(sessionStorage.getItem(`lh-order-${orderId}`) || "null");
    return snap && Array.isArray(snap.items) ? snap : null;
  } catch {
    return null;
  }
};
const sh = (agorot: number) => {
  const n = Math.round(agorot) / 100;
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "");
};

// Landing after PayMe redirects back. The webhook is the source of truth for
// "paid", so we poll order-status until it flips (the redirect may arrive first).
export const ThankYouPage = () => {
  usePageMeta({ title: titleFor("תודה על ההזמנה"), path: "/thank-you", noindex: true });
  const [params] = useSearchParams();
  const orderId = params.get("order") || "";
  const { clear } = useCart();
  const [status, setStatus] = useState<Status>(orderId ? "pending" : "unknown");
  const cleared = useRef(false);
  const [snap] = useState(() => (orderId ? readSnapshot(orderId) : null));
  const code = orderId ? orderCode(orderId) : "";
  const askShop = (text: string) => `https://wa.me/${store.phoneIntl}?text=${encodeURIComponent(text)}`;

  useEffect(() => {
    if (!orderId) return;
    let alive = true;
    let tries = 0;
    let timer: any;
    const poll = async () => {
      try {
        const res = await fetch(`${WORKER_API}/order-status?id=${encodeURIComponent(orderId)}`);
        const data = await res.json().catch(() => null);
        if (!alive) return;
        const s = data?.status;
        if (s === "paid") {
          setStatus("paid");
          if (!cleared.current) {
            cleared.current = true;
            firePurchase(orderId); // conversion — before clear(), de-duped by order id
            clear();
            clearPendingFlag();
          }
          return;
        }
        if (s === "failed" || s === "cancelled") {
          setStatus("failed");
          clearPendingFlag(); // nothing was charged — no double-charge risk to warn about
          return;
        }
        if (s === "unknown") {
          setStatus("unknown");
          return;
        }
        if (++tries < 20) timer = setTimeout(poll, 3000); // keep waiting for the webhook
      } catch {
        if (alive && ++tries < 20) timer = setTimeout(poll, 3000);
      }
    };
    timer = setTimeout(poll, 1500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [orderId]);

  return (
    <main className="page-main shell a11y-page" style={{ textAlign: "center" }}>
      {status === "paid" ? (
        <>
          <h1 className="display">תודה! ההזמנה התקבלה 🎨</h1>
          <p className="ty-code">
            מספר הזמנה: <b dir="ltr">{code}</b>
          </p>

          {snap && (
            <section className="ty-card ty-summary" aria-label="סיכום ההזמנה">
              {snap.items.map((i, n) => (
                <p key={n}>
                  <span>
                    {i.name}
                    {(i.qty || 1) > 1 ? ` ×${i.qty}` : ""}
                  </span>
                  <span>₪{sh(i.priceAgorot * (i.qty || 1))}</span>
                </p>
              ))}
              {(snap.discountAgorot || 0) > 0 && (
                <p>
                  <span>הנחה{snap.coupon ? ` (קופון ${snap.coupon})` : ""}</span>
                  <span>−₪{sh(snap.discountAgorot!)}</span>
                </p>
              )}
              {snap.delivery !== "pickup" && (snap.shippingAgorot || 0) > 0 && (
                <p>
                  <span>משלוח</span>
                  <span>₪{sh(snap.shippingAgorot!)}</span>
                </p>
              )}
              <p className="ty-total">
                <span>שולם</span>
                <span>₪{sh(snap.valueAgorot)}</span>
              </p>
            </section>
          )}

          {snap?.delivery === "pickup" ? (
            <section className="ty-card ty-next">
              <h2>איסוף מהחנות</h2>
              <p>
                {store.address} ·{" "}
                <a href={store.waze} target="_blank" rel="noreferrer">
                  ניווט ב‑Waze
                </a>
              </p>
              <ul className="ty-hours">
                {store.hours.map((h) => (
                  <li key={h.days}>
                    <span>{h.days}</span> <span dir="ltr">{h.time}</span>
                  </li>
                ))}
              </ul>
              <p>נשלח לכם הודעת וואטסאפ כשההזמנה מוכנה לאיסוף.</p>
            </section>
          ) : snap?.delivery === "courier" ? (
            <section className="ty-card ty-next">
              <h2>משלוח עד הבית</h2>
              <p>
                ההזמנה תגיע אליכם תוך {store.courierEta}, ונעדכן בוואטסאפ כשהיא יוצאת.
              </p>
            </section>
          ) : (
            <p>קיבלנו את התשלום ונחזור אליכם לתיאום האספקה.</p>
          )}

          <p className="ty-note">
            {snap?.hasEmail
              ? "אישור וחשבונית יישלחו גם למייל."
              : "כדאי לשמור צילום מסך של העמוד — זה אישור ההזמנה."}
          </p>
          <a
            className="btn ty-wa"
            href={askShop(`היי, יש לי שאלה לגבי הזמנה ${code}`)}
            target="_blank"
            rel="noreferrer"
          >
            💬 שאלה על ההזמנה בוואטסאפ
          </a>
        </>
      ) : status === "failed" ? (
        <>
          <h1 className="display">התשלום לא הושלם</h1>
          <p>
            לא בוצע חיוב. אפשר לנסות שוב מהעגלה, או להזמין{" "}
            <a href={askShop("היי, ניסיתי להזמין באתר והתשלום לא עבר — אפשר להזמין דרככם?")} target="_blank" rel="noreferrer">
              בוואטסאפ
            </a>{" "}
            או בטלפון.
          </p>
        </>
      ) : status === "unknown" ? (
        <>
          <h1 className="display">אופס</h1>
          <p>לא מצאנו את ההזמנה. אם בוצע חיוב — צרו קשר ונבדוק מיד.</p>
          {code && (
            <a
              className="btn ty-wa"
              href={askShop(`היי, שילמתי באתר ולא מופיע אישור — הזמנה ${code}`)}
              target="_blank"
              rel="noreferrer"
            >
              💬 בדיקה מול החנות בוואטסאפ
            </a>
          )}
        </>
      ) : (
        <>
          <h1 className="display">מאשרים את התשלום…</h1>
          <p>רגע אחד — בודקים את הסטטוס מול חברת הסליקה.</p>
        </>
      )}
      <p style={{ marginTop: "1.4rem" }}>
        <Link to="/">חזרה לחנות ←</Link> · שאלות?{" "}
        <a href={`tel:${store.phone}`}>{store.phone}</a>
      </p>
    </main>
  );
};
