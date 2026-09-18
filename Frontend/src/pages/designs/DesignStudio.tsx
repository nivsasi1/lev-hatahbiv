import "./design-studio.css";
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  categories,
  products,
  productsByCategory,
  searchProducts,
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
   Design A — "Studio / סטודיו"

   Editorial, photographic, calm. Product-as-hero still lifes (generated as one
   cohesive set: ivory paper, hard afternoon sun), a Hebrew serif display face,
   one vermilion accent. Conversion pieces: search inside the hero, live
   open-now status, a starter-kit builder that drops a whole kit in the cart,
   quick-add rail. Reveals are CSS scroll-driven (no JS, fail-open).
   --------------------------------------------------------------------------- */

const FONTS =
  "https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700;900&display=swap";

const POPULAR = ["אקריליק", "אקוורל", "מכחול", "פימו", "קנסון", "פוסקה"];

/* ---------- starter kits: real catalog items, matched by name ----------
   The catalog is live (items sell out, get renamed), so a pick may be a list of
   fallbacks — the first one that's in stock wins. */
type KitDef = { key: string; name: string; blurb: string; picks: (string | string[])[] };

const KIT_DEFS: KitDef[] = [
  {
    key: "acrylic",
    name: "אקריליק",
    blurb: "הכי סלחני להתחיל איתו: מתייבש מהר, נשטף במים, ועובד על כמעט כל משטח.",
    picks: [
      ["סט צבע אקריליק 1/12 12מל", "סט צבע אקריליק מונט מרט 1/18", "סט צבע אקריליק"],
      "עגול ידית קצרה P3750 8",
      "Flat Shader P3750-10",
      "בלוק צבעי שמן ואקריליק",
      "פלטה פלסטיק פשוטה עגולה",
      "כן ציור עץ מתקפל שולחני",
    ],
  },
  {
    key: "watercolor",
    name: "אקוורל",
    blurb: "שקיפות, מים ואור. סט כפתורים, נייר שסופג נכון ושני מכחולים עגולים — וזהו.",
    picks: [
      "סט 16 Sonnet קוביות מים",
      "בלוק אקוורל XL A4",
      "עגול ידית קצרה P3750 6",
      "עגול ידית קצרה P3750 10",
      "מתקן לשטיפת מכחולים",
    ],
  },
  {
    key: "drawing",
    name: "רישום",
    blurb: "עיפרון, פחם ונייר טוב. כל מה שצריך כדי להתחיל לראות כמו ציירים.",
    picks: [
      "Drawing Set Classic",
      "רישום וציור A4",
      "עפרון פחם סט 3",
      "מחק פחם פאבר קאסטל",
      "מחדד Grip 2001",
    ],
  },
  {
    key: "oil",
    name: "צבעי שמן",
    blurb: "הקלאסיקה. סט פתיחה, חומר לניקוי ודילול, פלטת עץ ונייר ייעודי.",
    picks: [
      "Simply Oil 12ml sets",
      ["מדיום (מנקה) אקולוגי לצבעי שמן", "מנקה מכחולים לצבעי שמן", "טרפנטין מינרלי"],
      "פלטה עץ אובלית 30/20",
      "Canson XL OIL & ACRYLIC",
      "Flat Shader P3750-8",
    ],
  },
  {
    key: "sculpt",
    name: "פיסול",
    blurb: "חימר שמתייבש באוויר לפסלים, ופימו לתכשיטים ומיניאטורות שנאפים בתנור הביתי.",
    picks: [
      "דאס לבן 1 קג",
      "סופר סקלפי Super Scalpy",
      "פימו סופט 0 לבן",
      "פימו סופט 26 cherry red",
      "פימו סופט 37 pacific blue",
    ],
  },
];

type Kit = KitDef & { items: Product[] };

// a pick that's gone from the catalog (or sold out) just drops out of its kit
const KITS: Kit[] = KIT_DEFS.map((k) => ({
  ...k,
  items: k.picks
    .map((pick) => {
      for (const needle of Array.isArray(pick) ? pick : [pick]) {
        const hit = products.find(
          (p) => p.name.includes(needle) && p.img && quickAddable(p)
        );
        if (hit) return hit;
      }
    })
    .filter((p): p is Product => Boolean(p)),
})).filter((k) => k.items.length >= 3);

