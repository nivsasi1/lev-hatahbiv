import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import "./home-kineticstudio.css";

/* ===========================================================================
   Home design · "סטודיו קינטי" (Kinetic Studio)
   A pristine gallery/atelier homepage with quietly kinetic interactions:
   a magnetic wordmark, a warm cursor spotlight, ink/gold brush rules that
   draw on scroll, and a horizontal scroll-snap exhibition rail. Light mode
   only. All motion is rAF-throttled, listener-clean, and respects
   prefers-reduced-motion. Reuses catalog data + <ProductCard>.
   =========================================================================== */

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

const fresh = (
  siteSettings.saleIds.length > 0
    ? siteSettings.saleIds
        .map((id) => getProduct(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p) && onSale(p!))
    : products.filter(onSale).slice(0, 5)
).slice(0, 5);

const firstSlug = categories[0]?.slug ?? "paints";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isCoarseOrNarrow = () =>
  typeof window !== "undefined" &&
  (window.innerWidth < 760 ||
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches));

/* ---------- a thin ink/gold "brush" rule that draws as it scrolls in ---------- */
const BrushRule = ({ tone = "ink" }: { tone?: "ink" | "gold" }) => {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // reduced motion → render fully drawn, no scroll work
    if (prefersReduced()) {
      el.style.setProperty("--ks-draw", "0");
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 while below the fold → 1 once it has risen ~70% up the viewport
      const start = vh * 0.95;
      const end = vh * 0.45;
      const p = (start - r.top) / (start - end);
      const clamped = p < 0 ? 0 : p > 1 ? 1 : p;
      el.style.setProperty("--ks-draw", String(1 - clamped));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <svg
      ref={ref}
      className={`ks-brush ks-brush-${tone}`}
      viewBox="0 0 1000 24"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        className="ks-brush-path"
        pathLength={1}
        d="M6 15 C 150 4, 300 22, 470 12 C 620 4, 760 20, 904 9 C 940 6, 970 9, 994 13"
      />
    </svg>
  );
};

/* ---------- kinetic hero ---------- */
const KineticHero = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const wordmark = wordmarkRef.current;
    if (!hero) return;
    if (prefersReduced() || isCoarseOrNarrow()) return;

    const words = wordmark
      ? (Array.from(
          wordmark.querySelectorAll<HTMLElement>(".ks-word")
        ) as HTMLElement[])
      : [];

    // current + target translate per word, lerped each frame
    const state = words.map(() => ({ cx: 0, cy: 0, tx: 0, ty: 0 }));
    let pointerInside = false;
    let mx = 0;
    let my = 0;
    let raf = 0;

    const frame = () => {
      raf = 0;
      let moving = false;
      for (let i = 0; i < words.length; i++) {
        const s = state[i];
        if (pointerInside) {
          const r = words[i].getBoundingClientRect();
          const wx = r.left + r.width / 2;
          const wy = r.top + r.height / 2;
          const dx = mx - wx;
          const dy = my - wy;
          const dist = Math.hypot(dx, dy) || 1;
          // pull strength falls off with distance; capped so it stays legible
          const pull = Math.min(150, 4200 / (dist + 60));
          s.tx = (dx / dist) * pull * 0.16;
          s.ty = (dy / dist) * pull * 0.16;
        } else {
          s.tx = 0;
          s.ty = 0;
        }
        s.cx = lerp(s.cx, s.tx, 0.14);
        s.cy = lerp(s.cy, s.ty, 0.14);
        if (Math.abs(s.cx - s.tx) > 0.1 || Math.abs(s.cy - s.ty) > 0.1)
          moving = true;
        words[i].style.transform = `translate(${s.cx.toFixed(2)}px, ${s.cy.toFixed(
          2
        )}px)`;
      }
      if (moving || pointerInside) raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      mx = e.clientX;
      my = e.clientY;
      pointerInside = true;
      // drive the spotlight via CSS vars (relative to the hero box)
      hero.style.setProperty("--ks-mx", `${e.clientX - r.left}px`);
      hero.style.setProperty("--ks-my", `${e.clientY - r.top}px`);
      hero.style.setProperty("--ks-spot", "1");
      kick();
    };
    const onLeave = () => {
      pointerInside = false;
      hero.style.setProperty("--ks-spot", "0");
      kick();
    };

    hero.addEventListener("mousemove", onMove);
    hero.addEventListener("mouseleave", onLeave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      hero.removeEventListener("mousemove", onMove);
      hero.removeEventListener("mouseleave", onLeave);
      for (const w of words) w.style.transform = "";
    };
  }, []);

  return (
    <section className="ks-hero" ref={heroRef}>
      <div className="ks-spotlight" aria-hidden="true" />
      <div className="ks-hero-inner">
        <span className="ks-eyebrow">
          <i className="ks-tick" />
          סטודיו האמנות של רחובות · מאז {store.since}
        </span>

        <h1 className="ks-wordmark display" ref={wordmarkRef} aria-label="כל יצירה מתחילה כאן">
          <span className="ks-line">
            <span className="ks-word">כל</span>{" "}
            <span className="ks-word">יצירה</span>
          </span>
          <span className="ks-line">
            <span className="ks-word">מתחילה</span>{" "}
            <span className="ks-word ks-accent">כאן</span>
          </span>
        </h1>

        <BrushRule tone="gold" />

        <p className="ks-lead">
          צבעים, מכחולים, נייר וחוטים — אולפן משפחתי שבו כל גוון נבחר ביד, וכל
          לקוח יוצא עם בדיוק מה שהפרויקט הבא צריך.
        </p>

        <div className="ks-hero-ctas">
          <MagneticLink to={`/category/${firstSlug}`} className="ks-cta">
            להיכנס לסטודיו 🎨
          </MagneticLink>
          <a
            href={store.waze}
            target="_blank"
            rel="noreferrer"
            className="ks-hero-link"
          >
            ניווט לחנות ←
          </a>
        </div>
      </div>
    </section>
  );
};

