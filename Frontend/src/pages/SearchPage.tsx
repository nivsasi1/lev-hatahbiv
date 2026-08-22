import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { searchProducts } from "../data/catalog";
import { usePageMeta, titleFor } from "../lib/seo";
import { ProductCard } from "../components/ProductCard";
import { ShelvesGrid } from "../components/ShelvesGrid";
import { Splat } from "../components/Splat";

const PAGE_SIZE = 24;

// /search?q=… — full results for the header search (Enter) and the 404 form.
export const SearchPage = () => {
  const [params, setParams] = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  usePageMeta({ title: titleFor(q ? `חיפוש: ${q}` : "חיפוש"), path: "/search", noindex: true });

  const [draft, setDraft] = useState(q);
  const [limit, setLimit] = useState(PAGE_SIZE);
  // a new query (back/forward, header search) resets both the input and the page
  useEffect(() => {
    setDraft(q);
    setLimit(PAGE_SIZE);
  }, [q]);

  const results = useMemo(() => searchProducts(q), [q]);
  const shown = results.slice(0, limit);
  const remaining = results.length - shown.length;

  const onSubmit = (e: any) => {
    e.preventDefault();
    const v = draft.trim();
    if (v && v !== q) setParams({ q: v }, { replace: true });
  };

  const countLine = !q
    ? "מה מחפשים היום?"
    : results.length === 0
    ? null
    : results.length === 1
    ? "נמצא מוצר אחד עבור "
    : `נמצאו ${results.length} מוצרים עבור `;

  return (
    <main className="page-main">
      <section className="cat-hero compact srch-hero" style={{ "--ch-soft": "#f0e7fa" } as any}>
        <Splat color="#7b3fbf" size={110} style={{ top: "-18%", left: "6%", opacity: 0.5 }} />
        <div className="shell">
          <div className="crumbs">
            <Link to="/">ראשי</Link> ‹ חיפוש
          </div>
          <h1 className="display">חיפוש</h1>
          <form className="srch-form" onSubmit={onSubmit} role="search">
            <input
              type="search"
              value={draft}
              onInput={(e: any) => setDraft(e.target.value)}
              placeholder="מה מחפשים? צבע, מכחול, נייר..."
              aria-label="חיפוש מוצרים"
              autoFocus={!q}
            />
            <button type="submit" className="btn">
              חיפוש
            </button>
          </form>
          {countLine && (
            <p className="srch-count" aria-live="polite">
              {countLine}
              {q && <span className="srch-q">„{q}”</span>}
            </p>
          )}
        </div>
      </section>

      <section className="shell cat-products srch-results">
        {shown.length > 0 && (
          <div className="product-grid">
            {shown.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
        {remaining > 0 && (
          <div className="load-more-row">
            <button className="btn ghost" onClick={() => setLimit((l) => l + PAGE_SIZE * 2)}>
              להציג עוד ({remaining} נוספים)
            </button>
          </div>
        )}

        {q && results.length === 0 && (
          <p className="empty-note srch-empty">
            לא מצאנו כלום עבור <span className="srch-q">„{q}”</span> — נסו מילה אחרת או קצרה יותר 🎨
          </p>
        )}
        {results.length === 0 && <ShelvesGrid title={q ? "אולי במדפים האלה?" : "בוחרים מדף"} />}
      </section>
    </main>
  );
};
