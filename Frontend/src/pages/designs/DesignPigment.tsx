import "./design-pigment.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  categories,
  products,
  productsByCategory,
  subPath,
  finalPrice,
  shekel,
  salePct,
  variantPricesVary,
  siteSettings,
  store,
  workshops,
  FREE_SHIPPING_FROM,
  REDUCED_SHIPPING_FROM,
  REDUCED_SHIPPING_PRICE,
  Product,
} from "../../data/catalog";
import { useCart } from "../../context/cart-context";
import { ProductThumb } from "../../components/ProductThumb";
import { usePageMeta, titleFor } from "../../lib/seo";
import {
  dzImg,
  useDesignTheme,
  useOpenStatus,
  featuredPicks,
  salePicks,
  quickAddable,
  yearsOpen,
} from "./shared";

/* ---------------------------------------------------------------------------
   Design B — "Pigment / פיגמנט"

   Loud, playful, colour-field. The hero is a real canvas you paint on (dry-brush
   bristle strokes); the pigment you pick re-tints the whole page. Below it: a
   bento of pop product shots, SHOP-BY-HUE over the ~1,100 real paint tubes
   (matched by colour name), a live free-shipping meter wired to the cart, and
   soft borderless cards with quick-add.
   --------------------------------------------------------------------------- */

const FONTS =
  "https://fonts.googleapis.com/css2?family=Karantina:wght@400;700&family=Rubik:wght@400;500;600;700;800&display=swap";

// paintable pigments — all light enough that ink text stays AA on top of them
const PIGMENTS = [
  { name: "עגבנייה", hex: "#ff5a36" },
  { name: "חמנייה", hex: "#ffc531" },
  { name: "מסטיק", hex: "#ff9cc2" },
  { name: "מנטה", hex: "#7fd6ae" },
  { name: "שמיים", hex: "#6db6ff" },
  { name: "לילך", hex: "#b69cff" },
];

const TILE_BG: Record<string, string> = {
  paints: "#ff4a22",
  hobby: "#ffc21f",
  drawing: "#1f3dff",
  brushes: "#ff8fc0",
  paper: "#79d9ae",
  easels: "#ff8a1f",
  craft: "#ae94ff",
  fiber: "#1f9a61",
  jewelry: "#5a2fd0",
};

/* ---------- shop by hue: index the real paint tubes by colour name ---------- */
type Hue = { key: string; name: string; hex: string; soft: string; re: RegExp };
const HUES: Hue[] = [
  { key: "red", name: "אדום", hex: "#e5342a", soft: "#ffe3df", re: /אדום|\bred\b|scarlet|crimson|carmine|vermil|madder|alizarin|קרמין/i },
  { key: "orange", name: "כתום", hex: "#ff8a1f", soft: "#ffead5", re: /כתום|orange/i },
  { key: "yellow", name: "צהוב", hex: "#ffc531", soft: "#fff3cf", re: /צהוב|yellow|lemon|ochre|gamboge|אוקר/i },
  { key: "green", name: "ירוק", hex: "#2fa36b", soft: "#dff4e8", re: /ירוק|green|viridian|emerald|olive/i },
  { key: "teal", name: "טורקיז", hex: "#19b5b0", soft: "#d9f5f3", re: /טורקיז|turquoise|teal|aqua\b/i },
  { key: "blue", name: "כחול", hex: "#2b4eff", soft: "#e1e7ff", re: /כחול|blue|ultramarine|cobalt|cerulean|indigo|prussian|אולטרמרין|קובלט/i },
  { key: "purple", name: "סגול", hex: "#8a4fd9", soft: "#eee3fb", re: /סגול|violet|purple|magenta|lilac|mauve/i },
  { key: "pink", name: "ורוד", hex: "#ff7fb0", soft: "#ffe6f0", re: /ורוד|pink|\brose\b/i },
  { key: "brown", name: "חום", hex: "#8b5a3c", soft: "#f1e6de", re: /חום|brown|sienna|umber|sepia|סיינה|אומברה/i },
  { key: "white", name: "לבן", hex: "#ffffff", soft: "#f4f1ea", re: /לבן|white/i },
  { key: "black", name: "שחור", hex: "#1d1a17", soft: "#e9e6e1", re: /שחור|black/i },
  { key: "metal", name: "מטאלי", hex: "#c9a227", soft: "#f6efd4", re: /זהב|gold|כסף|silver|bronze|copper|pearl|ברונזה|נחושת/i },
];

