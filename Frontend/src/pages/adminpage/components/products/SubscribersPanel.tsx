import { useAdmin } from "../../context";

export function SubscribersPanel() {
  const { subscribers, setSubscribers, workerCall, act, setNotice } = useAdmin();

  return (
    <div className="subs-box">
      <div className="subs-head">
        <b>נרשמו לעדכונים ({subscribers.length})</b>
        <button
          className="btn small ghost"
          onClick={() => {
            navigator.clipboard.writeText(subscribers.map((s) => s.email).join(", "));
            setNotice("כל המיילים הועתקו — אפשר להדביק במייל");
          }}
          disabled={subscribers.length === 0}
        >
          📋 העתקת כל המיילים
        </button>
      </div>
      {subscribers.length === 0 ? (
        <p className="order-note">עוד אין נרשמים — הדיאלוג באתר כבר עובד על זה 😉</p>
      ) : (
        <div className="subs-list">
          {subscribers.map((s) => (
            <span key={s.email} className="subs-chip">
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
