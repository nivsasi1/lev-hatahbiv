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
import "./home-nightstudio.css";

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
  <main className="ns-home">
    {/* ---------- hero ---------- */}
    <section className="ns-hero">
      <div className="ns-shell">
        <span className="ns-kicker">
          <span className="ns-live" />
          חנות האמנות של רחובות · מאז {store.since}
        </span>
        <h1>לב התחביב</h1>
        <p className="ns-lead">
          צבעים, מכחולים, נייר וחוטים — חנות משפחתית שבה כל גוון זוהר. אלפי
          פריטים, כל מותג, ועצה טובה ליד הקופה.
        </p>
        <div className="ns-ctas">
          <Link to={`/category/${categories[0].slug}`} className="ns-btn glow">
            להדליק את המדפים ✦
          </Link>
          <a href={store.waze} target="_blank" rel="noreferrer" className="ns-btn wire">
            ניווט לחנות
          </a>
        </div>
      </div>
    </section>

    {/* ---------- marquee ---------- */}
    <div className="ns-marquee">
      <div className="ns-track">
        {[0, 1].map((dup) => (
          <span key={dup}>
            {ribbon.map((t, j) => (
              <span key={j} style={{ gap: 0 }}>{t}</span>
            ))}
          </span>
        ))}
      </div>
    </div>

    {/* ---------- category neon tiles ---------- */}
    <section className="ns-sec">
      <div className="ns-shell">
        <div className="ns-sec-head">
          <h2>המדפים שלנו</h2>
          <span className="ns-rule" />
        </div>
        <div className="ns-cats">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              className="ns-cat"
              style={{ "--cc": c.color } as any}
            >
              <span className="ns-cat-art" aria-hidden="true">
                <ProductArt kind={c.art} color={c.color} />
              </span>
              <div>
                <h3>{c.name}</h3>
                <p>{c.blurb}</p>
              </div>
              <span className="ns-cat-count">
                {productsByCategory(c.slug).length} מוצרים ←
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* ---------- featured ---------- */}
    {featured.length > 0 && (
      <section className="ns-sec">
        <div className="ns-shell">
          <div className="ns-sec-head">
            <h2>נבחרים מהמדפים</h2>
            <span className="ns-rule" />
          </div>
          <div className="ns-grid">
            {featured.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- on sale ---------- */}
    {fresh.length > 0 && (
      <section className="ns-sec">
        <div className="ns-shell">
          <div className="ns-sec-head">
            <h2>במבצע עכשיו</h2>
            <span className="ns-rule" />
          </div>
          <div className="ns-grid">
            {fresh.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- workshops spotlight ---------- */}
    <section className="ns-sec">
      <div className="ns-shell">
        <div className="ns-shop">
          <h2>חוגים וסדנאות</h2>
          <p className="intro">{workshops.intro}</p>
          <div className="ns-chips">
            {workshops.topics.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="ns-shop-meta">
            <span className="ns-m">🗓 {workshops.schedule}</span>
            <span className="ns-m">💰 {workshops.price}</span>
            <a href={`tel:${store.phone}`} className="ns-btn glow">
              להרשמה: {store.phone}
            </a>
          </div>
        </div>
      </div>
    </section>

    {/* ---------- visit band ---------- */}
    <section className="ns-sec">
      <div className="ns-shell ns-visit">
        <div className="ns-vcard">
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
        <div className="ns-vcard">
          <h3>קופצים לבקר?</h3>
          <div className="ns-rows">
            <div>📍 {store.address}</div>
            <div>
              📞 <a href={`tel:${store.phone}`}>{store.phone}</a>
            </div>
            <div>
              ✉️ <a href={`mailto:${store.email}`}>{store.email}</a>
            </div>
          </div>
          <div className="ns-vactions">
            <a href={store.waze} target="_blank" rel="noreferrer" className="ns-btn glow">
              פותחים Waze
            </a>
            <a href={store.maps} target="_blank" rel="noreferrer" className="ns-btn wire">
              מפת Google
            </a>
          </div>
        </div>
      </div>
    </section>
  </main>
);
