import type { useHomeSettings } from "../../hooks/useHomeSettings";
import { imgUrl } from "../../lib/helpers";

type HomeApi = ReturnType<typeof useHomeSettings>;

export function SalePicker({ home }: { home: HomeApi }) {
  return (
    <section className="home-block">
      <h3 className="display">מבצעים בדף הבית</h3>
      <p className="import-help">
        בחרו אילו מבצעים יופיעו בדף הבית. אם לא תבחרו — יוצגו מבצעים אוטומטית.
      </p>
      <input
        type="search"
        className="featured-search"
        placeholder="חיפוש מבצע להוספה..."
        value={home.saleSearch}
        onInput={(e: any) => home.setSaleSearch(e.target.value)}
      />
      {home.saleSearch.trim() && home.saleMatches.length === 0 && (
        <p className="import-help dim">לא נמצאו מוצרים במבצע בשם הזה</p>
      )}
      {home.saleMatches.length > 0 && (
        <div className="featured-results">
          {home.saleMatches.map((p) => (
            <button
              key={p._id}
              type="button"
              className="featured-result"
              onClick={() => {
                home.addSale(p._id);
                home.setSaleSearch("");
              }}
            >
              <img src={imgUrl((p.img || "").split(";")[0])} alt="" loading="lazy" />
              <span>{p.name}</span>
              <b className="sale-tag">{p.salePercentage}%-</b>
            </button>
          ))}
        </div>
      )}
      <div className="featured-chips">
        {home.saleIds.length === 0 && (
          <p className="empty-note">לא נבחרו מבצעים — יוצגו מבצעים אוטומטית</p>
        )}
        {home.saleIds.map((id) => {
          const p = home.productById.get(id);
          return (
            <span key={id} className="featured-chip">
              <img src={p ? imgUrl((p.img || "").split(";")[0]) : ""} alt="" />
              <span className="fc-name">{p ? p.name : id}</span>
              {p && (p.salePercentage || 0) > 0 && <b className="sale-tag">{p.salePercentage}%-</b>}
              <button type="button" aria-label="הסרה" onClick={() => home.removeSale(id)}>
                ✕
              </button>
            </span>
          );
        })}
      </div>
      <p className="import-help dim">נבחרו {home.saleIds.length}/5 מבצעים</p>
      <div className="home-block-foot">
        <button className="btn" onClick={home.saveSales}>
          שמירת המבצעים
        </button>
      </div>
    </section>
  );
}
