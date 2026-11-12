import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Category,
  Product,
  COURIER_PRICE,
  FREE_SHIPPING_FROM,
  REDUCED_SHIPPING_FROM,
  REDUCED_SHIPPING_PRICE,
  getVariant,
  linePrice,
  shekel,
  slugOf,
  store,
  subPath,
  variantPricesVary,
} from "../data/catalog";
import { ProductThumb } from "../components/ProductThumb";
import "./product-phone.css";

/* ---------------------------------------------------------------------------
   The product page on a phone. ProductPage owns the state (quantity, chosen
   option, current photo, lightbox, description) and renders this in place of
   the two-column layout when the screen is phone-sized.

   Order: photo, name, price, options, description, delivery facts, questions,
   then "goes well with" as it always was. The buy bar stays pinned to the
   bottom of the screen, so "add to cart" is always in reach.
   --------------------------------------------------------------------------- */

type Props = {
  product: Product;
  category?: Category;
  qty: number;
  setQty: (next: (q: number) => number) => void;
  variantKey?: string;
  setVariantKey: (key: string) => void;
  imgIdx: number;
  setImgIdx: (i: number) => void;
  lightbox: boolean;
  openLightbox: () => void;
  descRef: { current: HTMLParagraphElement | null };
  descOverflows: boolean;
  descExpanded: boolean;
  toggleDesc: () => void;
  onAdd: () => void;
  children?: any; // "goes well with" + the lightbox, shared with the wide layout
};

// is a swatch colour light enough to need a dark tick on it?
const isLight = (css: string) => {
  let r = 0,
    g = 0,
    b = 0;
  const hex = css.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  const rgb = css.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, "$&$&") : hex[1];
    r = parseInt(h.slice(0, 2), 16);
    g = parseInt(h.slice(2, 4), 16);
    b = parseInt(h.slice(4, 6), 16);
  } else if (rgb) {
    r = +rgb[1];
    g = +rgb[2];
    b = +rgb[3];
  } else return true;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
};

const whatsapp = (text: string) =>
  `https://wa.me/${store.phoneIntl}?text=${encodeURIComponent(text)}`;

const Icon = ({ d, children }: { d?: string; children?: any }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    {d && <path d={d} />}
    {children}
  </svg>
);
const Tick = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="3"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M4 12l5 5L20 6" />
  </svg>
);
const WA = "M21 12a8 8 0 0 1-11.6 7.2L4 21l1.8-5.4A8 8 0 1 1 21 12z";

