import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Floating accessibility controls: font size, contrast, motion, link
// underlines. Choices persist in localStorage and apply as classes on <html>.
const STORE_KEY = "lh-a11y";

type Prefs = {
  font: 0 | 1 | 2;
  contrast: boolean;
  noMotion: boolean;
  underline: boolean;
};

const DEFAULTS: Prefs = { font: 0, contrast: false, noMotion: false, underline: false };

const load = (): Prefs => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
};

const apply = (p: Prefs) => {
  const el = document.documentElement;
  el.classList.toggle("a11y-font-1", p.font === 1);
  el.classList.toggle("a11y-font-2", p.font === 2);
  el.classList.toggle("a11y-contrast", p.contrast);
  el.classList.toggle("a11y-no-motion", p.noMotion);
  el.classList.toggle("a11y-underline", p.underline);
};

export const A11yWidget = () => {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(load);

  useEffect(() => {
    apply(prefs);
    localStorage.setItem(STORE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const set = (patch: Partial<Prefs>) => setPrefs((p) => ({ ...p, ...patch }));

  return (
    <div className="a11y-root">
      <button
        className="a11y-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="תפריט נגישות"
        title="נגישות"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <circle cx="12" cy="5" r="2.2" fill="currentColor" />
          <path
            d="M4 8.5 Q 12 11 20 8.5 L19.4 10.6 Q14 12 13.5 13 L15.5 20 L13.4 20.6 L12 15.5 L10.6 20.6 L8.5 20 L10.5 13 Q10 12 4.6 10.6 Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {open && (
        <div className="a11y-panel" role="dialog" aria-label="הגדרות נגישות">
          <b className="a11y-title">נגישות</b>
          <div className="a11y-row">
            <span>גודל טקסט</span>
            <div className="a11y-seg">
              {([0, 1, 2] as const).map((f) => (
                <button
                  key={f}
                  className={prefs.font === f ? "on" : ""}
                  onClick={() => set({ font: f })}
                  aria-pressed={prefs.font === f}
                >
                  {f === 0 ? "א" : f === 1 ? "א+" : "א++"}
                </button>
              ))}
            </div>
          </div>
          <label className="a11y-row">
            <span>ניגודיות גבוהה</span>
            <input
              type="checkbox"
              checked={prefs.contrast}
              onChange={(e: any) => set({ contrast: e.target.checked })}
            />
          </label>
          <label className="a11y-row">
            <span>הפחתת תנועה</span>
            <input
              type="checkbox"
              checked={prefs.noMotion}
              onChange={(e: any) => set({ noMotion: e.target.checked })}
            />
          </label>
          <label className="a11y-row">
            <span>הדגשת קישורים</span>
            <input
              type="checkbox"
              checked={prefs.underline}
              onChange={(e: any) => set({ underline: e.target.checked })}
            />
          </label>
          <div className="a11y-foot">
            <button className="a11y-reset" onClick={() => setPrefs(DEFAULTS)}>
              איפוס
            </button>
            <Link to="/accessibility" onClick={() => setOpen(false)}>
              הצהרת נגישות
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
