import { Link } from "react-router-dom";
import {
  categories,
  products,
  productsByCategory,
  getProduct,
  siteSettings,
  store,
  workshops,
  asset,
  FREE_SHIPPING_FROM,
} from "../data/catalog";
import { ProductCard } from "../components/ProductCard";
import "./home-editorial.css";

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

// the hero "plate" wants one striking photo — reuse the first featured pick
const heroPlate = featured[0];

const two = (n: number) => String(n).padStart(2, "0");

export const HomePage = () => (
  <main className="ed-home">
    {/* ---------- meta masthead ---------- */}
    <div className="ed-meta">
      <div className="ed-shell">
        <span>
          חנות האמנות של רחובות · מאז <b>{store.since}</b>
        </span>
        <span className="ed-dot">◆</span>
        <span>
          משלוח חינם מעל <b>₪{FREE_SHIPPING_FROM}</b>
        </span>
        <span className="ed-dot">◆</span>
        <span>ייעוץ אישי ליד הקופה</span>
        <span className="ed-dot">◆</span>
        <span>{store.address}</span>
      </div>
    </div>

    {/* ---------- hero ---------- */}
    <section className="ed-hero">
      <div className="ed-shell ed-hero-grid">
        <div className="ed-hero-copy">
          <span className="ed-issue">מהדורת אולפן · גיליון 2026</span>
          <h1>
            לב <em>התחביב</em>
          </h1>
          <p className="ed-lead">
            צבעים, מכחולים, נייר וחוטים — חנות משפחתית עם כל מה שהידיים שלכם
            מחפשות, ועם עצה טובה ליד הקופה. אלפי פריטים, מותג אחר מותג, על מדף
            אחד ברחובות.
          </p>
          <div className="ed-hero-ctas">
            <Link to={`/category/${categories[0].slug}`} className="ed-btn">
              לעיון בקטלוג ←
            </Link>
            <a
              href={store.waze}
              target="_blank"
              rel="noreferrer"
              className="ed-btn ghost"
            >
              ניווט לחנות
            </a>
          </div>
        </div>

        <div className="ed-hero-plate">
          {heroPlate?.img ? (
            <>
              <img src={heroPlate.img} alt={heroPlate.name} />
              <span className="ed-plate-tag">
                מהמדף · <b>{heroPlate.name}</b>
              </span>
            </>
          ) : (
            <div className="ed-hero-fallback">
              <img src={asset("/images/LevHatahbivLogo.png")} alt="לב התחביב" />
            </div>
          )}
        </div>
      </div>
    </section>

    {/* ---------- category index ---------- */}
    <section className="ed-sec">
      <div className="ed-shell">
        <div className="ed-sec-head">
          <h2>מפת המדפים</h2>
          <span className="ed-num">— תוכן הגיליון</span>
        </div>
        <div className="ed-index">
          {categories.map((c, i) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              style={{ "--cc": c.color } as any}
            >
              <span className="ed-ix-num">{two(i + 1)}</span>
              <span className="ed-ix-main">
                <h3>{c.name}</h3>
                <p>{c.blurb}</p>
              </span>
              <span className="ed-ix-meta">
                {productsByCategory(c.slug).length} מוצרים
                <span className="ed-arrow">←</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* ---------- featured gallery ---------- */}
    {featured.length > 0 && (
      <section className="ed-sec">
        <div className="ed-shell">
          <div className="ed-sec-head">
            <h2>נבחרים מהמדפים</h2>
            <span className="ed-num">— בחירת הצוות</span>
          </div>
          <div className="ed-gallery">
            {featured.slice(0, 5).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- on sale ---------- */}
    {fresh.length > 0 && (
      <section className="ed-sec">
        <div className="ed-shell">
          <div className="ed-sec-head">
            <h2>במבצע עכשיו</h2>
            <span className="ed-num">— מחירים מיוחדים</span>
          </div>
          <div className="ed-sale-grid">
            {fresh.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- workshops ---------- */}
    <section className="ed-sec">
      <div className="ed-shell">
        <div className="ed-shop">
          <div className="ed-shop-side">
            <div>
              <h2>חוגים וסדנאות</h2>
              <p>{workshops.intro}</p>
            </div>
          </div>
          <div className="ed-shop-main">
            <div className="ed-shop-chips">
              {workshops.topics.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="ed-shop-meta">
              <span className="ed-mline">🗓 {workshops.schedule}</span>
              <span className="ed-mline">💰 {workshops.price}</span>
              <a href={`tel:${store.phone}`} className="ed-btn">
                להרשמה: {store.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ---------- visit band ---------- */}
    <section className="ed-visit">
      <div className="ed-shell">
        <div>
          <h2>שעות פתיחה</h2>
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
        <div>
          <h2>קופצים לבקר?</h2>
          <div className="ed-visit-rows">
            <div>
              <span className="ed-dot" style={{ background: "#d83a2f" }} />
              {store.address}
            </div>
            <div>
              <span className="ed-dot" style={{ background: "#2a9d8f" }} />
              <a href={`tel:${store.phone}`}>{store.phone}</a>
            </div>
            <div>
              <span className="ed-dot" style={{ background: "#f2c14e" }} />
              <a href={`mailto:${store.email}`}>{store.email}</a>
            </div>
          </div>
          <div className="ed-visit-actions">
            <a href={store.waze} target="_blank" rel="noreferrer" className="ed-btn">
              פותחים Waze
            </a>
            <a
              href={store.maps}
              target="_blank"
              rel="noreferrer"
              className="ed-btn ghost"
            >
              מפת Google
            </a>
          </div>
        </div>
      </div>
    </section>
  </main>
);
