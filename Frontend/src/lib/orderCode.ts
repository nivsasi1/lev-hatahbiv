// The short order number customers see on the thank-you page and quote on
// WhatsApp, and the dashboard shows on every order and finds in its search:
// the first 8 hex digits of the order's UUID.
export const orderCode = (id: string) => "#" + String(id || "").replace(/-/g, "").slice(0, 8).toUpperCase();

// does a typed "#a1b2" / "A1B2C3D4" refer to this order id?
export const matchesOrderCode = (id: string, typed: string) => {
  const q = typed.trim().replace(/^#/, "").toLowerCase();
  return q.length >= 4 && /^[0-9a-f]+$/.test(q) && String(id || "").replace(/-/g, "").toLowerCase().startsWith(q);
};
