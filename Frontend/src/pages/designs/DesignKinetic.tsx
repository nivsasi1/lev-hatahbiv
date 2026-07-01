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
import "./design-kinetic.css";

/* ---------------------------------------------------------------------------
   DesignKinetic — "Kinetic Pop" homepage variant.

   Direction: energetic and alive — 2026 kinetic-typography + animated
   mesh-gradient trend. A slowly-shifting coral/violet/teal gradient behind a
   big Amatic headline whose words spring in with a stagger; a magnetic CTA;
   scroll-reveal stagger on sales + categories; hover lifts + a shimmer sweep on
   sale badges. Motion is transform/opacity only, rAF-throttled, and ALL gated
   behind prefers-reduced-motion — content is fully visible without JS (fail-open).

   Content mirrors MainHome; the LOOK is replaced. All CSS is scoped under
   .dz-kinetic.
   --------------------------------------------------------------------------- */

// Up to 6 sale items for the near-top band (manager-curated saleIds win, same
// rule the sale page + homepage share via isOnSale).
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

// Big Amatic headline, split into words so each can spring in on its own delay.
const HEAD_WORDS = ["כל", "יצירה", "מתחילה", "כאן"];

// A kinetic sale card — lifts/scales on hover, a shimmer sweep on the pulsing
// starburst badge, BIG sale-red price, small struck original.
const SaleCard = ({ p }: { p: Product }) => {
  const pct = salePct(p);
  return (
    <Link to={`/product/${p.id}`} className="dz-sale-card dz-reveal">
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

export const DesignKinetic = () => {
  const ref = useRef<HTMLElement>(null);

  /* ---------------------------------------------------------------------------
     Motion, all scoped to this <main>:
       1) hero kinetic headline  (add .play → CSS springs each word in)
       2) staggered scroll reveals (IntersectionObserver → adds "in")
       3) magnetic CTAs           (one shared rAF loop lerps buttons to pointer)
     FAIL-OPEN: the hidden reveal/headline start states live behind .dz-anim,
     added ONLY when JS runs AND reduced-motion is off. Under reduced motion (or
     no JS) we return early and everything stays fully visible + static.
     --------------------------------------------------------------------------- */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) return; // fail-open: never hide, never animate

    // JS confirmed + motion allowed → let CSS apply the hidden start states.
    el.classList.add("dz-anim");

    const cleanups: Array<() => void> = [];

    // -- 1) hero kinetic headline: play on next frame so the transition runs ---
    const raf0 = requestAnimationFrame(() => el.classList.add("dz-play"));
    cleanups.push(() => cancelAnimationFrame(raf0));

    // -- 2) staggered scroll reveals ------------------------------------------
    const targets = el.querySelectorAll<HTMLElement>(".dz-reveal");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const node = entry.target as HTMLElement;
            // gentle stagger inside a freshly-revealed group
            const group = node.parentElement;
            if (group) {
              const peers = Array.prototype.slice.call(
                group.querySelectorAll(":scope > .dz-reveal")
              ) as HTMLElement[];
              const idx = peers.indexOf(node);
              if (idx > 0) {
                node.style.setProperty(
                  "--reveal-delay",
                  (idx % 6) * 70 + "ms"
                );
              }
            }
            node.classList.add("in");
            obs.unobserve(node);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      targets.forEach((t) => io.observe(t));
      cleanups.push(() => io.disconnect());
    } else {
      targets.forEach((t) => t.classList.add("in")); // fail-open
    }

    // -- 3) magnetic CTAs ------------------------------------------------------
    type Mag = { node: HTMLElement; tx: number; ty: number; cx: number; cy: number };
    const mags: Mag[] = Array.prototype.slice
      .call(el.querySelectorAll<HTMLElement>(".dz-magnetic"))
      .map((node: HTMLElement) => ({ node, tx: 0, ty: 0, cx: 0, cy: 0 }));

    const RADIUS = 120; // px proximity at which the pull begins
    const PULL = 0.28; // fraction of the offset followed

    const onPointerMove = (e: PointerEvent) => {
      for (const m of mags) {
        const r = m.node.getBoundingClientRect();
        const mx = r.left + r.width / 2;
        const my = r.top + r.height / 2;
        const dx = e.clientX - mx;
        const dy = e.clientY - my;
        if (Math.hypot(dx, dy) < RADIUS) {
          m.cx = dx * PULL;
          m.cy = dy * PULL;
        } else {
          m.cx = 0;
          m.cy = 0;
        }
      }
    };
    const onBlur = () => {
      for (const m of mags) {
        m.cx = 0;
        m.cy = 0;
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("blur", onBlur, { passive: true });
    cleanups.push(() => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("blur", onBlur);
    });

    // -- shared rAF loop: spring each button toward its target ----------------
    let raf = 0;
    const tick = () => {
      for (const m of mags) {
        m.tx += (m.cx - m.tx) * 0.16;
        m.ty += (m.cy - m.ty) * 0.16;
        if (
          Math.abs(m.tx) < 0.05 &&
          Math.abs(m.ty) < 0.05 &&
          m.cx === 0 &&
          m.cy === 0
        ) {
          m.tx = 0;
          m.ty = 0;
          m.node.style.setProperty("--mag-x", "0px");
          m.node.style.setProperty("--mag-y", "0px");
        } else {
          m.node.style.setProperty("--mag-x", m.tx.toFixed(2) + "px");
          m.node.style.setProperty("--mag-y", m.ty.toFixed(2) + "px");
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    cleanups.push(() => cancelAnimationFrame(raf));

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <main className="dz-kinetic page-main" ref={ref}>
      {/* ---------- HERO — kinetic typography over a moving mesh gradient ---------- */}
      <section className="dz-hero">
        <div className="dz-mesh" aria-hidden="true">
          <span className="dz-mesh-a" />
          <span className="dz-mesh-b" />
          <span className="dz-mesh-c" />
        </div>
        <div className="dz-hero-inner">
          <span className="dz-eyebrow">מאז {store.since} · רחובות</span>
          <h1 className="dz-hero-head display" aria-label="כל יצירה מתחילה כאן">
            {HEAD_WORDS.map((w, i) => (
              <span
                key={w}
                className="dz-word"
                style={{ "--w": i } as any}
                aria-hidden="true"
              >
                {w}
              </span>
            ))}
          </h1>
          <div className="dz-hero-logo">
            <img
              src={asset("/images/LevHatahbivLogo.png")}
              alt="לב התחביב"
              loading="eager"
            />
          </div>
          <p className="dz-hero-sub">
            צבעים, מכחולים, נייר וחוטים — חנות משפחתית עם כל מה שהידיים שלכם
            מחפשות, ועם עצה טובה ליד הקופה.
          </p>
          <div className="dz-hero-ctas">
            <Link
              to={`/category/${categories[0].slug}`}
              className="dz-btn dz-btn-pop dz-magnetic"
            >
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

      {/* ---------- MARQUEE RIBBON — kinetic strip of store promises ---------- */}
      <div className="dz-marquee" aria-hidden="true">
        <div className="dz-marquee-track">
          {[0, 1].map((dup) => (
            <div className="dz-marquee-group" key={dup}>
              {siteSettings.ribbonTexts.map((t, i) => (
                <span className="dz-marquee-item" key={`${dup}-${i}`}>
                  {t}
                  <span className="dz-marquee-dot">✳</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ---------- ON SALE — near-top band, the headline of the page ---------- */}
      {saleItems.length > 0 && (
        <section className="dz-section dz-sale-band">
          <div className="dz-shell">
            <div className="dz-sec-head dz-reveal">
              <div>
                <span className="dz-eyebrow dz-eyebrow-red">חיסכון חם</span>
                <h2 className="dz-h2 dz-h2-red">מבצעים עכשיו</h2>
              </div>
              <Link to="/sale" className="dz-more-link dz-magnetic">
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

      {/* ---------- CATEGORIES — calm color chips that pop on hover ---------- */}
      <section className="dz-section">
        <div className="dz-shell">
          <div className="dz-sec-head dz-reveal">
            <div>
              <span className="dz-eyebrow">המחלקות</span>
              <h2 className="dz-h2">בוחרים מדף, מתחילים ליצור</h2>
            </div>
          </div>
          <div className="dz-cat-grid">
            {categories.map((c: Category) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="dz-cat-card dz-reveal"
                style={{ "--cc": c.color, "--soft": c.soft } as any}
              >
                <div className="dz-cat-art" aria-hidden="true">
                  <ProductArt kind={c.art} color={c.color} />
                </div>
                <div className="dz-cat-meta">
                  <h3 className="dz-cat-name">{c.name}</h3>
                  <span className="dz-cat-count">
                    {productsByCategory(c.slug).length} מוצרים ←
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FEATURED — restrained tiles with a hover lift ---------- */}
      {featured.length > 0 && (
        <section className="dz-section dz-section-tint">
          <div className="dz-shell">
            <div className="dz-sec-head dz-reveal">
              <div>
                <span className="dz-eyebrow">נבחרים</span>
                <h2 className="dz-h2">מהמדפים שלנו</h2>
              </div>
            </div>
            <div className="dz-feat-grid">
              {featured.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="dz-feat-card dz-reveal"
                >
                  <div className="dz-feat-media">
                    <ProductThumb product={p} />
                  </div>
                  <div className="dz-feat-body">
                    <span className="dz-feat-name">{p.name}</span>
                    <span className="dz-feat-price">
                      {shekel(finalPrice(p))}
                    </span>
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
      <section className="dz-section">
        <div className="dz-shell">
          <div className="dz-shop dz-reveal">
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
                  className="dz-btn dz-btn-light dz-magnetic"
                >
                  להרשמה: {workshops.contact}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- VISIT — hours + contact ---------- */}
      <section className="dz-section dz-section-tint">
        <div className="dz-shell dz-visit">
          <div className="dz-vcard dz-reveal">
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
          <div className="dz-vcard dz-reveal">
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
                className="dz-btn dz-btn-pop dz-magnetic"
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

export default DesignKinetic;
