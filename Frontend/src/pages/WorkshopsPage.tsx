import { Link } from "react-router-dom";
import { workshops, store, getCategory } from "../data/catalog";
import { usePageMeta, titleFor } from "../lib/seo";
import { Splat } from "../components/Splat";
import "./home-photographic.css"; // reuses the .ph-shop photo+body card from the homepage

// same hands-on supplies photo the homepage workshops block uses (MainHome.SHOP_IMG)
const SHOP_IMG =
  "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1600&q=70";

// shelves that match the workshop topics (knitting → fiber, jewelry → jewelry)
const RELATED_SLUGS = ["fiber", "jewelry"];

// /workshops — "חוגים וסדנאות", target of an old sitelink.
export const WorkshopsPage = () => {
  usePageMeta({
    title: titleFor("חוגים וסדנאות"),
    description:
      "חוגים וסדנאות אמנות בחנות לב התחביב ברחובות — תכשיטנות, סריגה ועוד. ימים א׳–ג׳ 10:00–13:00.",
    path: "/workshops",
  });
  const related = RELATED_SLUGS.map(getCategory).filter(
    (c): c is NonNullable<typeof c> => Boolean(c)
  );

  return (
    <main className="page-main ws-page">
      <section className="cat-hero ws-hero" style={{ "--ch-soft": "#f0e7fa" } as any}>
        <Splat color="#7b3fbf" size={150} style={{ top: "-14%", left: "4%", opacity: 0.55 }} />
        <Splat color="#6a994e" size={90} style={{ bottom: "-18%", right: "10%", opacity: 0.45 }} />
        <div className="shell">
          <div className="crumbs">
            <Link to="/">ראשי</Link> ‹ חוגים וסדנאות
          </div>
          <h1 className="display">חוגים וסדנאות בלב התחביב</h1>
          <p>{workshops.intro}</p>
        </div>
      </section>

      <section className="shell ws-body">
        <div className="ph-shop ws-shop">
          <div className="ph-shop-photo">
            <img src={SHOP_IMG} alt="" aria-hidden="true" loading="lazy" />
          </div>
          <div className="ph-shop-body">
            <h2>מה לומדים אצלנו</h2>
            <p className="intro">
              קבוצות קטנות ואישיות, למתחילים ולמתקדמים — מגיעים עם סקרנות, יוצאים עם יצירה ביד.
            </p>
            <div className="ph-chips">
              {workshops.topics.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="ph-shop-meta">
              <span className="ph-m">🗓 {workshops.schedule}</span>
              <a href={`tel:${workshops.contactTel}`} className="ph-btn fill">
                להרשמה: {workshops.contact}
              </a>
            </div>
          </div>
        </div>

        <div className="section-head">
          <h2 className="display">איך נרשמים?</h2>
          <div className="scribble" />
        </div>
        <ol className="ws-steps">
          <li>
            מתקשרים ל<a href={`tel:${workshops.contactTel}`}>{workshops.contact}</a> ובוחרים
            חוג ומועד שנוח לכם.
          </li>
          <li>
            או פשוט קופצים לחנות — {store.address} (טלפון{" "}
            <a href={`tel:${store.phone}`}>{store.phone}</a>) — ונרשמים ליד הקופה.
          </li>
          <li>מגיעים בשעת החוג ({workshops.schedule}) — ומתחילים ליצור.</li>
        </ol>

        <div className="ws-links">
          {related.map((c) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              className="btn ghost"
              style={{ "--btn-pop": c.color } as any}
            >
              למדף {c.name} ←
            </Link>
          ))}
          <Link to="/" className="btn">
            לכל המדפים ←
          </Link>
        </div>
      </section>
    </main>
  );
};
