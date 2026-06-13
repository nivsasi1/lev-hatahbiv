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
import "./home-collage.css";

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
).slice(0, 5); // MAX 5 sale items

const ribbon = siteSettings.ribbonTexts;
const firstSlug = categories.length > 0 ? categories[0].slug : "paints";

// Duotone pop palette assigned round-robin to the category stickers.
const POP = ["#ff5d8f", "#2a9d8f", "#3a86ff", "#e09f3e", "#2b2440"];

export default () => {
  const rootRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  /* ---- hero mouse-parallax: every layer follows the pointer a different
         fraction (rAF-lerped --px/--py on the hero, depth read from CSS) ---- */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const coarse = window.matchMedia("(max-width: 760px)").matches;
    // Static, centred collage for reduced-motion / small touch screens.
    if (reduce || coarse) {
      hero.style.setProperty("--px", "0");
      hero.style.setProperty("--py", "0");
      return;
    }

    let raf = 0;
    let tx = 0;
    let ty = 0; // targets, -1..1 of hero box from centre
    let cx = 0;
    let cy = 0; // current, lerped
    let running = false;

    const tick = () => {
      cx += (tx - cx) * 0.1;
      cy += (ty - cy) * 0.1;
      hero.style.setProperty("--px", cx.toFixed(4));
      hero.style.setProperty("--py", cy.toFixed(4));
      if (Math.abs(tx - cx) > 0.0005 || Math.abs(ty - cy) > 0.0005) {
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
      tx = Math.min(1, Math.max(-1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      ty = Math.min(1, Math.max(-1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      wake();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
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

  /* ---- scroll reveals: torn-paper sections/cards slide+rotate in once ---- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const items = Array.from(root.querySelectorAll<HTMLElement>(".co-reveal"));
    if (items.length === 0) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    // Reduced motion: show everything immediately, no observer.
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* ---- scroll-drawn scribbles: each marker path draws as it enters view ---- */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const strokes = Array.from(
      root.querySelectorAll<SVGPathElement>(".co-scribble path")
    );
    if (strokes.length === 0) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    // Reduced motion: render every scribble fully drawn, no scroll work.
    if (reduce) {
      strokes.forEach((s) => (s.style.strokeDashoffset = "0"));
      return;
    }

    let raf = 0;
    let ticking = false;

    const draw = () => {
      ticking = false;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      for (const s of strokes) {
        const r = s.getBoundingClientRect();
        // 0 while still low on the page, 1 once it has risen up the viewport.
        const start = vh * 0.9;
        const end = vh * 0.4;
        const p = (start - r.top) / (start - end);
        const clamped = p < 0 ? 0 : p > 1 ? 1 : p;
        s.style.strokeDashoffset = String(1 - clamped);
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        raf = requestAnimationFrame(draw);
      }
    };

    draw(); // initial pass for scribbles already on screen
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <main className="co-home" ref={rootRef}>
      {/* ---------- parallax collage hero ---------- */}
      <section className="co-hero" ref={heroRef}>
        {/* cut-paper / halftone layers, each at a different parallax depth */}
        <span
          className="co-layer co-blob co-blob-pink"
          style={{ "--d": "26" } as any}
          aria-hidden="true"
        />
        <span
          className="co-layer co-blob co-blob-teal"
          style={{ "--d": "44" } as any}
          aria-hidden="true"
        />
        <span
          className="co-layer co-halftone co-halftone-blue"
          style={{ "--d": "60" } as any}
          aria-hidden="true"
        />
        <span
          className="co-layer co-cut co-cut-tri"
          style={{ "--d": "-30" } as any}
          aria-hidden="true"
        />
        <span
          className="co-layer co-cut co-cut-gold"
          style={{ "--d": "-50" } as any}
          aria-hidden="true"
        />
        <span
          className="co-layer co-star co-star-a"
          style={{ "--d": "-72" } as any}
          aria-hidden="true"
        >
          ✦
        </span>
        <span
          className="co-layer co-star co-star-b"
          style={{ "--d": "70" } as any}
          aria-hidden="true"
        >
          ✺
        </span>

        {/* big hand-scribble drawn behind the headline */}
        <svg
          className="co-scribble co-hero-scribble co-layer"
          style={{ "--d": "16" } as any}
          viewBox="0 0 600 120"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M14 78 C 120 34, 220 110, 318 70 C 410 32, 470 96, 588 52"
            pathLength={1}
          />
        </svg>

        <div className="co-hero-inner">
          {/* torn-paper card holding the logo */}
          <span
            className="co-layer co-logo-card"
            style={{ "--d": "10" } as any}
          >
            <span className="co-tape co-tape-tl" aria-hidden="true" />
            <span className="co-tape co-tape-br" aria-hidden="true" />
            <img
              src={asset("/images/LevHatahbivLogo.png")}
              alt="לב התחביב"
              className="co-logo"
              loading="eager"
            />
          </span>

          {/* overprint / misregistered headline — duplicated offset spans */}
          <h1 className="co-title display" aria-label="לב התחביב, קולאז' חי">
            <span className="co-ghost co-ghost-pink" aria-hidden="true">
              קולאז' חי
            </span>
            <span className="co-ghost co-ghost-teal" aria-hidden="true">
              קולאז' חי
            </span>
            <span className="co-front">קולאז' חי</span>
          </h1>

          <p className="co-lead">
            חנות האמנות של רחובות מאז {store.since} — צבעים, מכחולים, נייר וחוטים,
            גזורים ומודבקים ביד לקולאז' אחד גדול ושמח.
          </p>

          <div className="co-ctas">
            <Link to={`/category/${firstSlug}`} className="co-sticker-btn">
              מתחילים ליצור 🎨
            </Link>
            <a
              href={store.waze}
              target="_blank"
              rel="noreferrer"
              className="co-text-link"
            >
              ניווט לחנות ←
            </a>
          </div>
        </div>
      </section>

      {/* ---------- category stickers ---------- */}
      <section className="co-sec">
        <div className="co-shell">
          <div className="co-sec-head co-reveal">
            <h2 className="display">המדפים שלנו</h2>
            <svg
              className="co-scribble co-underline"
              viewBox="0 0 320 26"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 16 C 70 6, 150 24, 226 12 C 270 5, 296 16, 314 10"
                pathLength={1}
              />
            </svg>
          </div>
          <div className="co-cats">
            {categories.map((c, i) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="co-cat co-reveal"
                style={
                  {
                    "--cc": c.color,
                    "--soft": c.soft,
                    "--pop": POP[i % POP.length],
                    "--i": i,
                  } as any
                }
              >
                <span className="co-peel" aria-hidden="true" />
                <span className="co-cat-orb" aria-hidden="true">
                  <ProductArt kind={c.art} color={c.color} />
                </span>
                <h3>{c.name}</h3>
                <p>{c.blurb}</p>
                <span className="co-cat-count">
                  {productsByCategory(c.slug).length} מוצרים
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- ribbon marquee on a torn paper strip ---------- */}
      {ribbon.length > 0 && (
        <div className="co-strip co-reveal" aria-hidden="true">
          <div className="co-track">
            {[0, 1].map((dup) => (
              <span key={dup} className="co-track-set">
                {ribbon.map((t, j) => (
                  <span key={j} className="co-track-item">
                    {t}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ---------- featured: taped polaroids ---------- */}
      {featured.length > 0 && (
        <section className="co-sec">
          <div className="co-shell">
            <div className="co-sec-head co-reveal">
              <h2 className="display">נבחרים מהמדפים</h2>
              <svg
                className="co-scribble co-underline"
                viewBox="0 0 320 26"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6 14 C 64 22, 150 4, 222 16 C 268 23, 298 10, 314 18"
                  pathLength={1}
                />
              </svg>
            </div>
            <div className="co-taped">
              {featured.slice(0, 8).map((p, i) => (
                <div
                  key={p.id}
                  className="co-tape-card co-reveal"
                  style={{ "--i": i } as any}
                >
                  <span className="co-tape co-tape-top" aria-hidden="true" />
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- on sale band ---------- */}
      {fresh.length > 0 && (
        <section className="co-sec co-sale-sec">
          <div className="co-shell">
            <div className="co-sec-head co-reveal">
              <h2 className="display">במבצע עכשיו</h2>
              <span className="co-burst" aria-hidden="true">
                מחירי קולאז'!
              </span>
            </div>
            <div className="co-taped">
              {fresh.map((p, i) => (
                <div
                  key={p.id}
                  className="co-tape-card co-reveal"
                  style={{ "--i": i } as any}
                >
                  <span className="co-tape co-tape-top" aria-hidden="true" />
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- workshops ---------- */}
      <section className="co-sec">
        <div className="co-shell">
          <div className="co-shop co-reveal">
            <span className="co-halftone co-shop-dots" aria-hidden="true" />
            <span className="co-tape co-tape-top" aria-hidden="true" />
            <h2 className="display">חוגים וסדנאות</h2>
            <p className="co-shop-intro">{workshops.intro}</p>
            <div className="co-chips">
              {workshops.topics.map((t) => (
                <span key={t} className="co-chip">
                  {t}
                </span>
              ))}
            </div>
            <div className="co-shop-meta">
              <span className="co-m">🗓 {workshops.schedule}</span>
              <span className="co-m">💰 {workshops.price}</span>
              <a href={`tel:${store.phone}`} className="co-sticker-btn small">
                להרשמה: {store.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- visit / hours as collage notes ---------- */}
      <section className="co-sec co-visit-sec">
        <div className="co-shell co-visit">
          <div className="co-note co-reveal">
            <span className="co-tape co-tape-top" aria-hidden="true" />
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
          </div>
          <div className="co-note co-reveal">
            <span className="co-tape co-tape-top" aria-hidden="true" />
            <h3 className="display">קופצים לבקר?</h3>
            <div className="co-rows">
              <div>📍 {store.address}</div>
              <div>
                📞 <a href={`tel:${store.phone}`}>{store.phone}</a>
              </div>
              <div>
                ✉️ <a href={`mailto:${store.email}`}>{store.email}</a>
              </div>
            </div>
            <div className="co-vactions">
              <a
                href={store.waze}
                target="_blank"
                rel="noreferrer"
                className="co-sticker-btn small"
              >
                פותחים Waze
              </a>
              <a
                href={store.maps}
                target="_blank"
                rel="noreferrer"
                className="co-text-link"
              >
                מפת Google ←
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
