import "./design-dark.css";
import { Link } from "react-router-dom";
import {
  categories,
  products,
  productsByCategory,
  getProduct,
  getCategory,
  finalPrice,
  shekel,
  siteSettings,
  store,
  workshops,
  asset,
  isOnSale,
  salePct,
  Product,
  Category,
} from "../../data/catalog";
import { ProductThumb } from "../../components/ProductThumb";
import { ProductArt } from "../../components/ProductArt";

/* ---------------------------------------------------------------------------
   Design D — "Dark Studio"

   A moody, premium gallery on a near-black canvas — a lit art studio at night.
   The CALM one: minimal motion, generous negative space, the work glows.
   Mirrors MainHome's CONTENT (hero, sale, collections, story, workshops,
   visit) but restyles it dark. Self-contained, zero props, reads from catalog.
   --------------------------------------------------------------------------- */

// up to 6 sale items — prefer manager-curated saleIds, else first on-sale rows.
// isOnSale/salePct are the shared source of truth — never re-derive here.
const saleItems: Product[] = (
  siteSettings.saleIds.length > 0
    ? siteSettings.saleIds
        .map((id) => getProduct(id))
        .filter((p): p is Product => Boolean(p) && isOnSale(p as Product))
    : products.filter(isOnSale)
).slice(0, 6);

// A dark sale card — soft inner glow, BIG red discounted price, muted struck
// original, and a gold-outlined red pill badge on the image.
const SaleCard = ({ p }: { p: Product }) => {
  const cat = getCategory(p.category);
  const pct = salePct(p);
  return (
    <Link to={`/product/${p.id}`} className="dz-sale-card">
      <div className="dz-thumb">
        {pct > 0 && (
          <span className="dz-badge" aria-hidden="true">
            {pct}%-
          </span>
        )}
        <ProductThumb product={p} />
      </div>
      <div className="dz-sale-body">
        {cat && (
          <span className="dz-sale-cat">
            <span className="dz-sale-cat-dot" style={{ background: cat.color }} />
            {cat.name}
          </span>
        )}
        <span className="dz-sale-name">{p.name}</span>
        <div className="dz-price-row">
          <span className="dz-price-now">{shekel(finalPrice(p))}</span>
          <span className="dz-price-was">{shekel(p.price)}</span>
          <span className="dz-sr-only">
            במחיר מבצע, הנחה של {pct} אחוז
          </span>
        </div>
      </div>
    </Link>
  );
};

