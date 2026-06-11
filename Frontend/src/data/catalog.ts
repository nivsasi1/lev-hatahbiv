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
  img?: string; // photo URL — wins over art unless it fails to load
  art?: ArtKind;
  artColor?: string;
  badge?: "חדש" | "מבצע" | "רב מכר";
  pickupOnly?: boolean;
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
  img: string;
  pickupOnly?: boolean;
};

export const products: Product[] = (rawProducts as RawProduct[]).map((r) => {
  const cat = categoryBySlug.get(r.cat);
  return {
    id: r.id,
    name: r.name,
    price: r.price,
    salePrice: r.salePrice,
    description: r.desc,
    category: r.cat,
    sub: r.sub,
    img: r.img ? S3_IMAGES + r.img : undefined,
    art: cat?.art ?? "tube",
    artColor: cat?.color,
    badge: r.salePrice ? "מבצע" : undefined,
    pickupOnly: r.pickupOnly,
  };
});

const productById = new Map(products.map((p) => [p.id, p]));

export const getCategory = (slug: string) => categoryBySlug.get(slug);

export const getProduct = (id: string) => productById.get(id);

export const productsByCategory = (slug: string) =>
  products.filter((p) => p.category === slug);

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

export const shekel = (n: number) =>
  `₪${Number.isInteger(n) ? n : n.toFixed(2).replace(/\.?0+$/, "")}`;

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
  hours: [
    { days: "ראשון – שישי", time: "9:00 – 13:30" },
    { days: "א', ב', ד', ה'", time: "16:00 – 18:00" },
  ],
};
