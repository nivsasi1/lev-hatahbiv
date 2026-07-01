import "./design-bento.css";
import { Link } from "react-router-dom";
import {
  categories,
  products,
  productsByCategory,
  getProduct,
  getCategory,
  finalPrice,
  shekel,
  isOnSale,
  salePct,
  siteSettings,
  store,
  workshops,
  asset,
  Product,
  Category,
} from "../../data/catalog";
import { ProductThumb } from "../../components/ProductThumb";
import { ProductArt } from "../../components/ProductArt";

/* ---------------------------------------------------------------------------
   Design H — "Bento Gallery"

   The 2026 bento-grid trend: the whole homepage is one cohesive mosaic of
   rounded white tiles of varying spans — a big hero tile, a tall sale tile, a
   wide categories tile, and small story / workshops / visit tiles. Light,
   airy, editorial-tech. Modern indigo + coral accents on off-white paper, with
   subtle glass on the hero + story tiles (translucent white + backdrop blur,
   no feTurbulence). Mirrors MainHome's CONTENT; invents a dashboard-like LOOK.

   Everything reads from the catalog; zero props; single <main>.
   --------------------------------------------------------------------------- */

// up to 6 sale items — prefer manager-curated saleIds, else first on-sale rows
const saleItems: Product[] = (
  siteSettings.saleIds.length > 0
    ? siteSettings.saleIds
        .map((id) => getProduct(id))
        .filter((p): p is Product => Boolean(p) && isOnSale(p as Product))
    : products.filter(isOnSale)
).slice(0, 6);

// one sale tile — photo, crisp on-image discount pill, BIG sale-red price
const SaleTile = ({ p }: { p: Product }) => {
  const cat = getCategory(p.category);
  const pct = salePct(p);
  return (
    <Link to={`/product/${p.id}`} className="bt-sale-card">
      <div className="bt-sale-thumb">
        {pct > 0 && (
          <span className="bt-sale-badge" aria-hidden="true">
            {pct}%-
          </span>
        )}
        <ProductThumb product={p} />
      </div>
      <div className="bt-sale-info">
        {cat && (
          <span className="bt-sale-cat">
            <span className="bt-dot" style={{ background: cat.color }} />
            {cat.name}
          </span>
        )}
        <span className="bt-sale-name">{p.name}</span>
        <div className="bt-price-row">
          <span className="bt-price-now">{shekel(finalPrice(p))}</span>
          <span className="bt-price-was">{shekel(p.price)}</span>
          <span className="bt-sr">
            במחיר מבצע, הנחה של {pct} אחוז
          </span>
        </div>
      </div>
    </Link>
  );
};

