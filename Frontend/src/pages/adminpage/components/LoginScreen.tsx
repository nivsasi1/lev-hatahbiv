import { useState } from "react";
import { useAdmin } from "../context";
import { API, TOKEN_KEY } from "../lib/constants";
import { ThemeSwitch } from "./ThemeSwitch";
import { DialogOverlay } from "./DialogOverlay";

type Theme = "atelier" | "clean";

export function LoginScreen({
  rootClass,
  adminTheme,
  setAdminTheme,
}: {
  rootClass: string;
  adminTheme: Theme;
  setAdminTheme: (t: Theme) => void;
}) {
  const { act, setToken, error } = useAdmin();
  const [loggingIn, setLoggingIn] = useState(false);

  return (
    <main className={rootClass}>
      <DialogOverlay />
      <div className="admin-login-wrap">
        <div className="admin-head">
          <h1 className="display">כניסת מנהלים</h1>
          <ThemeSwitch value={adminTheme} onChange={setAdminTheme} />
        </div>
        <form
          className="admin-login"
          onSubmit={(e: any) => {
            e.preventDefault();
            if (loggingIn) return;
            const fd = new FormData(e.target);
            setLoggingIn(true);
            act(async () => {
              const res = await fetch(`${API}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  username: fd.get("username"),
                  password: fd.get("password"),
                }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data.error || "שם משתמש או סיסמה שגויים");
              sessionStorage.setItem(TOKEN_KEY, data.token);
              setToken(data.token);
            }).finally(() => setLoggingIn(false));
          }}
        >
          <input name="username" placeholder="שם משתמש" required disabled={loggingIn} />
          <input name="password" type="password" placeholder="סיסמה" required disabled={loggingIn} />
          <button className="btn" type="submit" disabled={loggingIn}>
            {loggingIn ? "מתחבר…" : "כניסה"}
          </button>
          {error && <p className="admin-error">{error}</p>}
          <p className="order-note">
            בכניסה הראשונה אחרי הפסקה, השרת מתעורר — ההתחברות עשויה לקחת עד דקה.
            המתינו ל״מתחבר…״ ואל תסגרו את החלון.
          </p>
        </form>
      </div>
    </main>
  );
}
