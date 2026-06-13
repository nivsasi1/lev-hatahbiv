import { useState, useEffect } from "react";
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

export const ProductPage = () => {
  const { id } = useParams();
  const { add } = useCart();
  const [qty, setQtyLocal] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    setQtyLocal(1);
    setImgIdx(0);
  }, [id]);

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
  const related = productsByCategory(product.category)
    .filter((p) => p.id !== product.id)
    .slice(0, 4);
  const saved = product.salePrice ? product.price - product.salePrice : 0;
  const gallery = product.imgs ?? (product.img ? [product.img] : []);
  const hasGallery = gallery.length > 1;
  const step = (d: number) =>
    setImgIdx((i) => (i + d + gallery.length) % gallery.length);

  return (
    <main className="page-main">
      <div className="shell">
        <div className="product-view">
          <div className="product-stage-wrap">
            <div
              className={`product-stage ${product.img ? "photo" : ""} ${product.soldOut ? "soldout" : ""}`}
              style={{ "--pv-soft": category?.soft } as any}
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
                  <button className="stage-arrow next" onClick={() => step(1)} aria-label="התמונה הבאה">
                    ‹
                  </button>
                  <button className="stage-arrow prev" onClick={() => step(-1)} aria-label="התמונה הקודמת">
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
            {product.description && <p className="desc">{product.description}</p>}

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
              <div className="section-titles">
                <span className="eyebrow">מהמדף שלכם</span>
                <h2 className="display">משתלב יפה עם</h2>
              </div>
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
    </main>
  );
};
