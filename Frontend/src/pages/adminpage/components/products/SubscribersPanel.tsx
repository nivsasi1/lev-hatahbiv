import { useAdmin } from "../../context";

export function SubscribersPanel() {
  const { subscribers, setSubscribers, workerCall, act, setNotice } = useAdmin();

  // whoever clicked "unsubscribe" must never land in a campaign — the copy
  // button (the de-facto campaign builder) only takes the active ones
  const active = subscribers.filter((s) => !s.unsubscribed_at);

  return (
    <div className="subs-box">
      <div className="subs-head">
        <b>
          נרשמו לעדכונים ({active.length}
          {active.length !== subscribers.length ? ` פעילים מתוך ${subscribers.length}` : ""})
        </b>
        <button
          className="btn small ghost"
          onClick={() => {
            navigator.clipboard.writeText(active.map((s) => s.email).join(", "));
            setNotice("המיילים הפעילים הועתקו (ללא מי שהוסרו) — אפשר להדביק במייל");
          }}
          disabled={active.length === 0}
        >
          📋 העתקת כל המיילים
        </button>
      </div>
      {subscribers.length === 0 ? (
        <p className="order-note">עוד אין נרשמים — הדיאלוג באתר כבר עובד על זה 😉</p>
      ) : (
        <div className="subs-list">
          {subscribers.map((s) => (
            <span
              key={s.email}
              className="subs-chip"
              style={s.unsubscribed_at ? { opacity: 0.45, textDecoration: "line-through" } : undefined}
              title={s.unsubscribed_at ? "הוסר/ה מרשימת התפוצה — לא לשלוח דיוור" : undefined}
            >
              {s.email}
              <button
                aria-label={`הסרת ${s.email}`}
                onClick={() =>
                  act(async () => {
                    await workerCall(`/subscribers/${encodeURIComponent(s.email)}`, {
                      method: "DELETE",
                    });
                    setSubscribers((prev) => prev.filter((x) => x.email !== s.email));
                  })
                }
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
