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
} from "../data/catalog";
import { ProductCard } from "../components/ProductCard";
import { ProductArt } from "../components/ProductArt";
import { Splat, Blob } from "../components/Splat";

// one photogenic product from each of four different shelves
const heuristicFeatured = ["paints", "brushes", "drawing", "paper"]
  .map((slug) =>
    products.find(
      (p) =>
        p.category === slug &&
        p.img &&
        p.description.length > 40 &&
        // prefer products with a Hebrew name on the homepage
        /[֐-׿]/.test(p.name)
    )
  )
  .filter((p): p is NonNullable<typeof p> => Boolean(p));

// Manager-curated picks win; otherwise fall back to the heuristic.
const featured =
  siteSettings.featuredIds.length > 0
    ? siteSettings.featuredIds
        .map((id) => getProduct(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
    : heuristicFeatured;

// Manager-chosen sale picks win; otherwise auto-pick the first few on-sale items.
const onSale = (p: { salePrice?: number; soldOut?: boolean; img?: string }) =>
  Boolean(p.salePrice && !p.soldOut && p.img);

const fresh =
  siteSettings.saleIds.length > 0
    ? siteSettings.saleIds
        .map((id) => getProduct(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p) && onSale(p!))
    : products.filter(onSale).slice(0, 4);

export const HomePage = () => (
  <main className="page-main">
    {/* ---------- hero: split editorial field ---------- */}
    <section className="hero">
      {/* dark editorial field — its power is in the clean type, no splats */}
      <div className="hero-field" aria-hidden="true">
        <div className="hero-statement display">
          <span>כל</span>
          <span>יצירה</span>
          <span>מתחילה</span>
          <span>כאן</span>
        </div>
        <div className="hero-since">
          <span className="hero-since-num">מאז {store.since}</span>
          <span className="hero-since-sub">חנות ציוד האמנות של רחובות</span>
        </div>
      </div>

      {/* warm paper zone — the logo IS the headline */}
      <div className="hero-stage">
        <Splat color="#e2574c" size={86} style={{ top: "4%", left: "2%" }} className="wiggle" />
        <Splat color="#2a9d8f" size={72} style={{ bottom: "6%", right: "4%", opacity: 0.85 }} />
        <div className="hero-stage-inner">
          <h1 className="hero-logo">
            <img src={asset("/images/LevHatahbivLogo.png")} alt="לב התחביב" />
          </h1>
          <p className="sub">
            צבעים, מכחולים, נייר וחוטים — חנות משפחתית עם כל מה שהידיים שלכם
            מחפשות, ועם עצה טובה ליד הקופה.
          </p>
          <div className="hero-ctas">
            <Link to={`/category/${categories[0].slug}`} className="btn hero-cta">
              לצאת למסע בין המדפים 🎨
            </Link>
            <a href={store.waze} target="_blank" rel="noreferrer" className="hero-link">
              ניווט לחנות ←
            </a>
          </div>
        </div>
      </div>
    </section>

    {/* ---------- categories ---------- */}
    <section className="shell" id="shelves">
      <div className="section-head">
        <div className="section-titles">
          <span className="eyebrow">תשעה מדפים, אינסוף רעיונות</span>
          <h2 className="display">המדפים שלנו</h2>
        </div>
        <div className="scribble" />
      </div>
      <div className="cat-grid">
        {categories.map((c) => (
          <Link
            key={c.slug}
            to={`/category/${c.slug}`}
            className="cat-card"
            style={{ "--cc": c.color } as any}
          >
            <Blob color={c.soft} />
            <span className="cat-art" aria-hidden="true">
              <ProductArt kind={c.art} color={c.color} />
            </span>
            <h3 className="display">{c.name}</h3>
            <p>{c.blurb}</p>
            <span className="count">
              {productsByCategory(c.slug).length} מוצרים ←
            </span>
          </Link>
        ))}
      </div>
    </section>

    {/* ---------- ribbon ---------- */}
    <div className="ribbon">
      <div className="ribbon-track">
        {[0, 1].map((i) => (
          <span key={i}>
            {siteSettings.ribbonTexts.map((t, j) => (
              <span key={j}>{t}</span>
            ))}
          </span>
        ))}
      </div>
    </div>

    {/* ---------- best sellers ---------- */}
    {featured.length > 0 && (
      <section className="shell">
        <div className="section-head">
          <div className="section-titles">
            <span className="eyebrow">בחירת הצוות</span>
            <h2 className="display">נבחרים מהמדפים</h2>
          </div>
          <div className="scribble" />
        </div>
        {featured.length > 4 ? (
          // slow auto-scrolling carousel; cards duplicated for a seamless loop
          <div className="featured-carousel">
            <div
              className="track"
              style={{ animationDuration: `${featured.length * 6}s` }}
            >
              {[0, 1].map((dup) =>
                featured.map((p) => (
                  <ProductCard key={`${dup}-${p.id}`} product={p} />
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="product-grid home-grid">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    )}

    {/* ---------- new & on sale (warm cream feature band) ---------- */}
    {fresh.length > 0 && (
      <section className="sale-band">
        <div className="shell">
          <div className="section-head">
            <div className="section-titles">
              <span className="eyebrow sale">שווה לחטוף</span>
              <h2 className="display">במבצע עכשיו</h2>
            </div>
            <div className="scribble" />
          </div>
          <div className="product-grid home-grid">
            {fresh.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )}

    {/* ---------- workshops ---------- */}
    <section className="shell">
      <div className="section-head">
        <div className="section-titles">
          <span className="eyebrow">בחדר הלימוד הצמוד לחנות</span>
          <h2 className="display">חוגים וסדנאות</h2>
        </div>
        <div className="scribble" />
      </div>
      <div className="workshops-card">
        <p>{workshops.intro}</p>
        <div className="workshop-topics">
          {workshops.topics.map((t) => (
            <span key={t} className="workshop-chip">
              {t}
            </span>
          ))}
        </div>
        <div className="workshop-meta">
          <span>🗓 {workshops.schedule}</span>
          <span>💰 {workshops.price}</span>
          <a href={`tel:${store.phone}`} className="btn small">
            לפרטים והרשמה: {store.phone}
          </a>
        </div>
      </div>
    </section>

    {/* ---------- studio band: story + hours, pinned like notes on a wall ---------- */}
    <section className="studio-band">
      <Splat color="#e2574c" size={130} style={{ top: "-4%", right: "3%", opacity: 0.5 }} className="wiggle" />
      <Splat color="#7b3fbf" size={100} style={{ bottom: "-6%", left: "5%", opacity: 0.45 }} />
      <div className="shell">
        <h2 className="display studio-title">
          כל יצירה גדולה מתחילה{" "}
          <span className="hl" style={{ "--hl": "#e2574c" } as any}>
            בלב
          </span>
        </h2>
        <p className="studio-text">
          לב התחביב — המרכז לאמנויות ולתחביבים — היא חנות משפחתית שפועלת
          ברחובות מאז {store.since}. אצלנו לא רק קונים: מתייעצים עם צוות
          מקצועי, ממששים את הנייר, משווים גוונים מול האור, ויוצאים עם בדיוק
          מה שהפרויקט הבא צריך.
        </p>

        <div className="note-row">
          <div className="note-card gold">
            <h3 className="display">שעות פתיחה</h3>
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
            <div className="note-foot">* אחה"צ פתוחים בימים א', ב', ד', ה' בלבד</div>
          </div>

          <div className="note-card">
            <h3 className="display">קופצים לבקר?</h3>
            <div className="visit-rows">
              <div>
                <span className="dot" style={{ background: "#e2574c" }} />
                {store.address}
              </div>
              <div>
                <span className="dot" style={{ background: "#2a9d8f" }} />
                <a href={`tel:${store.phone}`}>{store.phone}</a>
              </div>
              <div>
                <span className="dot" style={{ background: "#7b3fbf" }} />
                <a href={`mailto:${store.email}`}>{store.email}</a>
              </div>
            </div>
            <div className="visit-actions">
              <a href={store.waze} target="_blank" rel="noreferrer" className="btn small">
                פותחים Waze
              </a>
              <a href={store.maps} target="_blank" rel="noreferrer" className="btn small ghost">
                מפת Google
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
);
