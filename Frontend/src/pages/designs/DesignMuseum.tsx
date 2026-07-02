import "./design-museum.css";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  categories,
  products,
  productsByCategory,
  getProduct,
  getCategory,
  finalPrice,
  shekel,
  isOnSale,
  salePct,
  siteSettings,
  store,
  workshops,
  asset,
  Product,
  Category,
} from "../../data/catalog";
import { ProductThumb } from "../../components/ProductThumb";
import { ProductArt } from "../../components/ProductArt";

/* ---------------------------------------------------------------------------
   Design I — "Museum / תערוכה"

   The shop presented AS AN EXHIBITION. Warm gallery-white walls, huge light
   Amatic display type, numbered halls with hairline rules, geometric
   "peephole" frames for the collections, and sale items hung like framed
   works with a red gallery dot-label. Motion = soft scroll reveals only,
   reduced-motion-gated and fail-open. Zero props, everything from catalog.
   --------------------------------------------------------------------------- */

/* ---------- data picks (manager-curated first, heuristics second) ---------- */

// current exhibition = up to 6 on-sale works
const saleItems: Product[] = (
  siteSettings.saleIds.length > 0
    ? siteSettings.saleIds
        .map((id) => getProduct(id))
        .filter((p): p is Product => Boolean(p) && isOnSale(p as Product))
    : products.filter(isOnSale)
).slice(0, 6);

// selected works = exactly 4 → one tidy uniform row, never an orphan
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

// peephole geometry cycles: arch → circle → dome
const peepShape = (i: number) => ["arch", "round", "dome"][i % 3];

/* ---------- small building blocks ---------- */

// numbered hall header: big ochre numeral + Latin wayfinding + Hebrew title
const HallHead = ({
  num,
  way,
  title,
  lead,
}: {
  num: string;
  way: string;
  title: string;
  lead?: string;
}) => (
  <header className="mz-hall-head mz-reveal">
    <span className="mz-hall-num" aria-hidden="true">
      {num}
    </span>
    <div className="mz-hall-titles">
      <span className="mz-way">{way}</span>
      <h2 className="mz-h2">{title}</h2>
      {lead && <p className="mz-lead">{lead}</p>}
    </div>
  </header>
);

// a work "hung" on the gallery wall — double frame, mat, red dot-label
const FramedWork = ({ p, i }: { p: Product; i: number }) => {
  const cat = getCategory(p.category);
  const pct = salePct(p);
  return (
    <Link
      to={`/product/${p.id}`}
      className="mz-work mz-reveal"
      style={{ "--d": `${(i % 6) * 70}ms` } as any}
    >
      <div className="mz-work-mat">
        {pct > 0 && (
          <span className="mz-dot" aria-hidden="true">
            -{pct}%
          </span>
        )}
        <div className="mz-work-thumb">
          <ProductThumb product={p} />
        </div>
      </div>
      <div className="mz-work-label">
        {cat && <span className="mz-work-cat">{cat.name}</span>}
        <span className="mz-work-name">{p.name}</span>
        <div className="mz-price-row">
          <span className="mz-price-now">{shekel(finalPrice(p))}</span>
          {pct > 0 && (
            <span className="mz-price-was">{shekel(p.price)}</span>
          )}
          {pct > 0 && (
            <span className="mz-sr">במחיר מבצע, הנחה של {pct} אחוז</span>
          )}
        </div>
      </div>
    </Link>
  );
};

// selected-works card — uniform height, quiet label
const SelectedWork = ({ p, i }: { p: Product; i: number }) => {
  const cat = getCategory(p.category);
  const sale = isOnSale(p);
  return (
    <Link
      to={`/product/${p.id}`}
      className="mz-sel mz-reveal"
      style={{ "--d": `${(i % 4) * 80}ms` } as any}
    >
      <div className="mz-sel-thumb">
        <ProductThumb product={p} />
      </div>
      <div className="mz-sel-label">
        {cat && <span className="mz-work-cat">{cat.name}</span>}
        <span className="mz-sel-name">{p.name}</span>
        <div className="mz-price-row">
          <span className={sale ? "mz-price-now sm" : "mz-price-ink"}>
            {shekel(finalPrice(p))}
          </span>
          {sale && <span className="mz-price-was">{shekel(p.price)}</span>}
        </div>
      </div>
    </Link>
  );
};

