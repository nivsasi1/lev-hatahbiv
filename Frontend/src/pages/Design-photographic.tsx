import { Link } from "react-router-dom";
import {
  categories,
  products,
  getProduct,
  siteSettings,
  store,
  workshops,
  productsByCategory,
  Category,
} from "../data/catalog";
import { ProductCard } from "../components/ProductCard";
import "./home-photographic.css";

/* ---------------------------------------------------------------------------
   Decorative imagery = curated INTERNET STOCK PHOTOS of art supplies / paint /
   brushes / paper / yarn / studio (the "header" + "shelf" photos the owner
   asked for). Real <ProductCard> products stay untouched in the grids below.
   Every base URL was verified to return 200 image/jpeg before use.
   --------------------------------------------------------------------------- */
const BIG = "?auto=format&fit=crop&w=1600&q=70"; // full-bleed backgrounds
const TILE = "?auto=format&fit=crop&w=800&q=70"; // mosaic / shelf tiles
const U = "https://images.unsplash.com/";

// inviting art-studio scene for the hero header
const HERO_IMG = `${U}photo-1459908676235-d5f02a50184b${BIG}`;
// artful flat-lay for the quote band
const QUOTE_IMG = `${U}photo-1658303135227-fcdfb0dab396${BIG}`;
// hands-on supplies for the workshops photo
const SHOP_IMG = `${U}photo-1460661419201-fd4cecdf8a8b${BIG}`;
// safe fallback so every mosaic tile always has a photo
const TILE_FALLBACK = `${U}photo-1558452337-ca6e53836504${TILE}`;

// one fitting "shelf" stock photo per category slug
const CAT_IMG: Record<string, string> = {
  paints: `${U}photo-1535673774336-ef95d2851cf3${TILE}`, // tubs of colour
  hobby: `${U}photo-1456086272160-b28b0645b729${TILE}`, // mixing pots of paint
  drawing: `${U}photo-1558452337-ca6e53836504${TILE}`, // rich mixed palette
  brushes: `${U}photo-1633443245758-6a507463c89c${TILE}`, // jars of brushes
  paper: `${U}photo-1513364776144-60967b0f800f${TILE}`, // brushes on white paper
  easels: `${U}photo-1613574714687-c33b9e90200d${TILE}`, // studio table + lamp
  craft: `${U}photo-1609446154807-d56805f0e007${TILE}`, // hands sorting beads
  fiber: `${U}photo-1584992236310-6edddc08acff${TILE}`, // balls of yarn + needles
  jewelry: `${U}photo-1646070107254-3713cec279c1${TILE}`, // beads + letter charms
};
const coverFor = (slug: string) => CAT_IMG[slug] ?? TILE_FALLBACK;

/* ---------- featured / sale picks (real products — same rules as base) ---------- */
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

// mosaic rhythm: 1 big, 1 wide, then standard tiles
const tileClass = (i: number) => (i === 0 ? "big" : i === 1 ? "wide" : "std");

export default () => (
  <main className="ph-home">
    {/* ---------- full-bleed hero (stock studio photo) ---------- */}
    <section className="ph-hero">
      <img className="ph-hero-bg" src={HERO_IMG} alt="" aria-hidden="true" />
      <div className="ph-scrim" />
      <div className="ph-shell ph-hero-inner">
        <span className="ph-kicker">חנות האמנות של רחובות · מאז {store.since}</span>
        <h1>לב התחביב</h1>
        <p className="ph-lead">
          צבעים, מכחולים, נייר וחוטים — חנות משפחתית עם אלפי מוצרים, כל מותג,
          ועצה טובה ליד הקופה. נכנסים להתרשם, יוצאים עם בדיוק מה שהפרויקט צריך.
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

    {/* ---------- photo category mosaic (stock "shelf" photos per category) ---------- */}
    <section className="ph-sec">
      <div className="ph-shell">
        <div className="ph-sec-head">
          <span className="ph-eyebrow">Collections</span>
          <h2>המדפים שלנו</h2>
        </div>
        <div className="ph-mosaic">
          {categories.map((c: Category, i) => (
            <Link key={c.slug} to={`/category/${c.slug}`} className={`ph-tile ${tileClass(i)}`}>
              <img src={coverFor(c.slug)} alt={c.name} loading="lazy" />
              <div className="ph-tile-scrim" />
              <div className="ph-tile-body">
                <h3>{c.name}</h3>
                <span className="ph-tile-count">
                  {productsByCategory(c.slug).length} מוצרים ←
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* ---------- featured (real products) ---------- */}
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

    {/* ---------- quote band over stock photo ---------- */}
    <section className="ph-quote">
      <img src={QUOTE_IMG} alt="" aria-hidden="true" loading="lazy" />
      <div className="ph-scrim" />
      <div className="ph-quote-body">
        <h2>כל יצירה גדולה מתחילה בלב</h2>
        <p>
          לא רק קונים — מתייעצים, ממששים את הנייר, משווים גוונים מול האור,
          ויוצאים עם בדיוק מה שהפרויקט הבא צריך. מאז {store.since}, ברחובות.
        </p>
      </div>
    </section>

    {/* ---------- on sale (real products) ---------- */}
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

    {/* ---------- workshops (schedule + signup, no price) ---------- */}
    <section className="ph-sec">
      <div className="ph-shell">
        <div className="ph-shop">
          <div className="ph-shop-photo">
            <img src={SHOP_IMG} alt="" aria-hidden="true" loading="lazy" />
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
              <a href={`tel:${workshops.contactTel}`} className="ph-btn fill">
                להרשמה: {workshops.contact}
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
