import { categories } from "../../../../data/catalog";
import type { useHomeSettings } from "../../hooks/useHomeSettings";
import { imgUrl } from "../../lib/helpers";

type HomeApi = ReturnType<typeof useHomeSettings>;

export function ShelfImages({ home }: { home: HomeApi }) {
  return (
    <section className="home-block">
      <h3 className="display">תמונות המדפים בעמוד הבית</h3>
      <p className="import-help">
        לכל קטגוריה יש תמונה גדולה במוזאיקת המדפים בדף הבית. אפשר להחליף אותה
        בהדבקת קישור (URL) או בהעלאת תמונה מהמחשב. קטגוריה שלא תוגדר — תציג את
        תמונת ברירת המחדל.
      </p>
      <div className="shelf-img-grid">
        {categories.map((cat) => {
          const url = home.shelfImages[cat.slug] || "";
          const isCustom = Boolean(url);
          return (
            <div className="shelf-img-row" key={cat.slug}>
              <div className="shelf-img-thumb">
                {isCustom ? (
                  <img src={imgUrl(url)} alt={cat.name} loading="lazy" />
                ) : (
                  <span className="shelf-img-default">
                    ברירת
                    <br />
                    מחדל
                  </span>
                )}
              </div>
              <div className="shelf-img-main">
                <div className="shelf-img-head">
                  <b className="shelf-img-name">{cat.name}</b>
                  {isCustom ? (
                    <span className="shelf-img-badge custom">מותאם אישית</span>
                  ) : (
                    <span className="shelf-img-badge">ברירת מחדל</span>
                  )}
                </div>
                <input
                  type="text"
                  dir="ltr"
                  className="shelf-img-url"
                  placeholder="הדביקו קישור לתמונה (URL)..."
                  value={url}
                  onInput={(e: any) => home.setShelfImage(cat.slug, e.target.value)}
                />
                <div className="shelf-img-ctrls">
                  <label className="btn small ghost">
                    {home.shelfUploading === cat.slug ? "מעלה..." : "📷 העלאת תמונה"}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={home.shelfUploading === cat.slug}
                      onChange={(e: any) =>
                        e.target.files?.[0] && home.uploadShelfImage(cat.slug, e.target.files[0])
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn small ghost"
                    disabled={!isCustom}
                    title={isCustom ? "" : "כבר בברירת המחדל"}
                    onClick={() => home.resetShelfImage(cat.slug)}
                  >
                    ↺ איפוס לברירת מחדל
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="home-block-foot">
        <button className="btn" onClick={home.saveShelfImages}>
          שמירת התמונות
        </button>
        {home.shelfSaved && <span className="shelf-img-saved">נשמר ▾</span>}
      </div>
    </section>
  );
}
