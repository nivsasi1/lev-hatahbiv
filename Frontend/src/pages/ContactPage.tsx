import { store } from "../data/catalog";

export const ContactPage = () => (
  <main className="page-main shell a11y-page legal-page">
    <h1 className="display">צור קשר</h1>
    <p>
      נשמח לעזור בכל שאלה על מוצרים, הזמנות או ייעוץ אישי — בטלפון, במייל, בוואטסאפ,
      או פשוט בביקור בחנות ב{store.address}.
    </p>

    <h2 className="display">פרטי התקשרות</h2>
    <ul>
      <li>
        טלפון: <a href={`tel:${store.phone}`}>{store.phone}</a>
      </li>
      <li>
        וואטסאפ:{" "}
        <a href={`https://wa.me/${store.phoneIntl}`} target="_blank" rel="noreferrer">
          שליחת הודעה
        </a>
      </li>
      <li>
        אימייל: <a href={`mailto:${store.email}`}>{store.email}</a>
      </li>
      <li>
        כתובת:{" "}
        <a href={store.maps} target="_blank" rel="noreferrer">
          {store.address}
        </a>{" "}
        (
        <a href={store.waze} target="_blank" rel="noreferrer">
          ניווט ב-Waze
        </a>
        )
      </li>
    </ul>

    <h2 className="display">שעות פעילות</h2>
    <ul>
      {store.hours.map((h) => (
        <li key={h.days}>
          {h.days}: {h.time}
        </li>
      ))}
    </ul>

    <h2 className="display">עקבו אחרינו</h2>
    <p>
      <a href={store.facebook} target="_blank" rel="noreferrer">
        פייסבוק
      </a>{" "}
      ·{" "}
      <a href={store.instagram} target="_blank" rel="noreferrer">
        אינסטגרם
      </a>
    </p>

    <h2 className="display">פרטי העסק</h2>
    <p>
      {store.legalName} · ח.פ {store.companyId} · {store.address}
    </p>

    <p className="a11y-updated">פותחים דלת מאז {store.since}</p>
  </main>
);
