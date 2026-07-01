import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  categories,
  products,
  productsByCategory,
  getProduct,
  getCategory,
  siteSettings,
  store,
  workshops,
  asset,
  isOnSale,
  salePct,
  finalPrice,
  shekel,
  Product,
  Category,
  ArtKind,
} from "../../data/catalog";
import { ProductThumb } from "../../components/ProductThumb";
import { ProductArt } from "../../components/ProductArt";
import "./design-clay.css";

/* ---------------------------------------------------------------------------
   DesignClay — "Soft Clay" homepage concept (claymorphism / pastel).
   Warm cream ground, pastel puffy panels with soft double shadows, pillowy
   pill buttons that press inward on click. Mirrors MainHome's content
   (hero → sale → categories → story → workshops → visit) in a calm, tactile,
   family-friendly look. Everything reads from the real catalog; no props.
   --------------------------------------------------------------------------- */

// Up to 6 on-sale items near the top (same source of truth as the live home:
// manager-picked saleIds first, else the first on-sale products).
const saleItems: Product[] = (
  siteSettings.saleIds.length > 0
    ? siteSettings.saleIds
        .map((id) => getProduct(id))
        .filter((p): p is Product => Boolean(p) && isOnSale(p!))
    : products.filter(isOnSale)
).slice(0, 6);

// a playful clay-friendly emoji per category art kind for the workshops aside
const WORKSHOP_EMOJI = "🧶";

const SaleCard = ({ p }: { p: Product }) => {
  const cat = getCategory(p.category);
  return (
    <Link to={`/product/${p.id}`} className="cl-card cl-reveal">
      <div className="cl-card-media">
        <span className="cl-badge">{salePct(p)}%-</span>
        <ProductThumb product={p} />
      </div>
      <div className="cl-card-body">
        {cat && <span className="cl-card-cat">{cat.name}</span>}
        <span className="cl-card-name">{p.name}</span>
        <div className="cl-price-row">
          <span className="cl-price-now">{shekel(finalPrice(p))}</span>
          <span className="cl-price-was">{shekel(p.price)}</span>
        </div>
      </div>
    </Link>
  );
};

