import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePageMeta, titleFor } from "../lib/seo";
import { ShelvesGrid } from "../components/ShelvesGrid";
import { Splat } from "../components/Splat";

// Real 404: the Worker answers unknown paths with HTTP 404 + the SPA shell,
// and the router's "*" route lands here.
export const NotFoundPage = () => {
  usePageMeta({ title: titleFor("העמוד לא נמצא"), path: "/404", noindex: true });
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const onSubmit = (e: any) => {
    e.preventDefault();
    const v = q.trim();
    if (v) navigate(`/search?q=${encodeURIComponent(v)}`);
  };

  return (
    <main className="page-main">
      <section className="cat-hero nf-hero" style={{ "--ch-soft": "#f0e7fa" } as any}>
        <Splat color="#7b3fbf" size={150} style={{ top: "-14%", left: "5%", opacity: 0.55 }} />
        <Splat color="#e09f3e" size={90} style={{ bottom: "-16%", right: "9%", opacity: 0.45 }} />
        <div className="shell">
          <div className="crumbs">
            <Link to="/">ראשי</Link> ‹ 404
          </div>
          <h1 className="display">אופס — העמוד הזה לא נמצא</h1>
          <p>אולי הקישור ישן, או שהמוצר עבר למדף אחר. בואו נמצא אותו מחדש:</p>
          <form className="srch-form" onSubmit={onSubmit} role="search">
            <input
              type="search"
              value={q}
              onInput={(e: any) => setQ(e.target.value)}
              placeholder="מה מחפשים? צבע, מכחול, נייר..."
              aria-label="חיפוש מוצרים"
            />
            <button type="submit" className="btn">
              חיפוש
            </button>
          </form>
        </div>
      </section>

      <section className="shell nf-shelves">
        <ShelvesGrid title="או בוחרים מדף" />
      </section>
    </main>
  );
};
