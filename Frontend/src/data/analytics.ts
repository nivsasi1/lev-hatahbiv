// Analytics + ad measurement, all opt-in by build-time env vars so a build
// without an ID ships zero tracking code for that platform:
//   VITE_GA_ID          G-XXXXXXXXXX   — Google Analytics 4
//   VITE_META_PIXEL_ID  1234567890     — Meta (Facebook/Instagram) Pixel
//   VITE_GADS_ID        AW-XXXXXXXXX   — Google Ads (conversion + remarketing)
//   VITE_GADS_PURCHASE_LABEL  aBcD...   — the Google Ads purchase conversion label
//
// Consent Mode v2: analytics is granted by default (Israeli-first audience —
// analytics cookies don't require prior opt-in here), but AD storage/personalization
// stay DENIED until the shopper accepts marketing in the consent banner. The banner
// only appears when an ad pixel is actually configured, so the shop's UX is
// unchanged until the owner turns paid ads on.
//
// MONEY: our order totals are integer AGOROT. GA4/Ads/Meta all expect major units,
// so every value is converted agorot/100 before it leaves here.

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fbq?: any;
    _fbq?: any;
  }
}

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;
const META_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
const GADS_ID = import.meta.env.VITE_GADS_ID as string | undefined;
const GADS_PURCHASE_LABEL = import.meta.env.VITE_GADS_PURCHASE_LABEL as string | undefined;

export const AD_PIXELS_CONFIGURED = Boolean(META_ID || GADS_ID);
// gtag routes every event to ALL configured destinations (GA4 and/or Ads), so
// events must fire when EITHER exists — guarding on GA_ID alone starved Google
// Ads remarketing of all SPA activity in an Ads-only setup.
const HAS_GTAG = Boolean(GA_ID || GADS_ID);
const CONSENT_KEY = "lh-consent-v1"; // "granted" | "denied"

const nis = (agorot: number) => Math.round(agorot) / 100;

const ready = () => typeof window !== "undefined";

// ── item shape shared by all ecommerce events ────────────────────────────────
export type TrackItem = {
  id: string;
  name: string;
  priceAgorot: number;
  qty?: number;
  category?: string;
};
const ga4Items = (items: TrackItem[]) =>
  items.map((i) => ({
    item_id: i.id,
    item_name: i.name,
    price: nis(i.priceAgorot),
    quantity: i.qty ?? 1,
    ...(i.category ? { item_category: i.category } : {}),
  }));
const metaContents = (items: TrackItem[]) =>
  items.map((i) => ({ id: i.id, quantity: i.qty ?? 1, item_price: nis(i.priceAgorot) }));

// ── consent ──────────────────────────────────────────────────────────────────
const storedConsent = (): "granted" | "denied" | null => {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
};
export const consentDecision = storedConsent; // re-export for the banner
export const needsConsentBanner = () => AD_PIXELS_CONFIGURED && storedConsent() === null;

