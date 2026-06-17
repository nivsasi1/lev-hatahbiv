// קטלוג החנות — לב התחביב
// The product list is real inventory, generated from MongoDB into
// products.json (see scripts/generate-catalog.mjs). Photos are served from
// the store's S3 bucket; products whose photo is missing or fails to load
// fall back to a per-category SVG illustration (ProductArt).
import rawProducts from "./products.json";
import settings from "./settings.json";

export type ArtKind =
  | "tube"
  | "watercolor"
  | "gouache"
  | "spray"
  | "pencil"
  | "charcoal"
  | "marker"
  | "brush"
  | "paper"
  | "sketchbook"
  | "canvas"
  | "easel"
  | "yarn"
  | "macrame"
  | "clay"
  | "glue"
  | "beads"
  | "pendant";

export type Product = {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  description: string;
  category: string; // category slug
  sub: string;
  third: string; // series/brand level inside the sub-category
  img?: string; // primary photo URL — wins over art unless it fails to load
  imgs?: string[]; // full gallery (primary first), only when more than one
  art?: ArtKind;
  artColor?: string;
  badge?: "חדש" | "מבצע" | "רב מכר";
  pickupOnly?: boolean;
  soldOut?: boolean; // shown greyed-out ("אזל מהמלאי"), can't be added to cart
  isActive?: boolean; // hidden items never reach the build; guard anyway
  isNew?: boolean; // created within the last 14 days — drives the "חדש" badge
};

export type Category = {
  slug: string;
  name: string;
  color: string;
  soft: string; // washed-out version of the color, for backgrounds
  blurb: string;
  art: ArtKind; // fallback illustration for products without a photo
};

export const categories: Category[] = [
  {
    slug: "paints",
    name: "צבעים לאמנות",
    color: "#e2574c",
    soft: "#fbe9e7",
    blurb: "אקריליק, שמן, אקוורל וגואש — כל הקשת על מדף אחד",
    art: "tube",
  },
  {
    slug: "hobby",
    name: "צבעים להובי",
    color: "#4f9dd0",
    soft: "#e7f1f9",
    blurb: "ספריי, דיו אלכוהולי, פיגמנטים וצבעי בד לכל פרויקט",
    art: "spray",
  },
  {
    slug: "drawing",
    name: "רישום ועפרונות",
    color: "#3f5fbf",
    soft: "#e8edfb",
    blurb: "עפרונות, פחם וטושים לכל יד שמשרבטת",
    art: "pencil",
  },
  {
    slug: "brushes",
    name: "מכחולים ואביזרים",
    color: "#2a9d8f",
    soft: "#e3f4f1",
    blurb: "שיער טבעי, סינתטי וסכיני ציור לכל טכניקה",
    art: "brush",
  },
  {
    slug: "paper",
    name: "נייר לאמנות",
    color: "#e09f3e",
    soft: "#faf0dd",
    blurb: "בלוקים, גליונות ומחברות סקיצה לכל רעיון",
    art: "paper",
  },
  {
    slug: "easels",
    name: "כני ציור",
    color: "#8d5a3b",
    soft: "#f3e9e1",
    blurb: "כן סטודיו, כן שולחני וכנים ניידים בכל גודל",
    art: "easel",
  },
  {
    slug: "craft",
    name: "חומרי יצירה",
    color: "#d94f70",
    soft: "#fbe7ec",
    blurb: "פיסול, דבקים ולבד — לידיים שלא נחות",
    art: "clay",
  },
  {
    slug: "fiber",
    name: "מקרמה וטריקו",
    color: "#6a994e",
    soft: "#ecf3e6",
    blurb: "חוטים, צמר וקשרים שמחזיקים בית שלם",
    art: "yarn",
  },
  {
    slug: "jewelry",
    name: "תכשיטנות",
    color: "#7b3fbf",
    soft: "#f0e7fa",
    blurb: "חרוזים, תליונים ושרשראות בעבודת יד",
    art: "beads",
  },
];

const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

const S3_IMAGES = "https://levhatahbiv.s3.eu-north-1.amazonaws.com/images/";

type RawProduct = {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  desc: string;
  cat: string;
  sub: string;
  third: string;
  img: string;
  gallery?: string[];
  pickupOnly?: boolean;
  soldOut?: boolean;
  isNew?: boolean;
  updated?: string;
};

