import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  getCategory,
  productsByCategory,
  subsOfCategory,
  shekel,
  finalPrice,
  slugOf,
  subPath,
  subFromParam,
} from "../data/catalog";
import { ProductCard } from "../components/ProductCard";
import { ProductThumb } from "../components/ProductThumb";
import { ProductArt } from "../components/ProductArt";
import { Splat } from "../components/Splat";
import { usePageMeta, categoryTitle, titleFor, breadcrumbLd } from "../lib/seo";
import "./price-range.css";

// Category hub: sub-category tiles instead of an 800-item wall.
export const CategoryPage = () => {
  const { slug } = useParams();
  const category = getCategory(slug ?? "");
  const all = productsByCategory(slug ?? "");

  usePageMeta({
    title: category ? categoryTitle(category.name) : titleFor("מדף לא נמצא"),
    description: category ? `${category.blurb} · ${all.length} מוצרים בלב התחביב, חנות ציוד אמנות ברחובות.` : undefined,
    path: `/category/${slug ?? ""}`,
    noindex: !category,
    jsonLd: category
      ? breadcrumbLd([
          { name: "ראשי", path: "/" },
          { name: category.name, path: `/category/${category.slug}` },
        ])
      : undefined,
  });

  if (!category) {
    return (
      <main className="page-main shell">
        <p className="empty-note">המדף הזה לא קיים... אולי הוא עוד מתייבש 🖌️</p>
      </main>
    );
  }

  const subs = subsOfCategory(slug!);
  const onSale = all
    .filter((p) => p.salePrice && !p.soldOut && p.img)
    .slice(0, 4);

  return (
    <main className="page-main">
      <section
        className="cat-hero"
        style={{ "--ch-soft": category.soft } as any}
      >
        <Splat color={category.color} size={150} style={{ top: "-12%", left: "4%", opacity: 0.6 }} />
        <Splat color={category.color} size={90} style={{ bottom: "-18%", right: "10%", opacity: 0.4 }} />
        <div className="shell">
          <div className="crumbs">
            <Link to="/">ראשי</Link> ‹ {category.name}
          </div>
          <h1 className="display">{category.name}</h1>
          <p>
            {category.blurb} · {all.length} מוצרים
          </p>
        </div>
      </section>

      <section className="shell cat-products">
        <div className="section-head">
          <h2 className="display">בחרו מדף</h2>
          <div className="scribble" />
        </div>
        <div className="sub-grid">
          {subs.map(({ sub, count, cover }) => (
            <Link
              key={sub}
              to={subPath(slug!, sub)}
              className="sub-card"
              style={{ "--pc": category.color, "--pc-soft": category.soft } as any}
            >
              <div className={`frame ${cover ? "photo" : ""}`}>
                {cover ? (
                  <ProductThumb product={cover} />
                ) : (
                  <ProductArt kind={category.art} color={category.color} />
                )}
              </div>
              <div className="body">
                <span className="sub-name display">{sub}</span>
                <span className="sub-count">{count} מוצרים ←</span>
              </div>
            </Link>
          ))}
        </div>

        {onSale.length > 0 && (
          <>
            <div className="section-head">
              <h2 className="display">במבצע במדף הזה</h2>
              <div className="scribble" />
            </div>
            <div className="product-grid">
              {onSale.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
};

const PAGE_SIZE = 24;

type SortKey = "default" | "priceAsc" | "priceDesc";

const sorters: Record<SortKey, (a: any, b: any) => number> = {
  default: () => 0,
  priceAsc: (a, b) => finalPrice(a) - finalPrice(b),
  priceDesc: (a, b) => finalPrice(b) - finalPrice(a),
};

// One sub-category: third-level (series/brand) chips + sort + pagination.
export const SubCategoryPage = () => {
  const { slug, sub: subParam } = useParams();
  // :sub is a slug ("צבעי-בד-טקסטיל"); the old raw-name links still resolve
  const sub = subFromParam(slug ?? "", subParam ?? "") ?? subParam ?? "";
  const [searchParams] = useSearchParams();
  const [sort, setSort] = useState<SortKey>("default");
  const [limit, setLimit] = useState(PAGE_SIZE);
  // subtle price-range filter (₪). null upper bound = "up to the max".
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState<number | null>(null);

  useEffect(() => {
    setSort("default");
    setLimit(PAGE_SIZE);
    setPriceMin(0);
    setPriceMax(null);
  }, [slug, sub]);

  const category = getCategory(slug ?? "");
  const all = productsByCategory(slug ?? "").filter((p) => p.sub === sub);
  const thirds = [...new Set(all.map((p) => p.third))];
  // the series/brand chip lives in the URL (?third=<slug>) so shelves are linkable
  const thirdParam = searchParams.get("third");
  const third = thirdParam ? thirds.find((t) => slugOf(t) === thirdParam) ?? null : null;

  // a series shelf (?third=) is its own indexable page: own title/description/breadcrumb,
  // listed in the sitemap, and the target of the old Wix collection redirects
  const thirdCount = third ? all.filter((p) => p.third === third).length : 0;
  usePageMeta({
    title: category ? titleFor(`${third ?? sub} — ${category.name}`) : titleFor("מדף לא נמצא"),
    description: category
      ? third
        ? `${third} — ${sub} במדף ${category.name}: ${thirdCount} מוצרים בלב התחביב, חנות ציוד אמנות ברחובות מאז 1985.`
        : `${sub} במדף ${category.name} — ${all.length} מוצרים בלב התחביב, חנות ציוד אמנות ברחובות מאז 1985.`
      : undefined,
    path: subPath(slug ?? "", sub) + (third ? `?third=${slugOf(third)}` : ""),
    noindex: !category || all.length === 0,
    jsonLd: category
      ? breadcrumbLd([
          { name: "ראשי", path: "/" },
          { name: category.name, path: `/category/${category.slug}` },
          { name: sub, path: subPath(category.slug, sub) },
          ...(third ? [{ name: third, path: `${subPath(category.slug, sub)}?third=${slugOf(third)}` }] : []),
        ])
      : undefined,
  });

  if (!category || all.length === 0) {
    return (
      <main className="page-main shell">
        <p className="empty-note">
          המדף הזה ריק כרגע... <Link to={`/category/${slug}`}>חזרה לקטגוריה ←</Link>
        </p>
      </main>
    );
  }

  const showThirds = thirds.length > 1 || (thirds.length === 1 && thirds[0] !== "כללי");
  const byThird = third ? all.filter((p) => p.third === third) : all;
  // price slider bounds: max product price in this sub, rounded up to ₪10
  const maxPrice = Math.max(10, Math.ceil(Math.max(...all.map(finalPrice)) / 10) * 10);
  const priceHi = priceMax ?? maxPrice;
  const priceActive = priceMin > 0 || priceMax !== null;
  const filtered = priceActive
    ? byThird.filter((p) => {
        const v = finalPrice(p);
        return v >= priceMin && v <= priceHi;
      })
    : byThird;
  const sorted = sort === "default" ? filtered : [...filtered].sort(sorters[sort]);
  const shown = sorted.slice(0, limit);
  const remaining = sorted.length - shown.length;
  const cheapest = Math.min(...all.map(finalPrice));

  return (
    <main className="page-main">
      <section
        className="cat-hero compact"
        style={{ "--ch-soft": category.soft } as any}
      >
        <Splat color={category.color} size={110} style={{ top: "-18%", left: "6%", opacity: 0.5 }} />
        <div className="shell">
          <div className="crumbs">
            <Link to="/">ראשי</Link> ‹{" "}
            <Link to={`/category/${slug}`}>{category.name}</Link> ‹ {sub}
          </div>
          <h1 className="display">{sub}</h1>
          <p>
            {all.length} מוצרים · החל מ־{shekel(cheapest)}
          </p>
        </div>
      </section>

      <section className="shell cat-products">
        <div className="filter-bar">
          {showThirds && (
            <div className="sub-chips">
              {/* real links (not buttons) so crawlers can discover every series shelf */}
              <Link
                to={{ search: "" }}
                replace
                className={`sub-chip ${third === null ? "active" : ""}`}
                style={{ "--sc": category.color } as any}
                onClick={() => setLimit(PAGE_SIZE)}
              >
                הכל ({all.length})
              </Link>
              {thirds.map((t) => (
                <Link
                  key={t}
                  to={{ search: `?third=${slugOf(t)}` }}
                  replace
                  className={`sub-chip ${third === t ? "active" : ""}`}
                  style={{ "--sc": category.color } as any}
                  onClick={() => setLimit(PAGE_SIZE)}
                >
                  {t}
                </Link>
              ))}
            </div>
          )}
          <div className="filter-tools">
          <select
            className="sort-select"
            value={sort}
            onChange={(e: any) => setSort(e.target.value as SortKey)}
            aria-label="מיון"
          >
            <option value="default">מיון: א-ב</option>
            <option value="priceAsc">מחיר: מהזול ליקר</option>
            <option value="priceDesc">מחיר: מהיקר לזול</option>
          </select>

          <div className="pr-filter" style={{ "--sc": category.color } as any}>
            <span className="pr-cap">מחיר</span>
            <div className="pr-slider">
              <div className="pr-track" />
              <div
                className="pr-range"
                style={{
                  left: `${(priceMin / maxPrice) * 100}%`,
                  width: `${((priceHi - priceMin) / maxPrice) * 100}%`,
                }}
              />
              <input
                type="range"
                min={0}
                max={maxPrice}
                step={1}
                value={priceMin}
                aria-label="מחיר מינימלי"
                onInput={(e: any) => {
                  setPriceMin(Math.min(Number(e.target.value), priceHi));
                  setLimit(PAGE_SIZE);
                }}
              />
              <input
                type="range"
                min={0}
                max={maxPrice}
                step={1}
                value={priceHi}
                aria-label="מחיר מקסימלי"
                onInput={(e: any) => {
                  const v = Math.max(Number(e.target.value), priceMin);
                  setPriceMax(v >= maxPrice ? null : v);
                  setLimit(PAGE_SIZE);
                }}
              />
            </div>
            <span className="pr-vals">
              {shekel(priceMin)}–{priceMax === null ? `${shekel(maxPrice)}` : shekel(priceMax)}
            </span>
            {/* always rendered (visibility toggled) so the row never shifts */}
            <button
              className={`pr-clear ${priceActive ? "" : "is-hidden"}`}
              onClick={() => {
                setPriceMin(0);
                setPriceMax(null);
                setLimit(PAGE_SIZE);
              }}
              aria-hidden={!priceActive}
              tabIndex={priceActive ? 0 : -1}
            >
              נקה
            </button>
          </div>
          </div>
        </div>

        <div className="product-grid">
          {shown.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {shown.length === 0 && (
          <p className="empty-note">
            אין מוצרים בטווח המחיר הזה — נסו להרחיב את הטווח 🎨
          </p>
        )}
        {remaining > 0 && (
          <div className="load-more-row">
            <button
              className="btn ghost"
              onClick={() => setLimit((l) => l + PAGE_SIZE * 2)}
            >
              להציג עוד מהמדף ({remaining} נוספים)
            </button>
          </div>
        )}
      </section>
    </main>
  );
};
