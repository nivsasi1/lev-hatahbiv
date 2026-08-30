import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { WORKER_API } from "../data/api";
import { store } from "../data/catalog";

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
  // the live welcome offer (percent) from the Worker, and the personal
  // single-use code minted for this subscriber once they sign up.
  const [welcome, setWelcome] = useState<{ percent: number } | null>(null);
  const [coupon, setCoupon] = useState<{ code: string; percent: number } | null>(null);

  // pull the current offer so the copy can show the right percent (or hide the
  // offer entirely if the manager turned it off). Silent on failure.
  useEffect(() => {
    let alive = true;
    fetch(`${WORKER_API}/welcome`)
      .then((r) => r.json())
      .then((d) => {
        if (alive && d && d.enabled) setWelcome({ percent: d.percent });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

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

  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<Element | null>(null);

  // lock background scroll + accessibility while the modal is open: remember the
  // trigger, move focus in, close on Escape, and trap Tab inside the dialog so a
  // keyboard user can't wander onto the (inert) page behind the veil.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lastFocused.current = document.activeElement;
    // focus the first focusable control in the dialog
    const focusables = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => !el.hasAttribute("disabled"));
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "Tab") {
        const f = focusables();
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      // restore focus to whatever opened the dialog
      (lastFocused.current as HTMLElement | null)?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const res = await fetch(`${WORKER_API}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // a no-Worker host (static fallback) returns index.html with 200 — guard
      // on the response SHAPE, not just res.ok, so we don't fake a signup.
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.subscribed)
        throw new Error((data && data.error) || "שגיאה בהרשמה");
      // the Worker mints a personal single-use code (when the offer is on)
      if (data.code) setCoupon({ code: data.code, percent: data.percent });
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
      <div className="sheet-veil open" aria-hidden="true" onClick={close} />
      <div
        className="news-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="הרשמה לעדכונים"
        ref={dialogRef}
      >
        <button className="x-btn" onClick={close} aria-label="סגירה">
          ✕
        </button>

        {status === "done" ? (
          <div className="news-body">
            <h2 className="display">איזה כיף! נשמרתם אצלנו 🎨</h2>
            {coupon ? (
              <>
                <p>
                  מתנת הצטרפות 🎁 — הקוד האישי שלכם ל־{coupon.percent}% הנחה על
                  ההזמנה הראשונה (חד-פעמי, רק בשבילכם):
                </p>
                <div className="news-coupon-code">{coupon.code}</div>
              </>
            ) : (
              <p>מבטיחים לכתוב רק כשיש משהו ששווה את הצבע.</p>
            )}
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
            {welcome ? (
              <p>
                השאירו אימייל ותקבלו{" "}
                <span className="hl">{welcome.percent}% הנחה</span> על ההזמנה
                הראשונה, רק למצטרפים חדשים 🎉
              </p>
            ) : (
              <p>
                השאירו אימייל ונעדכן אתכם כשמשהו שווה מגיע לחנות — בלי חפירות,
                מבטיחים.
              </p>
            )}
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
