import { useEffect, useMemo, useState } from "react";
import { categories } from "../data/catalog";
import { API_BASE } from "../data/api";
import "./admin-tools.css";
import "./admin-clean.css";

// ─── Manager dashboard (/manage) ────────────────────────────────────────────
// Talks to the Express backend (local now, hosted later via VITE_API_URL).
// After making changes, press "פרסום לאתר" to regenerate + rebuild the site.
const API = `${API_BASE}/admin`;

// ─── JWT storage strategy ───────────────────────────────────────────────────
// The token lives in sessionStorage, NOT localStorage:
//  • localStorage persists forever and is readable by any script that ever
//    runs on the origin — the widest possible XSS window.
//  • sessionStorage is scoped to the tab and evaporates when it closes, so a
//    stolen laptop or a forgotten kiosk session doesn't stay logged in.
//  • The gold standard is an httpOnly+SameSite cookie (JS can't read it at
//    all), but that requires CSRF tokens and cookie-aware CORS on the server;
//    for a dashboard that only runs on the owner's machine against
//    localhost, sessionStorage is the right cost/benefit point.
// The token also expires server-side after 12h; any 401 wipes it and returns
// the user to the login screen.
const TOKEN_KEY = "lh-admin-jwt";

const S3 = "https://levhatahbiv.s3.eu-north-1.amazonaws.com/images/";
const imgUrl = (img: string) =>
  !img ? "" : img.startsWith("http") || img.startsWith("/") ? img : S3 + img;

