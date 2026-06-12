// Google Analytics 4 — loads ONLY when VITE_GA_ID is set at build time
// (e.g. G-XXXXXXXXXX in the Render static site's env). Local dev and builds
// without the ID ship zero analytics code requests.

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;

export const initAnalytics = () => {
  if (!GA_ID) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  // SPA: we send page_view ourselves on every route change
  window.gtag("config", GA_ID, { send_page_view: false });
};

export const trackPageView = (path: string) => {
  if (window.gtag) {
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: location.href,
    });
  }
};
