import { Link } from "react-router-dom";
import "./designs-index.css";

type DesignEntry = {
  num: string;
  to: string;
  name: string;
  tag: string;
  desc: string;
  emoji: string;
  swatch: string;
  badge?: string; // optional corner ribbon
};

// Cursor-animation options to compare. The live homepage already uses the
// BRUSH ribbon trail; these let the owner feel the alternatives. The rest of
// the site (categories, products, cart) is identical across all of them.
const DESIGNS: DesignEntry[] = [
  {
    num: "סמן · ניצוצות",
    to: "/design15",
    name: "ניצוצות",
    tag: "אנימציית סמן · Sparks",
    desc: "ניצוצות זהב נוצצים שעפים מהעכבר בכל תנועה, מנצנצים לרגע ונעלמים — קסום וקליל.",
    emoji: "✨",
    badge: "אופציה",
    swatch:
      "radial-gradient(circle at 28% 30%, #fff, transparent 5%), radial-gradient(circle at 64% 50%, #ffe7b0, transparent 6%), radial-gradient(circle at 44% 72%, #e09f3e, transparent 7%), radial-gradient(circle at 80% 78%, #fff, transparent 4%), #20143a",
  },
  {
    num: "סמן · מכחול",
    to: "/design16",
    name: "סמן מכחול",
    tag: "אנימציית סמן · Brush",
    desc: "הסמן עצמו הוא מכחול קטן שעוקב אחרי העכבר ונשען לפי כיוון התנועה, עם הקצה צבוע — מעל משיכת המכחול הזורמת.",
    emoji: "🖌️",
    badge: "וריאציה",
    swatch:
      "linear-gradient(120deg, #7b3fbf 0%, #d94f70 34%, #e09f3e 64%, #2a9d8f 100%)",
  },
];

export const DesignsIndex = () => (
  <main className="page-main designs-index">
    <section className="di-hero">
      <span className="di-kicker">אנימציית סמן</span>
      <h1 className="display">איזו תנועת סמן הכי מתאימה?</h1>
      <p>
        עמוד הבית כבר משתמש ב<b>משיכת המכחול</b> (ribbon) שנגררת אחרי העכבר. כאן
        אפשר להשוות אותה עם שתי אופציות — הזיזו את העכבר בכל אחת כדי להרגיש.
      </p>
    </section>

    <section className="shell">
      <div className="di-grid">
        {DESIGNS.map((d) => (
          <article key={d.to} className={`di-card ${d.badge ? "featured" : ""}`}>
            <div className="di-swatch" style={{ background: d.swatch }}>
              {d.badge && <span className="di-ribbon">{d.badge}</span>}
              <span aria-hidden="true">{d.emoji}</span>
            </div>
            <div className="di-body">
              <span className="di-num">{d.num}</span>
              <h2 className="di-name display">{d.name}</h2>
              <span className="di-tag">{d.tag}</span>
              <p className="di-desc">{d.desc}</p>
              <Link to={d.to} className="btn">
                צפייה בעיצוב ←
              </Link>
            </div>
          </article>
        ))}
      </div>

      <p className="di-foot">
        רוצים לראות את האתר כמו שהוא עכשיו? <Link to="/">לעמוד הבית הנוכחי →</Link>
      </p>
    </section>
  </main>
);
