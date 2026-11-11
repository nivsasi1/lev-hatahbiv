import { Link } from "react-router-dom";
import {
  categories,
  products,
  productsByCategory,
  siteSettings,
  store,
  asset,
  shekel,
  FREE_SHIPPING_FROM,
  Category,
} from "../data/catalog";
import "./home-phone.css";

/* ---------------------------------------------------------------------------
   The top of the homepage on a phone: the logo on a sheet of paper, the two
   delivery promises, and the nine shelves as tidy cards. Rendered by MainHome
   in place of the split hero + photo mosaic when the screen is phone-sized;
   everything under the shelves is the same page as on a wide screen.
   --------------------------------------------------------------------------- */

// one studio photo per shelf, drawn as a set (public/images/home). A shelf
// added later has no photo in the set yet, so it falls back to its
// dashboard/default shelf image.
const SET = new Set([
  "paints",
  "hobby",
  "drawing",
  "brushes",
  "paper",
  "easels",
  "craft",
  "fiber",
  "jewelry",
]);
const shelfPhoto = (slug: string) =>
  SET.has(slug)
    ? asset(`/images/home/shelf-${slug}.webp`)
    : siteSettings.shelfImages[slug];

const num = (n: number) => n.toLocaleString("he-IL");

// the short list that opens a shelf's blurb: "אקריליק, שמן, אקוורל וגואש — ..."
const lead = (c: Category) => c.blurb.split("—")[0].trim();

// Scroll so `el` sits just under the sticky top bar. Smooth unless the visitor
// asked for less motion (system setting or the accessibility panel).
const scrollUnderBar = (el: Element) => {
  const bar = document.querySelector<HTMLElement>("header.header");
  const top =
    el.getBoundingClientRect().top + window.scrollY - (bar?.offsetHeight ?? 0) - 8;
  const calm =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.classList.contains("a11y-no-motion");
  window.scrollTo({ top: Math.max(0, top), behavior: calm ? "auto" : "smooth" });
};

const Chevron = () => (
  <svg
    className="hm-chev"
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.6"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const HomePhoneTop = () => {
  const [first, ...rest] = categories;

  const toShelves = (e: MouseEvent) => {
    const el = document.getElementById("shelves");
    if (!el) return;
    e.preventDefault();
    scrollUnderBar(el);
  };
  // "איך מגיעים" brings up the visit card further down the page (address,
  // hours, Waze, Google Maps). Without it the link simply opens Waze.
  const toVisit = (e: MouseEvent) => {
    const el = document.querySelector(".main-home .ph-visit");
    if (!el) return;
    e.preventDefault();
    scrollUnderBar(el);
  };

  return (
    <>
      <section className="hm-hero">
        <img
          className="hm-hero-bg"
          src={asset("/images/home/hero-paper.webp")}
          alt=""
          width="1024"
          height="688"
          // the first thing a phone paints: fetch it ahead of the shelf photos
          {...({ fetchpriority: "high" } as any)}
        />
        <div className="hm-hero-inner">
          <h1 className="hm-hero-logo">
            <img
              src={asset("/images/logo-trim.webp")}
              alt="לב התחביב"
              width="800"
              height="249"
            />
          </h1>
          <p className="hm-hero-sub">
            <span>חנות ציוד האמנות של רחובות,</span>{" "}
            <span>ועצה טובה ליד הקופה.</span>
          </p>
          <div className="hm-hero-ctas">
            <a href="#shelves" className="hm-btn fill" onClick={toShelves as any}>
              למדפים
            </a>
            <a
              href={store.waze}
              target="_blank"
              rel="noreferrer"
              className="hm-btn line"
              onClick={toVisit as any}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              איך מגיעים
            </a>
          </div>
        </div>
      </section>

      <ul className="hm-strip" aria-label="משלוחים ואיסוף">
        <li>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
            <circle cx="7" cy="18" r="2" />
            <circle cx="17" cy="18" r="2" />
          </svg>
          <span>
            משלוח חינם מעל <bdi dir="ltr">{shekel(FREE_SHIPPING_FROM)}</bdi>
          </span>
        </li>
        <li>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 10v10h16V10" />
            <path d="M3 10l2-6h14l2 6z" />
            <path d="M10 20v-5h4v5" />
          </svg>
          <span>איסוף חינם ברחובות</span>
        </li>
      </ul>

      <section id="shelves" className="hm-shelves" aria-label="המדפים שלנו">
        <div className="hm-shelves-head">
          <h2 className="display">
            כל יצירה מתחילה <span>כאן</span>
          </h2>
          <p>
            {num(categories.length)} מדפים · {num(products.length)} מוצרים
          </p>
        </div>

        <Link to={`/category/${first.slug}`} className="hm-card hm-feature">
          <img src={shelfPhoto(first.slug)} alt="" width="1024" height="688" />
          <span className="hm-cap">
            <span className="hm-cap-text">
              <span className="hm-cap-name">{first.name}</span>
              <span className="hm-cap-sub">
                {lead(first)} · {num(productsByCategory(first.slug).length)} מוצרים
              </span>
            </span>
            <Chevron />
          </span>
        </Link>

        <div className="hm-grid">
          {rest.map((c) => (
            <Link key={c.slug} to={`/category/${c.slug}`} className="hm-card">
              <img
                src={shelfPhoto(c.slug)}
                alt=""
                width="640"
                height="430"
                loading="lazy"
              />
              <span className="hm-cap">
                <span className="hm-cap-name">{c.name}</span>
                <Chevron />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
};
