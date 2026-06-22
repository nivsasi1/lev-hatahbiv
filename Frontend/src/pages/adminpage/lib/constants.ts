import { API_BASE, WORKER_API } from "../../../data/api";

// Products / orders / publish talk to the Express backend (VITE_API_URL).
// Coupons / subscribers / the welcome offer live on the Cloudflare Worker (D1).
export const API = `${API_BASE}/admin`;
export const WAPI = `${WORKER_API}/admin`;

// ─── JWT storage strategy ───────────────────────────────────────────────────
// The token lives in sessionStorage, NOT localStorage: it's scoped to the tab
// and evaporates when it closes, so a stolen laptop / forgotten kiosk session
// doesn't stay logged in. The token also expires server-side after 12h; any
// 401 wipes it and returns the user to the login screen.
export const TOKEN_KEY = "lh-admin-jwt";

export const S3 = "https://levhatahbiv.s3.eu-north-1.amazonaws.com/images/";

export const CSV_HEADERS = [
  "name",
  "price",
  "category",
  "sub_cat",
  "third_level",
  "description",
  "images",
  "salePercentage",
];

export const CSV_TEMPLATE =
  CSV_HEADERS.join(",") +
  "\n" +
  [
    'צבע שמן ואן גוך 208 צהוב קדמיום,32.9,צבעים לאמנות,צבעי שמן,צבע שמן ואן גוך- 20מ"ל,גוון צהוב עשיר ועמיד,vangogh-208.jpg,0',
    "צבע שמן ואן גוך 311 אדום קרמין,32.9,,,,גוון אדום קלאסי,vangogh-311.jpg,0",
    "צבע שמן ואן גוך 504 כחול אולטרמרין,32.9,,,,כחול עמוק לשמיים וים,vangogh-504.jpg,10",
  ].join("\n");

// The home marquee shows up to 8 lines. When saved settings are empty we
// pre-fill the inputs with these examples so the manager sees the format.
export const DEFAULT_RIBBONS = [
  "משלוח חינם מעל ₪300",
  "ייעוץ אישי בחנות",
  "חדש: חימר פולימרי ב־24 צבעים",
  "מבצעי סוף עונה על צבעי שמן",
  "פותחים דלת מאז 1985",
  "כל מותגי הצבע במקום אחד",
  "סדנאות ואמנות לכל המשפחה",
  "איסוף מהיר מהחנות ברחובות",
];