export default function DesignDark() {
  return (
    <main className="dz-dark page-main">
      {/* ---------- HERO — dark field, softly-lit logo ---------- */}
      <section className="dz-hero">
        <div className="dz-hero-glow" aria-hidden="true" />
        <div className="dz-shell">
          <span className="dz-hero-eyebrow">Est. {store.since} · Rehovot</span>
          <h1 className="dz-hero-logo">
            <img
              src={asset("/images/LevHatahbivLogo.png")}
              alt="לב התחביב"
              loading="lazy"
            />
          </h1>
          <p className="dz-hero-title display">כל יצירה מתחילה כאן</p>
          <p className="dz-hero-sub">
            צבעים, מכחולים, נייר וחוטים — חנות משפחתית עם כל מה שהידיים שלכם
            מחפשות, ועם עצה טובה ליד הקופה.
          </p>
          <div className="dz-hero-ctas">
            <Link to={`/category/${categories[0].slug}`} className="dz-btn solid">
              לעיון במדפים
            </Link>
            <a
              href={store.waze}
              target="_blank"
              rel="noreferrer"
              className="dz-btn line"
            >
              ניווט לחנות ←
            </a>
          </div>
        </div>
      </section>

      {/* ---------- SALE — high up, right after hero ---------- */}
      {saleItems.length > 0 && (
        <section className="dz-sale">
          <div className="dz-shell">
            <div className="dz-head-row">
              <div className="dz-sec-head">
                <span className="dz-eyebrow">On sale</span>
                <h2 className="dz-h2 display">במבצע עכשיו</h2>
              </div>
              <Link to="/sale" className="dz-textlink">
                לעוד מבצעים ←
              </Link>
            </div>
            <div className="dz-sale-grid">
              {saleItems.map((p) => (
                <SaleCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- COLLECTIONS — calm grid of dark tiles + tinted art glow ---------- */}
      <section className="dz-cats">
        <div className="dz-shell">
          <div className="dz-sec-head">
            <span className="dz-eyebrow">Collections</span>
            <h2 className="dz-h2 display">המדפים שלנו</h2>
            <p className="dz-lead">
              שמונה משפחות של חומרים, כל אחת עם פינה משלה בחנות.
            </p>
          </div>
          <div className="dz-cats-grid">
            {categories.map((c: Category) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="dz-tile"
                style={{ "--cc": c.color } as any}
              >
                <span className="dz-tile-glow" aria-hidden="true" />
                <span className="dz-tile-art" aria-hidden="true">
                  <ProductArt kind={c.art} color={c.color} />
                </span>
                <h3 className="dz-tile-name display">{c.name}</h3>
                <span className="dz-tile-count">
                  {productsByCategory(c.slug).length} מוצרים ←
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- QUOTE / STORY band — glowing, centered ---------- */}
      <section className="dz-quote">
        <div className="dz-shell">
          <span className="dz-quote-mark display" aria-hidden="true">
            “
          </span>
          <h2 className="display">כל יצירה גדולה מתחילה בלב</h2>
          <p>
            לא רק קונים — מתייעצים, ממששים את הנייר, משווים גוונים מול האור,
            ויוצאים עם בדיוק מה שהפרויקט הבא צריך. מאז {store.since}, ברחובות.
          </p>
        </div>
      </section>

      {/* ---------- WORKSHOPS — two-column, no price ---------- */}
      <section className="dz-shop-sec">
        <div className="dz-shell">
          <div className="dz-shop">
            <div className="dz-shop-body">
              <span className="dz-eyebrow">Workshops</span>
              <h2 className="dz-h2 display">חוגים וסדנאות</h2>
              <p className="dz-lead">{workshops.intro}</p>
              <div className="dz-chips">
                {workshops.topics.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <div className="dz-shop-meta">
                <span className="dz-shop-when">🗓 {workshops.schedule}</span>
                <a href={`tel:${workshops.contactTel}`} className="dz-btn solid">
                  להרשמה: {workshops.contact}
                </a>
              </div>
            </div>
            <div className="dz-shop-art" aria-hidden="true">
              {categories.slice(0, 4).map((c) => (
                <span
                  key={c.slug}
                  className="dz-mini"
                  style={{ "--cc": c.color } as any}
                >
                  <ProductArt kind={c.art} color={c.color} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- VISIT — hours + contact, dark cards ---------- */}
      <section className="dz-visit-sec">
        <div className="dz-shell">
          <div className="dz-visit">
            <div className="dz-vcard">
              <h3 className="display">שעות פתיחה</h3>
              <table>
                <tbody>
                  {store.hours.map((h) => (
                    <tr key={h.days}>
                      <td>{h.days}</td>
                      <td>{h.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="dz-vcard">
              <h3 className="display">קופצים לבקר?</h3>
              <div className="dz-rows">
                <div>📍 {store.address}</div>
                <div>
                  📞 <a href={`tel:${store.phone}`}>{store.phone}</a>
                </div>
                <div>
                  ✉️ <a href={`mailto:${store.email}`}>{store.email}</a>
                </div>
              </div>
              <div className="dz-vactions">
                <a
                  href={store.waze}
                  target="_blank"
                  rel="noreferrer"
                  className="dz-btn solid"
                >
                  פותחים Waze
                </a>
                <a
                  href={store.maps}
                  target="_blank"
                  rel="noreferrer"
                  className="dz-btn line"
                >
                  מפת Google
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
