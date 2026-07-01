import { Link } from "react-router-dom";
import "./designs-index.css";

// Internal preview gallery: eight homepage directions the owner can pick from.
// Not linked anywhere public — reachable only by visiting /designs directly.
const VARIANTS = [
  {
    to: "a",
    name: "גלריה",
    tag: "מינימלי · אוורירי",
    desc: "הרבה אוויר, טיפוגרפיה נקייה, קטגוריות רגועות בצבעי בית. המבצעים גבוה בעמוד עם מחיר אדום גדול.",
    accent: "#c75b41",
  },
  {
    to: "b",
    name: "פופ",
    tag: "צבעוני · נועז",
    desc: "בלוקים צבעוניים, צורות מעוגלות וניגודיות גבוהה. המבצעים ככותרת הדף עם תג הנחה בולט.",
    accent: "#5b2d8e",
  },
  {
    to: "c",
    name: "מלאכה",
    tag: "חמים · מדבקתי",
    desc: "האופי המלאכותי של החנות, מסודר ונקי יותר. מדבקות קטגוריה קומפקטיות והדגשת מרקר על המחיר.",
    accent: "#d99a2b",
  },
  {
    to: "e",
    name: "קינטי",
    tag: "צבעוני · הרבה תנועה",
    desc: "גרדיאנט חם ונע ברקע, כותרת שקופצת פנימה וכפתור מגנטי. הכי חי מבין כולם.",
    accent: "#e0733a",
  },
  {
    to: "g",
    name: "חמר רך",
    tag: "פסטל · רך ותפוח",
    desc: "צורות תפוחות ומעוגלות בפסטל, כפתורים שנלחצים פנימה. חמים, ידידותי ומזמין למשפחות.",
    accent: "#f0574f",
  },
];

export default function DesignsIndex() {
  return (
    <main className="dz-index page-main">
      <header className="dz-index-head">
        <span className="dz-index-eyebrow">Internal preview</span>
        <h1 className="display">גרסאות לדף הבית</h1>
        <p>
          שלוש גרסאות עיצוב לדף הבית — לחצו לצפייה בכל אחת ובחרו את זו שמדברת
          אליכם. כולן עם אותו תוכן אמיתי, רק מראה אחר.
        </p>
      </header>

      <div className="dz-index-grid">
        {VARIANTS.map((v) => (
          <Link
            key={v.to}
            to={`/designs/${v.to}`}
            className="dz-index-card"
            style={{ "--accent": v.accent } as any}
          >
            <span className="dz-index-letter">{v.to.toUpperCase()}</span>
            <div className="dz-index-card-body">
              <h2>
                {v.name} <span className="dz-index-tag">{v.tag}</span>
              </h2>
              <p>{v.desc}</p>
              <span className="dz-index-go">צפו בעיצוב ←</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="dz-index-foot">
        <Link to="/" className="dz-index-current">
          לצפייה בדף הנוכחי →
        </Link>
      </div>
    </main>
  );
}
