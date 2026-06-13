import { Link } from "react-router-dom";
import {
  categories,
  products,
  productsByCategory,
  getProduct,
  siteSettings,
  store,
  workshops,
  FREE_SHIPPING_FROM,
} from "../data/catalog";
import { ProductCard } from "../components/ProductCard";
import { ProductArt } from "../components/ProductArt";
import "./home-boutique.css";

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

// up to four photogenic picks to float beneath the hero
const heroThumbs = featured.filter((p) => p.img).slice(0, 4);

const promises = [
  { emoji: "🚚", title: "משלוח חינם", text: `בהזמנה מעל ₪${FREE_SHIPPING_FROM}` },
  { emoji: "💬", title: "ייעוץ אישי", text: "צוות מקצועי ליד הקופה" },
  { emoji: "🎨", title: "כל המותגים", text: "אלפי פריטים במקום אחד" },
  { emoji: "🏠", title: "מאז 1985", text: "חנות משפחתית ברחובות" },
];

export const HomePage = () => (
  <main className="bq-home">
    {/* ---------- hero ---------- */}
    <section className="bq-hero">
      <div className="bq-shell">
        <span className="bq-pill">
          <span className="bq-dot" />
          חנות האמנות של רחובות · מאז {store.since}
        </span>
        <h1>
          לב <span>התחביב</span>
        </h1>
        <p className="bq-lead">
          צבעים, מכחולים, נייר וחוטים — חנות משפחתית חמה עם כל מה שהידיים שלכם
          מחפשות, ועם עצה טובה ליד הקופה.
        </p>
        <div className="bq-ctas">
          <Link to={`/category/${categories[0].slug}`} className="bq-btn solid">
            לגלות את המדפים 🎨
          </Link>
          <a
            href={store.waze}
            target="_blank"
            rel="noreferrer"
            className="bq-btn soft"
          >
            ניווט לחנות
          </a>
        </div>

        {heroThumbs.length > 0 && (
          <div className="bq-hero-thumbs">
            {heroThumbs.map((p) => (
              <Link key={p.id} to={`/product/${p.id}`} className="bq-thumb">
                <img src={p.img} alt={p.name} loading="lazy" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>

    {/* ---------- category bubbles ---------- */}
    <section className="bq-sec">
      <div className="bq-shell">
        <div className="bq-sec-head">
          <h2>המדפים שלנו</h2>
          <p>בחרו עולם ותתחילו ליצור</p>
        </div>
        <div className="bq-cats">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              className="bq-cat"
              style={{ "--cc": c.color, "--soft": c.soft } as any}
            >
              <span className="bq-orb" aria-hidden="true">
                <ProductArt kind={c.art} color={c.color} />
              </span>
              <h3>{c.name}</h3>
              <span className="bq-count">{productsByCategory(c.slug).length} מוצרים</span>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* ---------- promise strip ---------- */}
    <section className="bq-sec" style={{ paddingTop: 0 }}>
      <div className="bq-shell">
        <div className="bq-promise">
          {promises.map((p) => (
            <div key={p.title} className="bq-pcard">
              <div className="bq-emoji">{p.emoji}</div>
              <h4>{p.title}</h4>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ---------- featured ---------- */}
    {featured.length > 0 && (
      <section className="bq-sec">
        <div className="bq-shell">
          <div className="bq-sec-head">
            <h2>נבחרים מהמדפים</h2>
            <p>בחירת הצוות לעונה</p>
          </div>
          <div className="bq-grid">
            {featured.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- on sale ---------- */}
    {fresh.length > 0 && (
      <section className="bq-sec">
        <div className="bq-shell">
          <div className="bq-sec-head">
            <h2>במבצע עכשיו</h2>
            <p>מחירים מיוחדים לזמן מוגבל</p>
          </div>
          <div className="bq-grid">
            {fresh.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- workshops ---------- */}
    <section className="bq-sec">
      <div className="bq-shell">
        <div className="bq-shop">
          <div className="bq-sec-head" style={{ marginBottom: "1rem" }}>
            <h2>חוגים וסדנאות</h2>
          </div>
          <p className="intro">{workshops.intro}</p>
          <div className="bq-shop-chips">
            {workshops.topics.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="bq-shop-meta">
            <span className="bq-m">🗓 {workshops.schedule}</span>
            <span className="bq-m">💰 {workshops.price}</span>
            <a href={`tel:${store.phone}`} className="bq-btn solid">
              להרשמה: {store.phone}
            </a>
          </div>
        </div>
      </div>
    </section>

    {/* ---------- visit ---------- */}
    <section className="bq-sec" style={{ paddingTop: 0 }}>
      <div className="bq-shell bq-visit">
        <div className="bq-vcard">
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
        <div className="bq-vcard">
          <h3>קופצים לבקר?</h3>
          <div className="bq-rows">
            <div>📍 {store.address}</div>
            <div>
              📞 <a href={`tel:${store.phone}`}>{store.phone}</a>
            </div>
            <div>
              ✉️ <a href={`mailto:${store.email}`}>{store.email}</a>
            </div>
          </div>
          <div className="bq-vactions">
            <a href={store.waze} target="_blank" rel="noreferrer" className="bq-btn solid">
              פותחים Waze
            </a>
            <a href={store.maps} target="_blank" rel="noreferrer" className="bq-btn soft">
              מפת Google
            </a>
          </div>
        </div>
      </div>
    </section>
  </main>
);
