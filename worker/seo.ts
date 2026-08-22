// SEO plumbing for the domain move (docs/SEO-MIGRATION.md):
//   * 301s from every old Wix URL (product pages, topic pages, collections) to its new home,
//     driven by the baked /seo-redirects.json (built by Frontend/scripts/generate-seo.mjs)
//   * 410 for Wix's demo leftovers, a real 404 status for paths that are not SPA routes
//     (instead of the soft-404 "200 + home page" the SPA fallback gives)
//   * host canonicalisation once CANONICAL_HOST is set (cutover day)
// Pure helpers are exported so scripts/seo/check-redirects.mjs can exercise the same logic.

export type SeoMap = {
  products: Record<string, string>; // wix product slug -> our product id
  fallback: Record<string, string>; // wix product slug -> "410" | "/category/..." | "/search?q=..."
  collections: Record<string, string>; // wix collection slug -> "/category/<cat>/<sub>[?third=]"
  paths: Record<string, string>; // "/<wix page path>" -> "/..." | "410"
};

type SeoEnv = { ASSETS: Fetcher; CANONICAL_HOST?: string };

// keep identical to Frontend/src/data/catalog.ts slugOf + scripts/seo/slug.mjs
export const slugifyWix = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9֐-׿]+/g, "-")
    .replace(/^-+|-+$/g, "");

const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

// Wix page/collection slugs keep geresh + quotes ("ג'אקרד", '37מ"ל'); the API slugs (our map
// keys) don't. Normalise the incoming slug the same way before looking it up.
const normSlug = (raw: string): string =>
  safeDecode(raw)
    .toLowerCase()
    .replace(/['"׳״]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const searchFor = (slug: string): string => `/search?q=${encodeURIComponent(slug.replace(/-+/g, " ").trim())}`;

export type LegacyHit = { status: 301 | 410; location?: string };

export function resolveLegacyPath(pathname: string, map: SeoMap): LegacyHit | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  let m = path.match(/^\/product-page\/([^/]+)$/);
  if (m) {
    const slug = normSlug(m[1]);
    const id = map.products[slug];
    if (id) return { status: 301, location: `/product/${id}` };
    const fb = map.fallback[slug];
    if (fb === "410") return { status: 410 };
    return { status: 301, location: fb || searchFor(slug) };
  }

  m = path.match(/^\/collections-[12]\/([^/]+)$/);
  if (m) {
    const slug = normSlug(m[1]);
    return { status: 301, location: map.collections[slug] || searchFor(slug) };
  }

  const decoded = safeDecode(path);
  const target = map.paths[decoded] ?? map.paths[decoded.toLowerCase()];
  if (target === "410") return { status: 410 };
  if (target) return { status: 301, location: target };
  return null;
}

// Every client-side route in Frontend/src/App.tsx. Anything else that reaches the Worker
// (assets are served before us) is a genuine 404.
const SPA_ROUTES: RegExp[] = [
  /^\/$/,
  /^\/category\/[^/]+(\/[^/]+)?\/?$/,
  /^\/product\/[^/]+\/?$/,
  /^\/(cart|sale|manage|accessibility|terms|returns|privacy|contact|thank-you|search|workshops)\/?$/,
  /^\/designs(\/[a-z])?\/?$/,
];
export const isSpaRoute = (pathname: string): boolean => SPA_ROUTES.some((r) => r.test(pathname));

export function canonicalLocation(url: URL, canonicalHost: string | undefined): string | null {
  if (!canonicalHost || url.hostname === canonicalHost) return null;
  if (url.pathname.startsWith("/api/")) return null; // PayMe callbacks etc. must not bounce
  return `https://${canonicalHost}${url.pathname}${url.search}`;
}

let mapCache: SeoMap | null = null;
async function loadSeoMap(origin: string, env: SeoEnv): Promise<SeoMap | null> {
  if (mapCache) return mapCache;
  try {
    const res = await env.ASSETS.fetch(new Request(new URL("/seo-redirects.json", origin).toString()));
    if (!res.ok) return null;
    mapCache = (await res.json()) as SeoMap;
    return mapCache;
  } catch {
    return null;
  }
}

const redirect = (location: string, status = 301): Response =>
  new Response(null, { status, headers: { location, "cache-control": "public, max-age=86400" } });

// Returns a Response when the request is handled by the SEO layer, null to fall through
// to the static assets. GET/HEAD only; everything fails open.
export async function seoResponse(request: Request, env: SeoEnv): Promise<Response | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);

  const canon = canonicalLocation(url, env.CANONICAL_HOST);
  if (canon) return redirect(canon);

  const map = await loadSeoMap(url.origin, env);
  if (map) {
    const hit = resolveLegacyPath(url.pathname, map);
    if (hit?.status === 410) return new Response("Gone", { status: 410, headers: { "cache-control": "public, max-age=86400" } });
    if (hit?.location) return redirect(new URL(hit.location, url.origin).toString());
  }

  if (!isSpaRoute(url.pathname)) {
    // unknown path: serve the SPA shell (which renders the not-found page) with a real 404
    const shell = await env.ASSETS.fetch(new Request(new URL("/", url.origin).toString()));
    const headers = new Headers(shell.headers);
    headers.set("cache-control", "no-store");
    return new Response(shell.body, { status: 404, headers });
  }
  return null;
}
