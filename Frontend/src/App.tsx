import "./App.css";
import { useEffect } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Link,
  useLocation,
} from "react-router-dom";
import { CartProvider } from "./context/cart-context";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { CartSheet } from "./components/CartSheet";
import { NewsletterDialog } from "./components/NewsletterDialog";
import { HomePage } from "./pages/HomePage";
import { CategoryPage, SubCategoryPage } from "./pages/CategoryPage";
import { ProductPage } from "./pages/ProductPage";
import { CartPage } from "./pages/CartPage";
import { AdminPage } from "./pages/AdminPage";
import { AccessibilityPage } from "./pages/AccessibilityPage";
import { DesignsIndex } from "./pages/DesignsIndex";
// Remaining cursor-effect previews for the owner to choose between (/designs).
import DesignCursorSparks from "./pages/Design-cursor-sparks";
import DesignCursorBrush from "./pages/Design-cursor-brush";
// Light-background + custom-cursor design variants.
import DesignAurora from "./pages/Design-bg1";
import DesignBlobs from "./pages/Design-bg2";
import DesignWatercolor from "./pages/Design-bg3";
import DesignGlass from "./pages/Design-bg4";
import DesignConstellation from "./pages/Design-bg5";
import { A11yWidget } from "./components/A11yWidget";
import { initAnalytics, trackPageView } from "./data/analytics";

initAnalytics(); // no-op unless VITE_GA_ID is configured

const Layout = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView(pathname);
  }, [pathname]);

  const isAdmin =
    typeof window !== "undefined" &&
    !!sessionStorage.getItem("lh-admin-jwt") &&
    !pathname.startsWith("/manage");

  return (
    <div className="page">
      <Header />
      <Outlet />
      <Footer />
      <CartSheet />
      <NewsletterDialog />
      <A11yWidget />
      {isAdmin && (
        <Link to="/manage" className="admin-return">
          🛠 לניהול
        </Link>
      )}
    </div>
  );
};

const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { path: "/", element: <HomePage /> },
        { path: "/category/:slug", element: <CategoryPage /> },
        { path: "/category/:slug/:sub", element: <SubCategoryPage /> },
        { path: "/product/:id", element: <ProductPage /> },
        { path: "/cart", element: <CartPage /> },
        { path: "/manage", element: <AdminPage /> },
        { path: "/accessibility", element: <AccessibilityPage /> },
        { path: "/designs", element: <DesignsIndex /> },
        { path: "/design15", element: <DesignCursorSparks /> },
        { path: "/design16", element: <DesignCursorBrush /> },
        { path: "/design17", element: <DesignAurora /> },
        { path: "/design18", element: <DesignBlobs /> },
        { path: "/design19", element: <DesignWatercolor /> },
        { path: "/design20", element: <DesignGlass /> },
        { path: "/design21", element: <DesignConstellation /> },
        { path: "*", element: <HomePage /> },
      ],
    },
  ],
  // matches Vite's base, so routing works under the GitHub Pages subfolder
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" }
);

const App = () => (
  <CartProvider>
    <RouterProvider router={router} />
  </CartProvider>
);

export default App;
