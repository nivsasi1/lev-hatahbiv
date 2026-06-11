// Where the manager/newsletter API lives.
// Locally this is the Express server next to the site; when the site is
// hosted on the web, set VITE_API_URL at build time to the hosted backend.
export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5001";