export const ProductPhone = ({
  product,
  category,
  qty,
  setQty,
  variantKey,
  setVariantKey,
  imgIdx,
  setImgIdx,
  lightbox,
  openLightbox,
  descRef,
  descOverflows,
  descExpanded,
  toggleDesc,
  onAdd,
  children,
}: Props) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const selVariant = getVariant(product, variantKey);
  const unitFull = selVariant ? selVariant.price : product.price;
  const unitNow = linePrice(product, variantKey);
  const saved = unitFull - unitNow;
  const selSoldOut = !product.soldOut && !!selVariant?.soldOut;

  const gallery = product.imgs ?? (product.img ? [product.img] : []);
  const hasGallery = gallery.length > 1;

  // the photos sit side by side in a scroll-snap strip; which one is showing
  // is read back from the scroll position (negative in RTL, hence abs)
  const onTrackScroll = () => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
    if (i !== imgIdx && i >= 0 && i < gallery.length) setImgIdx(i);
  };
  const scrollTrackTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollTo({ left: (rtl ? -1 : 1) * i * el.clientWidth });
  };
  // another product: back to its first photo
  useEffect(() => {
    scrollTrackTo(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);
  // the lightbox can step through the photos; on closing it, show the same
  // photo here and give focus back to the button that opened it
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !lightbox) {
      scrollTrackTo(imgIdx);
      zoomRef.current?.focus();
    }
    wasOpen.current = lightbox;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);

  // the bar's height → --pp-bar-h, so the accessibility button floats above it
  useEffect(() => {
    const bar = barRef.current;
    const root = document.documentElement;
    if (!bar || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() =>
      root.style.setProperty("--pp-bar-h", `${bar.offsetHeight}px`)
    );
    ro.observe(bar);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--pp-bar-h");
    };
  }, []);

  // ---- options ----
  const variants = product.variants ?? [];
  const asColors = variants.length > 0 && variants.every((v) => v.swatch);
  const sold = variants.filter((v) => v.soldOut);
  const optionsNote = asColors
    ? sold.length === 0
      ? `${variants.length} צבעים`
      : sold.length === 1
      ? `${sold[0].key} אזל`
      : `${sold.length} צבעים אזלו`
    : sold.length === 0
    ? ""
    : sold.length === 1
    ? "אפשרות אחת אזלה"
    : `${sold.length} מתוך ${variants.length} אזלו`;
  const chipPrices = variantPricesVary(product);

  const series = product.third && product.third !== "כללי" ? product.third : null;
  // line breaks inside a description are kept; stray ones at its ends are not
  const description = (product.description || "").trim();

  return (
    <main className="page-main pp">
      <div className="pp-body">
        <nav className="pp-crumbs" aria-label="פירורי לחם">
          <Link to="/">ראשי</Link> ‹{" "}
          <Link to={`/category/${product.category}`}>{category?.name}</Link> ‹{" "}
          <Link to={subPath(product.category, product.sub)}>{product.sub}</Link>
        </nav>

        <div
          className="pp-stage"
          style={{ "--pp-soft": category?.soft } as any}
        >
          {gallery.length > 0 ? (
            <div
              className="pp-track"
              ref={trackRef}
              onScroll={onTrackScroll}
              onClick={openLightbox}
            >
              {gallery.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt={i === 0 ? product.name : `${product.name} — תמונה ${i + 1}`}
                  loading={i === 0 ? undefined : "lazy"}
                />
              ))}
            </div>
          ) : (
            <div className="pp-art">
              <ProductThumb product={product} />
            </div>
          )}

          {product.soldOut ? (
            <span className="pp-flag out">אזל מהמלאי</span>
          ) : (
            saved > 0 && (
              <span className="pp-flag sale">
                <span>מבצע</span>
                <bdi dir="ltr">-{Math.round((saved / unitFull) * 100)}%</bdi>
              </span>
            )
          )}

          {hasGallery && (
            <>
              <span className="pp-count" aria-label={`תמונה ${imgIdx + 1} מתוך ${gallery.length}`}>
                <bdi dir="ltr">
                  {imgIdx + 1} / {gallery.length}
                </bdi>
              </span>
              {gallery.length <= 8 && (
                <div className="pp-dots" aria-hidden="true">
                  {gallery.map((src, i) => (
                    <i key={src} className={i === imgIdx ? "on" : ""} />
                  ))}
                </div>
              )}
            </>
          )}

          {gallery.length > 0 && (
            <button
              type="button"
              className="pp-zoom"
              ref={zoomRef}
              aria-label="הגדלת התמונה"
              onClick={openLightbox}
            >
              <Icon d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </button>
          )}
        </div>

        <h1 className="pp-title" dir="auto">
          {product.name}
        </h1>
        {series && (
          <p className="pp-series">
            מהסדרה{" "}
            <Link to={`${subPath(product.category, product.sub)}?third=${slugOf(series)}`}>
              {series}
            </Link>
          </p>
        )}

        <div className="pp-price">
          <span className="now">
            <bdi dir="ltr">{shekel(unitNow)}</bdi>
          </span>
          {saved > 0 && (
            <>
              <s>
                <bdi dir="ltr">{shekel(unitFull)}</bdi>
              </s>
              <span className="save">
                <span>חוסכים</span>
                <bdi dir="ltr">{shekel(saved)}</bdi>
              </span>
            </>
          )}
          {variants.length > 0 && !chipPrices && (
            <span className="same">
              {asColors ? "אותו מחיר בכל הצבעים" : "אותו מחיר בכל האפשרויות"}
            </span>
          )}
        </div>

        {variants.length > 0 && (
          <div className="pp-options">
            <div className="pp-options-head">
              <p id="pp-opt-label">
                {product.variantLabel || "אפשרות"}: <b>{selVariant?.key ?? "בחרו"}</b>
              </p>
              {optionsNote && <span>{optionsNote}</span>}
            </div>
            {asColors ? (
              <div className="pp-swatches" role="radiogroup" aria-labelledby="pp-opt-label">
                {variants.map((v) => {
                  const on = v.key === variantKey;
                  return (
                    <button
                      key={v.key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={v.soldOut ? `${v.key}, אזל מהמלאי` : v.key}
                      className={`pp-swatch ${on ? "on" : ""} ${v.soldOut ? "oos" : ""} ${
                        isLight(v.swatch!) ? "light" : "dark"
                      }`}
                      style={{ "--sw": v.swatch } as any}
                      onClick={() => setVariantKey(v.key)}
                    >
                      {on && !v.soldOut && <Tick />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="pp-chips" role="radiogroup" aria-labelledby="pp-opt-label">
                {variants.map((v) => {
                  const on = v.key === variantKey;
                  return (
                    <button
                      key={v.key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={`pp-chip ${on ? "on" : ""} ${v.soldOut ? "oos" : ""}`}
                      onClick={() => setVariantKey(v.key)}
                    >
                      <span className="nm">
                        {on && !v.soldOut && <Tick />}
                        {v.swatch && <i style={{ background: v.swatch }} aria-hidden="true" />}
                        <span>{v.key}</span>
                      </span>
                      {v.soldOut ? (
                        <small>אזל</small>
                      ) : (
                        chipPrices && (
                          <small>
                            <bdi dir="ltr">{shekel(v.salePrice ?? v.price)}</bdi>
                          </small>
                        )
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {(description || product.sku) && (
          <div className="pp-desc-wrap">
            {description && (
              <p
                ref={descRef as any}
                className={`pp-desc ${descOverflows && !descExpanded ? "clamped" : ""}`}
              >
                {description}
              </p>
            )}
            {(descOverflows || product.sku) && (
              <div className="pp-desc-foot">
                {descOverflows && (
                  <button
                    type="button"
                    className="pp-more"
                    aria-expanded={descExpanded}
                    onClick={toggleDesc}
                  >
                    {descExpanded ? "הצג פחות" : "קרא עוד"}
                    <Icon d={descExpanded ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
                  </button>
                )}
                {product.sku && (
                  <span className="pp-sku">
                    מק״ט <bdi dir="ltr">{product.sku}</bdi>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <ul className="pp-info" aria-label="משלוח, איסוף והחזרות">
          {product.pickupOnly ? (
            <li className="only">
              <Icon>
                <path d="M4 10v10h16V10" />
                <path d="M3 10l2-6h14l2 6z" />
                <path d="M10 20v-5h4v5" />
              </Icon>
              <span>
                נמכר באיסוף עצמי מהחנות בלבד
                <small>{store.address} · לא נשלח במשלוח</small>
              </span>
            </li>
          ) : (
            <>
              <li>
                <Icon>
                  <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
                  <circle cx="7" cy="18" r="2" />
                  <circle cx="17" cy="18" r="2" />
                </Icon>
                <span>
                  משלוח <bdi dir="ltr">{shekel(COURIER_PRICE)}</bdi> ·{" "}
                  <bdi dir="ltr">{shekel(REDUCED_SHIPPING_PRICE)}</bdi> מעל{" "}
                  <bdi dir="ltr">{shekel(REDUCED_SHIPPING_FROM)}</bdi> · חינם מעל{" "}
                  <bdi dir="ltr">{shekel(FREE_SHIPPING_FROM)}</bdi>
                  <small>עד הבית תוך {store.courierEta}</small>
                </span>
              </li>
              <li>
                <Icon>
                  <path d="M4 10v10h16V10" />
                  <path d="M3 10l2-6h14l2 6z" />
                  <path d="M10 20v-5h4v5" />
                </Icon>
                <span>איסוף חינם מהחנות · {store.address}</span>
              </li>
            </>
          )}
          {product.noCoupon && (
            <li>
              <Icon>
                <path d="M20 12l-8 8-9-9V4h7z" />
                <circle cx="7.5" cy="7.5" r="1.5" />
              </Icon>
              <span>המוצר לא משתתף בהנחות קופון</span>
            </li>
          )}
          <li>
            <Icon>
              <path d="M4 12a8 8 0 1 0 3-6.2" />
              <path d="M4 4v5h5" />
            </Icon>
            <span>
              אפשר להחזיר תוך 14 ימים · <Link to="/returns">התנאים</Link>
            </span>
          </li>
        </ul>

        <div className="pp-ask">
          <a
            href={whatsapp(`היי, יש לי שאלה על המוצר: ${product.name}`)}
            target="_blank"
            rel="noreferrer"
          >
            <Icon d={WA} />
            שאלה בוואטסאפ
          </a>
          <a href={`tel:${store.phone}`}>
            <Icon d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
            <bdi dir="ltr">{store.phone}</bdi>
          </a>
        </div>
      </div>

      {children}

      <div className="pp-bar" ref={barRef}>
        {product.soldOut ? (
          <>
            <span className="pp-bar-out">אזל מהמלאי</span>
            <a
              className="pp-bar-ask"
              href={whatsapp(`היי, מתי חוזר למלאי: ${product.name}?`)}
              target="_blank"
              rel="noreferrer"
            >
              <Icon d={WA} />
              מתי חוזר? שאלו בוואטסאפ
            </a>
          </>
        ) : selSoldOut ? (
          <p className="pp-buy off" role="status">
            {selVariant!.key} אזל · בחרו {asColors ? "צבע אחר" : "אפשרות אחרת"}
          </p>
        ) : (
          <>
            <div className="pp-qty" role="group" aria-label="כמות">
              <button type="button" aria-label="הוספת כמות" onClick={() => setQty((q) => q + 1)}>
                +
              </button>
              <output aria-live="polite">{qty}</output>
              <button
                type="button"
                aria-label="הפחתת כמות"
                disabled={qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                −
              </button>
            </div>
            <button
              type="button"
              className="pp-buy"
              disabled={variants.length > 0 && !variantKey}
              onClick={onAdd}
            >
              {selVariant?.swatch && (
                <i style={{ background: selVariant.swatch }} aria-hidden="true" />
              )}
              <span>הוספה לעגלה</span>
              <span aria-hidden="true">·</span>
              <bdi dir="ltr">{shekel(unitNow * qty)}</bdi>
            </button>
          </>
        )}
      </div>
    </main>
  );
};