/* ---------- icons (one stroke family) ---------- */
const Ico = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const I = {
  truck: "M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a1.8 1.8 0 1 0 0-3.6A1.8 1.8 0 0 0 7 19zm10 0a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6z",
  bag: "M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2",
  shelf: "M4 5h16M4 12h16M4 19h16M7 5v7M12 12v7M17 5v7",
  chat: "M4 5h16v11H9l-5 4z",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 21 21",
  arrow: "M19 12H5M11 6l-6 6 6 6",
  pin: "M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  check: "M5 12.5 10 17 19 7",
  plus: "M12 5v14M5 12h14",
};

/* ---------- product card with quick-add ---------- */
const StCard = ({ p }: { p: Product }) => {
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
    <Link to={`/product/${p.id}`} className={`st-card ${p.soldOut ? "is-out" : ""}`}>
      <div className="st-card-img">
        <ProductThumb product={p} />
        {pct > 0 && !p.soldOut && <span className="st-card-flag">{pct}%-</span>}
        {p.soldOut && <span className="st-card-flag out">אזל</span>}
      </div>
      <div className="st-card-body">
        <span className="st-card-brand">{p.third !== "כללי" ? p.third : p.sub}</span>
        <span className="st-card-name">{p.name}</span>
        <div className="st-card-foot">
          <span className="st-price">
            {variantPricesVary(p) && <small>מ־</small>}
            {shekel(finalPrice(p))}
            {p.salePrice && <s>{shekel(p.price)}</s>}
          </span>
          {!p.soldOut && (
            <button
              type="button"
              className={`st-add ${added ? "is-added" : ""}`}
              onClick={onAdd}
              aria-label={direct ? `הוספת ${p.name} לעגלה` : `לבחירת אפשרות — ${p.name}`}
            >
              <Ico d={added ? I.check : I.plus} />
              <span>{added ? "נוסף" : direct ? "לעגלה" : "לבחירה"}</span>
            </button>
          )}
        </div>
      </div>
    </Link>
  );
};

/* ---------- hero search with live suggestions ---------- */
const HeroSearch = () => {
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const navigate = useNavigate();
  const results = useMemo(
    () => (q.trim().length > 1 ? searchProducts(q).slice(0, 5) : []),
    [q]
  );
  const go = (term: string) =>
    term.trim() && navigate(`/search?q=${encodeURIComponent(term.trim())}`);

  return (
    <div className="st-search-wrap">
      <form
        className="st-search"
        role="search"
        onSubmit={(e: any) => {
          e.preventDefault();
          go(q);
        }}
      >
        <label htmlFor="st-q" className="st-sr">חיפוש מוצר</label>
        <Ico d={I.search} />
        <input
          id="st-q"
          type="search"
          value={q}
          autoComplete="off"
          placeholder="מה יוצרים היום? צבע, מכחול, מותג…"
          onInput={(e: any) => setQ(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 180)}
        />
        <button type="submit">חיפוש</button>
      </form>

      {focus && q.trim().length > 1 && (
        <div className="st-suggest" role="listbox" aria-label="תוצאות מהירות">
          {results.length === 0 ? (
            <p className="st-suggest-empty">לא מצאנו “{q}” — נסו מילה אחרת</p>
          ) : (
            <>
              {results.map((p) => (
                <Link key={p.id} to={`/product/${p.id}`} role="option" className="st-suggest-row">
                  <span className="st-suggest-thumb"><ProductThumb product={p} /></span>
                  <span className="st-suggest-name">{p.name}</span>
                  <span className="st-suggest-price">{shekel(finalPrice(p))}</span>
                </Link>
              ))}
              <button type="button" className="st-suggest-all" onMouseDown={() => go(q)}>
                לכל התוצאות של “{q}”
              </button>
            </>
          )}
        </div>
      )}

      <div className="st-popular">
        <span>מחפשים הרבה:</span>
        {POPULAR.map((t) => (
          <Link key={t} to={`/search?q=${encodeURIComponent(t)}`}>{t}</Link>
        ))}
      </div>
    </div>
  );
};

