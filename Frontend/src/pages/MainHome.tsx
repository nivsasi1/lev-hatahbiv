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
  Category,
} from "../data/catalog";
import { ProductCard } from "../components/ProductCard";
import { Splat } from "../components/Splat";
import { FeaturedRail } from "../components/HomeContent";
import "./home-photographic.css"; // design-7 body (.ph-*)
import "./main-home.css"; // hero tweak + micro-interactions + overrides (scoped under .main-home)

/* ---------------------------------------------------------------------------
   MainHome — the merged production homepage.

   BODY  = design 7 "photographic" sections (.ph-*), but with the editable
           shelf photos (siteSettings.shelfImages) in the category mosaic, the
           shared moving <FeaturedRail/> for the featured strip, and the current
           homepage's story photo behind the quote band.
   HERO  = the current split hero from HomeContent (dark statement field + logo
           stage), with the dark field shrunk and the logo visually centred via
           main-home.css.
   POLISH = design-11 micro-interactions (magnetic CTAs, gradient-fill titles,
           staggered scroll reveals), all rAF-throttled, reduced-motion-gated,
           and FAIL-OPEN so content is never hidden without JS.
   --------------------------------------------------------------------------- */

// shared art-studio photo for the quote band — same URL HomeContent uses
const STORY_IMG =
  "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1600&q=70";

// hands-on supplies for the workshops photo (same as design 7)
const SHOP_IMG =
  "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1600&q=70";

/* ---------- featured picks (same heuristic + siteSettings logic as HomeContent) ---------- */
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

// Homepage shows at most 5 sale items (same as HomeContent).
const fresh = (
  siteSettings.saleIds.length > 0
    ? siteSettings.saleIds
        .map((id) => getProduct(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p) && onSale(p!))
    : products.filter(onSale).slice(0, 5)
).slice(0, 5);

// shelf photo for a category tile — manager-editable map, never product photos
const shelfFor = (slug: string) => siteSettings.shelfImages[slug];

// mosaic rhythm: 1 big (2 rows tall) + 2 wide tiles stacked beside it, then
// standard tiles. The two wides fill the 3 columns left of the big tile on both
// of its rows, so the 6-col grid tiles cleanly with no orphaned gap.
const tileClass = (i: number) => (i === 0 ? "big" : i <= 2 ? "wide" : "std");

