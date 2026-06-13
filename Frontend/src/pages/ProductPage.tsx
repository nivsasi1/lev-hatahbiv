import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getProduct,
  getCategory,
  productsByCategory,
  finalPrice,
  shekel,
  FREE_SHIPPING_FROM,
  store,
} from "../data/catalog";
import { useCart } from "../context/cart-context";
import { ProductCard } from "../components/ProductCard";
import { ProductThumb } from "../components/ProductThumb";
import "./product-lightbox.css";

export const ProductPage = () => {
  const { id } = useParams();
  const { add } = useCart();
  const [qty, setQtyLocal] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setQtyLocal(1);
    setImgIdx(0);
    setLightbox(false);
    setDescExpanded(false);
  }, [id]);

  // Show "read more" only when the description ACTUALLY exceeds ~5 lines.
  // Measured (not char-counted): temporarily drop the clamp, compare the full
  // text height to 5 line-heights. Runs before paint so there's no flash.
  useLayoutEffect(() => {
    const el = descRef.current;
    if (!el) {
      setDescOverflows(false);
      return;
    }
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 24;
    const had = el.classList.contains("clamped");
    el.classList.remove("clamped");
    const full = el.scrollHeight;
    if (had) el.classList.add("clamped");
    setDescOverflows(full > lh * 5 + 4);
  }, [id]);

  // Lock body scroll, handle Escape, and manage focus while the lightbox is open.
  useEffect(() => {
    if (!lightbox) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
    };
    document.addEventListener("keydown", onKey);
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      // Restore focus to the trigger image when closing.
      stageRef.current?.focus();
    };
  }, [lightbox]);

  const product = getProduct(id ?? "");
  if (!product) {
    return (
      <main className="page-main shell">
        <p className="empty-note">
          המוצר הזה כנראה נמכר עד הטיפה האחרונה... <Link to="/">חזרה לחנות ←</Link>
        </p>
      </main>
    );
  }

  const category = getCategory(product.category);
  // "goes well with" — most relevant first: same sub-category, then fill from
  // the rest of the category, up to 5.
  const inCategory = productsByCategory(product.category).filter(
    (p) => p.id !== product.id
  );
  const related = [
    ...inCategory.filter((p) => p.sub === product.sub),
    ...inCategory.filter((p) => p.sub !== product.sub),
  ].slice(0, 5);
  const saved = product.salePrice ? product.price - product.salePrice : 0;
  const gallery = product.imgs ?? (product.img ? [product.img] : []);
  const hasGallery = gallery.length > 1;
  const canZoom = gallery.length > 0;
  const step = (d: number) =>
    setImgIdx((i) => (i + d + gallery.length) % gallery.length);

  return (
    <main className="page-main">
      <div className="shell">
        <div className="product-view">
          <div className="product-stage-wrap">
            <div
              ref={stageRef}
              className={`product-stage ${product.img ? "photo" : ""} ${product.soldOut ? "soldout" : ""} ${canZoom ? "zoomable" : ""}`}
              style={{ "--pv-soft": category?.soft } as any}
              {...(canZoom
                ? {
                    role: "button" as const,
                    tabIndex: 0,
                    "aria-label": `הגדלת התמונה — ${product.name}`,
                    onClick: () => setLightbox(true),
                    onKeyDown: (e: any) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setLightbox(true);
                      }
                    },
                  }
                : {})}
            >
              {gallery.length > 0 ? (
                gallery.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt={i === 0 ? product.name : `${product.name} — תמונה ${i + 1}`}
                    className={`stage-img ${i === imgIdx ? "on" : ""}`}
                  />
                ))
              ) : (
                <ProductThumb product={product} />
              )}
              {hasGallery && (
                <>
                  <button
                    className="stage-arrow next"
                    onClick={(e) => {
                      e.stopPropagation();
                      step(1);
                    }}
                    aria-label="התמונה הבאה"
                  >
                    ‹
                  </button>
                  <button
                    className="stage-arrow prev"
                    onClick={(e) => {
                      e.stopPropagation();
                      step(-1);
                    }}
                    aria-label="התמונה הקודמת"
                  >
                    ›
                  </button>
                </>
              )}
              {saved > 0 && !product.soldOut && (
                <div className="sale-aqua" aria-hidden="true">
                  <span>
                    מבצע <b>{Math.round((saved / product.price) * 100)}%-</b>
                  </span>
                </div>
              )}
              {product.soldOut && <div className="oos-strip">אזל מהמלאי</div>}
            </div>
            {hasGallery && (
              <div className="stage-thumbs" role="tablist" aria-label="תמונות המוצר">
                {gallery.map((src, i) => (
                  <button
                    key={src}
                    className={i === imgIdx ? "on" : ""}
                    onClick={() => setImgIdx(i)}
                    aria-label={`תמונה ${i + 1}`}
                    aria-selected={i === imgIdx}
                    role="tab"
                  >
                    <img src={src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-info">
            <div className="crumbs">
              <Link to="/">ראשי</Link> ‹{" "}
              <Link to={`/category/${product.category}`}>{category?.name}</Link>{" "}
              ‹{" "}
              <Link
                to={`/category/${product.category}/${encodeURIComponent(product.sub)}`}
              >
                {product.sub}
              </Link>
            </div>
            <h1 className="display">{product.name}</h1>
            {product.description && (
              <div className="desc-wrap">
                <p
                  ref={descRef}
                  className={`desc ${
                    descOverflows && !descExpanded ? "clamped" : ""
                  }`}
                >
                  {product.description}
                </p>
                {descOverflows && (
                  <button
                    type="button"
                    className="desc-toggle"
                    aria-expanded={descExpanded}
                    onClick={() => setDescExpanded((v) => !v)}
                  >
                    {descExpanded ? "הצג פחות ▲" : "קרא עוד ▼"}
                  </button>
                )}
              </div>
            )}

            <div className="product-price">
              <span className="now">{shekel(finalPrice(product))}</span>
              {product.salePrice && (
                <>
                  <span className="was">{shekel(product.price)}</span>
                  <span className="save">חוסכים {shekel(saved)}</span>
                </>
              )}
            </div>

            {product.soldOut ? (
              <div className="qty-row">
                <span className="oos-note">אזל מהמלאי — מוזמנים להתקשר ולבדוק מתי יחזור ☎</span>
              </div>
            ) : (
              <div className="qty-row">
                <div className="qty">
                  <button onClick={() => setQtyLocal((q) => q + 1)} aria-label="הוספה">
                    +
                  </button>
                  <span>{qty}</span>
                  <button
                    onClick={() => setQtyLocal((q) => Math.max(1, q - 1))}
                    aria-label="הפחתה"
                  >
                    −
                  </button>
                </div>
                <button
                  className="btn"
                  style={{ "--btn-pop": category?.color } as any}
                  onClick={() => add(product, qty)}
                >
                  הוספה לעגלה 🛒
                </button>
              </div>
            )}

            <div className="product-meta">
              {product.pickupOnly && (
                <span>
                  🏷️ <b>שימו לב:</b> המוצר זמין באיסוף עצמי מהחנות בלבד
                </span>
              )}
              <span>
                🚚 משלוח חינם בקנייה מעל <b>{shekel(FREE_SHIPPING_FROM)}</b>
              </span>
              <span>
                🏠 איסוף עצמי חינם מהחנות — <b>{store.address}</b>
              </span>
              <span>
                ☎ שאלות על המוצר? <b>{store.phone}</b>
              </span>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="related">
            <div className="section-head">
              <h2 className="display">משתלב יפה עם</h2>
              <div className="scribble" />
              <Link to={`/category/${product.category}`} className="more">
                לכל המדף ←
              </Link>
            </div>
            <div className="product-grid">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {lightbox && canZoom && (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={product.name}
          onClick={() => setLightbox(false)}
        >
          <button
            ref={closeBtnRef}
            className="lightbox-close"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(false);
            }}
            aria-label="סגירת התמונה"
          >
            ✕
          </button>

          {hasGallery && (
            <>
              <button
                className="lightbox-arrow next"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="התמונה הבאה"
              >
                ‹
              </button>
              <button
                className="lightbox-arrow prev"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="התמונה הקודמת"
              >
                ›
              </button>
            </>
          )}

          <div className="lightbox-frame">
            <img
              className="lightbox-img"
              src={gallery[imgIdx]}
              alt={product.name}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {hasGallery && (
            <div className="lightbox-count" aria-hidden="true">
              {imgIdx + 1} / {gallery.length}
            </div>
          )}
        </div>
      )}
    </main>
  );
};