// ── GA4 + Consent Mode bootstrap ──────────────────────────────────────────────
export const initAnalytics = () => {
  if (!ready()) return;
  // gtag is the shared transport for GA4 AND Google Ads; load it if either exists.
  if (GA_ID || GADS_ID) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer!.push(arguments);
    };
    // Consent Mode v2 defaults — BEFORE any config. Ads denied until opt-in.
    const adConsent = storedConsent() === "granted" ? "granted" : "denied";
    window.gtag("consent", "default", {
      ad_storage: adConsent,
      ad_user_data: adConsent,
      ad_personalization: adConsent,
      analytics_storage: "granted",
      wait_for_update: 500,
    });

    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID || GADS_ID}`;
    document.head.appendChild(s);
    window.gtag("js", new Date());
    if (GA_ID) window.gtag("config", GA_ID, { send_page_view: false }); // we send page_view on route change
    if (GADS_ID) window.gtag("config", GADS_ID);
  }
  // Meta pixel only loads once marketing consent exists (it is an ad tracker).
  if (META_ID && storedConsent() === "granted") loadMetaPixel();
};

// ── Meta pixel loader (called on consent) ─────────────────────────────────────
let metaLoaded = false;
export const loadMetaPixel = (fireInitialPageView = false) => {
  if (!ready() || !META_ID || metaLoaded) return;
  metaLoaded = true;
  /* eslint-disable */
  (function (f: any, b, e, v, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  window.fbq("init", META_ID);
  // On page load the Layout route effect fires the first PageView via
  // trackPageView — firing here too double-counted every landing view. Only a
  // mid-session consent grant (no route change coming) needs its own PageView.
  if (fireInitialPageView) window.fbq("track", "PageView");
};

// ── consent actions (called by the banner) ───────────────────────────────────
export const grantConsent = () => {
  try {
    localStorage.setItem(CONSENT_KEY, "granted");
  } catch {
    /* storage blocked — consent applies for this session only */
  }
  if (window.gtag) {
    window.gtag("consent", "update", {
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
  }
  if (META_ID) loadMetaPixel(true);
};
export const denyConsent = () => {
  try {
    localStorage.setItem(CONSENT_KEY, "denied");
  } catch {
    /* ignore */
  }
  if (window.gtag) {
    window.gtag("consent", "update", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }
};

// ── events ────────────────────────────────────────────────────────────────────
export const trackPageView = (path: string) => {
  if (window.gtag && HAS_GTAG) {
    window.gtag("event", "page_view", { page_path: path, page_location: location.href });
  }
  if (window.fbq) window.fbq("track", "PageView");
};

export const trackViewItem = (item: TrackItem) => {
  if (window.gtag && HAS_GTAG) {
    window.gtag("event", "view_item", {
      currency: "ILS",
      value: nis(item.priceAgorot),
      items: ga4Items([item]),
    });
  }
  if (window.fbq) {
    window.fbq("track", "ViewContent", {
      content_ids: [item.id],
      content_type: "product",
      content_name: item.name,
      value: nis(item.priceAgorot),
      currency: "ILS",
    });
  }
};

export const trackAddToCart = (item: TrackItem) => {
  const value = nis(item.priceAgorot) * (item.qty ?? 1);
  if (window.gtag && HAS_GTAG) {
    window.gtag("event", "add_to_cart", { currency: "ILS", value, items: ga4Items([item]) });
  }
  if (window.fbq) {
    window.fbq("track", "AddToCart", {
      content_ids: [item.id],
      content_type: "product",
      content_name: item.name,
      value,
      currency: "ILS",
    });
  }
};

export const trackBeginCheckout = (items: TrackItem[], valueAgorot: number, coupon?: string) => {
  if (window.gtag && HAS_GTAG) {
    window.gtag("event", "begin_checkout", {
      currency: "ILS",
      value: nis(valueAgorot),
      ...(coupon ? { coupon } : {}),
      items: ga4Items(items),
    });
  }
  if (window.fbq) {
    window.fbq("track", "InitiateCheckout", {
      content_ids: items.map((i) => i.id),
      content_type: "product",
      contents: metaContents(items),
      num_items: items.reduce((n, i) => n + (i.qty ?? 1), 0),
      value: nis(valueAgorot),
      currency: "ILS",
    });
  }
};

// Purchase — fired once from the ThankYou page on a server-confirmed paid order.
// De-duped by transaction id so a page refresh never double-counts a conversion.
export const trackPurchase = (o: {
  transactionId: string;
  valueAgorot: number;
  coupon?: string;
  items: TrackItem[];
}) => {
  const flagKey = `lh-purch-${o.transactionId}`;
  try {
    if (sessionStorage.getItem(flagKey)) return; // already tracked this order
    sessionStorage.setItem(flagKey, "1");
  } catch {
    /* storage blocked — still fire once for this view */
  }
  const value = nis(o.valueAgorot);
  if (window.gtag && HAS_GTAG) {
    window.gtag("event", "purchase", {
      transaction_id: o.transactionId,
      value,
      currency: "ILS",
      ...(o.coupon ? { coupon: o.coupon } : {}),
      items: ga4Items(o.items),
    });
  }
  if (window.gtag && GADS_ID && GADS_PURCHASE_LABEL) {
    window.gtag("event", "conversion", {
      send_to: `${GADS_ID}/${GADS_PURCHASE_LABEL}`,
      value,
      currency: "ILS",
      transaction_id: o.transactionId,
    });
  }
  if (window.fbq) {
    window.fbq(
      "track",
      "Purchase",
      {
        content_ids: o.items.map((i) => i.id),
        content_type: "product",
        contents: metaContents(o.items),
        value,
        currency: "ILS",
      },
      { eventID: o.transactionId } // dedup key for Meta CAPI, if wired server-side later
    );
  }
};