// `cursorFx` is an optional cursor-effect element rendered as an overlay — used
// only by the /designs preview variants. The live homepage passes nothing.
export default ({ cursorFx }: { cursorFx?: any }) => {
  const ref = useRef<HTMLElement>(null);

  /* ---------------------------------------------------------------------------
     Micro-interactions (design 11), all scoped to this <main>:
       1) staggered scroll reveals  (IntersectionObserver → adds "in")
       2) magnetic CTAs             (one shared rAF loop lerps toward pointer)
     FAIL-OPEN: the hidden initial reveal state lives behind .is-reveal, which
     is only added when JS runs AND reduced-motion is off. Under reduced motion
     we return early and leave everything fully visible.
     --------------------------------------------------------------------------- */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced) return; // fail-open: never hide, never animate

    // JS confirmed running & motion allowed → now let the CSS hide the reveal
    // start state.
    el.classList.add("is-reveal");

    const cleanups: Array<() => void> = [];

    // -- 1) scroll reveals -----------------------------------------------------
    const revealTargets = el.querySelectorAll<HTMLElement>(
      ".ph-sec, .ph-quote, .ph-tile, .p-card"
    );
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const node = entry.target as HTMLElement;
            // gentle stagger inside a freshly-revealed group of tiles/cards
            const group = node.parentElement;
            if (group && (node.matches(".ph-tile") || node.matches(".p-card"))) {
              const peers = Array.prototype.slice.call(
                group.querySelectorAll(":scope > .ph-tile, :scope > .p-card")
              ) as HTMLElement[];
              const idx = peers.indexOf(node);
              node.style.setProperty(
                "--reveal-delay",
                (idx > 0 ? (idx % 6) * 70 : 0) + "ms"
              );
            }
            node.classList.add("in");
            obs.unobserve(node);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      revealTargets.forEach((t) => io.observe(t));
      cleanups.push(() => io.disconnect());
    } else {
      // no IO → reveal everything immediately (fail-open)
      revealTargets.forEach((t) => t.classList.add("in"));
    }

    // -- 2) magnetic CTAs ------------------------------------------------------
    type Mag = { node: HTMLElement; tx: number; ty: number; cx: number; cy: number };
    const mags: Mag[] = Array.prototype.slice
      .call(el.querySelectorAll<HTMLElement>(".ph-btn, .btn"))
      .map((node: HTMLElement) => ({ node, tx: 0, ty: 0, cx: 0, cy: 0 }));

    const RADIUS = 110; // px proximity at which the pull begins
    const PULL = 0.3; // fraction of the offset followed

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
    <main className="page-main ph-home main-home" ref={ref}>
      {/* optional cursor effect — only the /designs preview variants pass one;
          the live homepage renders nothing here. */}
      {cursorFx}

      {/* ---------- 1) HERO — current split hero (shrunk field + centred logo) ---------- */}
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
          <Splat
            color="#e2574c"
            size={86}
            style={{ top: "4%", left: "2%" }}
            className="wiggle"
          />
          <Splat
            color="#2a9d8f"
            size={72}
            style={{ bottom: "6%", right: "4%", opacity: 0.85 }}
          />
          <div className="hero-stage-inner">
            <h1 className="hero-logo">
              <img src={asset("/images/LevHatahbivLogo.png")} alt="לב התחביב" />
            </h1>
            <p className="sub">
              צבעים, מכחולים, נייר וחוטים — חנות משפחתית עם כל מה שהידיים שלכם
              מחפשות, ועם עצה טובה ליד הקופה.
            </p>
            <div className="hero-ctas">
              <Link
                to={`/category/${categories[0].slug}`}
                className="btn hero-cta"
              >
                לצאת למסע בין המדפים 🎨
              </Link>
              <a
                href={store.waze}
                target="_blank"
                rel="noreferrer"
                className="hero-link"
              >
                ניווט לחנות ←
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 2) CATEGORIES — design-7 mosaic w/ editable shelf photos ---------- */}
      <section className="ph-sec">
        <div className="ph-shell">
          <div className="ph-sec-head">
            <span className="ph-eyebrow">Collections</span>
            <h2>המדפים שלנו</h2>
          </div>
          <div className="ph-mosaic">
            {categories.map((c: Category, i) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className={`ph-tile ${tileClass(i)}`}
              >
                <img src={shelfFor(c.slug)} alt={c.name} loading="lazy" />
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

      {/* ---------- 3) FEATURED — design-7 head + the shared MOVING rail ---------- */}
      {featured.length > 0 && (
        <section className="ph-sec" style={{ paddingTop: 0 }}>
          <div className="ph-shell">
            <div className="ph-sec-head">
              <span className="ph-eyebrow">Curated</span>
              <h2>נבחרים מהמדפים</h2>
            </div>
            <FeaturedRail items={featured} />
          </div>
        </section>
      )}

      {/* ---------- 4) QUOTE BAND — over the current story photo ---------- */}
      <section className="ph-quote">
        <img src={STORY_IMG} alt="" aria-hidden="true" loading="lazy" />
        <div className="ph-scrim" />
        <div className="ph-quote-body">
          <h2>כל יצירה גדולה מתחילה בלב</h2>
          <p>
            לא רק קונים — מתייעצים, ממששים את הנייר, משווים גוונים מול האור,
            ויוצאים עם בדיוק מה שהפרויקט הבא צריך. מאז {store.since}, ברחובות.
          </p>
        </div>
      </section>

      {/* ---------- 5) ON SALE — design-7 grid, max 5 (same logic as HomeContent) ---------- */}
      {fresh.length > 0 && (
        <section className="ph-sec">
          <div className="ph-shell">
            <div className="ph-sec-head">
              <span className="ph-eyebrow">On sale</span>
              <h2>במבצע עכשיו</h2>
            </div>
            <div className="ph-grid ph-sale-grid">
              {fresh.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- 6) WORKSHOPS — schedule + signup, no price ---------- */}
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

      {/* ---------- 7) VISIT — hours card + contact card ---------- */}
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
              <a
                href={store.waze}
                target="_blank"
                rel="noreferrer"
                className="ph-btn fill"
              >
                פותחים Waze
              </a>
              <a
                href={store.maps}
                target="_blank"
                rel="noreferrer"
                className="ph-btn line"
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
