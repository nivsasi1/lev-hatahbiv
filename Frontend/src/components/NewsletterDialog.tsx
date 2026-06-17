import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { API_BASE } from "../data/api";
import { store } from "../data/catalog";
import { Splat } from "./Splat";

// Shows once per visitor (15s after first arriving), or whenever something
// dispatches the "lh-open-news" event (e.g. the footer button).
const SEEN_KEY = "lh-news-v1";

type Status = "idle" | "sending" | "done" | "error";

export const NewsletterDialog = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const { pathname } = useLocation();

  useEffect(() => {
    const openNow = () => {
      setStatus("idle");
      setOpen(true);
    };
    window.addEventListener("lh-open-news", openNow);

    let timer: any;
    if (!localStorage.getItem(SEEN_KEY)) {
      timer = setTimeout(openNow, 15000);
    }
    return () => {
      window.removeEventListener("lh-open-news", openNow);
      clearTimeout(timer);
    };
  }, []);

  // lock background scroll while the modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // never interrupt the manager screens
  if (pathname.startsWith("/manage")) return null;

  const close = () => {
    setOpen(false);
    if (!localStorage.getItem(SEEN_KEY)) localStorage.setItem(SEEN_KEY, "dismissed");
  };

  const submit = async (e: any) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch(`${API_BASE}/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "שגיאה בהרשמה");
      localStorage.setItem(SEEN_KEY, "subscribed");
      setStatus("done");
    } catch (err: any) {
      // backend unreachable (static hosting without API) or server error —
      // offer WhatsApp as a friendly fallback instead of a dead end
      setErrorMsg(err.message === "Failed to fetch" ? "" : err.message);
      setStatus("error");
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="sheet-veil open" />
      <div className="news-dialog" role="dialog" aria-label="הרשמה לעדכונים">
        <Splat color="#e09f3e" size={90} style={{ top: "-2.2rem", left: "-2.2rem", opacity: 0.85 }} />
        <button className="x-btn" onClick={close} aria-label="סגירה">
          ✕
        </button>

        {status === "done" ? (
          <div className="news-body">
            <h2 className="display">איזה כיף! נשמרתם אצלנו 🎨</h2>
            <p>
              מתנת הצטרפות 🎁 — הזינו את הקוד הזה בעמוד התשלום ל־10% הנחה על
              ההזמנה הראשונה:
            </p>
            <div className="news-coupon-code">LEV10</div>
            <p className="news-coupon-note">
              מבטיחים לכתוב רק כשיש משהו ששווה את הצבע.
            </p>
            <button className="btn small" onClick={close}>
              סגירה
            </button>
          </div>
        ) : status === "error" ? (
          <div className="news-body">
            <h2 className="display">אופס, ההרשמה לא עברה</h2>
            <p>{errorMsg || "לא הצלחנו להתחבר כרגע."} אפשר פשוט לכתוב לנו בוואטסאפ ונוסיף אתכם:</p>
            <a
              className="btn small wa-btn"
              href={`https://wa.me/${store.phoneIntl}?text=${encodeURIComponent("היי! אשמח להצטרף לרשימת העדכונים שלכם 🎨")}`}
              target="_blank"
              rel="noreferrer"
            >
              הצטרפות בוואטסאפ 💬
            </a>
          </div>
        ) : (
          <div className="news-body">
            <span className="hero-kicker">חדש על המדף · מבצעים · סדנאות</span>
            <h2 className="display">נשארים בקשר?</h2>
            <p>
              השאירו אימייל ונעדכן אתכם כשמשהו שווה מגיע לחנות — ותקבלו{" "}
              <span className="hl">10% הנחה</span> על ההזמנה הראשונה, רק
              למצטרפים חדשים 🎉
            </p>
            <form onSubmit={submit} className="news-form">
              <input
                type="email"
                required
                placeholder="האימייל שלכם"
                value={email}
                onInput={(e: any) => setEmail(e.target.value)}
              />
              <button className="btn" type="submit" disabled={status === "sending"}>
                {status === "sending" ? "רגע..." : "הרשמה 💌"}
              </button>
            </form>
            <button className="news-skip" onClick={close}>
              לא תודה, אני רק מסתכל/ת
            </button>
          </div>
        )}
      </div>
    </>
  );
};
