import { useState } from "react";
import { useAdmin } from "../context";

// BIG, deliberately-hard-to-miss reminder that there are edits which haven't
// reached the live shop yet. Product/price/home changes are saved to the DB but
// only appear to shoppers (and are charged at the new price) after "publish".
// Shown whenever `dirty` is set; one click publishes and clears it.
export function PublishBanner() {
  const { dirty, call, act, setNotice, clearDirty } = useAdmin();
  const [publishing, setPublishing] = useState(false);
  if (!dirty) return null;

  const publish = () => {
    setPublishing(true);
    act(async () => {
      const d = await call(`/publish`, { method: "POST" });
      clearDirty();
      // a 200 here only means the deploy started (cloud: the build hook accepted) —
      // the ~3-minute build can still fail, so don't claim the site IS updated
      setNotice(
        `הפרסום יצא לדרך! ${d.summary ?? ""} האתר מתעדכן תוך כ־3 דקות — כדאי לרענן את החנות ולוודא שהשינוי עלה.`
      );
    }).finally(() => setPublishing(false));
  };

  return (
    <div className="publish-banner" role="alert">
      <div className="publish-banner-inner">
        <span className="publish-banner-icon" aria-hidden="true">⚠️</span>
        <div className="publish-banner-text">
          <strong>יש שינויים שעדיין לא פורסמו לאתר!</strong>
          <span>
            העריכות שלך נשמרו, אבל הלקוחות עדיין רואים (ומשלמים לפי) הגרסה הישנה של האתר.
            לחצו “פרסום עכשיו” כדי שהשינויים ייכנסו לתוקף.
          </span>
        </div>
        <button
          className="publish-banner-btn"
          onClick={publish}
          disabled={publishing}
        >
          {publishing ? "מפרסם…" : "🚀 פרסום עכשיו"}
        </button>
      </div>
    </div>
  );
}
