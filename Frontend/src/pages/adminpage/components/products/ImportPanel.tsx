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
        טיפ: אפשר לבקש מ-AI לסרוק אתר של מותג ולהחזיר קובץ בדיוק בפורמט הזה —
        עמודות: name, price, category, sub_cat, third_level, description, images,
        salePercentage, sku (ברקוד), searchKeywords (מילות חיפוש נסתרות). שורה עם
        שם או ברקוד שכבר קיימים בחנות תדולג — הייבוא רק מוסיף, לא מעדכן. אין
        מגבלה על גודל הקובץ: הוא נשלח במנות.
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
          {csv.importBusy || "🚀 ייבוא (הוספה)"}
        </button>
        <button
          className="btn small"
          onClick={csv.runSyncPreview}
          disabled={!csv.importCsv || Boolean(csv.importBusy)}
          title="לקובץ שיוצא מכאן ונערך: משווה כל שורה לפי id ומראה מה ישתנה לפני שכותבים"
        >
          🔍 עדכון מ-CSV — תצוגה מקדימה
        </button>
      </div>
      <p className="import-help dim">
        <b>עדכון מ-CSV:</b> מייצאים את הקטלוג (📤), עורכים בגיליון, ומעלים חזרה. כל
        שורה מזוהה לפי עמודת <b>id</b> ומושווית לחנות שדה-שדה — רק מה שהשתנה
        נכתב, ורק בעמודות שיש בקובץ (אפשר למחוק עמודות שלא נוגעים בהן). שורה בלי
        id היא מוצר חדש. מוצרים שלא בקובץ נמחקים רק אם מסמנים זאת בתצוגה
        המקדימה. ברקודים מוגנים מאקסל (‎="…"‎) — אל תמחקו את זה.
      </p>
      {csv.syncPreview && <SyncPreview csv={csv} />}
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

// What "update from CSV" would do, before anything is written.
function SyncPreview({ csv }: { csv: CsvApi }) {
  const p = csv.syncPreview;
  const c = p.counts || {};
  const more = (shown: number, total: number) =>
    total > shown ? <li className="dim">...ועוד {total - shown}</li> : null;
  const fmt = (v: any) => (v === true ? "כן" : v === false ? "לא" : v === "" || v == null ? "—" : String(v));
  const canApply = c.errors === 0 && (c.update > 0 || c.create > 0 || (csv.deleteMissing && c.missing > 0));
  return (
    <div className="import-report sync-preview">
      <b>
        תצוגה מקדימה: {p.total} שורות — {c.update} ישתנו, {c.create} חדשים,{" "}
        {p.unchanged} ללא שינוי, {c.missing} לא בקובץ, {c.errors} שגיאות
      </b>

      {c.errors > 0 && (
        <div className="sync-section sync-errors">
          <b>שגיאות ({c.errors}) — יש לתקן לפני העדכון:</b>
          <ul>
            {p.errors.map((e: any, i: number) => (
              <li key={i}>
                שורה {e.row} · {e.name} — {e.reason}
              </li>
            ))}
            {more(p.errors.length, c.errors)}
          </ul>
        </div>
      )}

      {c.update > 0 && (
        <div className="sync-section">
          <b>ישתנו ({c.update}):</b>
          <ul>
            {p.update.map((u: any) => (
              <li key={u.id}>
                {u.name}:{" "}
                {u.changes.map((ch: any, i: number) => (
                  <span key={i} className="sync-change">
                    {ch.field} {fmt(ch.from)} ← {fmt(ch.to)}
                    {i < u.changes.length - 1 ? " · " : ""}
                  </span>
                ))}
              </li>
            ))}
            {more(p.update.length, c.update)}
          </ul>
        </div>
      )}

      {c.create > 0 && (
        <div className="sync-section">
          <b>חדשים ({c.create}):</b>
          <ul>
            {p.create.map((n: any, i: number) => (
              <li key={i}>
                {n.name} — ₪{n.price} · {n.category}
              </li>
            ))}
            {more(p.create.length, c.create)}
          </ul>
        </div>
      )}

      {c.missing > 0 && (
        <div className="sync-section">
          <label className="sync-delete">
            <input
              type="checkbox"
              checked={csv.deleteMissing}
              onChange={(e: any) => csv.setDeleteMissing(e.target.checked)}
            />{" "}
            <b>למחוק {c.missing} מוצרים שנמצאים בחנות אבל לא בקובץ</b> (בלי סימון
            הם נשארים כמו שהם)
          </label>
          <ul>
            {p.missing.map((m: any) => (
              <li key={m.id}>{m.name}</li>
            ))}
            {more(p.missing.length, c.missing)}
          </ul>
        </div>
      )}

      <div className="import-inputs">
        <button
          className="btn small wa-btn"
          onClick={csv.applySync}
          disabled={!canApply || Boolean(csv.importBusy)}
        >
          {csv.importBusy ||
            `✅ להחיל: ${c.update} עדכונים, ${c.create} חדשים${csv.deleteMissing ? `, ${c.missing} מחיקות` : ""}`}
        </button>
        <button className="btn small ghost" onClick={() => csv.setSyncPreview(null)}>
          ביטול
        </button>
      </div>
    </div>
  );
}