/* ---------- starter-kit builder ---------- */
const KitBuilder = () => {
  const { add, total } = useCart();
  const [active, setActive] = useState(0);
  const [off, setOff] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);
  const kit = KITS[active];
  if (!kit) return null;

  const chosen = kit.items.filter((p) => !off[p.id]);
  const sum = chosen.reduce((a, p) => a + finalPrice(p), 0);
  const after = total + sum;
  const shipNote =
    after >= FREE_SHIPPING_FROM
      ? "עם הערכה הזו המשלוח עליכם חינם"
      : after >= REDUCED_SHIPPING_FROM
        ? `משלוח ב־${shekel(REDUCED_SHIPPING_PRICE)} בלבד · עוד ${shekel(FREE_SHIPPING_FROM - after)} למשלוח חינם`
        : `עוד ${shekel(REDUCED_SHIPPING_FROM - after)} למשלוח ב־${shekel(REDUCED_SHIPPING_PRICE)}`;

  const addAll = () => {
    chosen.forEach((p) => add(p));
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };

  return (
    <div className="st-kit">
      <div className="st-kit-tabs" role="tablist" aria-label="בחרו תחום">
        {KITS.map((k, i) => (
          <button
            key={k.key}
            role="tab"
            type="button"
            aria-selected={i === active}
            className={i === active ? "is-on" : ""}
            onClick={() => {
              setActive(i);
              setOff({});
            }}
          >
            {k.name}
          </button>
        ))}
      </div>

      <div className="st-kit-panel" role="tabpanel" key={kit.key}>
        <ul className="st-kit-list">
          {kit.items.map((p, i) => {
            const on = !off[p.id];
            return (
              <li key={p.id} className={on ? "" : "is-off"} style={{ "--i": i } as any}>
                <label className="st-kit-check">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setOff((o) => ({ ...o, [p.id]: on }))}
                  />
                  <span aria-hidden="true"><Ico d={I.check} /></span>
                  <span className="st-sr">לכלול את {p.name}</span>
                </label>
                <Link to={`/product/${p.id}`} className="st-kit-thumb" tabIndex={-1} aria-hidden="true">
                  <ProductThumb product={p} />
                </Link>
                <Link to={`/product/${p.id}`} className="st-kit-name">{p.name}</Link>
                <span className="st-kit-price">{shekel(finalPrice(p))}</span>
              </li>
            );
          })}
        </ul>

        <aside className="st-kit-sum">
          <span className="st-eyebrow">ערכת פתיחה</span>
          <h3>{kit.name}</h3>
          <p>{kit.blurb}</p>
          <div className="st-kit-total">
            <span>{chosen.length} פריטים</span>
            <strong>{shekel(sum)}</strong>
          </div>
          <button
            type="button"
            className="st-btn primary wide"
            onClick={addAll}
            disabled={chosen.length === 0}
          >
            {done ? "הערכה בעגלה ✓" : "הוסיפו את כל הערכה לעגלה"}
          </button>
          <p className="st-kit-ship"><Ico d={I.truck} />{shipNote}</p>
        </aside>
      </div>
    </div>
  );
};