// one-decimal price display (4.333 -> 4.3), same as the storefront
const ils = (n: number) => {
  const r = Math.round(Number(n) * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

type AdminProduct = {
  _id: string;
  name: string;
  price: number;
  salePercentage?: number;
  isAvailable?: boolean;
  isActive?: boolean;
  description?: string;
  category: string;
  sub_cat?: string;
  third_level?: string;
  img: string;
  createdAt?: string;
  updatedAt?: string;
};

// ─── promise-based dialog (replaces native prompt/confirm) ──────────────────
type DialogState = {
  title: string;
  message: string;
  mode: "confirm" | "prompt";
  defaultValue?: string;
  resolve: (value: any) => void;
} | null;

// ─── CSV helpers (import/export) ────────────────────────────────────────────

// minimal RFC-4180 parser: quoted fields, embedded commas/newlines, CRLF, BOM
const parseCsv = (text: string): string[][] => {
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
};

const csvEscape = (v: any) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const CSV_HEADERS = [
  "name", "price", "category", "sub_cat", "third_level", "description", "images", "salePercentage",
];

const CSV_TEMPLATE =
  CSV_HEADERS.join(",") +
  "\n" +
  [
    'צבע שמן ואן גוך 208 צהוב קדמיום,32.9,צבעים לאמנות,צבעי שמן,צבע שמן ואן גוך- 20מ"ל,גוון צהוב עשיר ועמיד,vangogh-208.jpg,0',
    "צבע שמן ואן גוך 311 אדום קרמין,32.9,,,,גוון אדום קלאסי,vangogh-311.jpg,0",
    "צבע שמן ואן גוך 504 כחול אולטרמרין,32.9,,,,כחול עמוק לשמיים וים,vangogh-504.jpg,10",
  ].join("\n");

// turns parsed CSV rows into import payload; empty category/sub/third
// inherit from the previous row (handy for product families), and image
// entries are matched against the batch-uploaded files by original name
const rowsToProducts = (rows: string[][], imageMap: Map<string, string>) => {
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

const downloadFile = (filename: string, text: string) => {
  // BOM so Excel opens Hebrew correctly
  const blob = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};

// ─── ribbon (marquee) defaults ──────────────────────────────────────────────
// The home marquee shows up to 8 lines. When the saved settings are empty we
// pre-fill the 8 inputs with these examples so the manager sees the format.
const DEFAULT_RIBBONS = [
  "משלוח חינם מעל ₪300",
  "ייעוץ אישי בחנות",
  "חדש: חימר פולימרי ב־24 צבעים",
  "מבצעי סוף עונה על צבעי שמן",
  "פותחים דלת מאז 1985",
  "כל מותגי הצבע במקום אחד",
  "סדנאות ואמנות לכל המשפחה",
  "איסוף מהיר מהחנות ברחובות",
];

// pads/truncates a saved ribbon list to exactly 8 input slots; empty saved
// list falls back to the example defaults
const toRibbonSlots = (saved: string[]): string[] => {
  const base = saved.filter((t) => t.trim() !== "").length ? saved : DEFAULT_RIBBONS;
  return Array.from({ length: 8 }, (_, i) => base[i] ?? "");
};

const emptyForm = {
  name: "",
  price: "",
  description: "",
  category: "",
  sub_cat: "",
  third_level: "",
  imgs: [] as string[], // stored in Mongo as one semicolon-separated string
};

export const AdminPage = () => {
  const [token, setToken] = useState<string | null>(
    () => sessionStorage.getItem(TOKEN_KEY) // restore session on refresh
  );
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(30);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [showAdd, setShowAdd] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [subscribers, setSubscribers] = useState<{ _id: string; email: string }[]>([]);
  const [showSubs, setShowSubs] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [view, setView] = useState<"products" | "orders" | "stats" | "home">("products");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogValue, setDialogValue] = useState("");
  // home-content tab
  const [ribbonSlots, setRibbonSlots] = useState<string[]>(() => toRibbonSlots([]));
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [featuredSearch, setFeaturedSearch] = useState("");
  const [saleIds, setSaleIds] = useState<string[]>([]);
  const [saleSearch, setSaleSearch] = useState("");
  // home-page category-mosaic photos: { slug: url }. Only slugs the manager
  // explicitly set live here; the storefront falls back to DEFAULT_SHELF_IMAGES.
  const [shelfImages, setShelfImages] = useState<Record<string, string>>({});
  const [coupons, setCoupons] = useState<Array<{ code: string; percent: number }>>([]);
  const [shelfUploading, setShelfUploading] = useState<string | null>(null);
  const [shelfSaved, setShelfSaved] = useState(false);
  const [homeLoaded, setHomeLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "sale" | "hidden" | "oos">("all");
  // price-range filter (₪): null upper bound = "up to the max" (auto-tracks data)
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [importCsv, setImportCsv] = useState<File | null>(null);
  const [importImages, setImportImages] = useState<File[]>([]);
  const [importBusy, setImportBusy] = useState("");
  const [importReport, setImportReport] = useState<any>(null);

  // ─── dashboard skin: "atelier" (original, artsy) | "clean" (readable, pro) ───
  const [adminTheme, setAdminTheme] = useState<"atelier" | "clean">(() =>
    localStorage.getItem("lh-admin-theme") === "clean" ? "clean" : "atelier"
  );
  useEffect(() => {
    localStorage.setItem("lh-admin-theme", adminTheme);
    // a body class lets the clean theme own the whole page background
    document.body.classList.toggle("lh-admin-clean", adminTheme === "clean");
    return () => document.body.classList.remove("lh-admin-clean");
  }, [adminTheme]);
  const rootClass = `page-main shell admin-page${adminTheme === "clean" ? " adm-clean" : ""}`;
  const ThemeSwitch = () => (
    <div className="adm-theme-switch" role="group" aria-label="עיצוב הדשבורד">
      <button
        type="button"
        className={adminTheme === "atelier" ? "on" : ""}
        onClick={() => setAdminTheme("atelier")}
        aria-pressed={adminTheme === "atelier"}
      >
        🎨 קלאסי
      </button>
      <button
        type="button"
        className={adminTheme === "clean" ? "on" : ""}
        onClick={() => setAdminTheme("clean")}
        aria-pressed={adminTheme === "clean"}
      >
        📋 נקי
      </button>
    </div>
  );

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setProducts([]);
  };

  // ─── promise-based UI dialogs (replace window.prompt / window.confirm) ───
  const uiConfirm = (title: string, message: string) =>
    new Promise<boolean>((resolve) => {
      setDialogValue("");
      setDialog({ title, message, mode: "confirm", resolve });
    });

  const uiPrompt = (title: string, message: string, defaultValue = "") =>
    new Promise<string | null>((resolve) => {
      setDialogValue(defaultValue);
      setDialog({ title, message, mode: "prompt", defaultValue, resolve });
    });

  const closeDialog = (result: any) => {
    if (dialog) dialog.resolve(result);
    setDialog(null);
  };

  // fetch wrapper: attaches the JWT, surfaces server errors in Hebrew,
  // and drops the session on 401 (expired/invalid token)
  const call = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        ...(init.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    });
    if (res.status === 401) {
      logout();
      throw new Error("ההתחברות פגה — נא להתחבר שוב");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `שגיאה (${res.status})`);
    return data;
  };

  const refresh = () =>
    Promise.all([call("/products"), call("/subscribers"), call("/orders")])
      .then(([p, s, o]) => {
        setProducts(p.products);
        setSubscribers(s.subscribers);
        setOrders(o.orders);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    if (token) refresh();
  }, [token]);

  const act = async (fn: () => Promise<any>, okMsg = "") => {
    setError("");
    setNotice("");
    try {
      await fn();
      if (okMsg) setNotice(okMsg);
    } catch (e: any) {
      setError(e.message);
    }
  };

  // ---- product actions ----

  const patchLocal = (p: AdminProduct) =>
    setProducts((prev) => prev.map((x) => (x._id === p._id ? { ...x, ...p } : x)));

  const toggleActive = (p: AdminProduct) =>
    act(async () => {
      const d = await call(`/products/${p._id}/active`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: p.isActive === false }),
      });
      patchLocal(d.product);
    });

  const toggleStock = (p: AdminProduct) =>
    act(async () => {
      const d = await call(`/products/${p._id}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: p.isAvailable === false }),
      });
      patchLocal(d.product);
    });

  const setSale = async (p: AdminProduct) => {
    const input = await uiPrompt(
      "הגדרת מבצע",
      `אחוז הנחה עבור "${p.name}" (0 לביטול המבצע):`,
      String(p.salePercentage || 0)
    );
    if (input === null) return;
    const pct = Number(input);
    if (!Number.isFinite(pct) || pct < 0 || pct > 95) {
      setError("אחוז הנחה חייב להיות מספר בין 0 ל־95");
      return;
    }
    act(async () => {
      const d = await call(`/products/${p._id}/sale`, {
        method: "PATCH",
        body: JSON.stringify({ salePercentage: pct }),
      });
      patchLocal(d.product);
    }, pct > 0 ? `המוצר במבצע ${pct}%` : "המבצע בוטל");
  };

  const remove = async (p: AdminProduct) => {
    const ok = await uiConfirm("מחיקת מוצר", `למחוק לצמיתות את "${p.name}"?\nאין דרך חזרה.`);
    if (!ok) return;
    act(async () => {
      await call(`/products/${p._id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((x) => x._id !== p._id));
    }, "המוצר נמחק");
  };

  const startEdit = (p: AdminProduct) => {
    setEditingId(p._id);
    setShowAdd(false);
    setForm({
      name: p.name,
      price: String(p.price),
      description: p.description || "",
      category: p.category,
      sub_cat: p.sub_cat || "",
      third_level: p.third_level || "",
      imgs: (p.img || "").split(";").map((s) => s.trim()).filter(Boolean),
    });
  };

  const submitForm = async (e: any) => {
    e.preventDefault();
    if (form.imgs.length === 0) {
      setError("צריך לפחות תמונה אחת למוצר");
      return;
    }
    // new category? warn — it won't show on the public site until the
    // developer adds it to the site's category list (colors, page, theme)
    const knownCats = new Set([
      ...categories.map((c) => c.name),
      ...products.map((p) => p.category),
    ]);
    if (form.category && !knownCats.has(form.category.trim())) {
      const ok = await uiConfirm(
        "קטגוריה חדשה",
        `"${form.category}" היא קטגוריה חדשה שלא קיימת באתר.\n\n` +
          `שימו לב: מוצרים בקטגוריה חדשה יישמרו במערכת אבל לא יופיעו באתר ` +
          `עד שהמתכנת יוסיף אותה לעיצוב האתר.\n\nלהמשיך בכל זאת?`
      );
      if (!ok) return;
    }
    const { imgs, ...rest } = form;
    const payload = { ...rest, img: imgs.join(";"), price: Number(form.price) };
    act(async () => {
      if (editingId) {
        const d = await call(`/products/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        patchLocal(d.product);
      } else {
        const d = await call(`/products`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setProducts((prev) => [d.product, ...prev]);
      }
      setEditingId(null);
      setShowAdd(false);
      setForm(emptyForm);
    }, editingId ? "המוצר עודכן" : "המוצר נוסף");
  };

  const uploadImage = (file: File) => {
    const body = new FormData();
    body.append("image", file);
    act(async () => {
      const d = await call(`/upload`, { method: "POST", body });
      setForm((f: any) => ({ ...f, imgs: [...f.imgs, d.img] }));
    }, "התמונה הועלתה ונוספה לגלריה");
  };

  // ---- bulk actions on the selection ----

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulk = (action: { type: string; value?: any }, okMsg: string) =>
    act(async () => {
      const d = await call(`/products/bulk`, {
        method: "POST",
        body: JSON.stringify({ ids: [...selected], action }),
      });
      setSelected(new Set());
      await refresh();
      return d;
    }, okMsg);

  const bulkSale = async () => {
    const n = selected.size;
    const input = await uiPrompt("מבצע לכולם", `אחוז הנחה עבור ${n} מוצרים (0 לביטול מבצע):`, "10");
    if (input === null) return;
    const pct = Number(input);
    if (!Number.isFinite(pct) || pct < 0 || pct > 95) {
      setError("אחוז הנחה חייב להיות מספר בין 0 ל־95");
      return;
    }
    bulk({ type: "sale", value: pct }, pct > 0 ? `מבצע ${pct}% הופעל על ${n} מוצרים` : `המבצע בוטל ל־${n} מוצרים`);
  };

  const bulkPrice = async () => {
    const n = selected.size;
    const input = await uiPrompt(
      "שינוי מחיר באחוזים",
      `שינוי מחיר באחוזים עבור ${n} מוצרים\n(למשל 10 = ייקור ב־10%, ‎-5 = הוזלה ב־5%):`,
      "10"
    );
    if (input === null) return;
    const pct = Number(input);
    if (!Number.isFinite(pct) || pct === 0 || pct < -90 || pct > 500) {
      setError("יש להזין אחוז שינוי בין -90 ל־500 (לא 0)");
      return;
    }
    bulk({ type: "price", value: pct }, `המחיר של ${n} מוצרים עודכן ב־${pct}%`);
  };

  const bulkSetPrice = async () => {
    const n = selected.size;
    const input = await uiPrompt(
      "מחיר אחיד",
      `כל המוצרים שנבחרו יקבלו את אותו מחיר (${n} מוצרים):`,
      ""
    );
    if (input === null) return;
    const price = Number(input);
    if (!Number.isFinite(price) || price <= 0) {
      setError("המחיר חייב להיות מספר גדול מ־0");
      return;
    }
    bulk({ type: "setPrice", value: price }, `${n} מוצרים תומחרו ל־₪${ils(price)}`);
  };

  const bulkDelete = async () => {
    const n = selected.size;
    const ok = await uiConfirm("מחיקה מרובה", `למחוק לצמיתות ${n} מוצרים?\nאין דרך חזרה!`);
    if (!ok) return;
    bulk({ type: "delete" }, `${n} מוצרים נמחקו`);
  };

  // ---- duplicate a product into the add form ----

  const duplicate = (p: AdminProduct) => {
    setEditingId(null);
    setShowAdd(true);
    setForm({
      name: `${p.name} (עותק)`,
      price: String(p.price),
      description: p.description || "",
      category: p.category,
      sub_cat: p.sub_cat || "",
      third_level: p.third_level || "",
      imgs: (p.img || "").split(";").map((s) => s.trim()).filter(Boolean),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---- CSV export (also doubles as a backup) ----

  const exportCsv = () => {
    const lines = [CSV_HEADERS.join(",")];
    for (const p of products) {
      lines.push(
        [
          csvEscape(p.name),
          p.price,
          csvEscape(p.category),
          csvEscape(p.sub_cat || ""),
          csvEscape(p.third_level || ""),
          csvEscape(p.description || ""),
          csvEscape(p.img || ""),
          p.salePercentage || 0,
        ].join(",")
      );
    }
    downloadFile(`lev-hatahbiv-products-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\n"));
    setNotice(`יוצאו ${products.length} מוצרים לקובץ CSV`);
  };

  // ---- CSV import: upload images in batches, map names, create products ----

  const runImport = async () => {
    if (!importCsv) {
      setError("בחרו קובץ CSV");
      return;
    }
    setError("");
    setNotice("");
    setImportReport(null);
    try {
      // 1. upload the images (if any) in chunks, build original-name -> stored-name map
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

  const publish = () => {
    setPublishing(true);
    act(async () => {
      const d = await call(`/publish`, { method: "POST" });
      setNotice(`האתר עודכן! ${d.summary ?? ""}`);
    }).finally(() => setPublishing(false));
  };

  // ---- derived list ----

  // newest-edited first; undated products keep their relative order after all
  // dated ones (stable sort + Infinity-less comparison)
  const sortedProducts = useMemo(() => {
    const t = (p: AdminProduct) => {
      const d = p.updatedAt || p.createdAt;
      return d ? new Date(d).getTime() : -1;
    };
    return [...products]
      .map((p, i) => [p, i] as const)
      .sort((a, b) => {
        const diff = t(b[0]) - t(a[0]);
        return diff !== 0 ? diff : a[1] - b[1];
      })
      .map(([p]) => p);
  }, [products]);

  // upper bound for the price slider — largest product price, rounded up to ₪10
  const maxPrice = useMemo(() => {
    const m = products.reduce((mx, p) => Math.max(mx, Number(p.price) || 0), 0);
    return Math.max(10, Math.ceil(m / 10) * 10);
  }, [products]);
  const priceHi = priceMax ?? maxPrice; // null = "no upper limit"
  const priceActive = priceMin > 0 || priceMax !== null;

  const filtered = useMemo(() => {
    const q = query.trim();
    let list = sortedProducts;
    if (statusFilter === "sale") list = list.filter((p) => (p.salePercentage || 0) > 0);
    if (statusFilter === "hidden") list = list.filter((p) => p.isActive === false);
    if (statusFilter === "oos") list = list.filter((p) => p.isAvailable === false);
    if (priceActive)
      list = list.filter((p) => {
        const price = Number(p.price) || 0;
        return price >= priceMin && price <= priceHi;
      });
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.includes(q) ||
        p.category.includes(q) ||
        (p.sub_cat || "").includes(q) ||
        (p.third_level || "").includes(q)
    );
  }, [sortedProducts, query, statusFilter, priceActive, priceMin, priceHi]);

  const shown = filtered.slice(0, limit);
  const hiddenCount = products.filter((p) => p.isActive === false).length;
  const oosCount = products.filter((p) => p.isAvailable === false).length;
  const saleCount = products.filter((p) => (p.salePercentage || 0) > 0).length;

  // autocomplete suggestions for the form, derived from real data
  const catOptions = useMemo(
    () => [...new Set([...categories.map((c) => c.name), ...products.map((p) => p.category)])].filter(Boolean),
    [products]
  );
  const subOptions = useMemo(
    () =>
      [...new Set(
        products
          .filter((p) => !form.category || p.category === form.category)
          .map((p) => p.sub_cat || "")
      )].filter(Boolean),
    [products, form.category]
  );
  const thirdOptions = useMemo(
    () =>
      [...new Set(
        products
          .filter(
            (p) =>
              (!form.category || p.category === form.category) &&
              (!form.sub_cat || p.sub_cat === form.sub_cat)
          )
          .map((p) => p.third_level || "")
      )].filter(Boolean),
    [products, form.category, form.sub_cat]
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p._id));

  // ─── which bulk actions can actually change something in the selection ───
  // A button is enabled only if at least one selected product would change.
  const selProducts = useMemo(
    () => products.filter((p) => selected.has(p._id)),
    [products, selected]
  );
  const anyHidden = selProducts.some((p) => p.isActive === false);
  const anyVisible = selProducts.some((p) => p.isActive !== false);
  const anyOos = selProducts.some((p) => p.isAvailable === false);
  const anyInStock = selProducts.some((p) => p.isAvailable !== false);

  // ─── cascading category fields (clear children when a parent changes) ───
  const setCategory = (v: string) =>
    setForm((f: any) =>
      f.category === v ? { ...f, category: v } : { ...f, category: v, sub_cat: "", third_level: "" }
    );
  const setSubCat = (v: string) =>
    setForm((f: any) =>
      f.sub_cat === v ? { ...f, sub_cat: v } : { ...f, sub_cat: v, third_level: "" }
    );

  // ─── stats tab (computed from already-loaded data) ───
  const stats = useMemo(() => {
    const live = orders.filter((o) => o.status !== "cancelled");
    const revenue = live.reduce((s, o) => s + Number(o.total || 0), 0);
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = live.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
    const recentRevenue = recent.reduce((s, o) => s + Number(o.total || 0), 0);
    // top sellers by total qty across non-cancelled orders
    const qtyByName = new Map<string, number>();
    for (const o of live)
      for (const i of o.items || [])
        qtyByName.set(i.name, (qtyByName.get(i.name) || 0) + Number(i.qty || 0));
    const top = [...qtyByName.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return {
      newOrders: orders.filter((o) => o.status === "new").length,
      totalOrders: orders.length,
      revenue,
      recentCount: recent.length,
      recentRevenue,
      subscribers: subscribers.length,
      onSale: saleCount,
      outOfStock: oosCount,
      hidden: hiddenCount,
      top,
    };
  }, [orders, subscribers, saleCount, oosCount, hiddenCount]);

  // ─── home-content tab: load settings on first open ───
  // A single load fills all three sections: ribbon inputs (padded/truncated to
  // 8 slots), featured ids, and sale ids.
  const loadHome = () =>
    act(async () => {
      const d = await call(`/settings`);
      setRibbonSlots(toRibbonSlots(d.settings.ribbonTexts || []));
      setFeaturedIds((d.settings.featuredIds || []).filter(Boolean));
      setSaleIds((d.settings.saleIds || []).filter(Boolean));
      setShelfImages(
        d.settings.shelfImages && typeof d.settings.shelfImages === "object"
          ? d.settings.shelfImages
          : {}
      );
      setCoupons(
        Array.isArray(d.settings.coupons)
          ? d.settings.coupons.filter((c: any) => c && c.code)
          : []
      );
      setHomeLoaded(true);
    });

  // each section save sends the CURRENT values of all three keys so that
  // saving one section never wipes the others. ribbonTexts is always the
  // non-empty trimmed inputs (the server rejects empty strings).
  const settingsPayload = () => ({
    ribbonTexts: ribbonSlots.map((s) => s.trim()).filter(Boolean).slice(0, 8),
    featuredIds,
    saleIds,
    shelfImages,
    coupons,
  });

  const setRibbonSlot = (i: number, v: string) =>
    setRibbonSlots((slots) => slots.map((s, j) => (j === i ? v : s)));

  const saveRibbons = () =>
    act(async () => {
      await call(`/settings`, {
        method: "PUT",
        body: JSON.stringify(settingsPayload()),
      });
    }, "הטקסטים נשמרו! יופיעו באתר אחרי פרסום");

  const addCoupon = () => setCoupons((cs) => [...cs, { code: "", percent: 10 }]);
  const updateCoupon = (i: number, field: "code" | "percent", v: string) =>
    setCoupons((cs) =>
      cs.map((c, j) =>
        j !== i
          ? c
          : field === "code"
            ? { ...c, code: v.toUpperCase() }
            : { ...c, percent: Math.min(Math.max(Math.round(Number(v) || 0), 1), 100) }
      )
    );
  const deleteCoupon = (i: number) =>
    setCoupons((cs) => cs.filter((_, j) => j !== i));
  const saveCoupons = () =>
    act(async () => {
      await call(`/settings`, {
        method: "PUT",
        body: JSON.stringify(settingsPayload()),
      });
    }, "הקופונים נשמרו! יופיעו באתר אחרי פרסום");

  const featuredMatches = useMemo(() => {
    const q = featuredSearch.trim();
    if (!q) return [];
    return products
      .filter((p) => p.name.includes(q) && !featuredIds.includes(p._id))
      .slice(0, 8);
  }, [featuredSearch, products, featuredIds]);

  const addFeatured = (id: string) =>
    setFeaturedIds((ids) =>
      ids.includes(id) || ids.length >= 12 ? ids : [...ids, id]
    );
  const removeFeatured = (id: string) =>
    setFeaturedIds((ids) => ids.filter((x) => x !== id));

  const saveFeatured = () =>
    act(async () => {
      await call(`/settings`, {
        method: "PUT",
        body: JSON.stringify(settingsPayload()),
      });
    }, "המוצרים הנבחרים נשמרו! יופיעו באתר אחרי פרסום");

  // ─── sale picker (feature #6): candidates are only on-sale products ───
  const saleMatches = useMemo(() => {
    const q = saleSearch.trim();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          (p.salePercentage || 0) > 0 &&
          p.name.includes(q) &&
          !saleIds.includes(p._id)
      )
      .slice(0, 8);
  }, [saleSearch, products, saleIds]);

  const addSale = (id: string) =>
    setSaleIds((ids) => (ids.includes(id) || ids.length >= 5 ? ids : [...ids, id]));
  const removeSale = (id: string) =>
    setSaleIds((ids) => ids.filter((x) => x !== id));

  const saveSales = () =>
    act(async () => {
      await call(`/settings`, {
        method: "PUT",
        body: JSON.stringify(settingsPayload()),
      });
    }, "המבצעים נשמרו! יופיעו באתר אחרי פרסום");

  // ─── shelf images (feature): per-category home-mosaic photos ───
  // set/clear a slug; an empty value removes the key so the storefront falls
  // back to its built-in default. Editing resets the "saved ✓" confirmation.
  const setShelfImage = (slug: string, url: string) => {
    setShelfSaved(false);
    setShelfImages((m) => {
      const next = { ...m };
      const v = url.trim();
      if (v) next[slug] = v;
      else delete next[slug];
      return next;
    });
  };
  const resetShelfImage = (slug: string) => setShelfImage(slug, "");

  // reuse the product image-upload endpoint (S3 / local) → store the URL
  const uploadShelfImage = (slug: string, file: File) => {
    const body = new FormData();
    body.append("image", file);
    setShelfUploading(slug);
    act(async () => {
      const d = await call(`/upload`, { method: "POST", body });
      setShelfImage(slug, d.img);
    }, "התמונה הועלתה — לחצו על שמירה כדי להחיל").finally(() =>
      setShelfUploading(null)
    );
  };

  const saveShelfImages = () =>
    act(async () => {
      await call(`/settings`, {
        method: "PUT",
        body: JSON.stringify(settingsPayload()),
      });
      setShelfSaved(true);
    }, "תמונות המדפים נשמרו! יופיעו באתר אחרי פרסום");

  const productById = useMemo(
    () => new Map(products.map((p) => [p._id, p])),
    [products]
  );

  // ─── seen markers for the header notification bell ───
  useEffect(() => {
    if (view === "orders")
      localStorage.setItem("lh-noti-seen-orders", new Date().toISOString());
  }, [view]);

  useEffect(() => {
    if (view === "home" && !homeLoaded) loadHome();
  }, [view]);

  useEffect(() => {
    if (showSubs) localStorage.setItem("lh-noti-seen-subs", String(subscribers.length));
  }, [showSubs, subscribers.length]);

  // ─── dialog overlay (rendered in both login & dashboard) ───
  const dialogOverlay = dialog && (
    <div className="ui-veil" onClick={() => closeDialog(dialog.mode === "confirm" ? false : null)}>
      <div
        className="ui-dialog"
        onClick={(e: any) => e.stopPropagation()}
        onKeyDown={(e: any) => {
          if (e.key === "Escape") closeDialog(dialog.mode === "confirm" ? false : null);
        }}
      >
        <h3 className="display">{dialog.title}</h3>
        <p className="ui-dialog-msg">{dialog.message}</p>
        {dialog.mode === "prompt" && (
          <input
            autoFocus
            dir="auto"
            value={dialogValue}
            onInput={(e: any) => setDialogValue(e.target.value)}
            onKeyDown={(e: any) => {
              if (e.key === "Enter") {
                e.preventDefault();
                closeDialog(dialogValue);
              }
            }}
          />
        )}
        <div className="ui-dialog-foot">
          <button
            className="btn small"
            onClick={() => closeDialog(dialog.mode === "confirm" ? true : dialogValue)}
          >
            אישור
          </button>
          <button
            className="btn small ghost"
            onClick={() => closeDialog(dialog.mode === "confirm" ? false : null)}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );

  // ─── login screen ───
  if (!token) {
    return (
      <main className={rootClass}>
        {dialogOverlay}
        <div className="admin-login-wrap">
        <div className="admin-head">
          <h1 className="display">כניסת מנהלים</h1>
          <ThemeSwitch />
        </div>
        <form
          className="admin-login"
          onSubmit={(e: any) => {
            e.preventDefault();
            if (loggingIn) return;
            const fd = new FormData(e.target);
            setLoggingIn(true);
            act(async () => {
              const res = await fetch(`${API}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  username: fd.get("username"),
                  password: fd.get("password"),
                }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data.error || "שם משתמש או סיסמה שגויים");
              // see "JWT storage strategy" comment at the top of this file
              sessionStorage.setItem(TOKEN_KEY, data.token);
              setToken(data.token);
            }).finally(() => setLoggingIn(false));
          }}
        >
          <input name="username" placeholder="שם משתמש" required disabled={loggingIn} />
          <input name="password" type="password" placeholder="סיסמה" required disabled={loggingIn} />
          <button className="btn" type="submit" disabled={loggingIn}>
            {loggingIn ? "מתחבר…" : "כניסה"}
          </button>
          {error && <p className="admin-error">{error}</p>}
          <p className="order-note">
            בכניסה הראשונה אחרי הפסקה, השרת מתעורר — ההתחברות עשויה לקחת עד דקה.
            המתינו ל״מתחבר…״ ואל תסגרו את החלון.
          </p>
        </form>
        </div>
      </main>
    );
  }

  // ─── dashboard ───
  return (
    <main className={rootClass}>
      {dialogOverlay}
      <div className="admin-head">
        <h1 className="display">ניהול החנות</h1>
        <div className="admin-head-actions">
          <ThemeSwitch />
          <button className="btn small wa-btn" onClick={publish} disabled={publishing}>
            {publishing ? "מפרסם..." : "📤 פרסום לאתר"}
          </button>
          <button className="btn small ghost" onClick={logout}>
            יציאה
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={view === "products" ? "active" : ""}
          onClick={() => setView("products")}
        >
          🎨 מוצרים ({products.length})
        </button>
        <button
          className={view === "orders" ? "active" : ""}
          onClick={() => setView("orders")}
        >
          🧾 הזמנות ({orders.filter((o) => o.status === "new").length} חדשות)
        </button>
        <button
          className={view === "stats" ? "active" : ""}
          onClick={() => setView("stats")}
        >
          📊 נתונים
        </button>
        <button
          className={view === "home" ? "active" : ""}
          onClick={() => setView("home")}
        >
          🏠 דף הבית
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {notice && <p className="admin-notice">{notice}</p>}

      {view === "stats" ? (
        <div className="stats-wrap">
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-num display">{stats.newOrders}</span>
              <span className="stat-label">הזמנות חדשות</span>
            </div>
            <div className="stat-card">
              <span className="stat-num display">{stats.totalOrders}</span>
              <span className="stat-label">סה״כ הזמנות</span>
            </div>
            <div className="stat-card">
              <span className="stat-num display">₪{ils(stats.revenue)}</span>
              <span className="stat-label">הכנסות סה״כ</span>
            </div>
            <div className="stat-card">
              <span className="stat-num display">{stats.recentCount}</span>
              <span className="stat-label">הזמנות ב-30 הימים האחרונים · ₪{ils(stats.recentRevenue)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-num display">{stats.subscribers}</span>
              <span className="stat-label">נרשמים לרשימת התפוצה</span>
            </div>
            <div className="stat-card">
              <span className="stat-num display">{stats.onSale}</span>
              <span className="stat-label">מוצרים במבצע</span>
            </div>
            <div className="stat-card">
              <span className="stat-num display">{stats.outOfStock}</span>
              <span className="stat-label">אזלו מהמלאי</span>
            </div>
            <div className="stat-card">
              <span className="stat-num display">{stats.hidden}</span>
              <span className="stat-label">מוסתרים</span>
            </div>
          </div>

          <div className="stats-top">
            <h3 className="display">הנמכרים ביותר</h3>
            {stats.top.length === 0 ? (
              <p className="empty-note">עוד אין הזמנות — כאן יופיעו המוצרים הנמכרים ביותר</p>
            ) : (
              <ol className="top-sellers">
                {stats.top.map(([name, qty]) => (
                  <li key={name}>
                    <span className="ts-name">{name}</span>
                    <span className="ts-qty">{qty} יח׳</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <a
            className="btn small ga-link"
            href="https://analytics.google.com"
            target="_blank"
            rel="noreferrer"
          >
            📈 Google Analytics — נתוני גלישה מלאים
          </a>
        </div>
      ) : view === "home" ? (
        <div className="home-content">
          <p className="home-publish-note">
            השינויים יופיעו באתר אחרי לחיצה על פרסום לאתר
          </p>

          {/* SECTION A — ribbon (marquee) texts: 8 numbered inputs */}
          <section className="home-block">
            <h3 className="display">הטקסטים בפס הנע</h3>
            <p className="import-help">
              הפס הנע בראש האתר מציג עד 8 טקסטים. מלאו את השורות שתרצו (השאר ריקות
              יידלגו). עד 80 תווים בשורה.
            </p>
            <div className="ribbon-inputs">
              {ribbonSlots.map((val, i) => (
                <label key={i} className="ribbon-input-row">
                  <span className="ribbon-num">{i + 1}</span>
                  <input
                    type="text"
                    className="ribbon-input"
                    maxLength={80}
                    placeholder={`טקסט ${i + 1}`}
                    value={val}
                    onInput={(e: any) => setRibbonSlot(i, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className="home-block-foot">
              <button className="btn" onClick={saveRibbons}>
                שמירת הטקסטים
              </button>
            </div>
          </section>

          {/* SECTION B — featured products picker */}
          <section className="home-block">
            <h3 className="display">מוצרים נבחרים לדף הבית</h3>
            <p className="import-help">
              עד 4 מוצרים — רשת רגילה; יותר מ-4 — קרוסלה נעה לאט.
            </p>
            <input
              type="search"
              className="featured-search"
              placeholder="חיפוש מוצר להוספה..."
              value={featuredSearch}
              onInput={(e: any) => setFeaturedSearch(e.target.value)}
            />
            {featuredMatches.length > 0 && (
              <div className="featured-results">
                {featuredMatches.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    className="featured-result"
                    onClick={() => {
                      addFeatured(p._id);
                      setFeaturedSearch("");
                    }}
                  >
                    <img src={imgUrl((p.img || "").split(";")[0])} alt="" loading="lazy" />
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="featured-chips">
              {featuredIds.length === 0 && (
                <p className="empty-note">עוד לא נבחרו מוצרים — חיפשו והוסיפו למעלה</p>
              )}
              {featuredIds.map((id) => {
                const p = productById.get(id);
                return (
                  <span key={id} className="featured-chip">
                    <img src={p ? imgUrl((p.img || "").split(";")[0]) : ""} alt="" />
                    <span className="fc-name">{p ? p.name : id}</span>
                    <button type="button" aria-label="הסרה" onClick={() => removeFeatured(id)}>
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
            <p className="import-help dim">נבחרו {featuredIds.length}/12 מוצרים</p>
            <div className="home-block-foot">
              <button className="btn" onClick={saveFeatured}>
                שמירת הנבחרים
              </button>
            </div>
          </section>

          {/* SECTION C — sale picker: candidates are only on-sale products */}
          <section className="home-block">
            <h3 className="display">מבצעים בדף הבית</h3>
            <p className="import-help">
              בחרו אילו מבצעים יופיעו בדף הבית. אם לא תבחרו — יוצגו מבצעים אוטומטית.
            </p>
            <input
              type="search"
              className="featured-search"
              placeholder="חיפוש מבצע להוספה..."
              value={saleSearch}
              onInput={(e: any) => setSaleSearch(e.target.value)}
            />
            {saleSearch.trim() && saleMatches.length === 0 && (
              <p className="import-help dim">לא נמצאו מוצרים במבצע בשם הזה</p>
            )}
            {saleMatches.length > 0 && (
              <div className="featured-results">
                {saleMatches.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    className="featured-result"
                    onClick={() => {
                      addSale(p._id);
                      setSaleSearch("");
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
              {saleIds.length === 0 && (
                <p className="empty-note">לא נבחרו מבצעים — יוצגו מבצעים אוטומטית</p>
              )}
              {saleIds.map((id) => {
                const p = productById.get(id);
                return (
                  <span key={id} className="featured-chip">
                    <img src={p ? imgUrl((p.img || "").split(";")[0]) : ""} alt="" />
                    <span className="fc-name">{p ? p.name : id}</span>
                    {p && (p.salePercentage || 0) > 0 && (
                      <b className="sale-tag">{p.salePercentage}%-</b>
                    )}
                    <button type="button" aria-label="הסרה" onClick={() => removeSale(id)}>
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
            <p className="import-help dim">נבחרו {saleIds.length}/5 מבצעים</p>
            <div className="home-block-foot">
              <button className="btn" onClick={saveSales}>
                שמירת המבצעים
              </button>
            </div>
          </section>

          {/* SECTION D — shelf images: per-category home-mosaic photos */}
          <section className="home-block">
            <h3 className="display">תמונות המדפים בעמוד הבית</h3>
            <p className="import-help">
              לכל קטגוריה יש תמונה גדולה במוזאיקת המדפים בדף הבית. אפשר להחליף
              אותה בהדבקת קישור (URL) או בהעלאת תמונה מהמחשב. קטגוריה שלא תוגדר —
              תציג את תמונת ברירת המחדל.
            </p>
            <div className="shelf-img-grid">
              {categories.map((cat) => {
                const url = shelfImages[cat.slug] || "";
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
                        onInput={(e: any) => setShelfImage(cat.slug, e.target.value)}
                      />
                      <div className="shelf-img-ctrls">
                        <label className="btn small ghost">
                          {shelfUploading === cat.slug ? "מעלה..." : "📷 העלאת תמונה"}
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            disabled={shelfUploading === cat.slug}
                            onChange={(e: any) =>
                              e.target.files?.[0] &&
                              uploadShelfImage(cat.slug, e.target.files[0])
                            }
                          />
                        </label>
                        <button
                          type="button"
                          className="btn small ghost"
                          disabled={!isCustom}
                          title={isCustom ? "" : "כבר בברירת המחדל"}
                          onClick={() => resetShelfImage(cat.slug)}
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
              <button className="btn" onClick={saveShelfImages}>
                שמירת התמונות
              </button>
              {shelfSaved && <span className="shelf-img-saved">נשמר ▾</span>}
            </div>
          </section>

          {/* SECTION E — coupons: discount codes applied at checkout */}
          <section className="home-block">
            <h3 className="display">קופונים</h3>
            <p className="import-help">
              הוסיפו קודי קופון ואת אחוז ההנחה של כל אחד. הקונה מקליד את הקוד
              בעמוד התשלום ומקבל את ההנחה. הקופונים מתעדכנים באתר אחרי פרסום.
            </p>
            <div className="coupon-admin-list">
              {coupons.length === 0 && (
                <p className="import-help dim">אין קופונים עדיין.</p>
              )}
              {coupons.map((c, i) => (
                <div className="coupon-admin-row" key={i}>
                  <input
                    type="text"
                    className="coupon-admin-code"
                    placeholder="קוד (לדוגמה SUMMER)"
                    value={c.code}
                    onInput={(e: any) => updateCoupon(i, "code", e.target.value)}
                  />
                  <div className="coupon-admin-pct">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={c.percent}
                      onInput={(e: any) => updateCoupon(i, "percent", e.target.value)}
                    />
                    <span>%</span>
                  </div>
                  <button
                    type="button"
                    className="btn small ghost"
                    onClick={() => deleteCoupon(i)}
                  >
                    🗑 מחיקה
                  </button>
                </div>
              ))}
            </div>
            <div className="home-block-foot">
              <button type="button" className="btn small ghost" onClick={addCoupon}>
                ➕ קופון חדש
              </button>
              <button className="btn" onClick={saveCoupons}>
                שמירת הקופונים
              </button>
            </div>
          </section>
        </div>
      ) : view === "orders" ? (
        <div className="orders-list">
          {orders.length === 0 && (
            <p className="empty-note">עוד אין הזמנות — הן יופיעו כאן ברגע שלקוח ישלח עגלה בוואטסאפ</p>
          )}
          {orders.map((o) => (
            <div key={o._id} className={`order-card ${o.status}`}>
              <div className="order-head">
                <b>
                  {new Date(o.createdAt).toLocaleDateString("he-IL")}{" "}
                  {new Date(o.createdAt).toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </b>
                <span className={`order-status ${o.status}`}>
                  {o.status === "new" ? "חדשה" : o.status === "handled" ? "טופלה" : "בוטלה"}
                </span>
                <span className="order-channel">
                  {o.channel === "card" ? "💳 שולם באשראי" : "💬 וואטסאפ"}
                </span>
                <span className="order-total">₪{ils(o.total)}</span>
              </div>
              <div className="order-items">
                {o.items.map((i: any, idx: number) => (
                  <span key={idx}>
                    {i.name} ×{i.qty}
                  </span>
                ))}
              </div>
              <div className="order-foot">
                <span className="meta">{o.delivery}</span>
                <span className="order-actions">
                  {o.status !== "handled" && (
                    <button
                      className="btn small"
                      onClick={() =>
                        act(async () => {
                          const d = await call(`/orders/${o._id}/status`, {
                            method: "PATCH",
                            body: JSON.stringify({ status: "handled" }),
                          });
                          setOrders((prev) => prev.map((x) => (x._id === o._id ? d.order : x)));
                        })
                      }
                    >
                      ✓ סימון טופלה
                    </button>
                  )}
                  {o.status !== "cancelled" && (
                    <button
                      className="btn small ghost"
                      onClick={() =>
                        act(async () => {
                          const d = await call(`/orders/${o._id}/status`, {
                            method: "PATCH",
                            body: JSON.stringify({ status: "cancelled" }),
                          });
                          setOrders((prev) => prev.map((x) => (x._id === o._id ? d.order : x)));
                        })
                      }
                    >
                      ביטול
                    </button>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
      <div className="admin-filters">
        {(
          [
            ["all", `הכל (${products.length})`],
            ["sale", `% במבצע (${saleCount})`],
            ["oos", `📦 אזלו (${oosCount})`],
            ["hidden", `🚫 מוסתרים (${hiddenCount})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className={`sub-chip ${statusFilter === key ? "active" : ""}`}
            onClick={() => {
              setStatusFilter(key);
              setLimit(30);
            }}
          >
            {label}
          </button>
        ))}
        <button className="subs-toggle" onClick={() => setShowSubs((v) => !v)}>
          💌 רשימת תפוצה ({subscribers.length})
        </button>
      </div>

      {/* price-range filter — drag the handles to hide products outside the range */}
      <div className="price-filter">
        <span className="pf-label">טווח מחיר</span>
        <div className="pf-slider">
          <div className="pf-track" />
          <div
            className="pf-range"
            style={{
              left: `${(priceMin / maxPrice) * 100}%`,
              width: `${((priceHi - priceMin) / maxPrice) * 100}%`,
            }}
          />
          <input
            type="range"
            min={0}
            max={maxPrice}
            step={1}
            value={priceMin}
            aria-label="מחיר מינימלי"
            onInput={(e: any) => {
              const v = Math.min(Number(e.target.value), priceHi);
              setPriceMin(v);
              setLimit(30);
            }}
          />
          <input
            type="range"
            min={0}
            max={maxPrice}
            step={1}
            value={priceHi}
            aria-label="מחיר מקסימלי"
            onInput={(e: any) => {
              const v = Math.max(Number(e.target.value), priceMin);
              setPriceMax(v >= maxPrice ? null : v);
              setLimit(30);
            }}
          />
        </div>
        <span className="pf-vals">
          ₪{priceMin} – {priceMax === null ? `₪${maxPrice}+` : `₪${priceMax}`}
        </span>
        <button
          className={`pf-clear ${priceActive ? "" : "is-hidden"}`}
          onClick={() => {
            setPriceMin(0);
            setPriceMax(null);
            setLimit(30);
          }}
          aria-hidden={!priceActive}
          tabIndex={priceActive ? 0 : -1}
        >
          נקה
        </button>
      </div>

      {showSubs && (
        <div className="subs-box">
          <div className="subs-head">
            <b>נרשמו לעדכונים ({subscribers.length})</b>
            <button
              className="btn small ghost"
              onClick={() => {
                navigator.clipboard.writeText(subscribers.map((s) => s.email).join(", "));
                setNotice("כל המיילים הועתקו — אפשר להדביק במייל");
              }}
              disabled={subscribers.length === 0}
            >
              📋 העתקת כל המיילים
            </button>
          </div>
          {subscribers.length === 0 ? (
            <p className="order-note">עוד אין נרשמים — הדיאלוג באתר כבר עובד על זה 😉</p>
          ) : (
            <div className="subs-list">
              {subscribers.map((s) => (
                <span key={s._id} className="subs-chip">
                  {s.email}
                  <button
                    aria-label={`הסרת ${s.email}`}
                    onClick={() =>
                      act(async () => {
                        await call(`/subscribers/${s._id}`, { method: "DELETE" });
                        setSubscribers((prev) => prev.filter((x) => x._id !== s._id));
                      })
                    }
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="admin-toolbar">
        <input
          type="search"
          placeholder="חיפוש לפי שם / קטגוריה / סדרה..."
          value={query}
          onInput={(e: any) => {
            setQuery(e.target.value);
            setLimit(30);
          }}
        />
        <button
          className="btn small"
          onClick={() => {
            setShowAdd((v) => !v);
            setEditingId(null);
            setForm(emptyForm);
          }}
        >
          {showAdd ? "סגירה" : "+ מוצר חדש"}
        </button>
        <button className="btn small ghost" onClick={() => setShowImport((v) => !v)}>
          📥 ייבוא CSV
        </button>
        <button className="btn small ghost" onClick={exportCsv}>
          📤 ייצוא CSV
        </button>
      </div>

      {showImport && (
        <div className="admin-form import-panel">
          <h3 className="display">ייבוא מוצרים מקובץ CSV</h3>
          <p className="import-help">
            מוסיפים הרבה מוצרים בבת אחת: בוחרים קובץ CSV + את כל התמונות, ולוחצים
            ייבוא. בעמודת <b>images</b> כותבים את שם קובץ התמונה (כפי שהוא במחשב),
            כתובת URL, או שם קובץ S3 — מפרידים כמה תמונות עם נקודה-פסיק.
            שורה שמשאירה קטגוריה/מדף/סדרה ריקים ממשיכה את השורה שמעליה — נוח
            למשפחת מוצרים שלמה.{" "}
            <button
              type="button"
              className="subs-toggle"
              onClick={() => downloadFile("lev-hatahbiv-template.csv", CSV_TEMPLATE)}
            >
              ⬇ הורדת קובץ לדוגמה
            </button>
          </p>
          <p className="import-help dim">
            טיפ: אפשר לבקש מ-Claude לסרוק אתר של מותג ולהחזיר קובץ בדיוק בפורמט
            הזה — עמודות: name, price, category, sub_cat, third_level,
            description, images, salePercentage.
          </p>
          <div className="import-inputs">
            <label className="btn small ghost">
              📄 {importCsv ? importCsv.name : "בחירת קובץ CSV"}
              <input
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e: any) => setImportCsv(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="btn small ghost">
              🖼 {importImages.length ? `${importImages.length} תמונות נבחרו` : "בחירת תמונות (אפשר הרבה)"}
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e: any) => setImportImages([...(e.target.files ?? [])])}
              />
            </label>
            <button
              className="btn small wa-btn"
              onClick={runImport}
              disabled={!importCsv || Boolean(importBusy)}
            >
              {importBusy || "🚀 ייבוא"}
            </button>
          </div>
          {importReport && (
            <div className="import-report">
              <b>
                נוספו {importReport.created} מתוך {importReport.total} שורות
              </b>
              {importReport.skipped?.length > 0 && (
                <ul>
                  {importReport.skipped.slice(0, 12).map((s: any, i: number) => (
                    <li key={i}>
                      {s.name} — {s.reason}
                    </li>
                  ))}
                  {importReport.skipped.length > 12 && (
                    <li>...ועוד {importReport.skipped.length - 12}</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {(showAdd || editingId) && (
        <form className="admin-form" onSubmit={submitForm}>
          <h3 className="display">{editingId ? "עריכת מוצר" : "מוצר חדש"}</h3>
          <div className="admin-form-grid">
            <input
              placeholder="שם המוצר *"
              required
              value={form.name}
              onInput={(e: any) => setForm({ ...form, name: e.target.value })}
            />
            <input
              placeholder="מחיר בש״ח *"
              required
              type="number"
              min="0.1"
              step="0.1"
              value={form.price}
              onInput={(e: any) => setForm({ ...form, price: e.target.value })}
            />
            <input
              placeholder="קטגוריה * — בחרו מהרשימה או הקלידו חדשה"
              required
              list="dl-categories"
              value={form.category}
              onInput={(e: any) => setCategory(e.target.value)}
            />
            <input
              placeholder={form.category.trim() ? "תת-קטגוריה (מדף)" : "קודם בוחרים קטגוריה"}
              list="dl-subs"
              disabled={!form.category.trim()}
              value={form.sub_cat}
              onInput={(e: any) => setSubCat(e.target.value)}
            />
            <input
              placeholder={form.sub_cat.trim() ? "סדרה / מותג" : "קודם בוחרים מדף"}
              list="dl-thirds"
              disabled={!form.sub_cat.trim()}
              value={form.third_level}
              onInput={(e: any) => setForm({ ...form, third_level: e.target.value })}
            />
            <datalist id="dl-categories">
              {catOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <datalist id="dl-subs">
              {subOptions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <datalist id="dl-thirds">
              {thirdOptions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <input
              placeholder="קישור לתמונה מהאינטרנט (URL) — ולוחצים Enter"
              value={form.imgInput ?? ""}
              onInput={(e: any) => setForm({ ...form, imgInput: e.target.value })}
              onKeyDown={(e: any) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const v = (form.imgInput || "").trim();
                  if (v) setForm({ ...form, imgs: [...form.imgs, v], imgInput: "" });
                }
              }}
            />
          </div>
          <p className="import-help">
            תמונות אפשר להוסיף בשלוש דרכים: הדבקת קישור (URL) + Enter · העלאת קובץ
            מהמחשב בכפתור למטה · הקלדת שם קובץ שכבר קיים במאגר התמונות (S3) של
            החנות. התמונה הראשונה ברשימה היא התמונה הראשית.
          </p>
          {form.imgs.length > 0 && (
            <div className="img-chips">
              {form.imgs.map((im: string, i: number) => (
                <span key={im + i} className="img-chip">
                  <img src={imgUrl(im)} alt="" />
                  {i === 0 && <b>ראשית</b>}
                  <button
                    type="button"
                    aria-label="הסרת תמונה"
                    onClick={() =>
                      setForm({ ...form, imgs: form.imgs.filter((_: string, j: number) => j !== i) })
                    }
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
          <textarea
            placeholder="תיאור המוצר"
            rows={3}
            value={form.description}
            onInput={(e: any) => setForm({ ...form, description: e.target.value })}
          />
          <div className="admin-form-foot">
            <label className="btn small ghost">
              📷 העלאת תמונה מהמחשב
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e: any) =>
                  e.target.files?.[0] && uploadImage(e.target.files[0])
                }
              />
            </label>
            <button className="btn small" type="submit">
              {editingId ? "שמירת שינויים" : "הוספת המוצר"}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn small ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                ביטול
              </button>
            )}
          </div>
        </form>
      )}

      <div className="select-all-row">
        <label>
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={() =>
              setSelected(
                allFilteredSelected ? new Set() : new Set(filtered.map((p) => p._id))
              )
            }
          />
          בחירת כל המסוננים ({filtered.length})
        </label>
        {selected.size > 0 && <b>{selected.size} מוצרים נבחרו</b>}
      </div>

      {selected.size > 0 && (
        <div className="bulk-bar">
          <span className="bulk-count">{selected.size} נבחרו:</span>
          <button className="btn small" onClick={bulkSale}>
            % מבצע לכולם
          </button>
          <button className="btn small" onClick={bulkPrice}>
            💰 שינוי מחיר ב-%
          </button>
          <button className="btn small" onClick={bulkSetPrice}>
            ₪ מחיר אחיד
          </button>
          <button
            className="btn small ghost"
            disabled={!anyHidden}
            title={anyHidden ? "" : "כל הנבחרים כבר מוצגים"}
            onClick={() => bulk({ type: "active", value: true }, `${selected.size} מוצרים הוצגו באתר`)}
          >
            👁 הצגה
          </button>
          <button
            className="btn small ghost"
            disabled={!anyVisible}
            title={anyVisible ? "" : "כל הנבחרים כבר מוסתרים"}
            onClick={() => bulk({ type: "active", value: false }, `${selected.size} מוצרים הוסתרו`)}
          >
            🚫 הסתרה
          </button>
          <button
            className="btn small ghost"
            disabled={!anyInStock}
            title={anyInStock ? "" : "כל הנבחרים כבר מסומנים כאזלו"}
            onClick={() => bulk({ type: "stock", value: false }, `${selected.size} מוצרים סומנו: אזל`)}
          >
            📦 אזל מהמלאי
          </button>
          <button
            className="btn small ghost"
            disabled={!anyOos}
            title={anyOos ? "" : "כל הנבחרים כבר במלאי"}
            onClick={() => bulk({ type: "stock", value: true }, `${selected.size} מוצרים חזרו למלאי`)}
          >
            ✅ חזרה למלאי
          </button>
          <button className="btn small bulk-danger" onClick={bulkDelete}>
            🗑 מחיקה
          </button>
          <button className="bulk-clear" onClick={() => setSelected(new Set())}>
            ביטול בחירה
          </button>
        </div>
      )}

      <div className="admin-list">
        {shown.map((p) => (
          <div
            key={p._id}
            className={`admin-row ${p.isActive === false ? "inactive" : ""} ${
              p.isAvailable === false ? "oos" : ""
            } ${selected.has(p._id) ? "row-selected" : ""}`}
          >
            <input
              type="checkbox"
              className="row-check"
              checked={selected.has(p._id)}
              onChange={() => toggleSelect(p._id)}
              aria-label={`בחירת ${p.name}`}
            />
            <img src={imgUrl((p.img || "").split(";")[0])} alt="" loading="lazy" />
            <div className="admin-row-mid">
              <span className="nm">{p.name}</span>
              <span className="meta">
                {p.category} › {p.sub_cat || "—"} · ₪{ils(p.price)}
                {(p.salePercentage || 0) > 0 && (
                  <b className="sale-tag"> מבצע {p.salePercentage}%-</b>
                )}
                {p.isAvailable === false && <b className="oos-tag"> אזל מהמלאי</b>}
                {p.isActive === false && <b className="hidden-tag"> מוסתר</b>}
                {(p.updatedAt || p.createdAt) && (
                  <span className="row-date">
                    {" · עודכן "}
                    {new Date(p.updatedAt || p.createdAt!).toLocaleDateString("he-IL")}
                  </span>
                )}
              </span>
            </div>
            <div className="admin-row-actions">
              <button
                data-tip={p.isActive === false ? "הצגה חזרה באתר" : "הסתרה מהאתר"}
                aria-label={p.isActive === false ? "הצגה חזרה באתר" : "הסתרה מהאתר"}
                onClick={() => toggleActive(p)}
              >
                {p.isActive === false ? "🚫" : "👁"}
              </button>
              <button
                data-tip={p.isAvailable === false ? "החזרה למלאי" : "סימון: אזל מהמלאי"}
                aria-label={p.isAvailable === false ? "החזרה למלאי" : "סימון: אזל מהמלאי"}
                onClick={() => toggleStock(p)}
              >
                📦
              </button>
              <button data-tip="עריכת פרטים" aria-label="עריכת פרטים" onClick={() => startEdit(p)}>
                ✏️
              </button>
              <button data-tip="שכפול מוצר" aria-label="שכפול מוצר" onClick={() => duplicate(p)}>
                📋
              </button>
              <button
                data-tip={
                  (p.salePercentage || 0) > 0 ? `מבצע ${p.salePercentage}% — שינוי/ביטול` : "הפעלת מבצע"
                }
                aria-label="הגדרת מבצע"
                onClick={() => setSale(p)}
              >
                %
              </button>
              <button
                data-tip="מחיקה לצמיתות"
                aria-label="מחיקה לצמיתות"
                className="danger"
                onClick={() => remove(p)}
              >
                🗑
              </button>
            </div>
          </div>
        ))}
        {filtered.length > shown.length && (
          <div className="load-more-row">
            <button className="btn small ghost" onClick={() => setLimit((l) => l + 60)}>
              להציג עוד ({filtered.length - shown.length} נוספים)
            </button>
          </div>
        )}
        {filtered.length === 0 && <p className="empty-note">לא נמצאו מוצרים</p>}
      </div>
        </>
      )}
    </main>
  );
};
