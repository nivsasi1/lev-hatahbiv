type Theme = "atelier" | "clean";

export function ThemeSwitch({
  value,
  onChange,
}: {
  value: Theme;
  onChange: (t: Theme) => void;
}) {
  return (
    <div className="adm-theme-switch" role="group" aria-label="עיצוב הדשבורד">
      <button
        type="button"
        className={value === "atelier" ? "on" : ""}
        onClick={() => onChange("atelier")}
        aria-pressed={value === "atelier"}
      >
        🎨 קלאסי
      </button>
      <button
        type="button"
        className={value === "clean" ? "on" : ""}
        onClick={() => onChange("clean")}
        aria-pressed={value === "clean"}
      >
        📋 נקי
      </button>
    </div>
  );
}
