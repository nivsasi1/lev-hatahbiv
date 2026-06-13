import { Link } from "react-router-dom";
import {
  categories,
  products,
  productsByCategory,
  getProduct,
  siteSettings,
  store,
  workshops,
  Category,
} from "../data/catalog";
import { ProductCard } from "../components/ProductCard";
import "./home-photographic.css";

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

// a representative photo per category (richest-description product with a photo)
const coverFor = (slug: string) =>
  productsByCategory(slug)
    .filter((p) => p.img)
    .sort((a, b) => b.description.length - a.description.length)[0]?.img;

const heroImg = featured.find((p) => p.img)?.img ?? coverFor(categories[0].slug);
// any spare photos for the quote + workshop bands
const photoPool = categories.map((c) => coverFor(c.slug)).filter(Boolean) as string[];
const quoteImg = photoPool[2] ?? photoPool[0];
const shopImg = photoPool[4] ?? photoPool[1];

// mosaic rhythm: 1 big, 1 wide, then standard tiles
const tileClass = (i: number) => (i === 0 ? "big" : i === 1 ? "wide" : "std");

export const HomePage = () => (
  <main className="ph-home">
    {/* ---------- full-bleed hero ---------- */}
    <section className="ph-hero">
      {heroImg ? (
        <img className="ph-hero-bg" src={heroImg} alt="" aria-hidden="true" />
      ) : (
        <div className="ph-hero-bg" style={{ background: "#2a241f" }} />
      )}
      <div className="ph-scrim" />
      <div className="ph-shell ph-hero-inner">
        <span className="ph-kicker">חנות האמנות של רחובות · מאז {store.since}</span>
        <h1>לב התחביב</h1>
        <p className="ph-lead">
          צבעים, מכחולים, נייר וחוטים — חנות משפחתית שבה כל פריט מצולם באהבה.
          אלפי מוצרים, כל מותג, ועצה טובה ליד הקופה.
        </p>
        <div className="ph-ctas">
          <Link to={`/category/${categories[0].slug}`} className="ph-btn fill">
            לגלות את המדפים ←
          </Link>
          <a href={store.waze} target="_blank" rel="noreferrer" className="ph-btn line">
            ניווט לחנות
          </a>
        </div>
      </div>
    </section>

    {/* ---------- photo category mosaic ---------- */}
    <section className="ph-sec">
      <div className="ph-shell">
        <div className="ph-sec-head">
          <span className="ph-eyebrow">Collections</span>
          <h2>המדפים שלנו</h2>
        </div>
        <div className="ph-mosaic">
          {categories.map((c: Category, i) => {
            const cover = coverFor(c.slug);
            return (
              <Link key={c.slug} to={`/category/${c.slug}`} className={`ph-tile ${tileClass(i)}`}>
                {cover ? (
                  <img src={cover} alt={c.name} loading="lazy" />
                ) : (
                  <div className="ph-tile-fallback" style={{ background: c.color }} />
                )}
                <div className="ph-tile-scrim" />
                <div className="ph-tile-body">
                  <h3>{c.name}</h3>
                  <span className="ph-tile-count">
                    {productsByCategory(c.slug).length} מוצרים ←
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>

    {/* ---------- featured ---------- */}
    {featured.length > 0 && (
      <section className="ph-sec" style={{ paddingTop: 0 }}>
        <div className="ph-shell">
          <div className="ph-sec-head">
            <span className="ph-eyebrow">Curated</span>
            <h2>נבחרים מהמדפים</h2>
          </div>
          <div className="ph-grid">
            {featured.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- quote band over photo ---------- */}
    <section className="ph-quote">
      {quoteImg && <img src={quoteImg} alt="" aria-hidden="true" />}
      <div className="ph-scrim" />
      <div className="ph-quote-body">
        <h2>כל יצירה גדולה מתחילה בלב</h2>
        <p>
          לא רק קונים — מתייעצים, ממששים את הנייר, משווים גוונים מול האור,
          ויוצאים עם בדיוק מה שהפרויקט הבא צריך. מאז {store.since}, ברחובות.
        </p>
      </div>
    </section>

    {/* ---------- on sale ---------- */}
    {fresh.length > 0 && (
      <section className="ph-sec">
        <div className="ph-shell">
          <div className="ph-sec-head">
            <span className="ph-eyebrow">On sale</span>
            <h2>במבצע עכשיו</h2>
          </div>
          <div className="ph-grid">
            {fresh.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- workshops ---------- */}
    <section className="ph-sec">
      <div className="ph-shell">
        <div className="ph-shop">
          <div className="ph-shop-photo">
            {shopImg ? (
              <img src={shopImg} alt="" aria-hidden="true" />
            ) : (
              <div style={{ position: "absolute", inset: 0, background: "#2a241f" }} />
            )}
          </div>
          <div className="ph-shop-body">
            <h2>חוגים וסדנאות</h2>
            <p className="intro">{workshops.intro}</p>
            <div className="ph-chips">
              {workshops.topics.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="ph-shop-meta">
              <span className="ph-m">🗓 {workshops.schedule}</span>
              <span className="ph-m">💰 {workshops.price}</span>
              <a href={`tel:${store.phone}`} className="ph-btn fill">
                להרשמה: {store.phone}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ---------- visit ---------- */}
    <section className="ph-sec" style={{ paddingTop: 0 }}>
      <div className="ph-shell ph-visit">
        <div className="ph-vcard">
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
        <div className="ph-vcard">
          <h3>קופצים לבקר?</h3>
          <div className="ph-rows">
            <div>📍 {store.address}</div>
            <div>
              📞 <a href={`tel:${store.phone}`}>{store.phone}</a>
            </div>
            <div>
              ✉️ <a href={`mailto:${store.email}`}>{store.email}</a>
            </div>
          </div>
          <div className="ph-vactions">
            <a href={store.waze} target="_blank" rel="noreferrer" className="ph-btn fill">
              פותחים Waze
            </a>
            <a href={store.maps} target="_blank" rel="noreferrer" className="ph-btn line">
              מפת Google
            </a>
          </div>
        </div>
      </div>
    </section>
  </main>
);
