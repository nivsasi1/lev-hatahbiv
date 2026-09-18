// Shared bits for the 2026-09 homepage concepts (/designs/a "Studio", /designs/b "Pigment").
import { useEffect, useState } from "react";
import {
  products,
  getProduct,
  siteSettings,
  isOnSale,
  asset,
  Product,
} from "../../data/catalog";

export const dzImg = (name: string) => asset(`/images/designs/${name}`);

// Re-skins the shared Layout chrome (header, page background) while a concept is
// mounted: puts a theme class on <html> and lazy-loads the concept's web fonts,
// so neither leaks into the live site.
export const useDesignTheme = (cls: string, fontHref: string) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(cls);
    const id = `font-${cls}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = fontHref;
      document.head.appendChild(link);
    }
    return () => root.classList.remove(cls);
  }, [cls, fontHref]);
};

/* ---------- live "open now" ----------
   Mirrors store.hours in data/catalog.ts (Sun–Fri mornings; Sun, Mon, Wed, Thu
   afternoons) — keep the two in sync. Evaluated in Israel time so it's right
   for a shopper abroad too. */
type Slot = [number, number]; // minutes from midnight
const MORNING: Slot = [9 * 60, 13 * 60 + 30];
const AFTERNOON: Slot = [16 * 60, 19 * 60];
const WEEK: Slot[][] = [
  [MORNING, AFTERNOON], // Sun
  [MORNING, AFTERNOON], // Mon
  [MORNING], // Tue
  [MORNING, AFTERNOON], // Wed
  [MORNING, AFTERNOON], // Thu
  [MORNING], // Fri
  [], // Sat
];
const DAY_NAMES = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const DAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const hhmm = (m: number) =>
  `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;

export type OpenStatus = { open: boolean; label: string };

export const openStatus = (now = new Date()): OpenStatus => {
  let day = now.getDay();
  let mins = now.getHours() * 60 + now.getMinutes();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const d = DAY_KEYS.indexOf(get("weekday"));
    if (d >= 0) {
      day = d;
      mins = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
    }
  } catch {
    /* no Intl timezone support → local clock */
  }

  for (const [from, to] of WEEK[day]) {
    if (mins >= from && mins < to)
      return { open: true, label: `פתוח עכשיו · עד ${hhmm(to)}` };
  }
  const laterToday = WEEK[day].find(([from]) => from > mins);
  if (laterToday)
    return { open: false, label: `סגור כרגע · נפתח היום ב־${hhmm(laterToday[0])}` };
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    if (WEEK[d].length)
      return {
        open: false,
        label: `סגור כרגע · נפתח ${i === 1 ? "מחר" : `ביום ${DAY_NAMES[d]}`} ב־${hhmm(WEEK[d][0][0])}`,
      };
  }
  return { open: false, label: "סגור כרגע" };
};

export const useOpenStatus = () => {
  const [s, setS] = useState<OpenStatus>(() => openStatus());
  useEffect(() => {
    const t = setInterval(() => setS(openStatus()), 60_000);
    return () => clearInterval(t);
  }, []);
  return s;
};

/* ---------- product picks (same rules as the live homepage) ---------- */
const heuristicFeatured = ["paints", "brushes", "drawing", "paper"]
  .map((slug) =>
    products.find(
      (p) =>
        p.category === slug &&
        p.img &&
        p.description.length > 40 &&
        /[֐-׿]/.test(p.name)
    )
  )
  .filter((p): p is Product => Boolean(p));

export const featuredPicks: Product[] =
  siteSettings.featuredIds.length > 0
    ? siteSettings.featuredIds
        .map((id) => getProduct(id))
        .filter((p): p is Product => Boolean(p))
    : heuristicFeatured;

export const salePicks: Product[] = (
  siteSettings.saleIds.length > 0
    ? siteSettings.saleIds
        .map((id) => getProduct(id))
        .filter((p): p is Product => Boolean(p) && isOnSale(p as Product))
    : products.filter(isOnSale)
).slice(0, 8);

// can be dropped straight into the cart from a card (no option to choose first)
export const quickAddable = (p: Product) => !p.soldOut && !p.variants?.length;

export const yearsOpen = (since: string) =>
  new Date().getFullYear() - Number(since);
