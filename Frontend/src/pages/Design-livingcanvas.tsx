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
} from "../data/catalog";
import { ProductCard } from "../components/ProductCard";
import { ProductArt } from "../components/ProductArt";
import "./home-livingcanvas.css";

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

/* A thick, expressive brushstroke that paints itself in as it scrolls into
   view. The path is normalised via pathLength="1" so stroke-dasharray="1"
   + a dashoffset between 1 (hidden) and 0 (drawn) maps straight to progress. */
const ScrollStroke = ({ color }: { color: string }) => (
  <svg
    className="lc-stroke"
    viewBox="0 0 420 60"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path
      d="M8 40 C 70 14, 130 12, 198 28 C 250 40, 300 50, 360 30 C 388 20, 404 24, 412 34"
      pathLength="1"
      stroke={color}
      stroke-width="16"
      stroke-linecap="round"
      fill="none"
      style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
    />
  </svg>
);

export default () => {
  const heroRef = useRef<HTMLElement | null>(null);
  const bloomRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);

  /* ---- hero cursor watercolor bloom: rAF-lerped --mx/--my on the wash ---- */
  useEffect(() => {
    const hero = heroRef.current;
    const bloom = bloomRef.current;
    if (!hero || !bloom) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const coarse = window.matchMedia("(max-width: 760px)").matches;
    // Static, centred wash for reduced-motion / small touch screens.
    if (reduce || coarse) {
      bloom.style.setProperty("--mx", "50%");
      bloom.style.setProperty("--my", "42%");
      bloom.style.setProperty("--bloom", "1");
      return;
    }

    let raf = 0;
    let tx = 0.5;
    let ty = 0.42; // targets (0..1 of hero box)
    let cx = 0.5;
    let cy = 0.42; // current, lerped
    let amt = 0; // 0..1 reveal strength
    let tamt = 0;
    let running = false;

    const tick = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      amt += (tamt - amt) * 0.08;
      bloom.style.setProperty("--mx", `${(cx * 100).toFixed(2)}%`);
      bloom.style.setProperty("--my", `${(cy * 100).toFixed(2)}%`);
      bloom.style.setProperty("--bloom", amt.toFixed(3));
      // keep animating until we have settled, then idle
      if (
        Math.abs(tx - cx) > 0.001 ||
        Math.abs(ty - cy) > 0.001 ||
        Math.abs(tamt - amt) > 0.002
      ) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };
    const wake = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    const onMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      ty = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      tamt = 1;
      wake();
    };
    const onLeave = () => {
      tamt = 0;
      wake();
    };

    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  /* ---- scroll-painted brushstrokes: paint each stroke as it enters view ---- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const strokes = Array.from(
      root.querySelectorAll<SVGPathElement>(".lc-stroke path")
    );
    if (strokes.length === 0) return;

    // Reduced motion: render every stroke fully painted, no scroll work.
    if (reduce) {
      strokes.forEach((s) => (s.style.strokeDashoffset = "0"));
      return;
    }

    let raf = 0;
    let ticking = false;

    const paint = () => {
      ticking = false;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      for (const s of strokes) {
        const r = s.getBoundingClientRect();
        // progress 0 when the stroke top sits a bit below the fold,
        // 1 once it has risen ~30% up the viewport — a brisk, satisfying draw.
        const start = vh * 0.92;
        const end = vh * 0.32;
        const p = (start - r.top) / (start - end);
        const clamped = p < 0 ? 0 : p > 1 ? 1 : p;
        s.style.strokeDashoffset = String(1 - clamped);
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        raf = requestAnimationFrame(paint);
      }
    };

    paint(); // initial pass for strokes already on screen
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /* ---- paint-chip tilt toward the cursor (subtle, rAF-throttled) ---- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const coarse = window.matchMedia("(max-width: 760px)").matches;
    if (reduce || coarse) return;

    const chips = Array.from(
      root.querySelectorAll<HTMLElement>(".lc-chip")
    );
    if (chips.length === 0) return;

    const cleanups = chips.map((chip) => {
      let raf = 0;
      let queued = false;
      let mx = 0;
      let my = 0;

      const apply = () => {
        queued = false;
        const r = chip.getBoundingClientRect();
        const dx = (mx - (r.left + r.width / 2)) / r.width; // -0.5..0.5
        const dy = (my - (r.top + r.height / 2)) / r.height;
        // tilt a few degrees TOWARD the cursor + a touch of lift
        chip.style.setProperty("--rx", `${(-dy * 7).toFixed(2)}deg`);
        chip.style.setProperty("--ry", `${(dx * 9).toFixed(2)}deg`);
      };
      const onMove = (e: PointerEvent) => {
        mx = e.clientX;
        my = e.clientY;
        if (!queued) {
          queued = true;
          raf = requestAnimationFrame(apply);
        }
      };
      const onLeave = () => {
        cancelAnimationFrame(raf);
        queued = false;
        chip.style.setProperty("--rx", "0deg");
        chip.style.setProperty("--ry", "0deg");
      };

      chip.addEventListener("pointermove", onMove, { passive: true });
      chip.addEventListener("pointerleave", onLeave, { passive: true });
      return () => {
        cancelAnimationFrame(raf);
        chip.removeEventListener("pointermove", onMove);
        chip.removeEventListener("pointerleave", onLeave);
      };
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <main className="lc-home" ref={rootRef as any}>
      {/* ---------- living-canvas hero ---------- */}
      <section className="lc-hero" ref={heroRef as any}>
        {/* watercolor wash that blooms under the cursor (pure decoration) */}
        <div className="lc-wash" ref={bloomRef} aria-hidden="true">
          <span className="lc-wash-a" />
          <span className="lc-wash-b" />
        </div>

        <div className="lc-hero-inner">
          <h1 className="lc-logo-wrap">
            <img
              className="lc-logo"
              src={asset("/images/LevHatahbivLogo.png")}
              alt="לב התחביב"
            />
            {/* hand-painted brush underline that draws itself on load */}
            <svg
              className="lc-underline"
              viewBox="0 0 460 46"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M14 30 C 110 12, 210 12, 300 22 C 360 28, 410 30, 446 20"
                pathLength="1"
                stroke="#e09f3e"
                stroke-width="13"
                stroke-linecap="round"
                fill="none"
              />
              <path
                d="M30 38 C 150 30, 320 30, 430 36"
                pathLength="1"
                stroke="#e23a3a"
                stroke-width="7"
                stroke-linecap="round"
                fill="none"
                opacity="0.85"
              />
            </svg>
          </h1>

          <p className="lc-tagline">
            כל גוון מתחיל בלב. חנות משפחתית של צבעים, מכחולים, נייר וחוטים —
            <span className="lc-hl"> בואו לטבול ידיים </span>
            ולצאת עם בדיוק מה שהיצירה הבאה שלכם צריכה.
          </p>

          <div className="lc-cta-row">
            <Link
              to={`/category/${categories[0].slug}`}
              className="lc-cta"
            >
              לצאת למסע בין המדפים 🎨
            </Link>
            <a
              href={store.waze}
              target="_blank"
              rel="noreferrer"
              className="lc-cta-link"
            >
              ניווט לחנות ←
            </a>
          </div>
        </div>
      </section>

      {/* ---------- categories: paint chips ---------- */}
      <section className="lc-sec lc-cats-sec">
        <div className="lc-shell">
          <div className="lc-head">
            <span className="lc-eyebrow">תשעה מדפים, אינסוף גוונים</span>
            <h2 className="display lc-title">המדפים שלנו</h2>
            <ScrollStroke color="#5b2d8e" />
          </div>

          <div className="lc-chips">
            {categories.map((c) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="lc-chip"
                style={
                  {
                    "--cc": c.color,
                    "--soft": c.soft,
                  } as any
                }
              >
                <span className="lc-chip-paint" aria-hidden="true" />
                <span className="lc-chip-art" aria-hidden="true">
                  <ProductArt kind={c.art} color={c.color} />
                </span>
                <span className="lc-chip-body">
                  <h3>{c.name}</h3>
                  <p>{c.blurb}</p>
                  <span className="lc-chip-count">
                    {productsByCategory(c.slug).length} מוצרים ←
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- moving paint-ribbon marquee ---------- */}
      {siteSettings.ribbonTexts.length > 0 && (
        <div className="lc-ribbon" aria-hidden="true">
          <div className="lc-ribbon-track">
            {[0, 1].map((dup) => (
              <span key={dup} className="lc-ribbon-run">
                {siteSettings.ribbonTexts.map((t, j) => (
                  <span key={j} className="lc-ribbon-item">
                    <span className="lc-ribbon-dot" />
                    {t}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ---------- featured ---------- */}
      {featured.length > 0 && (
        <section className="lc-sec">
          <div className="lc-shell">
            <div className="lc-head">
              <span className="lc-eyebrow">בחירת הצוות לעונה</span>
              <h2 className="display lc-title">נבחרים מהמדפים</h2>
              <ScrollStroke color="#2a9d8f" />
            </div>

            {featured.length > 4 ? (
              <div className="lc-rail">
                <div className="lc-rail-track">
                  {featured.map((p) => (
                    <div key={p.id} className="lc-rail-cell">
                      <ProductCard product={p} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="lc-grid">
                {featured.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---------- on-sale cream band ---------- */}
      {fresh.length > 0 && (
        <section className="lc-sale-band">
          <div className="lc-shell">
            <div className="lc-head">
              <span className="lc-eyebrow lc-eyebrow-sale">שווה לחטוף</span>
              <h2 className="display lc-title">במבצע עכשיו</h2>
              <ScrollStroke color="#e23a3a" />
            </div>
            <div className="lc-grid">
              {fresh.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- workshops ---------- */}
      <section className="lc-sec">
        <div className="lc-shell">
          <div className="lc-head">
            <span className="lc-eyebrow">בחדר הלימוד הצמוד לחנות</span>
            <h2 className="display lc-title">חוגים וסדנאות</h2>
            <ScrollStroke color="#e09f3e" />
          </div>

          <div className="lc-workshops">
            <span className="lc-ws-splat" aria-hidden="true" />
            <p className="lc-ws-intro">{workshops.intro}</p>
            <div className="lc-ws-chips">
              {workshops.topics.map((t) => (
                <span key={t} className="lc-ws-chip">
                  {t}
                </span>
              ))}
            </div>
            <div className="lc-ws-meta">
              <span className="lc-ws-pill">🗓 {workshops.schedule}</span>
              <span className="lc-ws-pill">💰 {workshops.price}</span>
              <a href={`tel:${store.phone}`} className="lc-cta lc-cta-small">
                לפרטים והרשמה: {store.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- visit / studio notes band ---------- */}
      <section className="lc-sec lc-visit-sec">
        <div className="lc-shell">
          <div className="lc-head">
            <span className="lc-eyebrow">קפצו לבקר בסטודיו</span>
            <h2 className="display lc-title">מתי באים אלינו</h2>
            <ScrollStroke color="#5b2d8e" />
          </div>

          <div className="lc-notes">
            <div className="lc-note lc-note-gold">
              <span className="lc-pin" aria-hidden="true" />
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
              <div className="lc-note-foot">
                * אחה"צ פתוחים בימים א', ב', ד', ה' בלבד
              </div>
            </div>

            <div className="lc-note lc-note-teal">
              <span className="lc-pin" aria-hidden="true" />
              <h3 className="display">קופצים לבקר?</h3>
              <div className="lc-visit-rows">
                <div>
                  <span className="lc-dot" style={{ background: "#e23a3a" }} />
                  {store.address}
                </div>
                <div>
                  <span className="lc-dot" style={{ background: "#2a9d8f" }} />
                  <a href={`tel:${store.phone}`}>{store.phone}</a>
                </div>
                <div>
                  <span className="lc-dot" style={{ background: "#5b2d8e" }} />
                  <a href={`mailto:${store.email}`}>{store.email}</a>
                </div>
              </div>
              <div className="lc-visit-actions">
                <a
                  href={store.waze}
                  target="_blank"
                  rel="noreferrer"
                  className="lc-cta lc-cta-small"
                >
                  פותחים Waze
                </a>
                <a
                  href={store.maps}
                  target="_blank"
                  rel="noreferrer"
                  className="lc-cta lc-cta-small lc-cta-ghost"
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
};
