import { useState } from "react";
import { useAdmin } from "../context";
import { parseCsv, rowsToProducts } from "../lib/csv";

// CSV import: upload images in batches, map names -> stored urls, create products.
const IMPORT_CHUNK = 250;

export function useCsvImport() {
  const { call, refresh, setError, setNotice } = useAdmin();

  const [showImport, setShowImport] = useState(false);
  const [importCsv, setImportCsv] = useState<File | null>(null);
  const [importImages, setImportImages] = useState<File[]>([]);
  const [importBusy, setImportBusy] = useState("");
  const [importReport, setImportReport] = useState<any>(null);

  const runImport = async () => {
    if (!importCsv) {
      setError("בחרו קובץ CSV");
      return;
    }
    setError("");
    setNotice("");
    setImportReport(null);
    try {
      // 1. upload images (if any) in chunks, build original-name -> stored-name map
      const imageMap = new Map<string, string>();
      const chunks: File[][] = [];
      for (let i = 0; i < importImages.length; i += 6) chunks.push(importImages.slice(i, i + 6));
      let uploaded = 0;
      for (const chunk of chunks) {
        setImportBusy(`מעלה תמונות... ${uploaded}/${importImages.length}`);
        const body = new FormData();
        for (const f of chunk) body.append("images", f);
        const d = await call(`/upload-batch`, { method: "POST", body });
        for (const f of d.files) {
          if (f.img) {
            imageMap.set(f.original, f.img);
            imageMap.set(f.original.toLowerCase(), f.img);
          }
        }
        uploaded += chunk.length;
      }

      // 2. parse the CSV and link images by filename
      setImportBusy("קורא את הקובץ...");
      const text = await importCsv.text();
      const { products: rows, errors } = rowsToProducts(parseCsv(text), imageMap);
      if (errors.length) throw new Error(errors.join(" · "));
      if (rows.length === 0) throw new Error("לא נמצאו שורות מוצרים בקובץ");

      // 3. create everything, in slices: the API takes up to 500 rows per call,
      //    and a whole-catalogue file (2,000+ rows) is a few calls with a running
      //    count rather than one request that fails on size or times out.
      //    Rows are sent in file order, so a duplicate later in the file is
      //    still caught — by then the earlier row is already in the store.
      const result = { created: 0, skipped: [] as any[], total: rows.length };
      for (let i = 0; i < rows.length; i += IMPORT_CHUNK) {
        const slice = rows.slice(i, i + IMPORT_CHUNK);
        setImportBusy(`מוסיף מוצרים... ${i}/${rows.length}`);
        let part: any;
        try {
          part = await call(`/products/import`, {
            method: "POST",
            body: JSON.stringify({ products: slice }),
          });
        } catch (e: any) {
          // say how far it got — the rows before this slice are already in
          throw new Error(
            i > 0 ? `הייבוא נעצר אחרי ${i} שורות מתוך ${rows.length} (נוספו ${result.created}). ${e.message}` : e.message
          );
        }
        result.created += part.created || 0;
        for (const s of part.skipped || []) result.skipped.push(s.row ? { ...s, row: s.row + i } : s);
      }
      setImportReport(result);
      setNotice(`נוספו ${result.created} מוצרים חדשים 🎉`);
      setImportCsv(null);
      setImportImages([]);
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setImportBusy("");
    }
  };

  return {
    showImport,
    setShowImport,
    importCsv,
    setImportCsv,
    importImages,
    setImportImages,
    importBusy,
    importReport,
    runImport,
  };
}
