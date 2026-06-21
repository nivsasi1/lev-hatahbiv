import { useState } from "react";
import { useAdmin } from "../context";
import { parseCsv, rowsToProducts } from "../lib/csv";

// CSV import: upload images in batches, map names -> stored urls, create products.
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

      // 3. create everything in one shot
      setImportBusy(`מוסיף ${rows.length} מוצרים...`);
      const result = await call(`/products/import`, {
        method: "POST",
        body: JSON.stringify({ products: rows }),
      });
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