/* ---------- horizontal rail with arrows ---------- */
const Rail = ({ items }: { items: Product[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  // RTL: scrollLeft runs negative, so "forward" (visual left) is a negative delta
  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: -dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <div className="st-rail-wrap">
      <div className="st-rail" ref={ref}>
        {items.map((p) => <StCard key={p.id} p={p} />)}
      </div>
      <div className="st-rail-nav">
        <button type="button" onClick={() => nudge(-1)} aria-label="הקודם" className="flip">
          <Ico d={I.arrow} />
        </button>
        <button type="button" onClick={() => nudge(1)} aria-label="הבא">
          <Ico d={I.arrow} />
        </button>
      </div>
    </div>
  );
};

const SecHead = ({ n, title, lead, more }: { n: string; title: string; lead?: string; more?: any }) => (
  <header className="st-head st-rise">
    <span className="st-head-n" aria-hidden="true">{n}</span>
    <div>
      <h2>{title}</h2>
      {lead && <p>{lead}</p>}
    </div>
    {more}
  </header>
);

export default function DesignStudio() {
  usePageMeta({ title: titleFor("עיצוב · סטודיו"), path: "/designs/a", noindex: true });
  useDesignTheme("dz-theme-studio", FONTS);
  const status = useOpenStatus();
  const catsRef = useRef<HTMLElement>(null);

  return (
    <main className="dz-studio page-main">
      {/* ---------- ticker: the manager's real ribbon texts ---------- */}
      <div className="st-ticker" aria-label="הודעות החנות">
        <div className="st-ticker-track">
          {[0, 1].map((k) => (
            <ul key={k} aria-hidden={k === 1}>
              {siteSettings.ribbonTexts.map((t) => <li key={t}>{t}</li>)}
            </ul>
          ))}
        </div>
      </div>

      {/* ---------- hero ---------- */}
      <section className="st-hero">
        <div className="st-hero-media" aria-hidden="true">
          <video
            autoPlay muted loop playsInline
            poster={dzImg("a-hero.webp")}
            src={dzImg("a-hero.mp4")}
          />
        </div>
        <div className="st-hero-inner">
          <p className="st-eyebrow">ציוד אמנות ויצירה · רחובות · מאז {store.since}</p>
          <h1>
            כל יצירה
            <br />
            מתחילה <em>כאן.</em>
          </h1>
          <p className="st-hero-sub">
            {products.length.toLocaleString("he-IL")} מוצרים לציור, רישום, פיסול ויצירה —
            ועצה טובה של מי שעושה את זה כבר {yearsOpen(store.since)} שנה.
          </p>
          <HeroSearch />
          <div className="st-hero-cta">
            <button
              type="button"
              className="st-btn primary"
              onClick={() => catsRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              לכל המדפים
            </button>
            <a href={store.waze} target="_blank" rel="noreferrer" className={`st-open ${status.open ? "is-open" : ""}`}>
              <i aria-hidden="true" />
              {status.label}
            </a>
          </div>
        </div>
      </section>

      {/* ---------- trust bar ---------- */}
      <ul className="st-trust">
        <li><Ico d={I.truck} /><div><b>משלוח חינם מעל {shekel(FREE_SHIPPING_FROM)}</b><span>{shekel(REDUCED_SHIPPING_PRICE)} בלבד מעל {shekel(REDUCED_SHIPPING_FROM)}</span></div></li>
        <li><Ico d={I.bag} /><div><b>איסוף עצמי מהחנות</b><span>{store.address}</span></div></li>
        <li><Ico d={I.shelf} /><div><b>{products.length.toLocaleString("he-IL")} מוצרים</b><span>{categories.length} מחלקות, כל המותגים</span></div></li>
        <li><Ico d={I.chat} /><div><b>ייעוץ אישי</b><span><a href={`tel:${store.phone}`}>{store.phone}</a></span></div></li>
      </ul>

      {/* ---------- 01 categories ---------- */}
      <section className="st-sec" ref={catsRef} id="st-cats">
        <div className="st-shell">
          <SecHead n="01" title="קונים לפי תחום" lead="תשע מחלקות, כל אחת עולם שלם של חומרים." />
          <div className="st-cats">
            {categories.map((c, i) => (
              <Link key={c.slug} to={`/category/${c.slug}`} className="st-cat st-rise" style={{ "--cc": c.color } as any}>
                <div className="st-cat-img">
                  <img src={dzImg(`a-${c.slug}.webp`)} alt="" loading="lazy" width="1000" height="1250" />
                </div>
                <div className="st-cat-body">
                  <span className="st-cat-n">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{c.name}</h3>
                  <p>{c.blurb}</p>
                  <span className="st-cat-go">
                    {productsByCategory(c.slug).length} מוצרים <Ico d={I.arrow} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 02 starter kits ---------- */}
      {KITS.length > 0 && (
        <section className="st-sec tinted">
          <div className="st-shell">
            <SecHead
              n="02"
              title="מתחילים משהו חדש?"
              lead="בחרו תחום — הרכבנו ערכת פתיחה ממוצרים שבאמת על המדף. הורידו מה שכבר יש לכם, והכול נכנס לעגלה בלחיצה."
            />
            <KitBuilder />
          </div>
        </section>
      )}

      {/* ---------- 03 featured ---------- */}
      {featuredPicks.length > 0 && (
        <section className="st-sec">
          <div className="st-shell">
            <SecHead n="03" title="נבחרים מהמדפים" lead="מה שהצוות ממליץ עליו החודש." />
            <Rail items={featuredPicks} />
          </div>
        </section>
      )}

      {/* ---------- sale (only when the manager has items on sale) ---------- */}
      {salePicks.length > 0 && (
        <section className="st-sec">
          <div className="st-shell">
            <SecHead
              n="04"
              title="במבצע עכשיו"
              more={<Link to="/sale" className="st-link">לכל המבצעים <Ico d={I.arrow} /></Link>}
            />
            <div className="st-grid">
              {salePicks.slice(0, 4).map((p) => <StCard key={p.id} p={p} />)}
            </div>
          </div>
        </section>
      )}

      {/* ---------- story ---------- */}
      <section className="st-story">
        <div className="st-story-img st-rise">
          <img src={dzImg("a-story.webp")} alt="" loading="lazy" width="1500" height="996" />
        </div>
        <div className="st-story-body st-rise">
          <span className="st-eyebrow">הסיפור שלנו</span>
          <h2>כל יצירה גדולה מתחילה בלב</h2>
          <p>
            לא רק קונים — מתייעצים, ממששים את הנייר, משווים גוונים מול האור, ויוצאים
            עם בדיוק מה שהפרויקט הבא צריך. חנות משפחתית אחת, ברחובות, מאז {store.since}.
          </p>
          <dl className="st-stats">
            <div><dt>{yearsOpen(store.since)}</dt><dd>שנים של צבע</dd></div>
            <div><dt>{products.length.toLocaleString("he-IL")}</dt><dd>מוצרים על המדף</dd></div>
            <div><dt>{categories.length}</dt><dd>מחלקות</dd></div>
          </dl>
        </div>
      </section>

      {/* ---------- workshops ---------- */}
      <section className="st-sec">
        <div className="st-shell st-ws">
          <div className="st-ws-body st-rise">
            <span className="st-eyebrow">בחנות, פנים אל פנים</span>
            <h2>חוגים וסדנאות</h2>
            <p>{workshops.intro}</p>
            <ul className="st-ws-topics">
              {workshops.topics.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <p className="st-ws-when">{workshops.schedule}</p>
            <a href={`tel:${workshops.contactTel}`} className="st-btn line">
              להרשמה: {workshops.contact}
            </a>
          </div>
          <div className="st-ws-img st-rise">
            <img src={dzImg("a-workshop.webp")} alt="" loading="lazy" width="1500" height="996" />
          </div>
        </div>
      </section>

      {/* ---------- visit ---------- */}
      <section className="st-sec tinted last">
        <div className="st-shell st-visit">
          <div className="st-rise">
            <span className="st-eyebrow">קופצים לבקר?</span>
            <h2>{store.address}</h2>
            <p className={`st-open big ${status.open ? "is-open" : ""}`}>
              <i aria-hidden="true" />
              {status.label}
            </p>
            <div className="st-visit-cta">
              <a href={store.waze} target="_blank" rel="noreferrer" className="st-btn primary">
                <Ico d={I.pin} /> ניווט ב־Waze
              </a>
              <a href={store.maps} target="_blank" rel="noreferrer" className="st-btn line">Google Maps</a>
            </div>
          </div>
          <div className="st-hours st-rise">
            <h3>שעות פתיחה</h3>
            <table>
              <tbody>
                {store.hours.map((h) => (
                  <tr key={h.days}><th scope="row">{h.days}</th><td>{h.time}</td></tr>
                ))}
              </tbody>
            </table>
            <p>
              <a href={`tel:${store.phone}`}>{store.phone}</a>
              <span aria-hidden="true"> · </span>
              <a href={`mailto:${store.email}`}>{store.email}</a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
