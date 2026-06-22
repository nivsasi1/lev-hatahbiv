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
