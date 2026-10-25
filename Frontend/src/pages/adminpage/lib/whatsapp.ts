import { store } from "../../../data/catalog";
import { orderCode } from "../../../lib/orderCode";
import type { Order } from "./types";

// An Israeli number as wa.me wants it: 972 + the number without its leading 0.
// null when it isn't a usable phone number.
export const waNumber = (phone?: string | null) => {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "972" + d.slice(1);
  else if (d.length === 9 && d.startsWith("5")) d = "972" + d;
  return d.length >= 11 && d.startsWith("972") ? d : null;
};

const hoursLine = () => store.hours.map((h) => `${h.days} ${h.time}`).join(", ");

// The message the manager sends when the order is ready: what it says depends
// on how the order is delivered. The manager can still edit it in WhatsApp
// before sending (e.g. add the mail tracking number).
export const customerMessage = (o: Order) => {
  const first = String(o.payerName || "").trim().split(/\s+/)[0];
  const hi = `שלום${first ? ` ${first}` : ""}, כאן ${store.name} 🎨`;
  const code = orderCode(o._id);
  if (o.delivery === "pickup") {
    return `${hi}\nההזמנה שלך (${code}) מוכנה לאיסוף מהחנות — ${store.address}.\nשעות פתיחה: ${hoursLine()}.\nנתראה!`;
  }
  if (o.delivery === "mail") {
    return `${hi}\nההזמנה שלך (${code}) נשלחה בדואר רשום.\nמספר מעקב: `;
  }
  return `${hi}\nההזמנה שלך (${code}) יצאה אליך במשלוח עד הבית, ובדרך כלל מגיעה תוך ${store.courierEta}.\nתודה שקנית אצלנו!`;
};

export const customerWaLink = (o: Order) => {
  const n = waNumber(o.payerPhone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(customerMessage(o))}` : null;
};

export const waLabel = (o: Order) => (o.delivery === "pickup" ? "📲 מוכנה לאיסוף" : "📲 נשלחה");
