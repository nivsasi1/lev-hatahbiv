import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  categories,
  products,
  productsByCategory,
  getProduct,
  finalPrice,
  shekel,
  siteSettings,
  store,
  workshops,
  asset,
  Category,
  Product,
} from "../../data/catalog";
import { ProductThumb } from "../../components/ProductThumb";
import { ProductArt } from "../../components/ProductArt";
import { Splat } from "../../components/Splat";
import "./design-craft.css";

/* ---------------------------------------------------------------------------
   DesignCraft — "Warm Craft / Sticker"
   A refined take on the store's handcrafted Atelier character: cream surface,
   ink borders + hard offset shadows, rotated sticker chips, marker highlights.
   Cohesive + tidy: the category section is COMPACT colour-coded sticker chips
   (SVG art, no photos) to fix the old photo-heavy overwhelm, and the On-Sale
   section sits high (right after hero) with BIG red prices and a solid,
   high-contrast discount tag.
   --------------------------------------------------------------------------- */

const onSale = (p: Product) => Boolean(p.salePrice && !p.soldOut && p.img);

// Up to 6 sale items for the headline grid. Prefer manager-curated saleIds,
// else the first on-sale products from real inventory.
const saleItems: Product[] = (
  siteSettings.saleIds.length > 0
    ? siteSettings.saleIds
        .map((id) => getProduct(id))
        .filter((p): p is Product => Boolean(p) && onSale(p as Product))
    : products.filter(onSale)
).slice(0, 6);

// Featured strip: manager picks, else a Hebrew-named, photographed item per
// staple category (same spirit as MainHome's heuristic, trimmed).
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
).slice(0, 4);

const salePct = (p: Product) =>
  p.salePrice ? Math.round((1 - p.salePrice / p.price) * 100) : 0;

// gentle, deterministic rotation per index so chips/cards feel hand-placed
const tilt = (i: number) => {
  const seq = [-2.2, 1.6, -1.2, 2.4, -1.8, 1.1, -2.6, 1.9];
  return seq[i % seq.length];
};

function SaleCard({ p, i }: { p: Product; i: number }) {
  const pct = salePct(p);
  return (
    <Link
      to={`/product/${p.id}`}
      className="dz-sale-card"
      style={{ ["--tilt" as any]: `${tilt(i)}deg` }}
    >
      <div className="dz-sale-media">
        <ProductThumb product={p} />
        {pct > 0 && (
          <span className="dz-tag" aria-hidden="true">
            <span className="dz-tag-num">{pct}%-</span>
          </span>
        )}
      </div>
      <div className="dz-sale-info">
        <h3 className="dz-sale-name">{p.name}</h3>
        <div className="dz-price-row">
          <span className="dz-price-now">{shekel(finalPrice(p))}</span>
          <span className="dz-price-was">{shekel(p.price)}</span>
        </div>
      </div>
    </Link>
  );
}

