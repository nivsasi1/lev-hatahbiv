import { useState } from "react";
import { useAdmin } from "../context";
import { ThemeSwitch } from "./ThemeSwitch";

type Theme = "atelier" | "clean";

export function DashboardHeader({
  adminTheme,
  setAdminTheme,
}: {
  adminTheme: Theme;
  setAdminTheme: (t: Theme) => void;
}) {
  const { call, act, setNotice, logout } = useAdmin();
  const [publishing, setPublishing] = useState(false);

  const publish = () => {
    setPublishing(true);
    act(async () => {
      const d = await call(`/publish`, { method: "POST" });
      setNotice(`האתר עודכן! ${d.summary ?? ""}`);
    }).finally(() => setPublishing(false));
  };

  return (
    <div className="admin-head">
      <h1 className="display">ניהול החנות</h1>
      <div className="admin-head-actions">
        <ThemeSwitch value={adminTheme} onChange={setAdminTheme} />
        <button className="btn small wa-btn" onClick={publish} disabled={publishing}>
          {publishing ? "מפרסם..." : "📤 פרסום לאתר"}
        </button>
        <button className="btn small ghost" onClick={logout}>
          יציאה
        </button>
      </div>
    </div>
  );
}
