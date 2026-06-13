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
import "./home-sketchbook.css";

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

/* a few quick hand-drawn doodles */
const Star = () => (
  <svg className="sk-doodle star" width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
    <path d="M24 4 L29 19 L45 19 L32 28 L37 44 L24 34 L11 44 L16 28 L3 19 L19 19 Z"
      stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" />
  </svg>
);
const Spiral = () => (
  <svg className="sk-doodle spiral" width="54" height="54" viewBox="0 0 54 54" fill="none" aria-hidden="true">
    <path d="M27 27 m0 0 a3 3 0 1 1 6 1 a8 8 0 1 1 -13 -3 a14 14 0 1 1 23 6 a20 20 0 1 1 -33 -8"
      stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
  </svg>
);
const Scribble = () => (
  <svg className="sk-doodle scribble" width="80" height="34" viewBox="0 0 80 34" fill="none" aria-hidden="true">
    <path d="M4 22 C14 6 20 30 30 16 S46 4 54 20 70 28 76 10"
      stroke="currentColor" stroke-width="2.6" stroke-linecap="round" />
  </svg>
);
const ArrowDoodle = () => (
  <svg className="sk-arrow" width="40" height="26" viewBox="0 0 40 26" fill="none" aria-hidden="true">
    <path d="M3 14 C12 10 24 18 34 9 M34 9 L27 8 M34 9 L31 16"
      stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

export const HomePage = () => (
  <main className="sk-home">
    {/* ---------- hero ---------- */}
    <section className="sk-hero">
      <Star />
      <Spiral />
      <Scribble />
      <div className="sk-shell">
        <span className="sk-tape">חנות האמנות של רחובות · מאז {store.since}</span>
        <h1>
          לב <span className="sk-underline">התחביב</span>
        </h1>
        <p className="sk-lead">
          צבעים, מכחולים, נייר וחוטים — חנות משפחתית שמרגישה כמו דף ממחברת
          הסקיצות שלכם. אלפי פריטים ועצה טובה ליד הקופה.
        </p>
        <div className="sk-ctas">
          <Link to={`/category/${categories[0].slug}`} className="sk-btn fill">
            להתחיל לשרבט ✏️
          </Link>
          <a href={store.waze} target="_blank" rel="noreferrer" className="sk-btn">
            ניווט לחנות
          </a>
        </div>
      </div>
    </section>

    {/* ---------- categories ---------- */}
    <section className="sk-sec">
      <div className="sk-shell">
        <div className="sk-sec-head">
          <h2>המדפים שלנו</h2>
          <ArrowDoodle />
        </div>
        <div className="sk-cats">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              className="sk-cat"
              style={{ "--cc": c.color, "--soft": c.soft } as any}
            >
              <span className="sk-orb" aria-hidden="true">
                <ProductArt kind={c.art} color={c.color} />
              </span>
              <h3>{c.name}</h3>
              <p>{c.blurb}</p>
              <span className="sk-count">{productsByCategory(c.slug).length} מוצרים ←</span>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* ---------- ribbon ---------- */}
    <div className="sk-strip">
      <div className="sk-track">
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
      <section className="sk-sec">
        <div className="sk-shell">
          <div className="sk-sec-head">
            <h2>נבחרים מהמדפים</h2>
            <ArrowDoodle />
          </div>
          <div className="sk-grid">
            {featured.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- on sale ---------- */}
    {fresh.length > 0 && (
      <section className="sk-sec">
        <div className="sk-shell">
          <div className="sk-sec-head">
            <h2>במבצע עכשיו</h2>
            <ArrowDoodle />
          </div>
          <div className="sk-grid">
            {fresh.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- workshops ---------- */}
    <section className="sk-sec">
      <div className="sk-shell">
        <div className="sk-shop">
          <h2>חוגים וסדנאות</h2>
          <p className="intro">{workshops.intro}</p>
          <div className="sk-notes">
            {workshops.topics.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="sk-shop-meta">
            <span className="sk-m">🗓 {workshops.schedule}</span>
            <span className="sk-m">💰 {workshops.price}</span>
            <a href={`tel:${store.phone}`} className="sk-btn fill">
              להרשמה: {store.phone}
            </a>
          </div>
        </div>
      </div>
    </section>

    {/* ---------- visit ---------- */}
    <section className="sk-sec" style={{ paddingTop: 0 }}>
      <div className="sk-shell sk-visit">
        <div className="sk-card">
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
        <div className="sk-card">
          <h3>קופצים לבקר?</h3>
          <div className="sk-rows">
            <div>📍 {store.address}</div>
            <div>
              📞 <a href={`tel:${store.phone}`}>{store.phone}</a>
            </div>
            <div>
              ✉️ <a href={`mailto:${store.email}`}>{store.email}</a>
            </div>
          </div>
          <div className="sk-vactions">
            <a href={store.waze} target="_blank" rel="noreferrer" className="sk-btn fill">
              פותחים Waze
            </a>
            <a href={store.maps} target="_blank" rel="noreferrer" className="sk-btn">
              מפת Google
            </a>
          </div>
        </div>
      </div>
    </section>
  </main>
);
