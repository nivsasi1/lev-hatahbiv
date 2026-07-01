// Where the manager/orders API lives (Express backend: products, orders, login,
// publish, image upload). Locally the Express server next to the site; in
// production set VITE_API_URL at build time to the hosted backend.
export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5001";

// The Cloudflare Worker (D1) that serves coupons, the welcome offer and the
// subscriber list. It lives at /api on the same origin as the deployed site,
// so the default is relative; override with VITE_WORKER_API for local dev.
export const WORKER_API =
  (import.meta.env.VITE_WORKER_API as string | undefined) || "/api";

// Authenticated fetch against the Worker admin API, for spots where the
// AdminContext isn't in scope (e.g. the header bell). Throws on error / non-JSON
// (a no-Worker host returns index.html as 200 → treated as failure by callers).
export async function workerFetch(
  path: string,
  token: string,
  init: RequestInit = {}
): Promise<any> {
  const res = await fetch(`${WORKER_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data === null)
    throw new Error((data && data.error) || `error ${res.status}`);
  return data;
}
