import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { getCategory, productsByCategory } from "../data/catalog";
import { ProductCard } from "../components/ProductCard";
import { Splat } from "../components/Splat";

const PAGE_SIZE = 24;

export const CategoryPage = () => {
  const { slug } = useParams();
  const [sub, setSub] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // reset filter + pagination when navigating between categories
  useEffect(() => {
    setSub(null);
    setLimit(PAGE_SIZE);
  }, [slug]);

  const category = getCategory(slug ?? "");
  const all = productsByCategory(slug ?? "");

  if (!category) {
    return (
      <main className="page-main shell">
        <p className="empty-note">המדף הזה לא קיים... אולי הוא עוד מתייבש 🖌️</p>
      </main>
    );
  }

  const subs = [...new Set(all.map((p) => p.sub))];
  const filtered = sub ? all.filter((p) => p.sub === sub) : all;
  const shown = filtered.slice(0, limit);
  const remaining = filtered.length - shown.length;

  const pickSub = (s: string | null) => {
    setSub(s);
    setLimit(PAGE_SIZE);
  };

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
          <p>{category.blurb}</p>
        </div>
      </section>

      <section className="shell cat-products">
        <div className="sub-chips">
          <button
            className={`sub-chip ${sub === null ? "active" : ""}`}
            style={{ "--sc": category.color } as any}
            onClick={() => pickSub(null)}
          >
            הכל ({all.length})
          </button>
          {subs.map((s) => (
            <button
              key={s}
              className={`sub-chip ${sub === s ? "active" : ""}`}
              style={{ "--sc": category.color } as any}
              onClick={() => pickSub(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="empty-note">המדף התרוקן — חוזרים למלא אותו ממש בקרוב!</p>
        ) : (
          <>
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
          </>
        )}
      </section>
    </main>
  );
};
