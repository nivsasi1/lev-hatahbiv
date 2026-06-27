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
  finalPrice,
  shekel,
  Category,
  Product,
} from "../../data/catalog";
import { ProductThumb } from "../../components/ProductThumb";
import { ProductArt } from "../../components/ProductArt";
import "./design-pop.css";

/* ---------------------------------------------------------------------------
   DesignPop — "Bold Brand Pop" homepage variant.

   Direction: confident, modern, energetic. Strong color blocking, big rounded
   shapes, high contrast — organized, not chaotic. Sales are the headline of the
   page (band directly under the hero), categories are flat color-block tiles
   driven by each category's `color` + a white ProductArt SVG (no photos).

   Content mirrors MainHome; the LOOK is replaced. All CSS is scoped under
   .dz-pop. Motion is gated behind prefers-reduced-motion.
   --------------------------------------------------------------------------- */

// On-sale predicate — needs a real photo so the sale card reads well.
const onSale = (p: Product) =>
  Boolean(p.salePrice && !p.soldOut && p.img && p.price > 0);

// Up to 6 sale items for the headline band (manager-curated saleIds win).
const saleItems: Product[] = (
  siteSettings.saleIds.length > 0
    ? siteSettings.saleIds
        .map((id) => getProduct(id))
        .filter((p): p is Product => Boolean(p) && onSale(p as Product))
    : products.filter(onSale)
).slice(0, 6);

// Featured picks — same heuristic/manager logic as MainHome, capped at 6.
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
  .filter((p): p is Product => Boolean(p));

const featured: Product[] = (
  siteSettings.featuredIds.length > 0
    ? siteSettings.featuredIds
        .map((id) => getProduct(id))
        .filter((p): p is Product => Boolean(p))
    : heuristicFeatured
).slice(0, 6);

const salePct = (p: Product) =>
  p.salePrice && p.price > 0
    ? Math.round((1 - p.salePrice / p.price) * 100)
    : 0;

// A bold sale card — white, rounded, BIG red price, corner starburst badge.
const SaleCard = ({ p }: { p: Product }) => {
  const pct = salePct(p);
  return (
    <Link to={`/product/${p.id}`} className="dz-sale-card">
      <div className="dz-sale-media">
        <ProductThumb product={p} />
        {pct > 0 && (
          <span className="dz-burst" aria-hidden="true">
            <span className="dz-burst-txt">{pct}%-</span>
          </span>
        )}
      </div>
      <div className="dz-sale-body">
        <span className="dz-sale-name">{p.name}</span>
        <div className="dz-sale-prices">
          <span className="dz-sale-now">{shekel(finalPrice(p))}</span>
          <span className="dz-sale-was">{shekel(p.price)}</span>
        </div>
      </div>
    </Link>
  );
};