export default function DesignCraft() {
  const ref = useRef<HTMLElement>(null);

  /* Gentle scroll-reveal, fully gated behind reduced-motion and fail-open:
     the hidden start state only applies once JS adds .is-reveal. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced || !("IntersectionObserver" in window)) return;

    el.classList.add("is-reveal");
    const targets = el.querySelectorAll<HTMLElement>(".dz-reveal");
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          (e.target as HTMLElement).classList.add("in");
          obs.unobserve(e.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <main className="dz-craft page-main" ref={ref}>
      {/* ---------- 1) HERO ---------- */}
      <section className="dz-hero">
        <Splat
          color="#d99a2b"
          size={70}
          style={{ top: "8%", insetInlineStart: "4%", opacity: 0.5 }}
          className="dz-splat"
        />
        <Splat
          color="#c75b41"
          size={58}
          style={{ bottom: "10%", insetInlineEnd: "6%", opacity: 0.45 }}
          className="dz-splat"
        />
        <div className="dz-hero-inner">
          <span className="dz-eyebrow">חנות ציוד האמנות של רחובות · מאז {store.since}</span>
          <h1 className="dz-hero-logo">
            <img
              src={asset("/images/LevHatahbivLogo.png")}
              alt="לב התחביב"
              loading="eager"
            />
          </h1>
          <p className="dz-hero-title display">
            כל יצירה <span className="dz-hl">מתחילה כאן</span>
          </p>
          <p className="dz-hero-sub">
            צבעים, מכחולים, נייר וחוטים — חנות משפחתית עם כל מה שהידיים שלכם
            מחפשות, ועם עצה טובה ליד הקופה.
          </p>
          <div className="dz-hero-ctas">
            <Link to={`/category/${categories[0].slug}`} className="dz-btn dz-btn-fill">
              לצאת למסע בין המדפים
            </Link>
            <a
              href={store.waze}
              target="_blank"
              rel="noreferrer"
              className="dz-btn dz-btn-line"
            >
              ניווט לחנות ←
            </a>
          </div>
        </div>
      </section>

      {/* ---------- 2) ON SALE — high, headline, big red prices ---------- */}
      {saleItems.length > 0 && (
        <section className="dz-sec dz-reveal">
          <div className="dz-shell">
            <header className="dz-sec-head">
              <span className="dz-eyebrow dz-eyebrow-sale">מבצעי השבוע</span>
              <h2 className="display">
                <span className="dz-hl dz-hl-red">במבצע עכשיו</span>
              </h2>
            </header>
            <div className="dz-sale-grid">
              {saleItems.map((p, i) => (
                <SaleCard key={p.id} p={p} i={i} />
              ))}
            </div>
            <div className="dz-more">
              <Link to="/sale" className="dz-btn dz-btn-line">
                לעוד מבצעים ←
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ---------- 3) CATEGORIES — compact sticker chips, colour-coded ---------- */}
      <section className="dz-sec dz-sec-soft dz-reveal">
        <div className="dz-shell">
          <header className="dz-sec-head">
            <span className="dz-eyebrow">המדפים שלנו</span>
            <h2 className="display">מה מחפשים היום?</h2>
          </header>
          <div className="dz-chips">
            {categories.map((c: Category, i) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="dz-chip"
                style={{
                  ["--cc" as any]: c.color,
                  ["--soft" as any]: c.soft,
                  ["--tilt" as any]: `${tilt(i)}deg`,
                }}
              >
                <span className="dz-chip-art">
                  <ProductArt kind={c.art} color={c.color} />
                </span>
                <span className="dz-chip-name display">{c.name}</span>
                <span className="dz-chip-count">
                  {productsByCategory(c.slug).length} מוצרים
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 4) FEATURED — restrained sticker row ---------- */}
      {featured.length > 0 && (
        <section className="dz-sec dz-reveal">
          <div className="dz-shell">
            <header className="dz-sec-head">
              <span className="dz-eyebrow">בחירת החנות</span>
              <h2 className="display">נבחרים מהמדפים</h2>
            </header>
            <div className="dz-feat-grid">
              {featured.map((p, i) => (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="dz-feat-card"
                  style={{ ["--tilt" as any]: `${tilt(i + 3)}deg` }}
                >
                  <div className="dz-feat-media">
                    <ProductThumb product={p} />
                  </div>
                  <div className="dz-feat-info">
                    <h3>{p.name}</h3>
                    <span className="dz-feat-price">{shekel(finalPrice(p))}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- 5) QUOTE / STORY BAND ---------- */}
      <section className="dz-quote dz-reveal">
        <div className="dz-shell dz-quote-inner">
          <p className="dz-quote-mark display" aria-hidden="true">
            “
          </p>
          <h2 className="display">כל יצירה גדולה מתחילה בלב</h2>
          <p className="dz-quote-body">
            לא רק קונים — מתייעצים, ממששים את הנייר, משווים גוונים מול האור,
            ויוצאים עם בדיוק מה שהפרויקט הבא צריך. מאז {store.since}, ברחובות.
          </p>
        </div>
      </section>

      {/* ---------- 6) WORKSHOPS ---------- */}
      <section className="dz-sec dz-sec-soft dz-reveal">
        <div className="dz-shell">
          <div className="dz-shop">
            <div className="dz-shop-body">
              <span className="dz-eyebrow">בחנות</span>
              <h2 className="display">חוגים וסדנאות</h2>
              <p className="dz-shop-intro">{workshops.intro}</p>
              <div className="dz-shop-chips">
                {workshops.topics.map((t) => (
                  <span key={t} className="dz-mini-chip">
                    {t}
                  </span>
                ))}
              </div>
              <div className="dz-shop-meta">
                <span className="dz-shop-when">🗓 {workshops.schedule}</span>
                <a
                  href={`tel:${workshops.contactTel}`}
                  className="dz-btn dz-btn-fill"
                >
                  להרשמה: {workshops.contact}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 7) VISIT — hours + contact ---------- */}
      <section className="dz-sec dz-reveal">
        <div className="dz-shell dz-visit">
          <div className="dz-vcard">
            <h3 className="display">שעות פתיחה</h3>
            <table>
              <tbody>
                {store.hours.map((h) => (
                  <tr key={h.days}>
                    <td>{h.days}</td>
                    <td className="dz-v-time">{h.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dz-vcard">
            <h3 className="display">קופצים לבקר?</h3>
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
                className="dz-btn dz-btn-fill"
              >
                פותחים Waze
              </a>
              <a
                href={store.maps}
                target="_blank"
                rel="noreferrer"
                className="dz-btn dz-btn-line"
              >
                מפת Google
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
