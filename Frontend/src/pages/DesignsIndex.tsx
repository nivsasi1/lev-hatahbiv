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
  // --- Light-background + custom-cursor design directions (the hero gets an
  //     airy animated background; each has its own cursor effect). ---
  {
    num: "רקע · זוהר",
    to: "/design17",
    name: "זוהר צפוני",
    tag: "רקע נע · Aurora",
    desc: "גרדיאנט פסטל אוורירי שזורם לאט מאחורי הלוגו, עם זוהר רך שעוקב אחרי העכבר ומחליף גוונים.",
    emoji: "🌌",
    badge: "רקע + סמן",
    swatch:
      "radial-gradient(circle at 28% 30%, #d9caf5, transparent 55%), radial-gradient(circle at 72% 62%, #ffd9c4, transparent 55%), radial-gradient(circle at 50% 92%, #cdeede, transparent 55%), #fbfaff",
  },
  {
    num: "רקע · בועות",
    to: "/design18",
    name: "בועות רכות",
    tag: "רקע נע · Blobs",
    desc: "כתמי צבע פסטל גדולים שצפים ומשנים צורה בעדינות, עם בועה רכה שנגררת אחרי הסמן ונמתחת.",
    emoji: "🫧",
    badge: "רקע + סמן",
    swatch:
      "radial-gradient(circle at 30% 34%, #ffd9e0, transparent 52%), radial-gradient(circle at 72% 60%, #cfe6ff, transparent 52%), radial-gradient(circle at 48% 88%, #cdeede, transparent 52%), #fdfaf4",
  },
  {
    num: "רקע · אקוורל",
    to: "/design19",
    name: "אקוורל",
    tag: "רקע · Watercolour",
    desc: "שטיפת מים רכה שנושמת על נייר חם, והסמן צובע כתמי אקוורל שקופים שמתפשטים ומתייבשים.",
    emoji: "🎨",
    badge: "רקע + סמן",
    swatch:
      "radial-gradient(circle at 34% 36%, rgba(123,63,191,0.3), transparent 55%), radial-gradient(circle at 68% 58%, rgba(79,157,208,0.28), transparent 55%), radial-gradient(circle at 52% 84%, rgba(226,87,76,0.24), transparent 55%), #fcf7ee",
  },
  {
    num: "רקע · זכוכית",
    to: "/design20",
    name: "זכוכית",
    tag: "רקע · Glass",
    desc: "לוחות זכוכית מטושטשת בהירים שצפים מעל גרדיאנט פסטל, עם דיסקת זכוכית שקופה שעוקבת אחרי העכבר.",
    emoji: "🧊",
    badge: "רקע + סמן",
    swatch:
      "linear-gradient(135deg, #efe9ff 0%, #ffe7d8 52%, #e9f3ff 100%)",
  },
  {
    num: "רקע · כוכבים",
    to: "/design21",
    name: "קונסטלציה",
    tag: "רקע נע · Constellation",
    desc: "שדה כוכבים רך שנע לאט וקווים דקים מתחברים ביניהם — ונמתחים אל העכבר כשהוא מתקרב.",
    emoji: "✦",
    badge: "רקע + סמן",
    swatch:
      "radial-gradient(circle at 30% 30%, #fff, transparent 4%), radial-gradient(circle at 62% 48%, #c9b8f0, transparent 5%), radial-gradient(circle at 78% 72%, #fff, transparent 4%), linear-gradient(135deg, #efe9fb, #eaf0fb)",
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
