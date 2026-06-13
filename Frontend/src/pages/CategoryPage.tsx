import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getCategory,
  productsByCategory,
  subsOfCategory,
  shekel,
  finalPrice,
} from "../data/catalog";
import { ProductCard } from "../components/ProductCard";
import { ProductThumb } from "../components/ProductThumb";
import { ProductArt } from "../components/ProductArt";
import { Splat } from "../components/Splat";

// Category hub: sub-category tiles instead of an 800-item wall.
export const CategoryPage = () => {
  const { slug } = useParams();
  const category = getCategory(slug ?? "");
  const all = productsByCategory(slug ?? "");

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
          <span className="eyebrow cat-hero-eyebrow">מדף הבית · מאז 1985</span>
          <h1 className="display">{category.name}</h1>
          <p>
            {category.blurb} · {all.length} מוצרים
          </p>
        </div>
      </section>

      <section className="shell cat-products">
        <div className="section-head">
          <div className="section-titles">
            <span className="eyebrow">בחירת מדף</span>
            <h2 className="display">בחרו מדף</h2>
          </div>
          <div className="scribble" />
        </div>
        <div className="sub-grid">
          {subs.map(({ sub, count, cover }) => (
            <Link
              key={sub}
              to={`/category/${slug}/${encodeURIComponent(sub)}`}
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
              <div className="section-titles">
                <span className="eyebrow sale">שווה לחטוף</span>
                <h2 className="display">במבצע במדף הזה</h2>
              </div>
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
  const sub = decodeURIComponent(subParam ?? "");
  const [third, setThird] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("default");
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    setThird(null);
    setSort("default");
    setLimit(PAGE_SIZE);
  }, [slug, sub]);

  const category = getCategory(slug ?? "");
  const all = productsByCategory(slug ?? "").filter((p) => p.sub === sub);

  if (!category || all.length === 0) {
    return (
      <main className="page-main shell">
        <p className="empty-note">
          המדף הזה ריק כרגע... <Link to={`/category/${slug}`}>חזרה לקטגוריה ←</Link>
        </p>
      </main>
    );
  }

  const thirds = [...new Set(all.map((p) => p.third))];
  const showThirds = thirds.length > 1 || (thirds.length === 1 && thirds[0] !== "כללי");
  const filtered = third ? all.filter((p) => p.third === third) : all;
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
          <span className="eyebrow cat-hero-eyebrow">{category.name}</span>
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
              <button
                className={`sub-chip ${third === null ? "active" : ""}`}
                style={{ "--sc": category.color } as any}
                onClick={() => {
                  setThird(null);
                  setLimit(PAGE_SIZE);
                }}
              >
                הכל ({all.length})
              </button>
              {thirds.map((t) => (
                <button
                  key={t}
                  className={`sub-chip ${third === t ? "active" : ""}`}
                  style={{ "--sc": category.color } as any}
                  onClick={() => {
                    setThird(t);
                    setLimit(PAGE_SIZE);
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
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
        </div>

        <div className="product-grid">
          {shown.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
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
