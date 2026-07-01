import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { workerFetch } from "../data/api";

// Manager-only bell in the header: polls the dashboard API for new orders and
// new newsletter subscribers, and shows a red count badge. Renders nothing for
// regular shoppers (no admin token) and stays silent on any fetch/auth error.

const SEEN_ORDERS_KEY = "lh-noti-seen-orders"; // ISO timestamp string
const SEEN_SUBS_KEY = "lh-noti-seen-subs"; // count

const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6 16 V11 a 6 6 0 0 1 12 0 v5 l1.5 2 H4.5 Z"
      stroke="#2b2440"
      stroke-width="2.2"
      stroke-linejoin="round"
      fill="#fffdf7"
    />
    <path
      d="M10 18 a 2 2 0 0 0 4 0"
      stroke="#2b2440"
      stroke-width="2.2"
      stroke-linecap="round"
    />
  </svg>
);

export const AdminBell = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem("lh-admin-jwt")
  );
  const [newOrders, setNewOrders] = useState(0);
  const [newSubs, setNewSubs] = useState(0);

  useEffect(() => {
    setToken(sessionStorage.getItem("lh-admin-jwt"));
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const [orders, subs] = await Promise.all([
          workerFetch("/admin/orders", token),
          workerFetch("/admin/subscribers", token),
        ]);
        if (cancelled) return;

        const seenOrders = localStorage.getItem(SEEN_ORDERS_KEY);
        // the API wraps its payloads: { orders: [...] } / { subscribers: [...] }
        const orderList: any[] = Array.isArray(orders?.orders) ? orders.orders : [];
        // actionable = a paid order awaiting fulfilment (since seen)
        const orderCount = orderList.filter(
          (o) =>
            o.status === "paid" &&
            (!seenOrders ||
              new Date(o.createdAt).getTime() > new Date(seenOrders).getTime())
        ).length;

        const subList: any[] = Array.isArray(subs?.subscribers) ? subs.subscribers : [];
        const seenSubs = Number(localStorage.getItem(SEEN_SUBS_KEY) || 0);
        const subCount = Math.max(0, subList.length - seenSubs);

        setNewOrders(orderCount);
        setNewSubs(subCount);
      } catch {
        if (!cancelled) {
          setNewOrders(0);
          setNewSubs(0);
        }
      }
    };

    poll();
    const id = setInterval(poll, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token]);

  if (!token) return null;

  const total = newOrders + newSubs;

  return (
    <button
      className="admin-bell"
      onClick={() => navigate("/manage")}
      aria-label="לוח ניהול"
      title={`${newOrders} הזמנות חדשות · ${newSubs} נרשמים חדשים`}
    >
      <span className="bell-icon">
        <BellIcon />
        {total > 0 && (
          <span key={total} className="cart-badge">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </span>
    </button>
  );
};
