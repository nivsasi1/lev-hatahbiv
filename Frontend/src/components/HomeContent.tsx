import { useEffect, useRef } from "react";
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
  Product,
} from "../data/catalog";
import { ProductCard } from "./ProductCard";
import { ProductArt } from "./ProductArt";
import { Splat, Blob } from "./Splat";

// shared, internet-sourced art-studio photo for the story band (Unsplash, verified)
const STORY_IMG =
  "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1600&q=70";

// one photogenic product from each of four different shelves
const heuristicFeatured = ["paints", "brushes", "drawing", "paper"]
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

// Homepage shows at most 5 sale items.
const fresh = (
  siteSettings.saleIds.length > 0
    ? siteSettings.saleIds
        .map((id) => getProduct(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p) && onSale(p!))
    : products.filter(onSale).slice(0, 5)
).slice(0, 5);

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Auto-drifting product rail that you can also steer with the side arrows.
// Drifts on its own; pauses while the pointer is over it; the arrows nudge it.
const FeaturedRail = ({ items }: { items: Product[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const pos = useRef(0); // float drift position (scrollLeft rounds to int)

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;
    pos.current = el.scrollLeft;
    let raf = 0;
    const tick = () => {
      if (!paused.current) {
        pos.current += 0.5; // gentle continuous drift
        // content is tripled; resetting by one segment lands on identical
        // pixels (periodic) so the loop is seamless at any viewport width
        const seg = el.scrollWidth / 3;
        if (seg > 0 && pos.current >= seg) pos.current -= seg;
        el.scrollLeft = pos.current;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const nudge = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  // triple the list so the drift can loop without a visible seam
  const loop = items.length ? [...items, ...items, ...items] : items;

  return (
    <div
      className="featured-rail-wrap"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => {
        paused.current = false;
        // resync the float position after any manual arrow scroll
        if (ref.current) pos.current = ref.current.scrollLeft;
      }}
    >
      <button
        className="rail-arrow prev"
        type="button"
        onClick={() => nudge(-1)}
        aria-label="המוצרים הקודמים"
      >
        ‹
      </button>
      <div className="featured-rail" ref={ref}>
        {loop.map((p, i) => (
          <ProductCard key={`${i}-${p.id}`} product={p} />
        ))}
      </div>
      <button
        className="rail-arrow next"
        type="button"
        onClick={() => nudge(1)}
        aria-label="המוצרים הבאים"
      >
        ›
      </button>
    </div>
  );
};

// The whole homepage body, reused by the real homepage, /design5 and the
// motion variants so they all stay in sync.
export const HomeContent = () => (
  <>
    {/* ---------- hero: split editorial field ---------- */}
    <section className="hero">
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
    <section className="shell">
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
            <span className="count">{productsByCategory(c.slug).length} מוצרים ←</span>
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
        {featured.length > 3 ? (
          <FeaturedRail items={featured} />
        ) : (
          <div className="product-grid home-grid">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    )}

    {/* ---------- new & on sale (with the "שווה לחטוף" eyebrow) ---------- */}
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
          <a href={`tel:${workshops.contactTel}`} className="btn small">
            לפרטים והרשמה: {workshops.contact}
          </a>
        </div>
      </div>
    </section>

    {/* ---------- story band: photo behind "כל יצירה גדולה מתחילה בלב" ---------- */}
    <section className="story-band">
      <img className="story-bg" src={STORY_IMG} alt="" aria-hidden="true" loading="lazy" />
      <div className="story-scrim" aria-hidden="true" />
      <div className="shell story-inner">
        <span className="eyebrow story-eyebrow">מאז {store.since} · ברחובות</span>
        <h2 className="display story-title">
          כל יצירה גדולה מתחילה <span className="story-accent">בלב</span>
        </h2>
        <p className="story-text">
          לב התחביב — המרכז לאמנויות ולתחביבים — היא חנות משפחתית שפועלת
          ברחובות מאז {store.since}. אצלנו לא רק קונים: מתייעצים עם צוות
          מקצועי, ממששים את הנייר, משווים גוונים מול האור, ויוצאים עם בדיוק
          מה שהפרויקט הבא צריך.
        </p>
      </div>
    </section>

    {/* ---------- visit: hours + contact, pinned like studio notes ---------- */}
    <section className="studio-band">
      <Splat color="#e2574c" size={130} style={{ top: "-4%", right: "3%", opacity: 0.5 }} className="wiggle" />
      <Splat color="#7b3fbf" size={100} style={{ bottom: "-6%", left: "5%", opacity: 0.45 }} />
      <div className="shell">
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
  </>
);
