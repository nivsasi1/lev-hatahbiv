import type { useCsvImport } from "../../hooks/useCsvImport";
import { CSV_TEMPLATE } from "../../lib/constants";
import { downloadFile } from "../../lib/csv";

type CsvApi = ReturnType<typeof useCsvImport>;

export function ImportPanel({ csv }: { csv: CsvApi }) {
  return (
    <div className="admin-form import-panel">
      <h3 className="display">ייבוא מוצרים מקובץ CSV</h3>
      <p className="import-help">
        מוסיפים הרבה מוצרים בבת אחת: בוחרים קובץ CSV + את כל התמונות, ולוחצים
        ייבוא. בעמודת <b>images</b> כותבים את שם קובץ התמונה (כפי שהוא במחשב),
        כתובת URL, או שם קובץ S3 — מפרידים כמה תמונות עם נקודה-פסיק. שורה שמשאירה
        קטגוריה/מדף/סדרה ריקים ממשיכה את השורה שמעליה — נוח למשפחת מוצרים שלמה.{" "}
        <button
          type="button"
          className="subs-toggle"
          onClick={() => downloadFile("lev-hatahbiv-template.csv", CSV_TEMPLATE)}
        >
          ⬇ הורדת קובץ לדוגמה
        </button>
      </p>
      <p className="import-help dim">
        טיפ: אפשר לבקש מ-Claude לסרוק אתר של מותג ולהחזיר קובץ בדיוק בפורמט הזה —
        עמודות: name, price, category, sub_cat, third_level, description, images,
        salePercentage.
      </p>
      <div className="import-inputs">
        <label className="btn small ghost">
          📄 {csv.importCsv ? csv.importCsv.name : "בחירת קובץ CSV"}
          <input
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e: any) => csv.setImportCsv(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="btn small ghost">
          🖼 {csv.importImages.length ? `${csv.importImages.length} תמונות נבחרו` : "בחירת תמונות (אפשר הרבה)"}
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e: any) => csv.setImportImages([...(e.target.files ?? [])])}
          />
        </label>
        <button
          className="btn small wa-btn"
          onClick={csv.runImport}
          disabled={!csv.importCsv || Boolean(csv.importBusy)}
        >
          {csv.importBusy || "🚀 ייבוא"}
        </button>
      </div>
      {csv.importReport && (
        <div className="import-report">
          <b>
            נוספו {csv.importReport.created} מתוך {csv.importReport.total} שורות
          </b>
          {csv.importReport.skipped?.length > 0 && (
            <ul>
              {csv.importReport.skipped.slice(0, 12).map((s: any, i: number) => (
                <li key={i}>
                  {s.name} — {s.reason}
                </li>
              ))}
              {csv.importReport.skipped.length > 12 && (
                <li>...ועוד {csv.importReport.skipped.length - 12}</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
