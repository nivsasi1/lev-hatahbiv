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
  finalPrice,
  shekel,
} from "../data/catalog";
import { ProductCard } from "../components/ProductCard";
import "./home-brutalist.css";

/* ---------- featured / sale picks (same rules as the base homepage) ---------- */
const heuristicFeatured = ["paints", "brushes", "drawing", "paper", "craft"]
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

const heroProduct = featured[0];
const ribbon = siteSettings.ribbonTexts;
const two = (n: number) => String(n).padStart(2, "0");

export const HomePage = () => (
  <main className="nb-home">
    {/* ---------- hero poster ---------- */}
    <section className="nb-hero">
      <div className="nb-shell nb-hero-grid">
        <div className="nb-hero-copy">
          <span className="nb-tag">חנות האמנות של רחובות · מאז {store.since}</span>
          <h1>
            לב <span className="nb-stroke">התחביב</span>
          </h1>
          <p className="nb-lead">
            צבעים, מכחולים, נייר וחוטים — אלפי פריטים, כל מותג, מחיר הוגן, ועצה
            טובה ליד הקופה. בלי בלגן, בלי הפתעות.
          </p>
          <div className="nb-ctas">
            <Link to={`/category/${categories[0].slug}`} className="nb-btn">
              לכל המדפים ←
            </Link>
            <a
              href={store.waze}
              target="_blank"
              rel="noreferrer"
              className="nb-btn alt"
            >
              ניווט לחנות
            </a>
          </div>
        </div>

        <div className="nb-hero-art">
          {heroProduct?.img ? (
            <>
              <img src={heroProduct.img} alt={heroProduct.name} />
              <span className="nb-price-pop">{shekel(finalPrice(heroProduct))}</span>
            </>
          ) : (
            <div className="nb-art-fallback">
              <img src={asset("/images/LevHatahbivLogo.png")} alt="לב התחביב" />
            </div>
          )}
        </div>
      </div>
    </section>

    {/* ---------- marquee ---------- */}
    <div className="nb-marquee">
      <div className="nb-track">
        {[0, 1].map((dup) => (
          <span key={dup}>
            {ribbon.map((t, j) => (
              <span key={j} style={{ gap: 0 }}>{t}</span>
            ))}
          </span>
        ))}
      </div>
    </div>

    {/* ---------- category swatches ---------- */}
    <section className="nb-sec">
      <div className="nb-shell">
        <div className="nb-sec-head">
          <h2>בחרו מדף</h2>
        </div>
        <div className="nb-cats">
          {categories.map((c, i) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              className="nb-cat"
              style={{ "--cc": c.color } as any}
            >
              <span className="nb-cat-num">{two(i + 1)}</span>
              <h3>{c.name}</h3>
              <p>{c.blurb}</p>
              <span className="nb-cat-count">
                {productsByCategory(c.slug).length} מוצרים
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* ---------- featured ---------- */}
    {featured.length > 0 && (
      <section className="nb-sec">
        <div className="nb-shell">
          <div className="nb-sec-head">
            <h2>נבחרים מהמדפים</h2>
          </div>
          <div className="nb-products">
            {featured.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- on sale ---------- */}
    {fresh.length > 0 && (
      <section className="nb-sec">
        <div className="nb-shell">
          <div className="nb-sec-head" style={{ background: "#ef3e36" }}>
            <h2>במבצע עכשיו</h2>
          </div>
          <div className="nb-products">
            {fresh.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- workshops + visit split ---------- */}
    <section className="nb-sec">
      <div className="nb-shell nb-split">
        <div className="nb-panel shop">
          <h2>חוגים וסדנאות</h2>
          <p>{workshops.intro}</p>
          <div className="nb-chips">
            {workshops.topics.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="nb-meta">
            <span>🗓 {workshops.schedule}</span>
            <span>💰 {workshops.price}</span>
          </div>
          <div className="nb-actions">
            <a href={`tel:${store.phone}`} className="nb-btn dark">
              להרשמה: {store.phone}
            </a>
          </div>
        </div>

        <div className="nb-panel visit">
          <h2>קופצים לבקר?</h2>
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
          <div className="nb-rows">
            <div>📍 {store.address}</div>
            <div>
              📞 <a href={`tel:${store.phone}`}>{store.phone}</a>
            </div>
            <div>
              ✉️ <a href={`mailto:${store.email}`}>{store.email}</a>
            </div>
          </div>
          <div className="nb-actions">
            <a href={store.waze} target="_blank" rel="noreferrer" className="nb-btn">
              פותחים Waze
            </a>
            <a
              href={store.maps}
              target="_blank"
              rel="noreferrer"
              className="nb-btn dark"
            >
              מפת Google
            </a>
          </div>
        </div>
      </div>
    </section>
  </main>
);