export default function DesignMuseum() {
  const ref = useRef<HTMLElement>(null);

  /* Soft scroll reveals only — dignified museum pacing.
     FAIL-OPEN: the hidden start-state CSS only applies once "mz-js" is added,
     which happens only when JS runs, motion is allowed AND IO exists. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    el.classList.add("mz-js");
    const targets = el.querySelectorAll<HTMLElement>(".mz-reveal");
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <main className="dz-museum page-main" ref={ref}>
      {/* ================= HERO — exhibition poster ================= */}
      <section className="mz-hero">
        <div className="mz-shell">
          <div className="mz-hero-way mz-reveal">
            <span className="mz-way">Lev Hatahbiv · Permanent Collection</span>
            <span className="mz-way">Rehovot · Est. {store.since}</span>
          </div>
          <hr className="mz-rule" />
          <div className="mz-hero-grid">
            <div className="mz-hero-copy mz-reveal">
              <h1 className="mz-hero-title">
                <span>כל יצירה</span>
                <span>מתחילה</span>
                <span className="mz-hero-under">כאן</span>
              </h1>
              <p className="mz-hero-sub">
                צבעים, מכחולים, נייר וחוטים — חנות משפחתית עם כל מה שהידיים
                שלכם מחפשות, ועם עצה טובה ליד הקופה.
              </p>
              <div className="mz-hero-ctas">
                <Link
                  to={`/category/${categories[0].slug}`}
                  className="mz-btn line"
                >
                  לסיור בין המדפים ←
                </Link>
                <a
                  href={store.waze}
                  target="_blank"
                  rel="noreferrer"
                  className="mz-link"
                >
                  ניווט לחנות
                </a>
              </div>
            </div>

            {/* the logo as a museum plaque */}
            <div className="mz-plaque-wall mz-reveal">
              <div className="mz-plaque">
                <img
                  src={asset("/images/LevHatahbivLogo.png")}
                  alt="לב התחביב"
                  loading="lazy"
                />
                <hr className="mz-rule ochre" />
                <p className="mz-plaque-line">מאז {store.since} · רחובות</p>
                <p className="mz-plaque-latin">
                  Lev Hatahbiv — Family Art Supplies
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= HALL 01 — current exhibition: on sale ================= */}
      {saleItems.length > 0 && (
        <section className="mz-hall" aria-labelledby="mz-h-sale">
          <div className="mz-shell">
            <HallHead
              num="01"
              way="Hall 01 · Current Exhibition"
              title="התערוכה הנוכחית: מבצעים"
              lead="עבודות שירדו במחיר — תלויות על הקיר לזמן מוגבל."
            />
            <span id="mz-h-sale" className="mz-sr">
              מבצעים
            </span>
            <div className="mz-wall">
              {saleItems.map((p, i) => (
                <FramedWork key={p.id} p={p} i={i} />
              ))}
            </div>
            <div className="mz-more mz-reveal">
              <Link to="/sale" className="mz-btn line">
                לעוד מבצעים ←
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ================= HALL 02 — the collections ================= */}
      <section className="mz-hall" aria-labelledby="mz-h-cats">
        <div className="mz-shell">
          <HallHead
            num="02"
            way="Hall 02 · The Collections"
            title="האוספים"
            lead="תשעה אגפים קבועים — כל אחד עולם שלם של חומרים."
          />
          <span id="mz-h-cats" className="mz-sr">
            קטגוריות
          </span>
          <div className="mz-cats">
            {categories.map((c: Category, i) => (
              <Link
                key={c.slug}
                to={`/category/${c.slug}`}
                className="mz-cat mz-reveal"
                style={{ "--d": `${(i % 3) * 90}ms` } as any}
              >
                <span
                  className={`mz-peep ${peepShape(i)}`}
                  style={{ background: c.soft }}
                  aria-hidden="true"
                >
                  <ProductArt kind={c.art} color={c.color} />
                </span>
                <span className="mz-cat-label">
                  <span className="mz-cat-name">{c.name}</span>
                  <span className="mz-cat-count">
                    {productsByCategory(c.slug).length} פריטים ←
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HALL 03 — selected works ================= */}
      {featured.length > 0 && (
        <section className="mz-hall" aria-labelledby="mz-h-sel">
          <div className="mz-shell">
            <HallHead
              num="03"
              way="Hall 03 · Selected Works"
              title="נבחרים מהמדפים"
            />
            <span id="mz-h-sel" className="mz-sr">
              מוצרים נבחרים
            </span>
            <div className="mz-sel-row">
              {featured.map((p, i) => (
                <SelectedWork key={p.id} p={p} i={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= WALL TEXT — the quote ================= */}
      <section className="mz-walltext-band">
        <div className="mz-shell">
          <figure className="mz-walltext mz-reveal">
            <span className="mz-way center">Wall Text</span>
            <blockquote>
              <p className="mz-quote">כל יצירה גדולה מתחילה בלב</p>
              <p className="mz-quote-body">
                לא רק קונים — מתייעצים, ממששים את הנייר, משווים גוונים מול
                האור, ויוצאים עם בדיוק מה שהפרויקט הבא צריך. מאז {store.since}
                , ברחובות.
              </p>
            </blockquote>
            <figcaption className="mz-quote-cap">
              — לב התחביב, {store.address}
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ================= HALL 04 — workshops ================= */}
      <section className="mz-hall" aria-labelledby="mz-h-ws">
        <div className="mz-shell">
          <HallHead
            num="04"
            way="Hall 04 · Workshops"
            title="סדנאות וחוגים"
          />
          <span id="mz-h-ws" className="mz-sr">
            סדנאות
          </span>
          <div className="mz-ws">
            <div className="mz-ws-list mz-reveal">
              <p className="mz-ws-intro">{workshops.intro}</p>
              <ul>
                {workshops.topics.map((t, i) => (
                  <li key={t}>
                    <span className="mz-ws-idx" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="mz-ws-topic">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <aside className="mz-ws-panel mz-reveal">
              <span className="mz-way onolive">Guided Sessions</span>
              <p className="mz-ws-when">{workshops.schedule}</p>
              <p className="mz-ws-host">בהנחיית {workshops.contact}</p>
              <a href={`tel:${workshops.contactTel}`} className="mz-btn ghost">
                להרשמה טלפונית
              </a>
            </aside>
          </div>
        </div>
      </section>

      {/* ================= HALL 05 — visitor information ================= */}
      <section className="mz-hall last" aria-labelledby="mz-h-visit">
        <div className="mz-shell">
          <HallHead
            num="05"
            way="Hall 05 · Visitor Information"
            title="מידע למבקרים"
          />
          <span id="mz-h-visit" className="mz-sr">
            שעות פתיחה ויצירת קשר
          </span>
          <div className="mz-visit">
            <div className="mz-vcol mz-reveal">
              <h3 className="mz-vh">שעות פתיחה</h3>
              <table className="mz-hours">
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
            <div className="mz-vcol mz-reveal">
              <h3 className="mz-vh">הדרך אלינו</h3>
              <ul className="mz-vrows">
                <li>{store.address}</li>
                <li>
                  <a href={`tel:${store.phone}`}>{store.phone}</a>
                </li>
                <li>
                  <a href={`mailto:${store.email}`}>{store.email}</a>
                </li>
              </ul>
              <div className="mz-vactions">
                <a
                  href={store.waze}
                  target="_blank"
                  rel="noreferrer"
                  className="mz-btn solid"
                >
                  פותחים Waze
                </a>
                <a
                  href={store.maps}
                  target="_blank"
                  rel="noreferrer"
                  className="mz-btn line"
                >
                  מפת Google
                </a>
              </div>
            </div>
          </div>

          {/* exit through the gift shop */}
          <div className="mz-colophon mz-reveal">
            <hr className="mz-rule" />
            <span className="mz-way">
              Lev Hatahbiv · Est. {store.since} · Rehovot
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