export default function DesignClay() {
  const ref = useRef<HTMLElement>(null);

  /* Gentle staggered scroll-reveal. FAIL-OPEN: content is fully visible
     without JS; we only add .cl-anim (which hides the start state) once JS
     runs AND reduced-motion is off. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) return;

    el.classList.add("cl-anim");
    const targets = el.querySelectorAll<HTMLElement>(".cl-reveal");

    if (!("IntersectionObserver" in window)) {
      targets.forEach((t) => t.classList.add("cl-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const node = entry.target as HTMLElement;
          const parent = node.parentElement;
          if (parent) {
            const peers = Array.from(
              parent.querySelectorAll<HTMLElement>(":scope > .cl-reveal")
            );
            const idx = peers.indexOf(node);
            node.style.setProperty("--cl-delay", `${(idx % 6) * 70}ms`);
          }
          node.classList.add("cl-in");
          obs.unobserve(node);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <main className="dz-clay page-main" ref={ref}>
      {/* ---------- HERO ---------- */}
      <section className="cl-hero">
        <div className="cl-shell">
          <div className="cl-hero-panel">
            <span className="cl-dab cl-dab-1" aria-hidden="true" />
            <span className="cl-dab cl-dab-2" aria-hidden="true" />
            <span className="cl-dab cl-dab-3" aria-hidden="true" />

            <div className="cl-hero-copy">
              <span className="cl-hero-since">מאז {store.since} · רחובות</span>
              <h1 className="cl-hero-title">
                כל יצירה <span className="cl-accent">מתחילה כאן</span>
              </h1>
              <p className="cl-hero-sub">
                צבעים, מכחולים, נייר וחוטים — חנות משפחתית רכה וחמה עם כל מה
                שהידיים שלכם מחפשות, ועם עצה טובה ליד הקופה.
              </p>
              <div className="cl-hero-ctas">
                <Link
                  to={`/category/${categories[0].slug}`}
                  className="cl-btn cl-btn-primary"
                >
                  למסע בין המדפים 🎨
                </Link>
                <a
                  href={store.waze}
                  target="_blank"
                  rel="noreferrer"
                  className="cl-link"
                >
                  ניווט לחנות ←
                </a>
              </div>
            </div>

            <div className="cl-hero-stage">
              <img
                className="cl-hero-logo"
                src={asset("/images/LevHatahbivLogo.png")}
                alt="לב התחביב"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- SALE (near the top, ≤6 + link) ---------- */}
      {saleItems.length > 0 && (
        <section className="cl-sec" aria-labelledby="cl-sale-h">
          <div className="cl-shell">
            <div className="cl-sec-head">
              <span className="cl-eyebrow">מבצעים</span>
              <h2 id="cl-sale-h" className="cl-display">
                חמים מהתנור
              </h2>
              <p>המחירים שכדאי לתפוס — בזמן שהם עוד כאן.</p>
            </div>
            <div className="cl-sale-grid">
              {saleItems.map((p) => (
                <SaleCard key={p.id} p={p} />
              ))}
            </div>
            <div className="cl-sale-more">
              <Link to="/sale" className="cl-btn cl-btn-rose">
                לעוד מבצעים ←
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ---------- CATEGORIES — calm pastel clay chips ---------- */}
      <section className="cl-sec" aria-labelledby="cl-cats-h">
        <div className="cl-shell">
          <div className="cl-sec-head">
            <span className="cl-eyebrow">מדפים</span>
            <h2 id="cl-cats-h" className="cl-display">
              בוחרים תחום ומתחילים
            </h2>
            <p>כל מדף בגוון משלו — רך, מוכר ומזמין לגעת.</p>
          </div>
          <div className="cl-cats">
            {categories.map((c: Category) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="cl-chip cl-reveal"
                style={{
                  ["--chip-soft" as any]: c.soft,
                  ["--chip-color" as any]: c.color,
                }}
              >
                <span className="cl-chip-art" aria-hidden="true">
                  <ProductArtChip kind={c.art} color={c.color} />
                </span>
                <span className="cl-chip-name">{c.name}</span>
                <span className="cl-chip-blurb">{c.blurb}</span>
                <span className="cl-chip-count">
                  {productsByCategory(c.slug).length} מוצרים ←
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- STORY / QUOTE band ---------- */}
      <section className="cl-quote">
        <div className="cl-shell">
          <div className="cl-quote-panel cl-reveal">
            <h2 className="cl-display">כל יצירה גדולה מתחילה בלב</h2>
            <p>
              לא רק קונים — מתייעצים, ממששים את הנייר, משווים גוונים מול האור,
              ויוצאים עם בדיוק מה שהפרויקט הבא צריך. מאז {store.since}, ברחובות.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- WORKSHOPS ---------- */}
      <section className="cl-sec" aria-labelledby="cl-shop-h">
        <div className="cl-shell">
          <div className="cl-shop">
            <div className="cl-shop-body cl-reveal">
              <h2 id="cl-shop-h" className="cl-display">
                חוגים וסדנאות
              </h2>
              <p className="cl-intro">{workshops.intro}</p>
              <div className="cl-chips">
                {workshops.topics.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <div className="cl-shop-meta">
                <span className="cl-shop-when">🗓 {workshops.schedule}</span>
                <a
                  href={`tel:${workshops.contactTel}`}
                  className="cl-btn cl-btn-primary"
                >
                  להרשמה: {workshops.contact}
                </a>
              </div>
            </div>
            <div className="cl-shop-aside cl-reveal" aria-hidden="true">
              <span className="cl-aside-emoji">{WORKSHOP_EMOJI}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- VISIT — hours + contact ---------- */}
      <section className="cl-sec" style={{ paddingTop: 0 }}>
        <div className="cl-shell">
          <div className="cl-visit">
            <div className="cl-vcard cl-reveal">
              <h3 className="cl-display">שעות פתיחה</h3>
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
            <div className="cl-vcard cl-reveal">
              <h3 className="cl-display">קופצים לבקר?</h3>
              <div className="cl-rows">
                <div>📍 {store.address}</div>
                <div>
                  📞 <a href={`tel:${store.phone}`}>{store.phone}</a>
                </div>
                <div>
                  ✉️ <a href={`mailto:${store.email}`}>{store.email}</a>
                </div>
              </div>
              <div className="cl-vactions">
                <a
                  href={store.waze}
                  target="_blank"
                  rel="noreferrer"
                  className="cl-btn cl-btn-primary"
                >
                  פותחים Waze
                </a>
                <a
                  href={store.maps}
                  target="_blank"
                  rel="noreferrer"
                  className="cl-btn"
                >
                  מפת Google
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* Small inline wrapper so category chips render the parametric ProductArt SVG
   in the category's own color (reuses the exact ArtKind SVGs from ProductArt). */
function ProductArtChip({ kind, color }: { kind: ArtKind; color: string }) {
  return <ProductArt kind={kind} color={color} />;
}
