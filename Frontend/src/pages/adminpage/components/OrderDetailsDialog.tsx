import { useEffect, useRef, useState } from "react";
import { useAdmin } from "../context";
import { imgUrl, ils } from "../lib/helpers";
import type { Order } from "../lib/types";

// money math in agorot, like the refund dialog — shekel floats drift
const toA = (n: number | null | undefined) => Math.round((Number(n) || 0) * 100);
const sh = (agorot: number) => ils(agorot / 100);

const Thumb = ({ src }: { src: string }) => {
  const [broken, setBroken] = useState(false);
  return src && !broken ? (
    <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} />
  ) : (
    <span className="od-thumb-empty" aria-hidden="true">🎨</span>
  );
};

// Everything about one order on one screen, so the manager doesn't have to go
// hunting for each product: every line with its photo, chosen option, barcode
// and a link to the product page, then the customer, delivery and the money.
// Read-only, so Escape or a tap outside closes it safely.
export function OrderDetailsDialog({
  order: o,
  status,
  delivery,
  onClose,
  onHandled,
}: {
  order: Order;
  status: string;
  delivery: string;
  onClose: () => void;
  onHandled?: () => void;
}) {
  const { products } = useAdmin();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      opener?.focus?.({ preventScroll: true });
    };
  }, []);

  const lines = (o.items || []).map((i) => {
    const p = i.id ? products.find((x) => x._id === i.id) : undefined;
    const v = i.variant ? p?.variants?.find((x) => x.key === i.variant) : undefined;
    const qty = Math.max(1, Math.floor(Number(i.qty) || 1));
    // an option's barcode is its own physical item; no option → the product's
    const sku = i.variant ? v?.sku : p?.sku;
    // hidden/deleted products 404 on the site; if the list didn't load we can't tell
    const linkable = !!i.id && (p ? p.isActive !== false : products.length === 0);
    return { i, p, v, qty, sku, linkable, img: imgUrl((p?.img || "").split(";")[0].trim()) };
  });
  const units = lines.reduce((s, l) => s + l.qty, 0);

  const totalA = toA(o.total);
  const subtotalA = toA(o.subtotal);
  const discountA = toA(o.discount);
  const shippingA = o.subtotal != null ? Math.max(0, totalA - subtotalA + discountA) : 0;
  const refundedA = toA(o.refundedTotal);
  const addr = o.shipping
    ? [o.shipping.street, o.shipping.apt, o.shipping.city, o.shipping.zip].filter(Boolean).join(", ")
    : "";
  const when = new Date(o.createdAt);

  return (
    <div className="ui-veil adm-sheet-veil" onClick={onClose}>
      <div
        className="adm-sheet od-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="od-title"
        tabIndex={-1}
        ref={box}
        onClick={(e: any) => e.stopPropagation()}
      >
        <div className="adm-sheet-head">
          <div className="adm-sheet-title">
            <h3 className="display" id="od-title">פרטי הזמנה</h3>
            <small>
              {when.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" })}{" "}
              {when.toLocaleTimeString("he-IL", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Jerusalem",
              })}
              {" · "}
              {units} פריטים · ₪{ils(o.total)}
            </small>
          </div>
          <span className={`order-status ${o.status}`}>{status}</span>
          <button type="button" className="adm-sheet-x" aria-label="סגירה" onClick={onClose}>
            ✕
          </button>
        </div>

        <ul className="od-items">
          {lines.map(({ i, p, v, qty, sku, linkable, img }, idx) => {
            const href = `${import.meta.env.BASE_URL}product/${encodeURIComponent(i.id || "")}`;
            return (
              <li key={idx} className="od-item">
                {linkable ? (
                  <a className="od-thumb" href={href} target="_blank" rel="noreferrer" tabIndex={-1}>
                    <Thumb src={img} />
                  </a>
                ) : (
                  <span className="od-thumb">
                    <Thumb src={img} />
                  </span>
                )}
                <div className="od-item-main">
                  <b className="od-item-name">{i.name || p?.name || "פריט"}</b>
                  {i.variant && (
                    <span className="od-variant">
                      {v?.swatch && <i style={{ background: v.swatch }} />}
                      {p?.variantLabel || "אפשרות"}:{" "}
                      <b>{i.variant}</b>
                    </span>
                  )}
                  <span className="od-meta">
                    {sku && (
                      <>
                        ברקוד <bdi dir="ltr">{sku}</bdi>
                      </>
                    )}
                    {sku && p && " · "}
                    {p && `${p.category}${p.sub_cat ? ` › ${p.sub_cat}` : ""}`}
                  </span>
                  {linkable ? (
                    <a className="od-link" href={href} target="_blank" rel="noreferrer">
                      לעמוד המוצר באתר ↗
                    </a>
                  ) : (
                    <span className="od-gone">
                      {p ? "המוצר מוסתר מהאתר כרגע" : "המוצר כבר לא קיים בקטלוג"}
                    </span>
                  )}
                </div>
                <div className="od-qty">
                  <span className={`od-qty-n${qty > 1 ? " many" : ""}`}>×{qty}</span>
                  {i.price != null && (
                    <>
                      <b>₪{sh(toA(i.price) * qty)}</b>
                      {qty > 1 && <small>₪{ils(i.price)} ליח׳</small>}
                    </>
                  )}
                </div>
              </li>
            );
          })}
          {lines.length === 0 && <li className="empty-note">אין פריטים בהזמנה</li>}
        </ul>

        <div className="od-grid">
          <section className="od-sec">
            <h4>לקוח</h4>
            <p>{o.payerName || "—"}</p>
            {o.payerPhone && (
              <a href={`tel:${o.payerPhone}`}>
                📞 <bdi dir="ltr">{o.payerPhone}</bdi>
              </a>
            )}
            {o.payerEmail && (
              <a href={`mailto:${o.payerEmail}`}>
                ✉️ <bdi dir="ltr">{o.payerEmail}</bdi>
              </a>
            )}
          </section>

          <section className="od-sec">
            <h4>משלוח</h4>
            <p>{delivery}</p>
            {addr && <p>📦 {addr}</p>}
            {o.shipping?.notes && <p className="od-note">״{o.shipping.notes}״</p>}
          </section>

          <section className="od-sec od-money">
            <h4>תשלום</h4>
            {o.subtotal != null && (
              <p>
                <span>מוצרים</span>
                <span>₪{sh(subtotalA)}</span>
              </p>
            )}
            {discountA > 0 && (
              <p>
                <span>הנחה{o.couponCode ? ` (קופון ${o.couponCode})` : ""}</span>
                <span>−₪{sh(discountA)}</span>
              </p>
            )}
            {shippingA > 0 && (
              <p>
                <span>משלוח</span>
                <span>₪{sh(shippingA)}</span>
              </p>
            )}
            <p className="od-total">
              <span>שולם</span>
              <span>₪{sh(totalA)}</span>
            </p>
            {refundedA > 0 && (
              <p className="od-refunded">
                <span>זוכה</span>
                <span>−₪{sh(refundedA)}</span>
              </p>
            )}
            {o.invoiceUrl && /^https:\/\//i.test(o.invoiceUrl) && (
              <a href={o.invoiceUrl} target="_blank" rel="noreferrer">
                🧾 חשבונית
              </a>
            )}
          </section>
        </div>

        <div className="adm-sheet-foot">
          {onHandled && (
            <button className="btn small" onClick={onHandled}>
              ✓ סימון טופלה
            </button>
          )}
          <button className="btn small ghost" onClick={onClose}>
            סגירה
          </button>
        </div>
      </div>
    </div>
  );
}
