import { Link } from "react-router-dom";
import {
  categories,
  products,
  productsByCategory,
  getProduct,
  siteSettings,
  store,
  workshops,
} from "../data/catalog";
import { ProductCard } from "../components/ProductCard";
import { ProductArt } from "../components/ProductArt";
import "./home-risozine.css";

/* ---------- featured / sale picks (same rules as the base homepage) ---------- */
const heuristicFeatured = ["paints", "brushes", "drawing", "paper", "craft", "fiber"]
  .map((slug) =>
    products.find(
      (p) =>
        p.category === slug &&
        p.img &&
        p.description.length > 40 &&
        /[֐-׿]/.test(p.name)
    )
  )
  .filter((p): p is NonNullable<typeof p> => Boolean(p));

const featured =
  siteSettings.featuredIds.length > 0
    ? siteSettings.featuredIds
        .map((id) => getProduct(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
    : heuristicFeatured;

const onSale = (p: { salePrice?: number; soldOut?: boolean; img?: string }) =>
  Boolean(p.salePrice && !p.soldOut && p.img);

const fresh =
  siteSettings.saleIds.length > 0
    ? siteSettings.saleIds
        .map((id) => getProduct(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p) && onSale(p!))
    : products.filter(onSale).slice(0, 4);

const ribbon = siteSettings.ribbonTexts;

export default () => (
  <main className="rz-home">
    {/* ---------- hero ---------- */}
    <section className="rz-hero">
      <span className="rz-shape c1" aria-hidden="true" />
      <span className="rz-shape c2" aria-hidden="true" />
      <span className="rz-shape tri" aria-hidden="true" />
      <div className="rz-shell rz-hero-inner">
        <span className="rz-stamp">חנות האמנות של רחובות · מאז {store.since}</span>
        <h1>לב התחביב</h1>
        <p className="rz-lead">
          צבעים, מכחולים, נייר וחוטים — חנות משפחתית מודפסת בכל הצבעים, עם אלפי
          פריטים ועצה טובה ליד הקופה.
        </p>
        <div className="rz-ctas">
          <Link to={`/category/${categories[0].slug}`} className="rz-btn pink">
            לדפדף במדפים ✦
          </Link>
          <a href={store.waze} target="_blank" rel="noreferrer" className="rz-btn yellow">
            ניווט לחנות
          </a>
        </div>
      </div>
    </section>

    {/* ---------- printed strip ---------- */}
    <div className="rz-strip">
      <div className="rz-track">
        {[0, 1].map((dup) => (
          <span key={dup}>
            {ribbon.map((t, j) => (
              <span key={j} style={{ gap: 0 }}>{t}</span>
            ))}
          </span>
        ))}
      </div>
    </div>

    {/* ---------- category sticker collage ---------- */}
    <section className="rz-sec">
      <div className="rz-shell">
        <div className="rz-sec-head">
          <h2>המדפים שלנו</h2>
        </div>
        <div className="rz-cats">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              className="rz-cat"
              style={{ "--cc": c.color } as any}
            >
              <span className="rz-orb rz-half" aria-hidden="true">
                <ProductArt kind={c.art} color={c.color} />
              </span>
              <h3>{c.name}</h3>
              <p>{c.blurb}</p>
              <span className="rz-count">{productsByCategory(c.slug).length} מוצרים</span>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* ---------- featured ---------- */}
    {featured.length > 0 && (
      <section className="rz-sec">
        <div className="rz-shell">
          <div className="rz-sec-head">
            <h2>נבחרים מהמדפים</h2>
          </div>
          <div className="rz-grid">
            {featured.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- on sale ---------- */}
    {fresh.length > 0 && (
      <section className="rz-sec">
        <div className="rz-shell">
          <div className="rz-sec-head">
            <h2>במבצע עכשיו</h2>
          </div>
          <div className="rz-grid">
            {fresh.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- workshops zine page ---------- */}
    <section className="rz-sec">
      <div className="rz-shell">
        <div className="rz-shop">
          <span className="rz-half" aria-hidden="true" />
          <h2>חוגים וסדנאות</h2>
          <p className="intro">{workshops.intro}</p>
          <div className="rz-chips">
            {workshops.topics.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="rz-shop-meta">
            <span className="rz-m">🗓 {workshops.schedule}</span>
            <span className="rz-m">💰 {workshops.price}</span>
            <a href={`tel:${store.phone}`} className="rz-btn yellow">
              להרשמה: {store.phone}
            </a>
          </div>
        </div>
      </div>
    </section>

    {/* ---------- visit notes ---------- */}
    <section className="rz-sec">
      <div className="rz-shell rz-visit">
        <div className="rz-note">
          <h3>שעות פתיחה</h3>
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
        <div className="rz-note">
          <h3>קופצים לבקר?</h3>
          <div className="rz-rows">
            <div>📍 {store.address}</div>
            <div>
              📞 <a href={`tel:${store.phone}`}>{store.phone}</a>
            </div>
            <div>
              ✉️ <a href={`mailto:${store.email}`}>{store.email}</a>
            </div>
          </div>
          <div className="rz-vactions">
            <a href={store.waze} target="_blank" rel="noreferrer" className="rz-btn pink">
              פותחים Waze
            </a>
            <a href={store.maps} target="_blank" rel="noreferrer" className="rz-btn yellow">
              מפת Google
            </a>
          </div>
        </div>
      </div>
    </section>
  </main>
);
