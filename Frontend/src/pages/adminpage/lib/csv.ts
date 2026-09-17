// CSV helpers for the dashboard import/export.

// minimal RFC-4180 parser: quoted fields, embedded commas/newlines, CRLF, BOM
export const parseCsv = (text: string): string[][] => {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
};

// A cell written as ="8712079312541" is the export protecting a barcode from
// Excel (which would otherwise turn it into 8.71208E+12); read the value back.
export const unwrapCell = (v: string) => {
  const m = /^="(.*)"$/.exec(v.trim());
  return m ? m[1] : v;
};
// the same protection on the way out, for any all-digit value (barcodes,
// leading zeros)
export const protectDigits = (v: string) => (/^\d+$/.test(v) ? `="${v}"` : v);

export const csvEscape = (v: any) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// turns parsed CSV rows into an import payload; empty category/sub/third inherit
// from the previous row (handy for product families), and image entries are
// matched against the batch-uploaded files by original name.
export const rowsToProducts = (rows: string[][], imageMap: Map<string, string>) => {
  if (rows.length < 2) return { products: [], errors: ["הקובץ ריק או חסרה שורת כותרות"] };
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) => headers.findIndex((h) => names.includes(h));
  const col = {
    name: idx(["name", "שם"]),
    price: idx(["price", "מחיר"]),
    category: idx(["category", "קטגוריה"]),
    sub: idx(["sub_cat", "subcategory", "מדף"]),
    third: idx(["third_level", "series", "סדרה"]),
    desc: idx(["description", "תיאור"]),
    images: idx(["images", "image", "img", "תמונות"]),
    sale: idx(["salepercentage", "sale", "מבצע"]),
    sku: idx(["sku", "barcode", "ברקוד", "מק\"ט", "מקט"]),
    keywords: idx(["searchkeywords", "keywords", "מילות חיפוש"]),
  };
  const errors: string[] = [];
  if (col.name < 0 || col.price < 0 || col.images < 0) {
    errors.push("חסרות עמודות חובה: name, price, images");
    return { products: [], errors };
  }
  const products: any[] = [];
  let prev: any = null;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (c: number) => (c >= 0 && r[c] !== undefined ? r[c].trim() : "");
    const images = get(col.images)
      .split(/[;|]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((entry) => imageMap.get(entry) || imageMap.get(entry.toLowerCase()) || entry);
    const p = {
      name: get(col.name),
      price: get(col.price),
      category: get(col.category) || (prev ? prev.category : ""),
      sub_cat: get(col.sub) || (prev ? prev.sub_cat : ""),
      third_level: get(col.third) || (prev ? prev.third_level : ""),
      description: get(col.desc),
      img: images.join(";"),
      salePercentage: get(col.sale) || 0,
      sku: unwrapCell(get(col.sku)),
      searchKeywords: get(col.keywords),
    };
    products.push(p);
    prev = p;
  }
  return { products, errors };
};

export const downloadFile = (filename: string, text: string) => {
  // BOM so Excel opens Hebrew correctly
  const blob = new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

// The "update from CSV" payload: one object per row carrying ONLY the columns
// the file has (so a file with just id + price compares and changes prices and
// nothing else), the id when present, no inheritance from the row above —
// an empty cell here means "empty", not "same as above".
export const rowsToSync = (rows: string[][], imageMap: Map<string, string>) => {
  if (rows.length < 2) return { rows: [], columns: [] as string[], errors: ["הקובץ ריק או חסרה שורת כותרות"] };
  const headers = rows[0].map((h) => unwrapCell(h).trim().toLowerCase());
  const idx = (names: string[]) => headers.findIndex((h) => names.includes(h));
  const col: Record<string, number> = {
    id: idx(["id", "מזהה"]),
    name: idx(["name", "שם"]),
    price: idx(["price", "מחיר"]),
    category: idx(["category", "קטגוריה"]),
    sub_cat: idx(["sub_cat", "subcategory", "מדף"]),
    third_level: idx(["third_level", "series", "סדרה"]),
    description: idx(["description", "תיאור"]),
    img: idx(["images", "image", "img", "תמונות"]),
    salePercentage: idx(["salepercentage", "sale", "מבצע"]),
    sku: idx(["sku", "barcode", "ברקוד", "מק\"ט", "מקט"]),
    searchKeywords: idx(["searchkeywords", "keywords", "מילות חיפוש"]),
    isActive: idx(["hidden", "מוסתר"]),
    isAvailable: idx(["soldout", "sold_out", "אזל"]),
    noCoupon: idx(["nocoupon", "no_coupon", "בלי קופונים"]),
  };
  const columns = Object.keys(col).filter((k) => col[k] >= 0);
  const errors: string[] = [];
  if (col.id < 0) errors.push("חסרה עמודת id — ייצאו את הקטלוג מכאן וערכו את הקובץ הזה");
  if (columns.length < 2) errors.push("הקובץ צריך לפחות עמודה אחת מלבד id");
  if (errors.length) return { rows: [], columns, errors };
  const out: Record<string, string>[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (c: number) => (r[c] !== undefined ? unwrapCell(r[c]).trim() : "");
    const o: Record<string, string> = {};
    for (const k of columns) o[k] = get(col[k]);
    if (o.img !== undefined) {
      o.img = o.img
        .split(/[;|]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry) => imageMap.get(entry) || imageMap.get(entry.toLowerCase()) || entry)
        .join(";");
    }
    out.push(o);
  }
  return { rows: out, columns, errors };
};
