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
  badge?: string; // optional corner ribbon (e.g. the motion concepts)
};

// The finalists, plus the motion variants. The rest of the site
// (categories, product pages, cart) stays the same across all of them.
const DESIGNS: DesignEntry[] = [
  {
    num: "עיצוב 5",
    to: "/design5",
    name: "אטלייה",
    tag: "הכיוון הראשי · Atelier",
    desc: "גיבור מפוצל (לוגו + שדה הצהרה כהה), מדף מוצרים נע עם חיצים, ופס 'כל יצירה מתחילה בלב' עם תמונה ברקע.",
    emoji: "🎨",
    swatch: "linear-gradient(135deg, #1a1030 0%, #1a1030 55%, #fdf3e0 55%)",
  },
  {
    num: "עיצוב 7",
    to: "/design7",
    name: "תמונה מלאה",
    tag: "פוטוגרפי · Full-Bleed",
    desc: "צילומי אווירה מלאי-מסך, פסיפס מדפים מצולם וטיפוגרפיה שקטה — עם תמונות מהאינטרנט.",
    emoji: "📷",
    swatch: "linear-gradient(160deg, #2d3142 0%, #4f5d75 55%, #bfc0c0 100%)",
  },
];

export const DesignsIndex = () => (
  <main className="page-main designs-index">
    <section className="di-hero">
      <span className="di-kicker">בחירת עיצוב לאתר</span>
      <h1 className="display">איזה עיצוב הכי מתאים לחנות?</h1>
      <p>
        אלה הכיוונים שנשארו על השולחן. לחצו על כל אחד כדי לראות אותו חי באתר
        האמיתי — שאר החנות (המדפים, המוצרים והעגלה) נשארת בדיוק אותו דבר.
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
