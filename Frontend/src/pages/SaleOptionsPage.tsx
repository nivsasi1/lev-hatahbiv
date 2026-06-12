import { products, shekel } from "../data/catalog";

// Demo page (/sale-options): eight LOUD sale treatments — each one transforms
// the whole card, not just a corner. The owner picks a number.

const demo = products.find((p) => p.salePrice && p.img) ?? products[0];
const pct = demo.salePrice
  ? Math.round((1 - demo.salePrice / demo.price) * 100)
  : 20;

/* 3 — paint pours over the whole top of the card, over the border */
const PourXL = () => (
  <div className="sdo sdo-pour">
    <svg viewBox="0 0 320 150" aria-hidden="true" preserveAspectRatio="none">
      <path
        d="M0 0 H320 V52
           C 308 52, 306 96, 294 96 C 282 96, 284 52, 268 52
           C 252 52, 254 124, 238 124 C 222 124, 226 52, 208 52
           C 194 52, 196 80, 184 80 C 172 80, 174 52, 158 52
           C 142 52, 146 142, 128 142 C 110 142, 116 52, 98 52
           C 84 52, 86 102, 72 102 C 58 102, 62 52, 44 52
           C 30 52, 32 74, 20 74 C 10 74, 10 52, 0 56 Z"
        fill="url(#pourGrad)"
      />
      <defs>
        <linearGradient id="pourGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#9b5de5" />
          <stop offset="1" stop-color="#6a2fb5" />
        </linearGradient>
      </defs>
      <circle cx="128" cy="148" r="5" fill="#6a2fb5" />
      <circle cx="238" cy="132" r="4" fill="#6a2fb5" />
    </svg>
    <span>
      מבצע <b>{pct}%-</b>
    </span>
  </div>
);

/* 4 — diagonal poster tape across the whole card + giant seal */
const TapeBand = () => (
  <div className="sdo sdo-tape">
    <div className="sdo-tape-band">
      <span>מבצע • מבצע • מבצע • מבצע • מבצע • מבצע</span>
    </div>
    <div className="sdo-tape-seal">
      <b>{pct}%-</b>
      <i>הנחה</i>
    </div>
  </div>
);

/* 6 — XL comic starburst over halftone dots */
const BurstXL = () => {
  const spikes = 16;
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 70 : 50;
    const a = (i / (spikes * 2)) * Math.PI * 2;
    pts.push(`${75 + Math.cos(a) * r},${75 + Math.sin(a) * r}`);
  }
  return (
    <div className="sdo sdo-burst">
      <i className="sdo-halftone" />
      <svg viewBox="0 0 150 150" aria-hidden="true">
        <polygon points={pts.join(" ")} fill="#ffd166" stroke="#2b2440" stroke-width="4" />
        <polygon
          points={pts.join(" ")}
          fill="none"
          stroke="#e23a3a"
          stroke-width="2"
          transform="scale(0.88) translate(10.2 10.2)"
        />
      </svg>
      <span>
        <b>{pct}%-</b>
        <em>מבצע!</em>
      </span>
    </div>
  );
};

/* 7 — excited artist scribbled all over the card */
const Scribble = () => (
  <div className="sdo sdo-scribble">
    <svg viewBox="0 0 300 300" aria-hidden="true" preserveAspectRatio="none">
      <rect
        x="10" y="10" width="280" height="280" rx="26"
        fill="none" stroke="#e23a3a" stroke-width="7" stroke-linecap="round"
        stroke-dasharray="1060 80" stroke-dashoffset="-30" transform="rotate(-1 150 150)"
      />
      <rect
        x="16" y="14" width="270" height="274" rx="32"
        fill="none" stroke="#e23a3a" stroke-width="4" stroke-linecap="round"
        stroke-dasharray="940 140" stroke-dashoffset="200" transform="rotate(1.4 150 150)" opacity="0.7"
      />
      {/* arrow doodle pointing at the product */}
      <path
        d="M 252 250 C 220 268, 190 262, 172 236"
        fill="none" stroke="#e23a3a" stroke-width="6" stroke-linecap="round"
      />
      <path d="M 186 232 L 168 230 L 176 248" fill="none" stroke="#e23a3a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span>
      !!מבצע <b>{pct}%-</b>
    </span>
  </div>
);

