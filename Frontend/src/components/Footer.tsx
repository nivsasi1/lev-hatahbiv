import { Link } from "react-router-dom";
import { categories, store } from "../data/catalog";

export const Footer = () => (
  <footer className="footer">
    <div className="shell">
      <div className="footer-grid">
        <div className="footer-brand-col">
          <div className="brand display">
            <span className="brand-name">לב התחביב</span>
            <small>ציוד אמנות ויצירה · מאז {store.since}</small>
          </div>
          <p className="footer-tagline">
            כל יצירה מתחילה כאן — חנות משפחתית ברחובות, עם צוות שמכיר כל מדף.
          </p>
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

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} לב התחביב בע"מ — נצבע באהבה ברחובות</span>
        <Link to="/accessibility">הצהרת נגישות</Link>
        <span>משלוח חינם בקנייה מעל ₪300</span>
      </div>
    </div>
  </footer>
);