export const DesignPop = () => {
  const ref = useRef<HTMLElement>(null);

  /* Staggered scroll reveals. FAIL-OPEN: the hidden start state lives behind
     .dz-anim, only added when JS runs AND reduced-motion is off — so content is
     never hidden without JS or under reduced motion. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced || !("IntersectionObserver" in window)) return;

    el.classList.add("dz-anim");
    const targets = el.querySelectorAll<HTMLElement>(".dz-reveal");
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).classList.add("in");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <main className="dz-pop page-main" ref={ref}>
      {/* ---------- HERO — logo on a confident purple color field ---------- */}
      <section className="dz-hero">
        <div className="dz-hero-blob dz-blob-a" aria-hidden="true" />
        <div className="dz-hero-blob dz-blob-b" aria-hidden="true" />
        <div className="dz-hero-inner">
          <span className="dz-eyebrow dz-eyebrow-light">מאז {store.since} · רחובות</span>
          <h1 className="dz-hero-logo">
            <img
              src={asset("/images/LevHatahbivLogo.png")}
              alt="לב התחביב"
              loading="eager"
            />
          </h1>
          <p className="dz-hero-sub">
            צבעים, מכחולים, נייר וחוטים — חנות משפחתית עם כל מה שהידיים שלכם
            מחפשות, ועם עצה טובה ליד הקופה.
          </p>
          <div className="dz-hero-ctas">
            <Link to={`/category/${categories[0].slug}`} className="dz-btn dz-btn-pop">
              למסע בין המדפים 🎨
            </Link>
            <a
              href={store.waze}
              target="_blank"
              rel="noreferrer"
              className="dz-btn dz-btn-ghost"
            >
              ניווט לחנות ←
            </a>
          </div>
        </div>
      </section>

      {/* ---------- ON SALE — bold tinted band, the headline of the page ---------- */}
      {saleItems.length > 0 && (
        <section className="dz-sale-band dz-reveal">
          <div className="dz-shell">
            <div className="dz-sale-head">
              <div>
                <span className="dz-eyebrow dz-eyebrow-red">חיסכון חם</span>
                <h2 className="dz-h2 dz-h2-red">מבצעים</h2>
              </div>
              <Link to="/sale" className="dz-more-link">
                לעוד מבצעים ←
              </Link>
            </div>
            <div className="dz-sale-grid">
              {saleItems.map((p) => (
                <SaleCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- CATEGORIES — bold flat color-block cards ---------- */}
      <section className="dz-section dz-reveal">
        <div className="dz-shell">
          <div className="dz-sec-head">
            <span className="dz-eyebrow">המחלקות</span>
            <h2 className="dz-h2">בוחרים מדף, מתחילים ליצור</h2>
          </div>
          <div className="dz-cat-grid">
            {categories.map((c: Category) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="dz-cat-card"
                style={{ "--cc": c.color } as any}
              >
                <div className="dz-cat-art" aria-hidden="true">
                  <ProductArt kind={c.art} color="#ffffff" />
                </div>
                <div className="dz-cat-meta">
                  <h3 className="dz-cat-name display">{c.name}</h3>
                  <span className="dz-cat-count">
                    {productsByCategory(c.slug).length} מוצרים ←
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FEATURED — restrained color tiles ---------- */}
      {featured.length > 0 && (
        <section className="dz-section dz-section-tint dz-reveal">
          <div className="dz-shell">
            <div className="dz-sec-head">
              <span className="dz-eyebrow">נבחרים</span>
              <h2 className="dz-h2">מהמדפים שלנו</h2>
            </div>
            <div className="dz-feat-grid">
              {featured.map((p) => (
                <Link key={p.id} to={`/product/${p.id}`} className="dz-feat-card">
                  <div className="dz-feat-media">
                    <ProductThumb product={p} />
                  </div>
                  <div className="dz-feat-body">
                    <span className="dz-feat-name">{p.name}</span>
                    <span className="dz-feat-price">{shekel(finalPrice(p))}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- QUOTE / STORY BAND ---------- */}
      <section className="dz-quote dz-reveal">
        <div className="dz-shell dz-quote-inner">
          <h2 className="dz-quote-title display">כל יצירה גדולה מתחילה בלב</h2>
          <p className="dz-quote-text">
            לא רק קונים — מתייעצים, ממששים את הנייר, משווים גוונים מול האור,
            ויוצאים עם בדיוק מה שהפרויקט הבא צריך. מאז {store.since}, ברחובות.
          </p>
        </div>
      </section>

      {/* ---------- WORKSHOPS ---------- */}
      <section className="dz-section dz-reveal">
        <div className="dz-shell">
          <div className="dz-shop">
            <div className="dz-shop-art" aria-hidden="true">
              <ProductArt kind="brush" color="#ffffff" />
            </div>
            <div className="dz-shop-body">
              <span className="dz-eyebrow dz-eyebrow-light">בחנות</span>
              <h2 className="dz-h2 dz-h2-light">חוגים וסדנאות</h2>
              <p className="dz-shop-intro">{workshops.intro}</p>
              <div className="dz-chips">
                {workshops.topics.map((t) => (
                  <span key={t} className="dz-chip">
                    {t}
                  </span>
                ))}
              </div>
              <div className="dz-shop-meta">
                <span className="dz-shop-when">🗓 {workshops.schedule}</span>
                <a
                  href={`tel:${workshops.contactTel}`}
                  className="dz-btn dz-btn-light"
                >
                  להרשמה: {workshops.contact}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- VISIT — hours + contact ---------- */}
      <section className="dz-section dz-section-tint dz-reveal">
        <div className="dz-shell dz-visit">
          <div className="dz-vcard">
            <span className="dz-eyebrow">מתי</span>
            <h3 className="dz-vcard-title">שעות פתיחה</h3>
            <table className="dz-hours">
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
          <div className="dz-vcard">
            <span className="dz-eyebrow">איפה</span>
            <h3 className="dz-vcard-title">קופצים לבקר?</h3>
            <div className="dz-rows">
              <div>📍 {store.address}</div>
              <div>
                📞 <a href={`tel:${store.phone}`}>{store.phone}</a>
              </div>
              <div>
                ✉️ <a href={`mailto:${store.email}`}>{store.email}</a>
              </div>
            </div>
            <div className="dz-vactions">
              <a
                href={store.waze}
                target="_blank"
                rel="noreferrer"
                className="dz-btn dz-btn-pop"
              >
                פותחים Waze
              </a>
              <a
                href={store.maps}
                target="_blank"
                rel="noreferrer"
                className="dz-btn dz-btn-ghost"
              >
                מפת Google
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default DesignPop;
