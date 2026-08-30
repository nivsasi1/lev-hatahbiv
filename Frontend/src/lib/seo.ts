// Per-route <head> management for the SPA: title, description, canonical,
// Open Graph and a single page-level JSON-LD block. Static defaults live in
// index.html (incl. the Store + WebSite JSON-LD — keep localBusinessLd() in
// sync with the copy there).
import { useEffect } from "react";
import { store } from "../data/catalog";

// canonical host — the www form is what Google has indexed
export const SITE = "https://www.lev-hatahbiv.com";
export const absUrl = (path: string) => SITE + path;

export const LOGO = absUrl("/images/LevHatahbivLogo.png");
// social preview: 1200×630 JPEG ~50 KB (WhatsApp drops previews above ~300 KB; the logo PNG is 747 KB)
export const OG_DEFAULT = absUrl("/images/og-default.jpg");

// the description that ranks today (carried over from the old Wix site)
export const DEFAULT_DESCRIPTION =
  "בלב התחביב ניתן למצוא בחנות מבחר רחב של מוצרים בתחומי האומנות כגון צבעים, מכחולים, בדי ציור - קנווס, כני ציור ועוד, בתחומי היצירה וההובי חימר, פימו, חרוזים, מדבקות ועוד. החנות ברחובות מאז 1985.";

export const HOME_TITLE = 'לב התחביב בע"מ | ציוד לאמנות | המנוף 6, רחובות';
export const titleFor = (s: string) => `${s} | לב התחביב`;
export const categoryTitle = (name: string) => `${name} | לב התחביב בע"מ | רחובות`;

// product photos are already absolute (S3) or site-relative ("/uploads/..")
const absImg = (img: string) =>
  img.startsWith("http") ? img : absUrl(img.startsWith("/") ? img : `/${img}`);

type PageMeta = {
  title: string;
  description?: string;
  path: string;
  image?: string;
  type?: "website" | "product" | "article";
  noindex?: boolean;
  jsonLd?: object | object[];
};

const upsertMeta = (attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const removeMeta = (attr: "name" | "property", key: string) =>
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();

const upsertLink = (rel: string, href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const LD_SELECTOR = 'script[type="application/ld+json"][data-page-ld]';

const setPageLd = (ld?: object | object[]) => {
  let el = document.head.querySelector<HTMLScriptElement>(LD_SELECTOR);
  if (!ld) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-page-ld", "");
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(ld);
};

export function usePageMeta(opts: PageMeta) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const { title, path, noindex, jsonLd } = opts;
    const description = opts.description ?? DEFAULT_DESCRIPTION;
    const url = absUrl(path);
    const image = opts.image ? absImg(opts.image) : OG_DEFAULT;
    const type = opts.type ?? "website";

    document.title = title;
    upsertMeta("name", "description", description);
    upsertLink("canonical", url);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", image);
    if (image === OG_DEFAULT) {
      upsertMeta("property", "og:image:width", "1200");
      upsertMeta("property", "og:image:height", "630");
    } else {
      removeMeta("property", "og:image:width");
      removeMeta("property", "og:image:height");
    }
    upsertMeta("property", "og:type", type);
    if (noindex) upsertMeta("name", "robots", "noindex,nofollow");
    else removeMeta("name", "robots");
    setPageLd(jsonLd);
  }, [JSON.stringify(opts)]);
}

// ── JSON-LD builders ────────────────────────────────────────────────────────

export const breadcrumbLd = (items: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: absUrl(it.path),
  })),
});

export const productLd = (p: {
  id: string;
  name: string;
  description?: string;
  price: number;
  img?: string;
  soldOut?: boolean;
  sku?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: p.name,
  ...(p.description ? { description: p.description } : {}),
  image: [p.img ? absImg(p.img) : LOGO],
  ...(p.sku ? { sku: p.sku } : {}),
  brand: { "@type": "Brand", name: store.name },
  offers: {
    "@type": "Offer",
    url: absUrl(`/product/${p.id}`),
    priceCurrency: "ILS",
    price: String(p.price),
    // rich-result eligibility likes a validity date + return terms
    priceValidUntil: `${new Date().getUTCFullYear() + 1}-12-31`,
    availability: p.soldOut
      ? "https://schema.org/OutOfStock"
      : "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "IL",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 14,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/ReturnShippingFees",
    },
  },
});

// mirrored verbatim in index.html — update both
export const localBusinessLd = () => ({
  "@context": "https://schema.org",
  "@type": "Store",
  "@id": `${SITE}/#store`,
  name: store.legalName,
  alternateName: store.name,
  url: SITE,
  image: LOGO,
  telephone: `+${store.phoneIntl}`,
  email: store.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: "המנוף 6",
    addressLocality: "רחובות",
    addressCountry: "IL",
  },
  geo: { "@type": "GeoCoordinates", latitude: 31.8977, longitude: 34.7984889 },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "13:30",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Sunday", "Monday", "Wednesday", "Thursday"],
      opens: "16:00",
      closes: "19:00",
    },
  ],
  sameAs: [store.facebook, store.instagram],
  priceRange: "₪",
  foundingDate: "1985",
});