/* ---------- a CTA that nudges toward the cursor on hover ---------- */
const MagneticLink = ({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: any;
}) => {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced() || isCoarseOrNarrow()) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    const frame = () => {
      raf = 0;
      cx = lerp(cx, tx, 0.2);
      cy = lerp(cy, ty, 0.2);
      el.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`;
      if (Math.abs(cx - tx) > 0.1 || Math.abs(cy - ty) > 0.1)
        raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - (r.left + r.width / 2)) / r.width) * 18;
      ty = ((e.clientY - (r.top + r.height / 2)) / r.height) * 14;
      kick();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      kick();
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      el.style.transform = "";
    };
  }, []);

  return (
    <Link to={to} className={className} ref={ref}>
      <span className="ks-cta-label">{children}</span>
    </Link>
  );
};

/* ---------- horizontal exhibition rail ---------- */
const ExhibitionRail = ({ items }: { items: typeof featured }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(1);
  const total = items.length;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const plate = track.querySelector<HTMLElement>(".ks-plate");
      if (!plate) return;
      const step = plate.offsetWidth + 24; // plate width + gap
      // RTL: scrollLeft is negative/decreasing toward the end in most engines.
      const scrolled = Math.abs(track.scrollLeft);
      const i = Math.round(scrolled / step) + 1;
      setIndex(Math.max(1, Math.min(total, i)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      track.removeEventListener("scroll", onScroll);
    };
  }, [total]);

  // mouse drag-to-scroll (touch + trackpad already work natively)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (prefersReduced()) return;

    let down = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;

    const onDown = (e: MouseEvent) => {
      // begin a drag; a real click after movement is swallowed in `stop`
      // so dragging across a card never triggers its link / add-to-cart
      down = true;
      moved = false;
      startX = e.clientX;
      startScroll = track.scrollLeft;
    };
    const onMove = (e: MouseEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) {
        moved = true;
        track.classList.add("ks-dragging");
      }
      track.scrollLeft = startScroll - dx;
    };
    const stop = (e: MouseEvent) => {
      if (moved) {
        // swallow the click that would otherwise fire after a drag
        e.preventDefault();
        const swallow = (ce: Event) => {
          ce.stopPropagation();
          ce.preventDefault();
        };
        track.addEventListener("click", swallow, { capture: true, once: true });
      }
      down = false;
      track.classList.remove("ks-dragging");
    };

    track.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", stop);
    return () => {
      track.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", stop);
    };
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="ks-rail">
      <div
        className="ks-rail-track"
        ref={trackRef}
        role="list"
        tabIndex={0}
        aria-label="גלריית נבחרים — ניתן לגלול לצדדים"
      >
        {items.map((p, i) => (
          <div className="ks-plate" role="listitem" key={p.id}>
            <span className="ks-plate-no" aria-hidden="true">
              {pad(i + 1)}
            </span>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
      <div className="ks-rail-counter" aria-hidden="true">
        <span className="ks-counter-now">{pad(index)}</span>
        <span className="ks-counter-sep">/</span>
        <span className="ks-counter-all">{pad(total)}</span>
      </div>
    </div>
  );
};

/* ---------- numbered editorial category index ---------- */
const CategoryIndex = () => (
  <ol className="ks-index" role="list">
    {categories.map((c, i) => (
      <li key={c.slug} className="ks-index-row" style={{ "--cc": c.color, "--soft": c.soft } as any}>
        <Link to={`/category/${c.slug}`} className="ks-index-link">
          <span className="ks-index-no">{String(i + 1).padStart(2, "0")}</span>
          <span className="ks-index-fill" aria-hidden="true" />
          <span className="ks-index-name display">{c.name}</span>
          <span className="ks-index-blurb">{c.blurb}</span>
          <span className="ks-index-count">{productsByCategory(c.slug).length}</span>
          <span className="ks-index-arrow" aria-hidden="true">
            ←
          </span>
        </Link>
      </li>
    ))}
  </ol>
);

/* ---------- a small section eyebrow + title block ---------- */
const SectionHead = ({
  eyebrow,
  title,
  tone,
}: {
  eyebrow: string;
  title: string;
  tone?: "gold" | "ink";
}) => (
  <header className="ks-sec-head">
    <span className="ks-eyebrow">
      <i className="ks-tick" />
      {eyebrow}
    </span>
    <h2 className="ks-sec-title display">{title}</h2>
    <BrushRule tone={tone ?? "ink"} />
  </header>
);

export default function KineticStudio() {
  // a one-shot flag so the page can render a tasteful static fallback class
  const [reduced, setReduced] = useState(false);
  useLayoutEffect(() => {
    setReduced(prefersReduced());
  }, []);

  return (
    <main className={`ks-home${reduced ? " ks-reduced" : ""}`}>
      {/* ---------- kinetic hero ---------- */}
      <KineticHero />

      {/* ---------- numbered editorial category index ---------- */}
      <section className="ks-shell ks-sec">
        <SectionHead
          eyebrow={`${categories.length} מדפים · אינסוף רעיונות`}
          title="אינדקס המדפים"
        />
        <CategoryIndex />
      </section>

      {/* ---------- ribbon marquee ---------- */}
      {siteSettings.ribbonTexts.length > 0 && (
        <div className="ks-ribbon" aria-hidden="true">
          <div className="ks-ribbon-track">
            {[0, 1].map((dup) => (
              <span className="ks-ribbon-group" key={dup}>
                {siteSettings.ribbonTexts.map((t, j) => (
                  <span className="ks-ribbon-item" key={`${dup}-${j}`}>
                    <i className="ks-ribbon-dot" />
                    {t}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ---------- featured exhibition rail ---------- */}
      {featured.length > 0 && (
        <section className="ks-shell ks-sec">
          <SectionHead
            eyebrow="בחירת הצוות לעונה"
            title="נבחרים מהמדפים"
            tone="gold"
          />
          <ExhibitionRail items={featured} />
        </section>
      )}

      {/* ---------- on sale ---------- */}
      {fresh.length > 0 && (
        <section className="ks-saleband">
          <div className="ks-shell ks-sec">
            <SectionHead eyebrow="שווה לחטוף · לזמן מוגבל" title="במבצע עכשיו" />
            <div className="ks-sale-grid">
              {fresh.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- workshops ---------- */}
      <section className="ks-shell ks-sec">
        <SectionHead
          eyebrow="בחדר הלימוד הצמוד לחנות"
          title="חוגים וסדנאות"
          tone="gold"
        />
        <div className="ks-workshops">
          <p className="ks-workshops-intro">{workshops.intro}</p>
          <div className="ks-workshops-topics">
            {workshops.topics.map((t) => (
              <span className="ks-chip" key={t}>
                {t}
              </span>
            ))}
          </div>
          <div className="ks-workshops-meta">
            <span className="ks-meta-item">🗓 {workshops.schedule}</span>
            <span className="ks-meta-item">💰 {workshops.price}</span>
            <a href={`tel:${store.phone}`} className="ks-cta ks-cta-sm">
              <span className="ks-cta-label">להרשמה: {store.phone}</span>
            </a>
          </div>
        </div>
      </section>

      {/* ---------- visit / hours band ---------- */}
      <section className="ks-shell ks-sec">
        <SectionHead eyebrow="מוזמנים לבקר באולפן" title="שעות וכתובת" />
        <div className="ks-visit">
          <div className="ks-visit-card">
            <h3 className="ks-visit-h">שעות פתיחה</h3>
            <table className="ks-hours">
              <tbody>
                {store.hours.map((h) => (
                  <tr key={h.days}>
                    <td>{h.days}</td>
                    <td>{h.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="ks-visit-note">
              * אחר הצהריים פתוחים בימים א׳, ב׳, ד׳, ה׳ בלבד
            </p>
          </div>

          <div className="ks-visit-card">
            <h3 className="ks-visit-h">קופצים לבקר?</h3>
            <ul className="ks-visit-rows">
              <li>
                <span className="ks-visit-dot" style={{ background: "#e2574c" }} />
                {store.address}
              </li>
              <li>
                <span className="ks-visit-dot" style={{ background: "#2a9d8f" }} />
                <a href={`tel:${store.phone}`}>{store.phone}</a>
              </li>
              <li>
                <span className="ks-visit-dot" style={{ background: "#5b2d8e" }} />
                <a href={`mailto:${store.email}`}>{store.email}</a>
              </li>
            </ul>
            <div className="ks-visit-actions">
              <a
                href={store.waze}
                target="_blank"
                rel="noreferrer"
                className="ks-cta ks-cta-sm"
              >
                <span className="ks-cta-label">פותחים Waze</span>
              </a>
              <a
                href={store.maps}
                target="_blank"
                rel="noreferrer"
                className="ks-ghost"
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
