import { useState } from "react";
import type { useHomeSettings } from "../../hooks/useHomeSettings";
import { imgUrl } from "../../lib/helpers";

type HomeApi = ReturnType<typeof useHomeSettings>;

// Per-shelf control of one sub-category page: the products that open it, and the
// order of its series chips. One shelf is edited at a time — there are dozens of
// them, and the owner only ever cares about the one they are looking at.
export function ShelfPicks({ home }: { home: HomeApi }) {
  // the series being dragged; touch devices never fire these events, which is
  // why the arrows stay — they are the only way to reorder on a phone
  const [dragging, setDragging] = useState<string | null>(null);
  const picked = home.shelfPickIds
    .map((id) => ({ id, p: home.productById.get(id) }))
    .filter((x) => x.p);

  return (
    <section className="home-block">
      <h3 className="display">מדפים: מוצרים ראשונים וסדר הסדרות</h3>
      <p className="import-help">
        לכל עמוד מדף אפשר לבחור עד 5 מוצרים שיפתחו אותו, ולקבוע באיזה סדר יופיעו
        כפתורי הסדרות. המוצרים הנבחרים מופיעים רק כשהמסנן על ״הכל״ — ברגע שלקוח בוחר
        סדרה או מיון אחר, הוא רואה את מה שביקש.
      </p>

      <select
        className="shelf-select"
        aria-label="בחירת מדף"
        value={home.shelfSel}
        onChange={(e: any) => {
          home.setShelfSel(e.target.value);
          home.setShelfSearch("");
        }}
      >
        <option value="">בחרו מדף…</option>
        {home.shelves.map((s) => (
          <option key={s.key} value={s.key}>
            {s.cat} · {s.sub} ({s.count})
          </option>
        ))}
      </select>

      {home.shelfSel && (
        <>
          <h4 className="shelf-sub">מוצרים ראשונים בעמוד</h4>
          <input
            type="search"
            className="featured-search"
            placeholder="חיפוש מוצר מהמדף הזה..."
            value={home.shelfSearch}
            onInput={(e: any) => home.setShelfSearch(e.target.value)}
          />
          {home.shelfMatches.length > 0 && (
            <div className="featured-results">
              {home.shelfMatches.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  className="featured-result"
                  onClick={() => {
                    home.addShelfPick(p._id);
                    home.setShelfSearch("");
                  }}
                >
                  <img src={imgUrl((p.img || "").split(";")[0])} alt="" loading="lazy" />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          )}
          <div className="featured-chips">
            {picked.length === 0 && (
              <p className="empty-note">
                אין בחירה — המדף ייפתח בסדר הרגיל שלו
              </p>
            )}
            {picked.map(({ id, p }, i) => (
              <span key={id} className="featured-chip shelf-chip">
                <img src={imgUrl((p!.img || "").split(";")[0])} alt="" />
                <span className="fc-name">
                  {i + 1}. {p!.name}
                </span>
                <button
                  type="button"
                  aria-label="הזזה אחורה"
                  disabled={i === 0}
                  onClick={() => home.moveShelfPick(id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="הזזה קדימה"
                  disabled={i === picked.length - 1}
                  onClick={() => home.moveShelfPick(id, 1)}
                >
                  ↓
                </button>
                <button type="button" aria-label="הסרה" onClick={() => home.removeShelfPick(id)}>
                  ✕
                </button>
              </span>
            ))}
          </div>
          <p className="import-help dim">נבחרו {home.shelfPickIds.length}/5 מוצרים</p>

          <h4 className="shelf-sub">סדר הסדרות בעמוד</h4>
          {home.shelfSeries.length < 2 ? (
            <p className="empty-note">במדף הזה יש סדרה אחת בלבד, אין מה לסדר</p>
          ) : (
            <>
              <p className="import-help dim">
                אפשר לגרור שורה למקומה בעכבר, או להשתמש בחיצים. ⤒ מקפיץ סדרה לראש
                הרשימה בלחיצה אחת.
              </p>
              <ol className="series-order">
                {home.shelfSeries.map((name, i) => (
                  <li
                    key={name}
                    draggable
                    className={dragging === name ? "dragging" : ""}
                    onDragStart={(e: any) => {
                      setDragging(name);
                      e.dataTransfer.effectAllowed = "move";
                      // Firefox refuses to start a drag without payload
                      e.dataTransfer.setData("text/plain", name);
                    }}
                    onDragOver={(e: any) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e: any) => {
                      e.preventDefault();
                      if (dragging) home.reorderSeries(dragging, name);
                      setDragging(null);
                    }}
                    onDragEnd={() => setDragging(null)}
                  >
                    <span className="so-grip" aria-hidden="true">
                      ⠿
                    </span>
                    <span className="so-name">{name}</span>
                    <button
                      type="button"
                      aria-label={`העברת ${name} לראש הרשימה`}
                      title="לראש הרשימה"
                      disabled={i === 0}
                      onClick={() => home.seriesToTop(name)}
                    >
                      ⤒
                    </button>
                    <button
                      type="button"
                      aria-label={`הקדמת ${name}`}
                      disabled={i === 0}
                      onClick={() => home.moveSeries(name, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`איחור ${name}`}
                      disabled={i === home.shelfSeries.length - 1}
                      onClick={() => home.moveSeries(name, 1)}
                    >
                      ↓
                    </button>
                  </li>
                ))}
              </ol>
              {home.shelfOrder[home.shelfSel] && (
                <button type="button" className="btn small ghost" onClick={home.resetSeriesOrder}>
                  איפוס לסדר המקורי
                </button>
              )}
            </>
          )}
        </>
      )}

      <div className="home-block-foot">
        <button className="btn" onClick={home.saveShelves} disabled={!home.shelfSel}>
          שמירת המדף
        </button>
      </div>
    </section>
  );
}
