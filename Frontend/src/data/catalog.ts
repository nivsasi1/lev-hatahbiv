// קטלוג החנות — לב התחביב
// The product list is real inventory, generated from MongoDB into
// products.json (see scripts/generate-catalog.mjs). Photos are served from
// the store's S3 bucket; products whose photo is missing or fails to load
// fall back to a per-category SVG illustration (ProductArt).
import rawProducts from "./products.json";

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
};

// img can be an S3 filename, a full URL, or a local "/uploads/..." path
const resolveImg = (img: string) =>
  !img ? undefined : img.startsWith("http") || img.startsWith("/") ? img : S3_IMAGES + img;

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
    badge: r.salePrice && !r.soldOut ? "מבצע" : undefined,
    pickupOnly: r.pickupOnly,
    soldOut: r.soldOut,
    isActive: true,
  };
});

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
    { days: "א', ב', ד', ה'", time: "16:00 – 18:00" },
  ],
};

// חוגים וסדנאות — מתקיימים בחדר הלימוד הצמוד לחנות (מתוך האתר הישן)
export const workshops = {
  intro:
    "בואו להעשיר את יכולות האמנות שלכם — החנות מקיימת חוגים וסדנאות מגוונים בחדר הלימוד הצמוד לחנות, למתחילים ולמתקדמים.",
  schedule: "יום א' 10:00–13:00 · יום ב' 17:00–20:00",
  price: "מפגש של שלוש שעות — ₪80",
  topics: [
    "פרסקו קולאז' — עיצוב תמונות עתיקות",
    "צביעה בסגנון עתיק",
    "פימו — יצירות חרוזים",
    "צריבה על עץ",
    "עיצוב אלבומים",
    "תכשיטנות — חריזה וסריגה",
    "עיצוב כלי זכוכית",
  ],
};
