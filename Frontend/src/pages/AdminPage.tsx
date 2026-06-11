import { useEffect, useMemo, useState } from "react";
import { categories } from "../data/catalog";
import { API_BASE } from "../data/api";

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
};

const emptyForm = {
  name: "",
  price: "",
  description: "",
  category: categories[0].name,
  sub_cat: "",
  third_level: "",
  img: "",
};

export const AdminPage = () => {
  const [token, setToken] = useState<string | null>(
    () => sessionStorage.getItem(TOKEN_KEY) // restore session on refresh
  );
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(30);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [showAdd, setShowAdd] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [subscribers, setSubscribers] = useState<{ _id: string; email: string }[]>([]);
  const [showSubs, setShowSubs] = useState(false);

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setProducts([]);
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
    Promise.all([call("/products"), call("/subscribers")])
      .then(([p, s]) => {
        setProducts(p.products);
        setSubscribers(s.subscribers);
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

  const setSale = (p: AdminProduct) => {
    const input = prompt(
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

  const remove = (p: AdminProduct) => {
    if (!confirm(`למחוק לצמיתות את "${p.name}"? אין דרך חזרה.`)) return;
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
      img: p.img,
    });
  };

  const submitForm = (e: any) => {
    e.preventDefault();
    const payload = { ...form, price: Number(form.price) };
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
      setForm((f: any) => ({ ...f, img: d.img }));
    }, "התמונה הועלתה");
  };

  const publish = () => {
    setPublishing(true);
    act(async () => {
      const d = await call(`/publish`, { method: "POST" });
      setNotice(`האתר עודכן! ${d.summary ?? ""}`);
    }).finally(() => setPublishing(false));
  };

  // ---- derived list ----

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.includes(q) ||
        p.category.includes(q) ||
        (p.sub_cat || "").includes(q) ||
        (p.third_level || "").includes(q)
    );
  }, [products, query]);

  const shown = filtered.slice(0, limit);
  const hiddenCount = products.filter((p) => p.isActive === false).length;
  const oosCount = products.filter((p) => p.isAvailable === false).length;
  const saleCount = products.filter((p) => (p.salePercentage || 0) > 0).length;

  // ─── login screen ───
  if (!token) {
    return (
      <main className="page-main shell admin-page">
        <h1 className="display">כניסת מנהלים</h1>
        <form
          className="admin-login"
          onSubmit={(e: any) => {
            e.preventDefault();
            const fd = new FormData(e.target);
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
              if (!res.ok) throw new Error(data.error || "שגיאת התחברות");
              // see "JWT storage strategy" comment at the top of this file
              sessionStorage.setItem(TOKEN_KEY, data.token);
              setToken(data.token);
            });
          }}
        >
          <input name="username" placeholder="שם משתמש" required />
          <input name="password" type="password" placeholder="סיסמה" required />
          <button className="btn" type="submit">
            כניסה
          </button>
          {error && <p className="admin-error">{error}</p>}
          <p className="order-note">
            הדשבורד עובד רק במחשב של החנות (השרת המקומי חייב לרוץ).
          </p>
        </form>
      </main>
    );
  }

  // ─── dashboard ───
  return (
    <main className="page-main shell admin-page">
      <div className="admin-head">
        <h1 className="display">ניהול החנות</h1>
        <div className="admin-head-actions">
          <button className="btn small wa-btn" onClick={publish} disabled={publishing}>
            {publishing ? "מפרסם..." : "📤 פרסום לאתר"}
          </button>
          <button className="btn small ghost" onClick={logout}>
            יציאה
          </button>
        </div>
      </div>

      <p className="admin-stats">
        {products.length} מוצרים · {saleCount} במבצע · {oosCount} אזלו ·{" "}
        {hiddenCount} מוסתרים ·{" "}
        <button className="subs-toggle" onClick={() => setShowSubs((v) => !v)}>
          💌 רשימת תפוצה ({subscribers.length})
        </button>
      </p>

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

      {error && <p className="admin-error">{error}</p>}
      {notice && <p className="admin-notice">{notice}</p>}

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
      </div>

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
            <select
              value={form.category}
              onChange={(e: any) => setForm({ ...form, category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.slug} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              placeholder="תת-קטגוריה (מדף)"
              value={form.sub_cat}
              onInput={(e: any) => setForm({ ...form, sub_cat: e.target.value })}
            />
            <input
              placeholder="סדרה / מותג"
              value={form.third_level}
              onInput={(e: any) => setForm({ ...form, third_level: e.target.value })}
            />
            <input
              placeholder="תמונה: כתובת URL או שם קובץ ב-S3 *"
              required
              value={form.img}
              onInput={(e: any) => setForm({ ...form, img: e.target.value })}
            />
          </div>
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
            {form.img && (
              <img className="admin-form-preview" src={imgUrl(form.img)} alt="" />
            )}
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

      <div className="admin-list">
        {shown.map((p) => (
          <div
            key={p._id}
            className={`admin-row ${p.isActive === false ? "inactive" : ""} ${
              p.isAvailable === false ? "oos" : ""
            }`}
          >
            <img src={imgUrl(p.img)} alt="" loading="lazy" />
            <div className="admin-row-mid">
              <span className="nm">{p.name}</span>
              <span className="meta">
                {p.category} › {p.sub_cat || "—"} · ₪{p.price}
                {(p.salePercentage || 0) > 0 && (
                  <b className="sale-tag"> מבצע {p.salePercentage}%-</b>
                )}
                {p.isAvailable === false && <b className="oos-tag"> אזל מהמלאי</b>}
                {p.isActive === false && <b className="hidden-tag"> מוסתר</b>}
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
    </main>
  );
};
