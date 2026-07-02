import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  categories,
  products,
  productsByCategory,
  getProduct,
  finalPrice,
  shekel,
  isOnSale,
  salePct,
  siteSettings,
  store,
  workshops,
  asset,
  Product,
} from "../../data/catalog";
import { ProductThumb } from "../../components/ProductThumb";
import { ProductArt } from "../../components/ProductArt";
import "./design-magazine.css";

/* ---------------------------------------------------------------------------
   DesignMagazine — "Art Magazine / קולאז'"
   The homepage as the cover + spreads of a printed art journal: newsprint
   cream, masthead issue line, column rules, polaroid product cards pinned
   with masking tape, price-gun sale stickers, pull-quotes and page-number
   footers. Sale = the cover story right after the hero; categories = the
   magazine's numbered מדורים (a calm contents page, no photo wall).
   --------------------------------------------------------------------------- */

// issue number = years in print (1985 → today), for the masthead line
const ISSUE = Math.max(1, new Date().getFullYear() - Number(store.since));

// cover story: up to 6 on-sale items — manager picks first, real stock else
const saleItems: Product[] = (
  siteSettings.saleIds.length > 0
    ? siteSettings.saleIds
        .map((id) => getProduct(id))
        .filter((p): p is Product => Boolean(p && isOnSale(p)))
    : products.filter(isOnSale)
).slice(0, 6);

// editor's picks: manager-curated, else one photographed staple per shelf
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

// hand-placed polaroid tilts — deterministic, alternating around 0
const TILTS = [-2.4, 1.8, -1.4, 2.6, -2, 1.2];
const TINTS = ["mustard", "terra", "blue"] as const;

function SalePolaroid({ p, i }: { p: Product; i: number }) {
  const pct = salePct(p);
  return (
    <Link
      to={`/product/${p.id}`}
      className="dz-mg-pola"
      style={{ ["--tilt" as any]: `${TILTS[i % TILTS.length]}deg` }}
    >
      <span
        className="dz-mg-tape"
        data-tint={TINTS[i % TINTS.length]}
        aria-hidden="true"
      />
      <span className="dz-mg-shot">
        <ProductThumb product={p} />
        {pct > 0 && (
          <span className="dz-mg-sticker" aria-hidden="true">
            {pct}%-
          </span>
        )}
      </span>
      <span className="dz-mg-pola-info">
        <span className="dz-mg-pola-name">{p.name}</span>
        <span className="dz-mg-price-row">
          <b className="dz-mg-price-now">{shekel(finalPrice(p))}</b>
          <s className="dz-mg-price-was">{shekel(p.price)}</s>
        </span>
      </span>
    </Link>
  );
}

