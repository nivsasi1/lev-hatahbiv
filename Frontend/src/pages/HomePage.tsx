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
import "./home-y2k.css";

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

const Sparkle = ({ cls }: { cls: string }) => (
  <svg className={`y-star ${cls}`} width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
    <path
      d="M28 2 C30 18 38 26 54 28 C38 30 30 38 28 54 C26 38 18 30 2 28 C18 26 26 18 28 2 Z"
      fill="currentColor"
    />
  </svg>
);

export const HomePage = () => (
  <main className="y2k-home">
    {/* ---------- hero ---------- */}
    <section className="y-hero">
      <Sparkle cls="s1" />
      <Sparkle cls="s2" />
      <div className="y-shell">
        <span className="y-pill">
          <span className="y-blink" />
          חנות האמנות של רחובות · מאז {store.since}
        </span>
        <h1>
          <span className="y-chrome">לב התחביב</span>
        </h1>
        <p className="y-lead">
          צבעים, מכחולים, נייר וחוטים — חנות משפחתית בוהקת בכרום, עם אלפי
          פריטים ועצה טובה ליד הקופה. ✨
        </p>
        <div className="y-ctas">
          <Link to={`/category/${categories[0].slug}`} className="y-btn aqua">
            לכל המדפים ✦
          </Link>
          <a href={store.waze} target="_blank" rel="noreferrer" className="y-btn bubble">
            ניווט לחנות
          </a>
        </div>
      </div>
    </section>

    {/* ---------- categories ---------- */}
    <section className="y-sec">
      <div className="y-shell">
        <div className="y-sec-head">
          <h2>המדפים שלנו</h2>
        </div>
        <div className="y-cats">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              className="y-cat"
              style={{ "--cc": c.color } as any}
            >
              <span className="y-orb" aria-hidden="true">
                <ProductArt kind={c.art} color={c.color} />
              </span>
              <div>
                <h3>{c.name}</h3>
                <p>{c.blurb}</p>
              </div>
              <span className="y-count">{productsByCategory(c.slug).length} מוצרים</span>
            </Link>
          ))}
        </div>
      </div>
    </section>

    {/* ---------- chrome marquee ---------- */}
    <div className="y-marquee">
      <div className="y-track">
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
      <section className="y-sec">
        <div className="y-shell">
          <div className="y-sec-head">
            <h2>נבחרים מהמדפים</h2>
          </div>
          <div className="y-grid">
            {featured.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- on sale ---------- */}
    {fresh.length > 0 && (
      <section className="y-sec">
        <div className="y-shell">
          <div className="y-sec-head">
            <h2>במבצע עכשיו</h2>
          </div>
          <div className="y-grid">
            {fresh.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- workshops ---------- */}
    <section className="y-sec">
      <div className="y-shell">
        <div className="y-shop">
          <h2>חוגים וסדנאות</h2>
          <p className="intro">{workshops.intro}</p>
          <div className="y-chips">
            {workshops.topics.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="y-shop-meta">
            <span className="y-m">🗓 {workshops.schedule}</span>
            <span className="y-m">💰 {workshops.price}</span>
            <a href={`tel:${store.phone}`} className="y-btn aqua">
              להרשמה: {store.phone}
            </a>
          </div>
        </div>
      </div>
    </section>

    {/* ---------- visit ---------- */}
    <section className="y-sec" style={{ paddingTop: 0 }}>
      <div className="y-shell y-visit">
        <div className="y-vcard">
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
        <div className="y-vcard">
          <h3>קופצים לבקר?</h3>
          <div className="y-rows">
            <div>📍 {store.address}</div>
            <div>
              📞 <a href={`tel:${store.phone}`}>{store.phone}</a>
            </div>
            <div>
              ✉️ <a href={`mailto:${store.email}`}>{store.email}</a>
            </div>
          </div>
          <div className="y-vactions">
            <a href={store.waze} target="_blank" rel="noreferrer" className="y-btn aqua">
              פותחים Waze
            </a>
            <a href={store.maps} target="_blank" rel="noreferrer" className="y-btn bubble">
              מפת Google
            </a>
          </div>
        </div>
      </div>
    </section>
  </main>
);