// Prefix a public-folder path (e.g. "/images/logo.png") with the deploy base,
// so it resolves correctly under a GitHub Pages subfolder. No-op when base "/".
export const asset = (p: string) =>
  import.meta.env.BASE_URL + p.replace(/^\//, "");

// img can be an S3 filename, a full URL, or a local "/uploads/..." path
const resolveImg = (img: string) =>
  !img
    ? undefined
    : img.startsWith("http")
      ? img
      : img.startsWith("/")
        ? asset(img)
        : S3_IMAGES + img;

export const products: Product[] = (rawProducts as RawProduct[]).map((r) => {
  const cat = categoryBySlug.get(r.cat);
  const imgs = r.gallery
    ? [r.img, ...r.gallery].map(resolveImg).filter((u): u is string => !!u)
    : undefined;
  return {
    id: r.id,
    name: r.name,
    price: r.price,
    salePrice: r.salePrice,
    description: r.desc,
    category: r.cat,
    sub: r.sub,
    third: r.third,
    img: resolveImg(r.img),
    imgs,
    art: cat?.art ?? "tube",
    artColor: cat?.color,
    badge:
      r.salePrice && !r.soldOut
        ? "מבצע"
        : r.isNew && !r.soldOut
          ? "חדש"
          : undefined,
    pickupOnly: r.pickupOnly,
    soldOut: r.soldOut,
    isNew: r.isNew,
    isActive: true,
  };
});

// Homepage settings (marquee ribbon + featured ids), baked in at build time
// from the SiteSettings singleton. Falls back to the original marquee strings
// when no ribbon texts have been configured.
// keep in sync with DEFAULT_RIBBONS in pages/AdminPage.tsx (what the manager
// sees pre-filled in the 8 ribbon inputs)
const DEFAULT_RIBBON = [
  "משלוח חינם מעל ₪300",
  "ייעוץ אישי בחנות",
  "חדש: חימר פולימרי ב־24 צבעים",
  "מבצעי סוף עונה על צבעי שמן",
  "פותחים דלת מאז 1985",
  "כל מותגי הצבע במקום אחד",
  "סדנאות ואמנות לכל המשפחה",
  "איסוף מהיר מהחנות ברחובות",
];

// Default "shelf" photos for the homepage category mosaic. Curated stock
// art-supply photos per category slug; the manager can override any of them
// from the dashboard (saved to SiteSettings.shelfImages, merged over these).
const SHELF_Q = "?auto=format&fit=crop&w=900&q=70";
const SHELF_U = "https://images.unsplash.com/";
export const DEFAULT_SHELF_IMAGES: Record<string, string> = {
  drawing: `${SHELF_U}photo-1565359184520-fcff70f99c24${SHELF_Q}`, // graphite pencils
  paints: `${SHELF_U}photo-1535673774336-ef95d2851cf3${SHELF_Q}`, // tubes of colour
  hobby: `${SHELF_U}photo-1456086272160-b28b0645b729${SHELF_Q}`, // pots of paint
  brushes: `${SHELF_U}photo-1633443245758-6a507463c89c${SHELF_Q}`, // jars of brushes
  paper: `${SHELF_U}photo-1513364776144-60967b0f800f${SHELF_Q}`, // paper + brushes
  easels: `${SHELF_U}photo-1514195037031-83d60ed3b448${SHELF_Q}`, // wooden easel
  craft: `${SHELF_U}photo-1609446154807-d56805f0e007${SHELF_Q}`, // craft supplies
  fiber: `${SHELF_U}photo-1584992236310-6edddc08acff${SHELF_Q}`, // balls of yarn
  jewelry: `${SHELF_U}photo-1646070107254-3713cec279c1${SHELF_Q}`, // beads + charms
};

export const siteSettings = {
  ribbonTexts:
    settings.ribbonTexts && settings.ribbonTexts.length > 0
      ? settings.ribbonTexts
      : DEFAULT_RIBBON,
  featuredIds: settings.featuredIds ?? [],
  saleIds: settings.saleIds ?? [],
  // manager-set shelf photos (from the dashboard) merge over the defaults, then
  // each value is resolved like a product photo (bare S3 filename → full URL,
  // so a manager upload isn't left as a 404-ing relative path).
  shelfImages: (() => {
    const merged: Record<string, string> = {
      ...DEFAULT_SHELF_IMAGES,
      ...(((settings as any).shelfImages &&
      typeof (settings as any).shelfImages === "object"
        ? (settings as any).shelfImages
        : {}) as Record<string, string>),
    };
    const out: Record<string, string> = {};
    for (const [slug, url] of Object.entries(merged)) {
      const r = resolveImg(String(url));
      if (r) out[slug] = r;
    }
    return out;
  })(),
  // checkout discount coupons (manager-set). Codes matched case-insensitively.
  coupons: (((settings as any).coupons as Array<{ code: string; percent: number }>) ?? []).filter(
    (c) => c && c.code && c.percent > 0
  ),
};

// Look up a coupon by its code (case-insensitive). Returns null if none match.
export const findCoupon = (
  code: string
): { code: string; percent: number } | null => {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return null;
  return siteSettings.coupons.find((x) => x.code.toUpperCase() === c) ?? null;
};

const productById = new Map(products.map((p) => [p.id, p]));

export const getCategory = (slug: string) => categoryBySlug.get(slug);

export const getProduct = (id: string) => productById.get(id);

export const productsByCategory = (slug: string) =>
  products.filter((p) => p.category === slug);

export const productsBySub = (slug: string, sub: string) =>
  products.filter((p) => p.category === slug && p.sub === sub);

export type SubSummary = {
  sub: string;
  count: number;
  cover?: Product; // representative product (first with a photo)
};

// sub-categories of a category, ordered by size — used for the hub tiles.
// Cover = the sub's product with the richest description (usually a flagship
// set with a proper photo) rather than whatever sorts first alphabetically.
export const subsOfCategory = (slug: string): SubSummary[] => {
  const map = new Map<string, SubSummary>();
  for (const p of productsByCategory(slug)) {
    let s = map.get(p.sub);
    if (!s) {
      s = { sub: p.sub, count: 0 };
      map.set(p.sub, s);
    }
    s.count++;
    if (
      p.img &&
      (!s.cover || p.description.length > s.cover.description.length)
    ) {
      s.cover = p;
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
};

export const searchProducts = (query: string) => {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return products.filter((p) =>
    words.every(
      (w) =>
        p.name.includes(w) ||
        p.sub.includes(w) ||
        (categoryBySlug.get(p.category)?.name ?? "").includes(w)
    )
  );
};

export const finalPrice = (p: Product) => p.salePrice ?? p.price;

// all prices display rounded to one decimal (4.333 -> ₪4.3, 4.0 -> ₪4)
export const shekel = (n: number) => {
  const r = Math.round(n * 10) / 10;
  return `₪${Number.isInteger(r) ? r : r.toFixed(1)}`;
};

export const FREE_SHIPPING_FROM = 300;

export const store = {
  name: "לב התחביב",
  since: "1985",
  address: "המנוף 6, רחובות",
  phone: "08-9315213",
  phoneIntl: "97289315213",
  email: "levhatahbiv@gmail.com",
  waze: "https://waze.com/ul?ll=31.8977,34.7984889&navigate=yes",
  maps: "https://maps.google.com/?q=31.8977,34.7984889",
  facebook:
    "https://www.facebook.com/%D7%9C%D7%91-%D7%94%D7%AA%D7%97%D7%91%D7%99%D7%91-971570949543339/",
  instagram: "https://www.instagram.com/levhatahbiv/",
  hours: [
    { days: "ראשון – שישי", time: "9:00 – 13:30" },
    { days: "א', ב', ד', ה'", time: "16:00 – 19:00" },
  ],
};

// חוגים וסדנאות — מתקיימים בחנות (מתוך האתר הישן)
export const workshops = {
  intro:
    "בואו להעשיר את יכולות האמנות שלכם — החנות מקיימת חוגים וסדנאות בחנות, למתחילים ולמתקדמים.",
  schedule: "ימים א', ב', ג' · 10:00–13:00",
  contact: "בתיה שפר · 050-735-3606",
  contactTel: "0507353606",
  topics: ["תכשיטנות", "סריגת בובות", "סריגה כללי"],
};
