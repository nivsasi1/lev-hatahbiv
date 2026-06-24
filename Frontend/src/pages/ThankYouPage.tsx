import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { WORKER_API } from "../data/api";
import { store } from "../data/catalog";
import { useCart } from "../context/cart-context";

type Status = "pending" | "paid" | "failed" | "unknown";

// Landing after PayMe redirects back. The webhook is the source of truth for
// "paid", so we poll order-status until it flips (the redirect may arrive first).
export const ThankYouPage = () => {
  const [params] = useSearchParams();
  const orderId = params.get("order") || "";
  const { clear } = useCart();
  const [status, setStatus] = useState<Status>(orderId ? "pending" : "unknown");
  const cleared = useRef(false);

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
            clear();
          }
          return;
        }
        if (s === "failed" || s === "cancelled") {
          setStatus("failed");
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
          <p>קיבלנו את התשלום ונחזור אליכם לתיאום האספקה. אישור/חשבונית יישלחו גם למייל.</p>
        </>
      ) : status === "failed" ? (
        <>
          <h1 className="display">התשלום לא הושלם</h1>
          <p>לא בוצע חיוב. אפשר לנסות שוב מהעגלה, או להזמין בוואטסאפ/טלפון.</p>
        </>
      ) : status === "unknown" ? (
        <>
          <h1 className="display">אופס</h1>
          <p>לא מצאנו את ההזמנה. אם בוצע חיוב — צרו קשר ונבדוק מיד.</p>
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
