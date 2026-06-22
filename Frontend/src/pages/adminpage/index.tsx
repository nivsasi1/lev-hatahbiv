import { useEffect, useState } from "react";
import { AdminProvider, useAdmin } from "./context";
import { useTheme } from "./hooks/useTheme";
import { useProducts } from "./hooks/useProducts";
import { useProductForm } from "./hooks/useProductForm";
import { useCsvImport } from "./hooks/useCsvImport";
import { useHomeSettings } from "./hooks/useHomeSettings";
import { useCoupons } from "./hooks/useCoupons";
import { LoginScreen } from "./components/LoginScreen";
import { DashboardHeader } from "./components/DashboardHeader";
import { TabNav, type View } from "./components/TabNav";
import { StatsView } from "./components/StatsView";
import { OrdersView } from "./components/OrdersView";
import { HomeView } from "./components/home/HomeView";
import { ProductsView } from "./components/products/ProductsView";
import { DialogOverlay } from "./components/DialogOverlay";
import "../admin-tools.css";
import "../admin-clean.css";

// ─── Manager dashboard (/manage) ────────────────────────────────────────────
// Products / orders / publish talk to the Express backend; coupons / subscribers
// / the welcome offer go to the Cloudflare Worker (D1). The shared infra (auth,
// the two API wrappers, banners, dialogs, core data) lives in AdminContext;
// each tab's logic lives in its own hook, each section in its own component.
export const AdminPage = () => (
  <AdminProvider>
    <AdminShell />
  </AdminProvider>
);

function AdminShell() {
  const { token } = useAdmin();
  const theme = useTheme();

  if (!token)
    return (
      <LoginScreen
        rootClass={theme.rootClass}
        adminTheme={theme.adminTheme}
        setAdminTheme={theme.setAdminTheme}
      />
    );
  return <Dashboard rootClass={theme.rootClass} adminTheme={theme.adminTheme} setAdminTheme={theme.setAdminTheme} />;
}

function Dashboard({
  rootClass,
  adminTheme,
  setAdminTheme,
}: {
  rootClass: string;
  adminTheme: "atelier" | "clean";
  setAdminTheme: (t: "atelier" | "clean") => void;
}) {
  const { error, notice, products, orders, subscribers } = useAdmin();
  // tab-scoped logic; called here (always mounted while logged in) so filter /
  // selection / unsaved edits survive switching tabs, like the original.
  const productsApi = useProducts();
  const form = useProductForm();
  const csv = useCsvImport();
  const home = useHomeSettings();
  const coupons = useCoupons();
  const [view, setView] = useState<View>("products");
  // newsletter-list toggle lives here (not in the products view) so it stays
  // open across tab switches, like the original.
  const [showSubs, setShowSubs] = useState(false);

  // seen marker for the header bell + lazy-load the home tab's data once
  useEffect(() => {
    if (view === "orders") localStorage.setItem("lh-noti-seen-orders", new Date().toISOString());
    if (view === "home" && !home.loaded) {
      home.load();
      coupons.load();
    }
  }, [view]);

  useEffect(() => {
    if (showSubs) localStorage.setItem("lh-noti-seen-subs", String(subscribers.length));
  }, [showSubs, subscribers.length]);

  return (
    <main className={rootClass}>
      <DialogOverlay />
      <DashboardHeader adminTheme={adminTheme} setAdminTheme={setAdminTheme} />
      <TabNav
        view={view}
        setView={setView}
        productCount={products.length}
        newOrders={orders.filter((o) => o.status === "new").length}
      />

      {error && <p className="admin-error">{error}</p>}
      {notice && <p className="admin-notice">{notice}</p>}

      {view === "stats" ? (
        <StatsView />
      ) : view === "home" ? (
        <HomeView home={home} coupons={coupons} />
      ) : view === "orders" ? (
        <OrdersView />
      ) : (
        <ProductsView
          products={productsApi}
          form={form}
          csv={csv}
          showSubs={showSubs}
          setShowSubs={setShowSubs}
        />
      )}
    </main>
  );
}
