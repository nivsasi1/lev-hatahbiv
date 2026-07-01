import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { API, WAPI, TOKEN_KEY } from "./lib/constants";
import type { AdminProduct, DialogState, Subscriber, Setter, Order } from "./lib/types";

// Cross-cutting dashboard infrastructure in one place: auth + the two API
// wrappers, the error/notice banners, the promise-based dialog, and the core
// data (products / orders / subscribers) that several views share.
interface AdminCtx {
  token: string | null;
  setToken: (t: string | null) => void;
  logout: () => void;
  call: (path: string, init?: RequestInit) => Promise<any>;
  workerCall: (path: string, init?: RequestInit) => Promise<any>;
  act: (fn: () => Promise<any>, okMsg?: string) => Promise<void>;
  error: string;
  notice: string;
  setError: (s: string) => void;
  setNotice: (s: string) => void;
  uiConfirm: (title: string, message: string) => Promise<boolean>;
  uiPrompt: (title: string, message: string, defaultValue?: string) => Promise<string | null>;
  // dialog state is exposed so <DialogOverlay> can render INSIDE the themed
  // <main> (keeping the "clean" theme's CSS variables in scope).
  dialog: DialogState;
  dialogValue: string;
  setDialogValue: (s: string) => void;
  closeDialog: (result: any) => void;
  products: AdminProduct[];
  setProducts: Setter<AdminProduct[]>;
  orders: Order[];
  setOrders: Setter<Order[]>;
  subscribers: Subscriber[];
  setSubscribers: Setter<Subscriber[]>;
  refresh: () => Promise<void>;
}

const AdminContext = createContext<AdminCtx | null>(null);

export function useAdmin(): AdminCtx {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside <AdminProvider>");
  return ctx;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [dialogValue, setDialogValue] = useState("");

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setProducts([]);
  };

  // fetch wrapper for the Express API: attaches the JWT, surfaces server errors
  // in Hebrew, and drops the session on 401 (expired/invalid token).
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

  // same JWT, but against the Cloudflare Worker (coupons / subscribers /
  // welcome offer). A worker hiccup surfaces an error but never drops the
  // Express session. A no-Worker host returns index.html (200) — treat a
  // non-JSON body as a failure so callers fall back to defaults.
  const workerCall = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`${WAPI}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || data === null)
      throw new Error((data && data.error) || `שגיאה (${res.status})`);
    return data;
  };

  const refresh = () =>
    Promise.all([
      call("/products"),
      workerCall("/orders").catch(() => ({ orders: [] })), // orders live in D1 now
      workerCall("/subscribers").catch(() => ({ subscribers: [] })),
    ])
      .then(([p, o, s]) => {
        setProducts(p.products);
        setOrders(o.orders || []);
        setSubscribers(s.subscribers || []);
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    if (token) refresh();
  }, [token]);

  // error-handling wrapper: clears banners, runs fn, shows a notice on success.
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

  const value: AdminCtx = {
    token,
    setToken,
    logout,
    call,
    workerCall,
    act,
    error,
    notice,
    setError,
    setNotice,
    uiConfirm,
    uiPrompt,
    dialog,
    dialogValue,
    setDialogValue,
    closeDialog,
    products,
    setProducts,
    orders,
    setOrders,
    subscribers,
    setSubscribers,
    refresh,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
