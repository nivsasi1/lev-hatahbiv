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
  isOnSale,
  salePct,
  Category,
  Product,
} from "../../data/catalog";
import { ProductThumb } from "../../components/ProductThumb";
import { ProductArt } from "../../components/ProductArt";
import "./design-brutal.css";

/* ---------------------------------------------------------------------------
   DesignBrutal — "Neo-Brutalist" homepage variant.

   Direction: raw, high-contrast, functional 2026 neo-brutalism. Thick 3px black
   borders on everything, hard offset drop-shadows (6px 6px 0 #111), no rounded
   corners, flat primary fills (NO gradients), oversized headings mixing Amatic
   display with a heavy mono/sans label voice. Buttons "press" — the shadow
   shifts under a translate. Sales lead the page; the discounted price is HUGE.

   Content mirrors MainHome; the LOOK is replaced. All CSS is scoped under
   .dz-brutal. Motion is gated behind prefers-reduced-motion and fails open.
   --------------------------------------------------------------------------- */

// Up to 6 sale items for the headline band (manager-curated saleIds win).
// Reuse catalog's shared isOnSale rule — do not re-derive sale logic.
const saleItems: Product[] = (
  siteSettings.saleIds.length > 0
    ? siteSettings.saleIds
        .map((id) => getProduct(id))
        .filter((p): p is Product => Boolean(p) && isOnSale(p as Product))
    : products.filter(isOnSale)
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

// A brutalist sale card — white box, thick black border + hard shadow, a
// rotated bordered "25%-" sticker on the image, and a HUGE now-price in
// sale-red with the original struck beside it.
const SaleCard = ({ p }: { p: Product }) => {
  const pct = salePct(p);
  return (
    <Link to={`/product/${p.id}`} className="dz-b-sale-card">
      <div className="dz-b-sale-media">
        <ProductThumb product={p} />
        {pct > 0 && (
          <span className="dz-b-tag" aria-hidden="true">
            {pct}%-
          </span>
        )}
      </div>
      <div className="dz-b-sale-body">
        <span className="dz-b-sale-name">{p.name}</span>
        <div className="dz-b-sale-prices">
          <span className="dz-b-sale-now">{shekel(finalPrice(p))}</span>
          <span className="dz-b-sale-was">{shekel(p.price)}</span>
        </div>
      </div>
    </Link>
  );
};

export const DesignBrutal = () => {
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
    const targets = el.querySelectorAll<HTMLElement>(".dz-b-reveal");
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).classList.add("in");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <main className="dz-brutal page-main" ref={ref}>
      {/* ---------- HERO — big blocky headline box + logo + loud CTA ---------- */}
      <section className="dz-b-hero">
        <div className="dz-b-hero-grid">
          <div className="dz-b-headbox">
            <span className="dz-b-eyebrow">מאז {store.since} · רחובות</span>
            <h1 className="dz-b-headline display">
              כל יצירה
              <br />
              מתחילה
              <mark className="dz-b-mark"> כאן.</mark>
            </h1>
            <p className="dz-b-hero-sub">
              צבעים, מכחולים, נייר וחוטים — חנות משפחתית עם כל מה שהידיים שלכם
              מחפשות, ועם עצה טובה ליד הקופה.
            </p>
            <div className="dz-b-hero-ctas">
              <Link
                to={`/category/${categories[0].slug}`}
                className="dz-b-btn dz-b-btn-blue"
              >
                למסע בין המדפים 🎨
              </Link>
              <a
                href={store.waze}
                target="_blank"
                rel="noreferrer"
                className="dz-b-btn dz-b-btn-plain"
              >
                ניווט לחנות ←
              </a>
            </div>
          </div>

          <div className="dz-b-logobox">
            <img
              src={asset("/images/LevHatahbivLogo.png")}
              alt="לב התחביב"
              loading="eager"
              className="dz-b-logo"
            />
            <span className="dz-b-logo-strip">חנות ציוד האמנות של רחובות</span>
          </div>
        </div>
      </section>

      {/* ---------- ON SALE — leads the page: bordered cards, HUGE red price ---------- */}
      {saleItems.length > 0 && (
        <section className="dz-b-section dz-b-reveal">
          <div className="dz-b-shell">
            <div className="dz-b-sec-head">
              <div className="dz-b-sec-titles">
                <span className="dz-b-eyebrow dz-b-eyebrow-red">חיסכון חם</span>
                <h2 className="dz-b-h2">מבצעים 🔥</h2>
              </div>
              <Link to="/sale" className="dz-b-btn dz-b-btn-yellow dz-b-more">
                לעוד מבצעים ←
              </Link>
            </div>
            <div className="dz-b-sale-grid">
              {saleItems.map((p) => (
                <SaleCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- CATEGORIES — bold bordered color blocks + B/W ProductArt ---------- */}
      <section className="dz-b-section dz-b-reveal">
        <div className="dz-b-shell">
          <div className="dz-b-sec-head">
            <div className="dz-b-sec-titles">
              <span className="dz-b-eyebrow">המחלקות</span>
              <h2 className="dz-b-h2">בוחרים מדף</h2>
            </div>
          </div>
          <div className="dz-b-cat-grid">
            {categories.map((c: Category) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="dz-b-cat-card"
                style={{ "--cc": c.color } as any}
              >
                <div className="dz-b-cat-art" aria-hidden="true">
                  <ProductArt kind={c.art} color="#111111" />
                </div>
                <div className="dz-b-cat-meta">
                  <h3 className="dz-b-cat-name">{c.name}</h3>
                  <span className="dz-b-cat-count">
                    {productsByCategory(c.slug).length} מוצרים ←
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FEATURED — bordered product tiles ---------- */}
      {featured.length > 0 && (
        <section className="dz-b-section dz-b-reveal">
          <div className="dz-b-shell">
            <div className="dz-b-sec-head">
              <div className="dz-b-sec-titles">
                <span className="dz-b-eyebrow">נבחרים</span>
                <h2 className="dz-b-h2">מהמדפים שלנו</h2>
              </div>
            </div>
            <div className="dz-b-feat-grid">
              {featured.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="dz-b-feat-card"
                >
                  <div className="dz-b-feat-media">
                    <ProductThumb product={p} />
                  </div>
                  <div className="dz-b-feat-body">
                    <span className="dz-b-feat-name">{p.name}</span>
                    <span className="dz-b-feat-price">
                      {shekel(finalPrice(p))}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- QUOTE / STORY BAND — blue block, big display ---------- */}
      <section className="dz-b-quote dz-b-reveal">
        <div className="dz-b-shell dz-b-quote-inner">
          <h2 className="dz-b-quote-title display">
            כל יצירה גדולה מתחילה בלב
          </h2>
          <p className="dz-b-quote-text">
            לא רק קונים — מתייעצים, ממששים את הנייר, משווים גוונים מול האור,
            ויוצאים עם בדיוק מה שהפרויקט הבא צריך. מאז {store.since}, ברחובות.
          </p>
        </div>
      </section>

      {/* ---------- WORKSHOPS — bordered block, no price ---------- */}
      <section className="dz-b-section dz-b-reveal">
        <div className="dz-b-shell">
          <div className="dz-b-shop">
            <div className="dz-b-shop-art" aria-hidden="true">
              <ProductArt kind="brush" color="#111111" />
            </div>
            <div className="dz-b-shop-body">
              <span className="dz-b-eyebrow">בחנות</span>
              <h2 className="dz-b-h2">חוגים וסדנאות</h2>
              <p className="dz-b-shop-intro">{workshops.intro}</p>
              <div className="dz-b-chips">
                {workshops.topics.map((t) => (
                  <span key={t} className="dz-b-chip">
                    {t}
                  </span>
                ))}
              </div>
              <div className="dz-b-shop-meta">
                <span className="dz-b-shop-when">🗓 {workshops.schedule}</span>
                <a
                  href={`tel:${workshops.contactTel}`}
                  className="dz-b-btn dz-b-btn-pink"
                >
                  להרשמה: {workshops.contact}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- VISIT — hours + contact, two bordered cards ---------- */}
      <section className="dz-b-section dz-b-reveal">
        <div className="dz-b-shell dz-b-visit">
          <div className="dz-b-vcard">
            <span className="dz-b-eyebrow">מתי</span>
            <h3 className="dz-b-vcard-title">שעות פתיחה</h3>
            <table className="dz-b-hours">
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
          <div className="dz-b-vcard">
            <span className="dz-b-eyebrow">איפה</span>
            <h3 className="dz-b-vcard-title">קופצים לבקר?</h3>
            <div className="dz-b-rows">
              <div>📍 {store.address}</div>
              <div>
                📞 <a href={`tel:${store.phone}`}>{store.phone}</a>
              </div>
              <div>
                ✉️ <a href={`mailto:${store.email}`}>{store.email}</a>
              </div>
            </div>
            <div className="dz-b-vactions">
              <a
                href={store.waze}
                target="_blank"
                rel="noreferrer"
                className="dz-b-btn dz-b-btn-blue"
              >
                פותחים Waze
              </a>
              <a
                href={store.maps}
                target="_blank"
                rel="noreferrer"
                className="dz-b-btn dz-b-btn-plain"
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

export default DesignBrutal;
