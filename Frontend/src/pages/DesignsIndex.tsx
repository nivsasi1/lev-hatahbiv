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
};

// Each entry previews one homepage concept. The rest of the site
// (categories, product pages, cart) stays the same across all of them.
const DESIGNS: DesignEntry[] = [
  {
    num: "עיצוב 1",
    to: "/design1",
    name: "בוטיק",
    tag: "פסטל רך · Soft Pastel",
    desc: "הרבה אוויר, גווני לבנדר רכים, כרטיסים מעוגלים ותמונות מרחפות.",
    emoji: "🌸",
    swatch:
      "linear-gradient(135deg, #efe3fb 0%, #fbe6ef 50%, #e3f3ef 100%)",
  },
  {
    num: "עיצוב 2",
    to: "/design2",
    name: "מהדורה",
    tag: "מגזין אמנות · Editorial",
    desc: "כמו שער של מגזין: כותרות ענק, אינדקס ממוספר ופריסה א-סימטרית.",
    emoji: "📰",
    swatch: "linear-gradient(135deg, #f6f1e7 0%, #f6f1e7 55%, #1c1726 55%)",
  },
  {
    num: "עיצוב 3",
    to: "/design3",
    name: "פוסטר",
    tag: "ניאו-ברוטליסט · Bold Poster",
    desc: "צבעים עזים, מסגרות דיו עבות, צללים קשים וטיפוגרפיה גדולה.",
    emoji: "⚡",
    swatch:
      "linear-gradient(135deg, #ffd23f 0%, #ffd23f 50%, #ff5d8f 50%, #ff5d8f 75%, #3a86ff 75%)",
  },
  {
    num: "עיצוב 4",
    to: "/design4",
    name: "אולפן לילה",
    tag: "ניאון-נואר · Night Studio",
    desc: "כהה ודרמטי: רקע דיו עמוק, זוהר ניאון עדין וראווה מוארת לכל מוצר.",
    emoji: "🌙",
    swatch:
      "radial-gradient(circle at 30% 40%, rgba(255,77,157,0.55), transparent 45%), radial-gradient(circle at 75% 60%, rgba(62,240,224,0.45), transparent 45%), #0e0b1a",
  },
  {
    num: "עיצוב 5",
    to: "/design5",
    name: "אטלייה",
    tag: "מדף האמן · Atelier",
    desc: "גיבור מפוצל: שדה דיו כהה עם הצהרה, לצד במת לוגו על נייר חם.",
    emoji: "🎨",
    swatch: "linear-gradient(135deg, #1a1030 0%, #1a1030 55%, #fdf3e0 55%)",
  },
  {
    num: "עיצוב 6",
    to: "/design6",
    name: "באוהאוס",
    tag: "באוהאוס × ממפיס · Bauhaus",
    desc: "צבעי יסוד נועזים, צורות גאומטריות חדות וקווים שובבים.",
    emoji: "🔺",
    swatch:
      "linear-gradient(135deg, #e63946 0%, #e63946 34%, #f4d03f 34%, #f4d03f 67%, #2a6f97 67%)",
  },
  {
    num: "עיצוב 7",
    to: "/design7",
    name: "תמונה מלאה",
    tag: "פוטוגרפי · Full-Bleed",
    desc: "צילום מוצרים מקצה לקצה, שכבות הצללה קולנועיות וטיפוגרפיה שקטה.",
    emoji: "📷",
    swatch:
      "linear-gradient(160deg, #2d3142 0%, #4f5d75 55%, #bfc0c0 100%)",
  },
  {
    num: "עיצוב 8",
    to: "/design8",
    name: "קולאז'",
    tag: "ריזוגרף · Riso Zine",
    desc: "נייר חתוך בדואוטון, שדות נקודות הַלפטון וכותרת בהדפסת-יתר.",
    emoji: "✂️",
    swatch:
      "radial-gradient(circle at 30% 35%, rgba(255,90,138,0.7) 18%, transparent 19%), radial-gradient(circle at 65% 70%, rgba(46,94,168,0.65) 16%, transparent 17%), #f7f0e0",
  },
  {
    num: "עיצוב 9",
    to: "/design9",
    name: "מחברת סקיצות",
    tag: "רישום ביד · Sketchbook",
    desc: "דף ממחברת אמן: נייר משובץ, מסגרות מצוירות ביד, דודלים וטושים.",
    emoji: "✏️",
    swatch:
      "repeating-linear-gradient(#fffdf7 0 21px, #cfe0f0 21px 22px), linear-gradient(#fffdf7, #fffdf7)",
  },
  {
    num: "עיצוב 10",
    to: "/design10",
    name: "Y2K",
    tag: "כרום רטרו · Y2K Chrome",
    desc: "שנות ה-2000: כותרת מתכת נוזלית, כפתורי בועה מבריקים ופאנלים הולוגרפיים.",
    emoji: "💿",
    swatch:
      "linear-gradient(135deg, #c9d6ff 0%, #eaeaea 30%, #b8c6db 55%, #f5e6ff 78%, #c9f0ff 100%)",
  },
];

export const DesignsIndex = () => (
  <main className="page-main designs-index">
    <section className="di-hero">
      <span className="di-kicker">בחירת עיצוב לאתר</span>
      <h1 className="display">איזה עיצוב הכי מתאים לחנות?</h1>
      <p>
        הכנו כמה כיוונים שונים לעמוד הבית. לחצו על כל אחד כדי לראות אותו חי
        באתר האמיתי — שאר החנות (המדפים, המוצרים והעגלה) נשארת בדיוק אותו דבר.
        כשבוחרים את האהוב, אומרים לנו והוא הופך לעמוד הבית הקבוע.
      </p>
    </section>

    <section className="shell">
      <div className="di-grid">
        {DESIGNS.map((d) => (
          <article key={d.to} className="di-card">
            <div className="di-swatch" style={{ background: d.swatch }}>
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
