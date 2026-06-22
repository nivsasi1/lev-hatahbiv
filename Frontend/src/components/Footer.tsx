import { Link } from "react-router-dom";
import { categories, store } from "../data/catalog";

export const Footer = () => (
  <footer className="footer">
    <div className="shell">
      <div className="footer-grid">
        <div>
          <div className="brand display">
            לב התחביב
            <small>ציוד אמנות ויצירה · מאז {store.since}</small>
          </div>
        </div>

        <div className="footer-col">
          <span className="t">מדפים</span>
          {categories.slice(0, 4).map((c) => (
            <Link key={c.slug} to={`/category/${c.slug}`}>
              {c.name}
            </Link>
          ))}
        </div>

        <div className="footer-col">
          <span className="t">עוד מדפים</span>
          {categories.slice(4).map((c) => (
            <Link key={c.slug} to={`/category/${c.slug}`}>
              {c.name}
            </Link>
          ))}
        </div>

        <div className="footer-col">
          <span className="t">מדברים איתנו</span>
          <a href={`tel:${store.phone}`}>{store.phone} ☎</a>
          <a href={`mailto:${store.email}`}>{store.email}</a>
          <a href={store.waze} target="_blank" rel="noreferrer">
            {store.address} 📍
          </a>
          <a href={store.facebook} target="_blank" rel="noreferrer">
            פייסבוק
          </a>
          <a href={store.instagram} target="_blank" rel="noreferrer">
            אינסטגרם
          </a>
          <button
            className="footer-news-btn"
            onClick={() => window.dispatchEvent(new Event("lh-open-news"))}
          >
            הרשמה לעדכונים 💌
          </button>
        </div>
      </div>

      <nav className="footer-legal" aria-label="מידע ומדיניות">
        <Link to="/terms">תקנון</Link>
        <Link to="/returns">ביטולים והחזרות</Link>
        <Link to="/privacy">מדיניות פרטיות</Link>
        <Link to="/contact">צור קשר</Link>
        <Link to="/accessibility">הצהרת נגישות</Link>
      </nav>

      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {store.legalName} (ח.פ {store.companyId}) — נצבע באהבה ברחובות
        </span>
        <span>משלוח חינם בקנייה מעל ₪300</span>
      </div>
    </div>
  </footer>
);