export default function DesignBento() {
  return (
    <main className="dz-bento page-main">
      <div className="bt-shell">
        {/* ---------- TOP BENTO: hero + sale ---------- */}
        <div className="bt-grid bt-grid-top">
          {/* HERO tile (glass) — logo + headline + CTA */}
          <section className="bt-tile bt-hero" aria-labelledby="bt-hero-h">
            <div className="bt-hero-glass">
              <span className="bt-eyebrow">מאז {store.since} · רחובות</span>
              <h1 className="bt-hero-logo">
                <img
                  src={asset("/images/LevHatahbivLogo.png")}
                  alt="לב התחביב"
                  loading="lazy"
                />
              </h1>
              <p id="bt-hero-h" className="bt-hero-title display">
                כל יצירה מתחילה כאן
              </p>
              <p className="bt-hero-sub">
                צבעים, מכחולים, נייר וחוטים — חנות משפחתית עם כל מה שהידיים
                שלכם מחפשות, ועם עצה טובה ליד הקופה.
              </p>
              <div className="bt-hero-ctas">
                <Link
                  to={`/category/${categories[0].slug}`}
                  className="bt-btn solid"
                >
                  לעיון במדפים
                </Link>
                <a
                  href={store.waze}
                  target="_blank"
                  rel="noreferrer"
                  className="bt-btn line"
                >
                  ניווט לחנות ←
                </a>
              </div>
            </div>
          </section>

          {/* SALE tile — tall, holds up to ~6 items */}
          {saleItems.length > 0 && (
            <section className="bt-tile bt-sale" aria-labelledby="bt-sale-h">
              <div className="bt-tile-head">
                <div>
                  <span className="bt-eyebrow bt-eyebrow-red">On sale</span>
                  <h2 id="bt-sale-h" className="bt-h2">
                    במבצע עכשיו
                  </h2>
                </div>
                <Link to="/sale" className="bt-textlink">
                  לעוד מבצעים ←
                </Link>
              </div>
              <div className="bt-sale-grid">
                {saleItems.map((p) => (
                  <SaleTile key={p.id} p={p} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ---------- CATEGORIES BENTO — calm tint tiles w/ ProductArt ---------- */}
        <section className="bt-tile bt-cats" aria-labelledby="bt-cats-h">
          <div className="bt-tile-head">
            <div>
              <span className="bt-eyebrow">Collections</span>
              <h2 id="bt-cats-h" className="bt-h2">
                המדפים שלנו
              </h2>
            </div>
            <span className="bt-tile-note">
              שמונה משפחות של חומרים, לכל אחת פינה משלה
            </span>
          </div>
          <div className="bt-cats-grid">
            {categories.map((c: Category) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="bt-cat"
                style={
                  {
                    "--cc": c.color,
                    "--soft": c.soft,
                  } as any
                }
              >
                <span className="bt-cat-art" aria-hidden="true">
                  <ProductArt kind={c.art} color={c.color} />
                </span>
                <span className="bt-cat-text">
                  <h3 className="bt-cat-name">{c.name}</h3>
                  <span className="bt-cat-count">
                    {productsByCategory(c.slug).length} מוצרים ←
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ---------- LOWER BENTO: story + stat + workshops ---------- */}
        <div className="bt-grid bt-grid-mid">
          {/* STORY / QUOTE tile (glass wash) */}
          <section className="bt-tile bt-story">
            <span className="bt-quote-mark display" aria-hidden="true">
              &ldquo;
            </span>
            <h2 className="bt-story-h display">כל יצירה גדולה מתחילה בלב</h2>
            <p className="bt-story-p">
              לא רק קונים — מתייעצים, ממששים את הנייר, משווים גוונים מול האור,
              ויוצאים עם בדיוק מה שהפרויקט הבא צריך. מאז {store.since}, ברחובות.
            </p>
          </section>

          {/* STAT tile — the "since" badge */}
          <section className="bt-tile bt-stat">
            <span className="bt-stat-num display">{store.since}</span>
            <span className="bt-stat-label">
              שנת הפתיחה — חנות ציוד האמנות של רחובות
            </span>
          </section>

          {/* WORKSHOPS tile */}
          <section className="bt-tile bt-shop" aria-labelledby="bt-shop-h">
            <span className="bt-eyebrow">Workshops</span>
            <h2 id="bt-shop-h" className="bt-h2">
              חוגים וסדנאות
            </h2>
            <p className="bt-shop-intro">{workshops.intro}</p>
            <div className="bt-chips">
              {workshops.topics.map((t) => (
                <span key={t} className="bt-chip">
                  {t}
                </span>
              ))}
            </div>
            <div className="bt-shop-meta">
              <span className="bt-when">🗓 {workshops.schedule}</span>
              <a href={`tel:${workshops.contactTel}`} className="bt-btn solid">
                להרשמה: {workshops.contact}
              </a>
            </div>
          </section>
        </div>

        {/* ---------- VISIT BENTO: hours + contact ---------- */}
        <div className="bt-grid bt-grid-visit">
          <section className="bt-tile bt-visit">
            <h3 className="bt-h3">שעות פתיחה</h3>
            <table className="bt-hours">
              <tbody>
                {store.hours.map((h) => (
                  <tr key={h.days}>
                    <td>{h.days}</td>
                    <td>{h.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="bt-tile bt-contact">
            <h3 className="bt-h3">קופצים לבקר?</h3>
            <div className="bt-rows">
              <div>📍 {store.address}</div>
              <div>
                📞 <a href={`tel:${store.phone}`}>{store.phone}</a>
              </div>
              <div>
                ✉️ <a href={`mailto:${store.email}`}>{store.email}</a>
              </div>
            </div>
            <div className="bt-vactions">
              <a
                href={store.waze}
                target="_blank"
                rel="noreferrer"
                className="bt-btn solid"
              >
                פותחים Waze
              </a>
              <a
                href={store.maps}
                target="_blank"
                rel="noreferrer"
                className="bt-btn line"
              >
                מפת Google
              </a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