export default function DesignMagazine() {
  const ref = useRef<HTMLElement>(null);

  /* Gentle scroll reveals. FAIL-OPEN: the hidden start state only exists under
     .is-reveal, which is added only when JS runs AND reduced-motion is off. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    el.classList.add("is-reveal");
    const targets = el.querySelectorAll<HTMLElement>(
      ".dz-mg-rev, .dz-mg-rev-item"
    );
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const node = entry.target as HTMLElement;
          if (node.classList.contains("dz-mg-rev-item") && node.parentElement) {
            const peers = Array.prototype.slice.call(
              node.parentElement.children
            ) as HTMLElement[];
            const idx = peers.indexOf(node);
            node.style.setProperty("--rev-delay", `${(idx % 6) * 70}ms`);
          }
          node.classList.add("in");
          obs.unobserve(node);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <main className="dz-mag page-main" ref={ref}>
      {/* ---------- masthead issue line ---------- */}
      <div className="dz-mg-masthead">
        <div className="dz-mg-shell dz-mg-masthead-row">
          <span className="dz-mg-mast-brand">לב התחביב · המגזין</span>
          <span>גיליון מס׳ {ISSUE}</span>
          <span>רחובות · מאז {store.since}</span>
          <span className="dz-mg-mast-price">מחיר: כניסה חופשית</span>
        </div>
      </div>

      {/* ---------- 1) COVER ---------- */}
      <section className="dz-mg-cover-wrap">
        <div className="dz-mg-shell">
          <div className="dz-mg-cover">
            <span className="dz-mg-tape big" data-tint="terra" aria-hidden="true" />
            <div className="dz-mg-cover-main">
              <p className="dz-mg-cover-kicker">
                המגזין של היוצרים · יוצא לאור מאז {store.since}
              </p>
              <h1 className="dz-mg-cover-title display">
                <span>כל</span>
                <span className="hl">יצירה</span>
                <span>מתחילה</span>
                <span className="terra">כאן</span>
              </h1>
              <p className="dz-mg-cover-lines">
                <b>בפנים:</b> המבצעים החמים · סדנאות בחנות ·{" "}
                {products.length.toLocaleString("he-IL")} מוצרים על המדפים ·
                עצה טובה ליד הקופה
              </p>
              <div className="dz-mg-cover-ctas">
                <Link
                  to={`/category/${categories[0].slug}`}
                  className="dz-mg-btn solid"
                >
                  לדפדף במדפים ←
                </Link>
                <a
                  href={store.waze}
                  target="_blank"
                  rel="noreferrer"
                  className="dz-mg-btn line"
                >
                  ניווט לחנות
                </a>
              </div>
            </div>

            <div className="dz-mg-cover-side">
              <div className="dz-mg-cover-logo">
                <span className="dz-mg-tape" data-tint="mustard" aria-hidden="true" />
                <img src={asset("/images/LevHatahbivLogo.png")} alt="לב התחביב" />
                <span className="dz-mg-cover-logo-cap">
                  החנות שלנו, {store.address}
                </span>
              </div>
              <div className="dz-mg-barcode" aria-hidden="true">
                <span className="dz-mg-barcode-lines" />
                <span className="dz-mg-barcode-num">7 290000 {store.since}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 2) COVER STORY — SALE ---------- */}
      {saleItems.length > 0 && (
        <section className="dz-mg-sec dz-mg-rev">
          <div className="dz-mg-shell">
            <header className="dz-mg-head">
              <span className="dz-mg-kicker sale">כתבת השער</span>
              <h2 className="dz-mg-title display">המבצעים החמים של הגיליון</h2>
              <p className="dz-mg-note">
                צילמנו פולארויד לפני שהמחירים יורדים עוד — עד גמר המלאי.
              </p>
            </header>
            <ul className="dz-mg-sale-grid">
              {saleItems.map((p, i) => (
                <li key={p.id} className="dz-mg-rev-item">
                  <SalePolaroid p={p} i={i} />
                </li>
              ))}
            </ul>
            <div className="dz-mg-more">
              <Link to="/sale" className="dz-mg-btn line">
                לעוד מבצעים ←
              </Link>
            </div>
          </div>
          <footer className="dz-mg-pagefoot" aria-hidden="true">
            <span>עמ׳ 3</span>
          </footer>
        </section>
      )}

      {/* ---------- 3) CONTENTS — CATEGORIES AS מדורים ---------- */}
      <section className="dz-mg-sec dz-mg-rev">
        <div className="dz-mg-shell">
          <header className="dz-mg-head">
            <span className="dz-mg-kicker">תוכן העניינים</span>
            <h2 className="dz-mg-title display">המדורים שלנו</h2>
          </header>
          <ol className="dz-mg-toc">
            {categories.map((c, i) => (
              <li key={c.slug} className="dz-mg-rev-item">
                <Link
                  to={`/category/${c.slug}`}
                  className="dz-mg-toc-item"
                  style={{
                    ["--cc" as any]: c.color,
                    ["--csoft" as any]: c.soft,
                  }}
                >
                  <span
                    className="dz-mg-tape mini"
                    data-tint={TINTS[i % TINTS.length]}
                    aria-hidden="true"
                  />
                  <span className="dz-mg-toc-num display" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="dz-mg-toc-art">
                    <ProductArt kind={c.art} color={c.color} />
                  </span>
                  <b className="dz-mg-toc-name">{c.name}</b>
                  <span className="dz-mg-toc-blurb">{c.blurb}</span>
                  <span className="dz-mg-toc-foot">
                    <span>{productsByCategory(c.slug).length} מוצרים</span>
                    <i className="dz-mg-dots" aria-hidden="true" />
                    <span aria-hidden="true">עמ׳ {12 + i * 6}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
        <footer className="dz-mg-pagefoot" aria-hidden="true">
          <span>עמ׳ 5</span>
        </footer>
      </section>

      {/* ---------- 4) EDITOR'S PICKS — FEATURED ---------- */}
      {featured.length > 0 && (
        <section className="dz-mg-sec dz-mg-rev">
          <div className="dz-mg-shell">
            <header className="dz-mg-head">
              <span className="dz-mg-kicker">בחירת המערכת</span>
              <h2 className="dz-mg-title display">נבחרים מהמדפים</h2>
            </header>
            <div className="dz-mg-feat-row">
              {featured.map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="dz-mg-feat-card"
                >
                  <span className="dz-mg-feat-flag">מומלץ</span>
                  <span className="dz-mg-shot flat">
                    <ProductThumb product={p} />
                  </span>
                  <span className="dz-mg-feat-name">{p.name}</span>
                  <b className="dz-mg-feat-price">{shekel(finalPrice(p))}</b>
                </Link>
              ))}
            </div>
          </div>
          <footer className="dz-mg-pagefoot" aria-hidden="true">
            <span>עמ׳ 7</span>
          </footer>
        </section>
      )}

      {/* ---------- 5) PULL QUOTE ---------- */}
      <section className="dz-mg-quote dz-mg-rev">
        <div className="dz-mg-shell">
          <blockquote>
            <p className="display">
              לא רק קונים — מתייעצים, ממששים את הנייר, משווים גוונים מול האור,
              ויוצאים עם בדיוק מה שהפרויקט הבא צריך.
            </p>
            <footer>— יומן החנות · רחובות, מאז {store.since}</footer>
          </blockquote>
        </div>
      </section>

      {/* ---------- 6) FEATURE ARTICLE — WORKSHOPS ---------- */}
      <section className="dz-mg-sec dz-mg-rev">
        <div className="dz-mg-shell dz-mg-article">
          <div className="dz-mg-article-body">
            <header className="dz-mg-head start">
              <span className="dz-mg-kicker">כתבה</span>
              <h2 className="dz-mg-title display">חוגים וסדנאות</h2>
            </header>
            <p className="dz-mg-lede">{workshops.intro}</p>
            <ul className="dz-mg-topics">
              {workshops.topics.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <aside className="dz-mg-infobox">
            <span className="dz-mg-tape mini" data-tint="blue" aria-hidden="true" />
            <h3>לוח החוגים</h3>
            <p className="dz-mg-sched">🗓 {workshops.schedule}</p>
            <a href={`tel:${workshops.contactTel}`} className="dz-mg-btn solid wide">
              להרשמה: {workshops.contact}
            </a>
          </aside>
        </div>
        <footer className="dz-mg-pagefoot" aria-hidden="true">
          <span>עמ׳ 9</span>
        </footer>
      </section>

      {/* ---------- 7) READER INFO BOX — VISIT ---------- */}
      <section className="dz-mg-sec dz-mg-rev">
        <div className="dz-mg-shell">
          <div className="dz-mg-visit">
            <header className="dz-mg-visit-head">
              <span className="dz-mg-kicker">לוח מידע לקוראים</span>
              <h2 className="dz-mg-title display">קופצים לבקר?</h2>
            </header>
            <div className="dz-mg-visit-cols">
              <div className="dz-mg-visit-col">
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
              <div className="dz-mg-visit-col">
                <h3>יצירת קשר</h3>
                <ul className="dz-mg-visit-rows">
                  <li>📍 {store.address}</li>
                  <li>
                    📞 <a href={`tel:${store.phone}`}>{store.phone}</a>
                  </li>
                  <li>
                    ✉️ <a href={`mailto:${store.email}`}>{store.email}</a>
                  </li>
                </ul>
                <div className="dz-mg-visit-actions">
                  <a
                    href={store.waze}
                    target="_blank"
                    rel="noreferrer"
                    className="dz-mg-btn solid"
                  >
                    פותחים Waze
                  </a>
                  <a
                    href={store.maps}
                    target="_blank"
                    rel="noreferrer"
                    className="dz-mg-btn line"
                  >
                    מפת Google
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- colophon ---------- */}
      <div className="dz-mg-colophon">
        <div className="dz-mg-shell">
          <span>סוף הגיליון · נתראה בחנות — {store.address}</span>
        </div>
      </div>
    </main>
  );
}
