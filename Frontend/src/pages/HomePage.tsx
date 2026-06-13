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
import "./home-bauhaus.css";

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

export const HomePage = () => (
  <main className="bh-home">
    {/* ---------- hero ---------- */}
    <section className="bh-hero">
      <span className="bh-deco dot" aria-hidden="true" />
      <span className="bh-deco ring" aria-hidden="true" />
      <div className="bh-shell bh-hero-grid">
        <div className="bh-hero-copy">
          <span className="bh-tag">חנות האמנות של רחובות · מאז {store.since}</span>
          <h1>
            לב <span className="r">ה</span>תח<span className="b">ביב</span>
          </h1>
          <p className="bh-lead">
            צבעים, מכחולים, נייר וחוטים — צורה, צבע ופונקציה. חנות משפחתית עם
            אלפי פריטים ועצה טובה ליד הקופה.
          </p>
          <div className="bh-ctas">
            <Link to={`/category/${categories[0].slug}`} className="bh-btn red">
              לכל המדפים ←
            </Link>
            <a href={store.waze} target="_blank" rel="noreferrer" className="bh-btn yellow">
              ניווט לחנות
            </a>
          </div>
        </div>

        <div className="bh-hero-art" aria-hidden="true">
          <span className="q-yellow q-circle" />
          <span className="q-red q-tri" />
          <span className="q-blue q-arch" />
          <span className="q-yellow" />
        </div>
      </div>
    </section>

    <div className="bh-zig" aria-hidden="true" />

    {/* ---------- category geometric blocks ---------- */}
    <section className="bh-sec">
      <div className="bh-shell">
        <div className="bh-sec-head">
          <span className="bh-mark circle" />
          <h2>המדפים שלנו</h2>
        </div>
        <div className="bh-cats">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              className="bh-cat"
              style={{ "--cc": c.color } as any}
            >
              <span className="bh-cat-art" aria-hidden="true">
                <ProductArt kind={c.art} color={c.color} />
              </span>
              <div>
                <h3>{c.name}</h3>
                <p>{c.blurb}</p>
              </div>
              <span className="bh-count">{productsByCategory(c.slug).length} מוצרים ←</span>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* ---------- ticker ---------- */}
    <div className="bh-ticker">
      <div className="bh-track">
        {[0, 1].map((dup) => (
          <span key={dup}>
            {ribbon.map((t, j) => (
              <span key={j} style={{ gap: 0 }}>{t}</span>
            ))}
          </span>
        ))}
      </div>
    </div>

    {/* ---------- featured ---------- */}
    {featured.length > 0 && (
      <section className="bh-sec">
        <div className="bh-shell">
          <div className="bh-sec-head">
            <span className="bh-mark" />
            <h2>נבחרים מהמדפים</h2>
          </div>
          <div className="bh-grid">
            {featured.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- on sale ---------- */}
    {fresh.length > 0 && (
      <section className="bh-sec">
        <div className="bh-shell">
          <div className="bh-sec-head">
            <span className="bh-mark tri" />
            <h2>במבצע עכשיו</h2>
          </div>
          <div className="bh-grid">
            {fresh.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- workshops ---------- */}
    <section className="bh-sec">
      <div className="bh-shell">
        <div className="bh-shop">
          <div className="bh-shop-side">
            <h2>חוגים וסדנאות</h2>
            <p>{workshops.intro}</p>
          </div>
          <div className="bh-shop-main">
            <div className="bh-chips">
              {workshops.topics.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="bh-shop-meta">
              <span className="bh-m">🗓 {workshops.schedule}</span>
              <span className="bh-m">💰 {workshops.price}</span>
              <a href={`tel:${store.phone}`} className="bh-btn blue">
                להרשמה: {store.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ---------- visit ---------- */}
    <section className="bh-sec" style={{ paddingTop: 0 }}>
      <div className="bh-shell">
        <div className="bh-visit">
          <div className="bh-vcard">
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
          <div className="bh-vcard">
            <h3>קופצים לבקר?</h3>
            <div className="bh-rows">
              <div>📍 {store.address}</div>
              <div>
                📞 <a href={`tel:${store.phone}`}>{store.phone}</a>
              </div>
              <div>
                ✉️ <a href={`mailto:${store.email}`}>{store.email}</a>
              </div>
            </div>
            <div className="bh-vactions">
              <a href={store.waze} target="_blank" rel="noreferrer" className="bh-btn red">
                פותחים Waze
              </a>
              <a href={store.maps} target="_blank" rel="noreferrer" className="bh-btn yellow">
                מפת Google
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
);