/* 8 — confetti rain over the whole card + ribbon banner */
const CONFETTI = [
  { x: 4, y: 6, c: "#7b3fbf", r: 24, d: 0 },
  { x: 16, y: -3, c: "#e09f3e", r: -18, d: 0.3 },
  { x: 27, y: 9, c: "#2a9d8f", r: 40, d: 0.6 },
  { x: 38, y: -2, c: "#e23a3a", r: -32, d: 0.15 },
  { x: 52, y: 7, c: "#3f5fbf", r: 12, d: 0.45 },
  { x: 64, y: -4, c: "#7b3fbf", r: -44, d: 0.7 },
  { x: 76, y: 8, c: "#e09f3e", r: 30, d: 0.2 },
  { x: 90, y: -1, c: "#e23a3a", r: -12, d: 0.55 },
  { x: 99, y: 10, c: "#2a9d8f", r: 22, d: 0.4 },
  { x: 9, y: 30, c: "#e23a3a", r: -28, d: 0.5 },
  { x: 94, y: 32, c: "#7b3fbf", r: 18, d: 0.1 },
  { x: -2, y: 52, c: "#2a9d8f", r: 36, d: 0.65 },
  { x: 101, y: 56, c: "#e09f3e", r: -20, d: 0.35 },
  { x: 6, y: 74, c: "#3f5fbf", r: 14, d: 0.25 },
  { x: 95, y: 78, c: "#e23a3a", r: -36, d: 0.6 },
];

const Confetti = () => (
  <div className="sdo sdo-confetti">
    {CONFETTI.map((p, i) => (
      <i
        key={i}
        style={{
          right: `${p.x}%`,
          top: `${p.y}%`,
          background: p.c,
          transform: `rotate(${p.r}deg)`,
          animationDelay: `${p.d}s`,
        }}
      />
    ))}
    <div className="sdo-confetti-banner">
      <span>🎉 מבצע {pct}%- 🎉</span>
    </div>
  </div>
);

type Option = {
  n: number;
  name: string;
  note: string;
  cls: string;
  overlay?: any;
};

const options: Option[] = [
  {
    n: 1,
    name: "מסגרת מוזיאון",
    note: "המוצר הופך ליצירת מופת ממוסגרת בזהב, עם שלט גלריה",
    cls: "opt-gold",
    overlay: (
      <div className="sdo sdo-plaque">
        <i>מבצע</i>
        <b>{pct}% הנחה</b>
      </div>
    ),
  },
  {
    n: 2,
    name: "אקוורל ענק",
    note: "שטיפת צבע רכה על חצי הכרטיס עם כיתוב יד גדול",
    cls: "opt-aqua",
    overlay: (
      <div className="sdo sdo-aqua">
        <span>
          מבצע <b>{pct}%-</b>
        </span>
      </div>
    ),
  },
  {
    n: 3,
    name: "מפל צבע",
    note: "צבע סגול נשפך מעל הכרטיס כולו ומטפטף על המוצר",
    cls: "opt-pour",
    overlay: <PourXL />,
  },
  {
    n: 4,
    name: "סרט פוסטר",
    note: "פס אלכסוני חוצה את כל הכרטיס + חותמת ענק",
    cls: "opt-tape",
    overlay: <TapeBand />,
  },
  {
    n: 5,
    name: "ניאון לילה",
    note: "הכרטיס כולו מחשיך והופך לשלט ניאון מהבהב",
    cls: "opt-neon",
    overlay: (
      <div className="sdo sdo-neonsign">
        <b>SALE {pct}%-</b>
      </div>
    ),
  },
  {
    n: 6,
    name: "פופ־ארט XL",
    note: "פיצוץ קומיקס ענק על רקע נקודות רשת",
    cls: "opt-burst",
    overlay: <BurstXL />,
  },
  {
    n: 7,
    name: "קשקוש אמן",
    note: "מישהו התלהב והקיף את כל הכרטיס בטוש אדום, עם חץ",
    cls: "opt-scribble",
    overlay: <Scribble />,
  },
  {
    n: 8,
    name: "קונפטי",
    note: "גשם קונפטי על כל הכרטיס + באנר חגיגי",
    cls: "opt-confetti",
    overlay: <Confetti />,
  },
];

export const SaleOptionsPage = () => (
  <main className="page-main shell sdo-page">
    <h1 className="display">גלריית מבצעים — סיבוב שני, בקול רם</h1>
    <p className="sdo-intro">
      הפעם כל עיצוב משתלט על הכרטיס כולו. אומרים מספר — ואני מלביש על כל האתר.
    </p>
    <div className="sdo-grid">
      {options.map((o) => (
        <figure key={o.n} className={`sdo-card ${o.cls}`}>
          <div className="sdo-frame">
            <img src={demo.img} alt={demo.name} loading="lazy" />
            {o.overlay}
          </div>
          <div className="sdo-price">
            <b>{shekel(demo.salePrice ?? demo.price * 0.8)}</b>
            <s>{shekel(demo.price)}</s>
          </div>
          <figcaption>
            <b>
              {o.n} · {o.name}
            </b>
            <span>{o.note}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  </main>
);