const MEDIA = [
  { key: "", name: "הכול" },
  { key: "צבע אקריליק", name: "אקריליק" },
  { key: "צבעי שמן", name: "שמן" },
  { key: "צבעי אקוורל", name: "אקוורל" },
  { key: "צבעי גואש", name: "גואש" },
];
const MEDIA_SUBS = new Set(MEDIA.map((m) => m.key).filter(Boolean));

// single tubes/pans only — sets and mediums would match colour words by accident
const TUBES = products.filter(
  (p) =>
    p.category === "paints" &&
    MEDIA_SUBS.has(p.sub) &&
    p.img &&
    !p.soldOut &&
    !/סט|\bset/i.test(p.name)
);
const BY_HUE: Record<string, Product[]> = {};
for (const h of HUES) BY_HUE[h.key] = TUBES.filter((p) => h.re.test(p.name));

const PAGE = 8;

/* ---------- icons ---------- */
const Ico = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const I = {
  arrow: "M19 12H5M11 6l-6 6 6 6",
  plus: "M12 5v14M5 12h14",
  check: "M5 12.5 10 17 19 7",
  pin: "M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  shuffle: "M4 7h3.5a5 5 0 0 1 4 2l1 1.5a5 5 0 0 0 4 2.5H20M4 17h3.5a5 5 0 0 0 4-2M16.5 7H20M17 4l3 3-3 3M17 10.5l3 3-3 3",
  truck: "M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a1.8 1.8 0 1 0 0-3.6A1.8 1.8 0 0 0 7 19zm10 0a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z",
  eraser: "M4 16 13 7l5 5-7 7H7zM10 19h10",
};

/* ---------- product card ---------- */
const PgCard = ({ p, i = 0 }: { p: Product; i?: number }) => {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const pct = salePct(p);
  const direct = quickAddable(p);
  const onAdd = (e: any) => {
    if (!direct) return; // options / sold out → the Link opens the product page
    e.preventDefault();
    e.stopPropagation();
    add(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };
  return (
    <Link
      to={`/product/${p.id}`}
      className={`pg-card ${p.soldOut ? "is-out" : ""}`}
      style={{ "--i": i } as any}
    >
      <div className="pg-card-img">
        <ProductThumb product={p} />
        {pct > 0 && !p.soldOut && <span className="pg-flag">{pct}%-</span>}
        {p.soldOut && <span className="pg-flag out">אזל</span>}
      </div>
      <span className="pg-card-name">{p.name}</span>
      <div className="pg-card-foot">
        <span className="pg-price">
          {variantPricesVary(p) && <small>מ־</small>}
          {shekel(finalPrice(p))}
          {p.salePrice && <s>{shekel(p.price)}</s>}
        </span>
        {!p.soldOut && (
          <button
            type="button"
            className={`pg-add ${added ? "is-added" : ""}`}
            onClick={onAdd}
            aria-label={direct ? `הוספת ${p.name} לעגלה` : `לבחירת אפשרות — ${p.name}`}
          >
            <Ico d={added ? I.check : direct ? I.plus : I.arrow} />
          </button>
        )}
      </div>
    </Link>
  );
};

/* ---------- the paintable hero canvas ----------
   Dry-brush look: every segment is drawn as a fan of thin "bristle" lines offset
   along the stroke normal, each with its own width/opacity. */
const BRISTLES = Array.from({ length: 11 }, (_, i) => {
  const t = i / 10 - 0.5; // -0.5 … 0.5 across the brush
  const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1; // stable pseudo-random
  return { off: t, w: 0.14 + r * 0.1, a: 0.55 + r * 0.45 };
});

// intro strokes in hero-relative coords (x from the LEFT, 0…1): cubic béziers
const INTRO: { c: number; w: number; p: number[] }[] = [
  { c: 1, w: 1.25, p: [0.08, 0.34, 0.3, 0.1, 0.62, 0.52, 0.93, 0.26] },
  { c: 2, w: 0.95, p: [0.9, 0.62, 0.66, 0.84, 0.36, 0.5, 0.1, 0.74] },
  { c: 3, w: 0.7, p: [0.3, 0.9, 0.46, 0.78, 0.6, 0.98, 0.74, 0.86] },
];
const bez = (p: number[], t: number) => {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p[0] + b * p[2] + c * p[4] + d * p[6], a * p[1] + b * p[3] + c * p[5] + d * p[7]];
};

