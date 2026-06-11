import { products, shekel } from "../data/catalog";

// Internal demo page (/sale-options): the same product card with five
// different sale treatments, so the owner can pick one. Not linked anywhere.

const demo = products.find((p) => p.salePrice && p.img) ?? products[0];
const pct = demo.salePrice
  ? Math.round((1 - demo.salePrice / demo.price) * 100)
  : 20;

// scalloped price-sticker built from a ring of circles
const Seal = () => {
  const bumps = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return { x: 50 + Math.cos(a) * 34, y: 50 + Math.sin(a) * 34 };
  });
  return (
    <svg viewBox="0 0 100 100" className="seal-svg" aria-hidden="true">
      {bumps.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r="11" fill="#e23a3a" />
      ))}
      <circle cx="50" cy="50" r="37" fill="#e23a3a" />
      <circle cx="50" cy="50" r="33" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.6" stroke-dasharray="3 3" />
      <text x="50" y="47" text-anchor="middle" fill="#fff" font-size="24" font-weight="800" font-family="Assistant">
        {pct}%-
      </text>
      <text x="50" y="66" text-anchor="middle" fill="#fff" font-size="13" font-weight="700" font-family="Assistant">
        מבצע
      </text>
    </svg>
  );
};

const Brush = () => (
  <svg viewBox="0 0 160 80" className="brush-svg" aria-hidden="true">
    <path
      d="M12 42 C 20 18, 60 12, 95 16 C 130 20, 152 28, 150 44 C 148 60, 120 70, 80 68 C 40 66, 6 64, 12 42 Z"
      fill="#e23a3a"
    />
    <path d="M18 50 C 30 60, 60 64, 90 62" stroke="rgba(255,255,255,.35)" stroke-width="4" fill="none" stroke-linecap="round" />
    <text x="80" y="40" text-anchor="middle" fill="#fff" font-size="22" font-weight="800" font-family="Assistant">
      מבצע {pct}%-
    </text>
  </svg>
);

const options: { key: string; title: string; note: string; overlay?: any; clean?: boolean }[] = [
  {
    key: "sticker",
    title: "1 · מדבקת מחיר",
    note: "מדבקה מסולסלת כמו בחנות, מוטה קלות",
    overlay: (
      <div className="sopt-sticker">
        <Seal />
      </div>
    ),
  },
  {
    key: "tape",
    title: "2 · וואשי טייפ",
    note: "פס דבק אלכסוני עם קצוות קרועים",
    overlay: (
      <div className="sopt-tape">
        מבצע · {pct}%- · מבצע
      </div>
    ),
  },
  {
    key: "brush",
    title: "3 · משיכת מכחול",
    note: "כתם צבע מצויר ביד עם הטקסט עליו",
    overlay: (
      <div className="sopt-brush">
        <Brush />
      </div>
    ),
  },
  {
    key: "clean",
    title: "4 · נקי ומינימלי",
    note: "בלי כלום על התמונה — רק תג ליד המחיר ופס אדום עדין",
    clean: true,
  },
  {
    key: "current",
    title: "5 · הנוכחי (סרט תפור)",
    note: "התגית התלויה עם התפרים — מה שיש היום",
    overlay: (
      <div className="sale-flag" aria-hidden="true">
        <b>{pct}%-</b>
        <i>מבצע</i>
      </div>
    ),
  },
];

export const SaleOptionsPage = () => (
  <main className="page-main shell" style={{ padding: "2.5rem 0 4rem" }}>
    <h1 className="display">איך נסמן מבצעים?</h1>
    <p style={{ fontWeight: 600, color: "var(--ink-soft)" }}>
      אותו מוצר, חמש גרסאות — בוחרים מספר ואני מיישם בכל האתר.
    </p>
    <div className="sopt-grid">
      {options.map((o) => (
        <figure key={o.key} className={`sopt-card ${o.clean ? "clean" : ""}`}>
          <div className="frame photo">
            <img src={demo.img} alt={demo.name} />
            {o.overlay}
          </div>
          <div className="body">
            <span className="name">{demo.name}</span>
            <div className="foot">
              <span className="price-tag">
                {shekel(demo.salePrice ?? demo.price * 0.8)}
                <span className="was">{shekel(demo.price)}</span>
                {o.clean && <span className="clean-pill">{pct}%-</span>}
              </span>
            </div>
          </div>
          <figcaption>
            <b>{o.title}</b>
            <span>{o.note}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  </main>
);
