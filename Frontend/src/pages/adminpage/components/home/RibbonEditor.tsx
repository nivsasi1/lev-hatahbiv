import type { useHomeSettings } from "../../hooks/useHomeSettings";

type HomeApi = ReturnType<typeof useHomeSettings>;

export function RibbonEditor({ home }: { home: HomeApi }) {
  return (
    <section className="home-block">
      <h3 className="display">הטקסטים בפס הנע</h3>
      <p className="import-help">
        הפס הנע בראש האתר מציג עד 8 טקסטים. מלאו את השורות שתרצו (השאר ריקות
        יידלגו). עד 80 תווים בשורה.
      </p>
      <div className="ribbon-inputs">
        {home.ribbonSlots.map((val, i) => (
          <label key={i} className="ribbon-input-row">
            <span className="ribbon-num">{i + 1}</span>
            <input
              type="text"
              className="ribbon-input"
              maxLength={80}
              placeholder={`טקסט ${i + 1}`}
              value={val}
              onInput={(e: any) => home.setRibbonSlot(i, e.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="home-block-foot">
        <button className="btn" onClick={home.saveRibbons}>
          שמירת הטקסטים
        </button>
      </div>
    </section>
  );
}