const usePaintCanvas = (
  heroRef: { current: HTMLElement | null },
  cvsRef: { current: HTMLCanvasElement | null },
  colorRef: { current: string }
) => {
  const api = useRef<{ clear: () => void }>({ clear: () => {} });

  useEffect(() => {
    const hero = heroRef.current;
    const cvs = cvsRef.current;
    const ctx = cvs?.getContext("2d");
    if (!hero || !cvs || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, raf = 0, cleared = false;

    const seg = (x0: number, y0: number, x1: number, y1: number, width: number, color: string) => {
      const dx = x1 - x0, dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      for (const b of BRISTLES) {
        ctx.globalAlpha = b.a;
        ctx.lineWidth = Math.max(1, b.w * width);
        ctx.beginPath();
        ctx.moveTo(x0 + nx * b.off * width, y0 + ny * b.off * width);
        ctx.lineTo(x1 + nx * b.off * width, y1 + ny * b.off * width);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    const base = () => Math.max(46, Math.min(W, 1500) * 0.085);
    const introUpTo = (progress: number) => {
      INTRO.forEach((s, i) => {
        // strokes run one after another, slightly overlapping
        const local = Math.min(1, Math.max(0, progress * INTRO.length - i * 0.85));
        if (local <= 0) return;
        const steps = Math.ceil(90 * local);
        let [px, py] = bez(s.p, 0);
        for (let k = 1; k <= steps; k++) {
          const t = (k / 90);
          const [x, y] = bez(s.p, t);
          // taper in and out like a loaded brush
          const taper = Math.sin(Math.min(1, t * 1.15) * Math.PI) * 0.55 + 0.45;
          seg(px * W, py * H, x * W, y * H, base() * s.w * taper, PIGMENTS[s.c].hex);
          px = x; py = y;
        }
      });
    };

    const resize = () => {
      const r = hero.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cvs.width = Math.round(W * dpr);
      cvs.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!cleared) introUpTo(1);
    };

    // animated intro (or static under reduced motion)
    resize();
    if (!reduced) {
      ctx.clearRect(0, 0, W, H);
      const t0 = performance.now();
      const DUR = 1700;
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / DUR);
        ctx.clearRect(0, 0, W, H);
        introUpTo(1 - Math.pow(1 - p, 3));
        if (p < 1 && !cleared) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    // pointer painting
    let last: { x: number; y: number; t: number; w: number } | null = null;
    const onMove = (e: PointerEvent) => {
      const r = cvs.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top, t = e.timeStamp;
      if (!last || t - last.t > 160) {
        last = { x, y, t, w: base() * 0.5 };
        return;
      }
      const dist = Math.hypot(x - last.x, y - last.y);
      if (dist < 3) return;
      const speed = dist / Math.max(1, t - last.t); // px per ms
      const target = Math.max(base() * 0.22, base() * 0.7 - speed * base() * 0.22);
      const w = last.w + (target - last.w) * 0.25; // fast hand → thinner line
      cancelAnimationFrame(raf); // painting takes over from the intro
      seg(last.x, last.y, x, y, w, colorRef.current);
      last = { x, y, t, w };
    };
    const onLeave = () => (last = null);

    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    hero.addEventListener("pointerup", onLeave);
    hero.addEventListener("pointercancel", onLeave);

    let rt: any;
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(resize, 150);
    };
    window.addEventListener("resize", onResize);

    api.current.clear = () => {
      cleared = true;
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, W, H);
    };

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(rt);
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      hero.removeEventListener("pointerup", onLeave);
      hero.removeEventListener("pointercancel", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return api;
};

/* ---------- shop by hue ---------- */
const HueShop = () => {
  const [hue, setHue] = useState(HUES[5]); // open on blue — the biggest shelf
  const [medium, setMedium] = useState("");
  const [page, setPage] = useState(0);

  const pool = useMemo(
    () => BY_HUE[hue.key].filter((p) => !medium || p.sub === medium),
    [hue, medium]
  );
  const pages = Math.max(1, Math.ceil(pool.length / PAGE));
  const shown = pool.slice((page % pages) * PAGE, (page % pages) * PAGE + PAGE);

  return (
    <section
      className="pg-hue"
      id="pg-hue"
      style={{ "--hue": hue.hex, "--hue-soft": hue.soft } as any}
    >
      <div className="pg-shell">
        <header className="pg-head">
          <span className="pg-kicker">רק אצלנו</span>
          <h2>קונים לפי גוון</h2>
          <p>
            {TUBES.length.toLocaleString("he-IL")} שפופרות וכפתורי צבע, ממוינים לפי
            הצבע שבראש שלכם — לא לפי מק״ט.
          </p>
        </header>

        <div className="pg-hue-wheel" role="radiogroup" aria-label="בחרו גוון">
          {HUES.map((h, i) => (
            <button
              key={h.key}
              type="button"
              role="radio"
              aria-checked={h.key === hue.key}
              className={`pg-blob b${i % 4} ${h.key === hue.key ? "is-on" : ""}`}
              style={{ "--c": h.hex } as any}
              onClick={() => {
                setHue(h);
                setPage(0);
              }}
            >
              <i aria-hidden="true" />
              <span>{h.name}</span>
            </button>
          ))}
        </div>

        <div className="pg-hue-bar">
          <div className="pg-seg" role="radiogroup" aria-label="סוג צבע">
            {MEDIA.map((m) => (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={m.key === medium}
                className={m.key === medium ? "is-on" : ""}
                onClick={() => {
                  setMedium(m.key);
                  setPage(0);
                }}
              >
                {m.name}
              </button>
            ))}
          </div>
          <p className="pg-hue-count" aria-live="polite">
            <strong>{pool.length}</strong> גווני {hue.name} במלאי
          </p>
          {pages > 1 && (
            <button type="button" className="pg-btn ghost" onClick={() => setPage((n) => n + 1)}>
              <Ico d={I.shuffle} /> עוד גוונים
            </button>
          )}
        </div>

        {shown.length > 0 ? (
          <div className="pg-grid" key={`${hue.key}-${medium}-${page}`}>
            {shown.map((p, i) => <PgCard key={p.id} p={p} i={i} />)}
          </div>
        ) : (
          <p className="pg-hue-empty">אין כרגע {hue.name} בסוג הזה — נסו סוג צבע אחר.</p>
        )}

        <div className="pg-hue-more">
          <Link to={medium ? subPath("paints", medium) : "/category/paints"} className="pg-btn ink">
            לכל {medium ? MEDIA.find((m) => m.key === medium)?.name : "צבעי האמנות"} <Ico d={I.arrow} />
          </Link>
        </div>
      </div>
    </section>
  );
};

/* ---------- live free-shipping meter (reads the real cart) ---------- */
const ShipMeter = () => {
  const { total, count, openSheet } = useCart();
  const pct = Math.min(100, (total / FREE_SHIPPING_FROM) * 100);
  const mid = (REDUCED_SHIPPING_FROM / FREE_SHIPPING_FROM) * 100;
  const msg =
    total >= FREE_SHIPPING_FROM
      ? "יש! המשלוח עליכם חינם."
      : total >= REDUCED_SHIPPING_FROM
        ? `המשלוח שלכם כבר ${shekel(REDUCED_SHIPPING_PRICE)} בלבד. עוד ${shekel(FREE_SHIPPING_FROM - total)} — והוא חינם.`
        : total > 0
          ? `עוד ${shekel(REDUCED_SHIPPING_FROM - total)} והמשלוח יורד ל־${shekel(REDUCED_SHIPPING_PRICE)}.`
          : `מעל ${shekel(REDUCED_SHIPPING_FROM)} המשלוח ${shekel(REDUCED_SHIPPING_PRICE)} בלבד. מעל ${shekel(FREE_SHIPPING_FROM)} — חינם.`;

  return (
    <section className="pg-ship">
      <div className="pg-shell pg-ship-in">
        <div>
          <h2>כמה חסר למשלוח חינם?</h2>
          <p aria-live="polite">{msg}</p>
        </div>
        <div className="pg-meter">
          <div
            className="pg-meter-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={FREE_SHIPPING_FROM}
            aria-valuenow={Math.min(total, FREE_SHIPPING_FROM)}
            aria-label="התקדמות למשלוח חינם"
          >
            <i style={{ width: `${pct}%` }} />
            <b className={total >= REDUCED_SHIPPING_FROM ? "hit" : ""} style={{ insetInlineStart: `${mid}%` }}>
              <Ico d={I.truck} />
            </b>
            <b className={total >= FREE_SHIPPING_FROM ? "hit" : ""} style={{ insetInlineStart: "100%" }}>
              <Ico d={I.check} />
            </b>
          </div>
          <div className="pg-meter-legend">
            <span>בעגלה: <strong>{shekel(total)}</strong></span>
            <span style={{ insetInlineStart: `${mid}%` }} className="at">{shekel(REDUCED_SHIPPING_FROM)}</span>
            <span className="end">{shekel(FREE_SHIPPING_FROM)}</span>
          </div>
        </div>
        {count > 0 && (
          <button type="button" className="pg-btn ink" onClick={openSheet}>
            לעגלה ({count})
          </button>
        )}
      </div>
    </section>
  );
};

export default function DesignPigment() {
  usePageMeta({ title: titleFor("עיצוב · פיגמנט"), path: "/designs/b", noindex: true });
  useDesignTheme("dz-theme-pigment", FONTS);
  const status = useOpenStatus();

  const [pigment, setPigment] = useState(PIGMENTS[0]);
  const colorRef = useRef(pigment.hex);
  colorRef.current = pigment.hex;
  const heroRef = useRef<HTMLElement>(null);
  const cvsRef = useRef<HTMLCanvasElement>(null);
  const paint = usePaintCanvas(heroRef, cvsRef, colorRef);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <main className="dz-pigment page-main" style={{ "--pg-accent": pigment.hex } as any}>
      {/* ---------- hero: paint on me ---------- */}
      <section className="pg-hero" ref={heroRef}>
        <canvas ref={cvsRef} className="pg-canvas" aria-hidden="true" />
        <img className="pg-float tube" src={dzImg("b-tube.webp")} alt="" aria-hidden="true" width="900" height="900" />
        <img className="pg-float brush" src={dzImg("b-brush.webp")} alt="" aria-hidden="true" width="900" height="900" />

        <div className="pg-hero-in">
          <p className="pg-hero-tag">לב התחביב · רחובות · מאז {store.since}</p>
          <h1>
            <span>בא לכם</span>
            <span>ליצור<em>?</em></span>
          </h1>
          <p className="pg-hero-sub">
            צבעים, מכחולים, נייר, חימר וחוטים — {products.length.toLocaleString("he-IL")} מוצרים,
            חנות משפחתית אחת, {yearsOpen(store.since)} שנה של עצות טובות ליד הקופה.
          </p>
          <div className="pg-hero-cta">
            <button type="button" className="pg-btn accent big" onClick={() => scrollTo("pg-bento")}>
              יאללה לחנות
            </button>
            <button type="button" className="pg-btn ghost big" onClick={() => scrollTo("pg-hue")}>
              קונים לפי גוון
            </button>
          </div>
        </div>

        <div className="pg-dock">
          <span className="pg-dock-hint">בחרו צבע — וציירו על המסך</span>
          <div className="pg-dock-row" role="radiogroup" aria-label="צבע המכחול">
            {PIGMENTS.map((c) => (
              <button
                key={c.hex}
                type="button"
                role="radio"
                aria-checked={c.hex === pigment.hex}
                aria-label={c.name}
                title={c.name}
                className={c.hex === pigment.hex ? "is-on" : ""}
                style={{ "--c": c.hex } as any}
                onClick={() => setPigment(c)}
              />
            ))}
            <button type="button" className="pg-dock-clear" onClick={() => paint.current.clear()} aria-label="ניקוי הציור" title="ניקוי">
              <Ico d={I.eraser} />
            </button>
          </div>
        </div>
      </section>

      {/* ---------- marquee: the manager's real ribbon texts ---------- */}
      <div className="pg-marquee" aria-label="הודעות החנות">
        <div className="pg-marquee-track">
          {[0, 1].map((k) => (
            <ul key={k} aria-hidden={k === 1}>
              {siteSettings.ribbonTexts.map((t) => <li key={t}>{t}</li>)}
            </ul>
          ))}
        </div>
      </div>

      {/* ---------- bento categories ---------- */}
      <section className="pg-sec" id="pg-bento">
        <div className="pg-shell">
          <header className="pg-head">
            <h2>המדפים</h2>
            <p>תשע מחלקות. תבחרו אחת, תצאו עם שלוש.</p>
          </header>
          <div className="pg-bento">
            {categories.map((c, i) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className={`pg-tile ${i === 0 ? "big" : ""}`}
                style={{ background: TILE_BG[c.slug], "--i": i } as any}
              >
                <img src={dzImg(`b-${c.slug}.webp`)} alt="" loading="lazy" width="1000" height="1000" />
                <span className="pg-tile-label">
                  <strong>{c.name}</strong>
                  <small>{productsByCategory(c.slug).length} מוצרים</small>
                  <Ico d={I.arrow} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- shop by hue ---------- */}
      <HueShop />

      {/* ---------- sale (only when the manager has items on sale) ---------- */}
      {salePicks.length > 0 && (
        <section className="pg-sec">
          <div className="pg-shell">
            <header className="pg-head row">
              <h2>במבצע עכשיו</h2>
              <Link to="/sale" className="pg-btn ghost">לכל המבצעים <Ico d={I.arrow} /></Link>
            </header>
            <div className="pg-grid">
              {salePicks.slice(0, 4).map((p, i) => <PgCard key={p.id} p={p} i={i} />)}
            </div>
          </div>
        </section>
      )}

      {/* ---------- featured on a colour field ---------- */}
      {featuredPicks.length > 0 && (
        <section className="pg-sec pg-hot">
          <div className="pg-shell">
            <header className="pg-head">
              <h2>המדף החם</h2>
              <p>מה שהצוות ממליץ עליו החודש — פלוס אחד ובעגלה.</p>
            </header>
            <div className="pg-grid">
              {featuredPicks.slice(0, 8).map((p, i) => <PgCard key={p.id} p={p} i={i} />)}
            </div>
          </div>
        </section>
      )}

      <ShipMeter />

      {/* ---------- quote over the paint swirl ---------- */}
      <section className="pg-swirl">
        <img src={dzImg("b-swirl.webp")} alt="" aria-hidden="true" loading="lazy" width="2200" height="943" />
        <blockquote>
          <p>כל יצירה גדולה מתחילה בלב</p>
          <footer>
            לא רק קונים — מתייעצים, ממששים את הנייר, משווים גוונים מול האור. מאז {store.since}, ברחובות.
          </footer>
        </blockquote>
      </section>

      {/* ---------- workshops + visit ---------- */}
      <section className="pg-sec last">
        <div className="pg-shell pg-duo">
          <article className="pg-block pink">
            <span className="pg-kicker">בחנות, פנים אל פנים</span>
            <h2>חוגים וסדנאות</h2>
            <p>{workshops.intro}</p>
            <ul className="pg-chips">
              {workshops.topics.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <p className="pg-when">{workshops.schedule}</p>
            <a href={`tel:${workshops.contactTel}`} className="pg-btn ink">להרשמה: {workshops.contact}</a>
          </article>

          <article className="pg-block sun">
            <span className={`pg-open ${status.open ? "is-open" : ""}`}><i aria-hidden="true" />{status.label}</span>
            <h2>{store.address}</h2>
            <table className="pg-hours">
              <tbody>
                {store.hours.map((h) => (
                  <tr key={h.days}><th scope="row">{h.days}</th><td>{h.time}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="pg-contact">
              <a href={`tel:${store.phone}`}>{store.phone}</a>
              <a href={`mailto:${store.email}`}>{store.email}</a>
            </p>
            <div className="pg-block-cta">
              <a href={store.waze} target="_blank" rel="noreferrer" className="pg-btn ink"><Ico d={I.pin} /> Waze</a>
              <a href={store.maps} target="_blank" rel="noreferrer" className="pg-btn ghost">Google Maps</a>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
