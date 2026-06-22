import type { useHomeSettings } from "../../hooks/useHomeSettings";
import { imgUrl } from "../../lib/helpers";

type HomeApi = ReturnType<typeof useHomeSettings>;

export function FeaturedPicker({ home }: { home: HomeApi }) {
  return (
    <section className="home-block">
      <h3 className="display">מוצרים נבחרים לדף הבית</h3>
      <p className="import-help">עד 4 מוצרים — רשת רגילה; יותר מ-4 — קרוסלה נעה לאט.</p>
      <input
        type="search"
        className="featured-search"
        placeholder="חיפוש מוצר להוספה..."
        value={home.featuredSearch}
        onInput={(e: any) => home.setFeaturedSearch(e.target.value)}
      />
      {home.featuredMatches.length > 0 && (
        <div className="featured-results">
          {home.featuredMatches.map((p) => (
            <button
              key={p._id}
              type="button"
              className="featured-result"
              onClick={() => {
                home.addFeatured(p._id);
                home.setFeaturedSearch("");
              }}
            >
              <img src={imgUrl((p.img || "").split(";")[0])} alt="" loading="lazy" />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      )}
      <div className="featured-chips">
        {home.featuredIds.length === 0 && (
          <p className="empty-note">עוד לא נבחרו מוצרים — חיפשו והוסיפו למעלה</p>
        )}
        {home.featuredIds.map((id) => {
          const p = home.productById.get(id);
          return (
            <span key={id} className="featured-chip">
              <img src={p ? imgUrl((p.img || "").split(";")[0]) : ""} alt="" />
              <span className="fc-name">{p ? p.name : id}</span>
              <button type="button" aria-label="הסרה" onClick={() => home.removeFeatured(id)}>
                ✕
              </button>
            </span>
          );
        })}
      </div>
      <p className="import-help dim">נבחרו {home.featuredIds.length}/12 מוצרים</p>
      <div className="home-block-foot">
        <button className="btn" onClick={home.saveFeatured}>
          שמירת הנבחרים
        </button>
      </div>
    </section>
  );
}
