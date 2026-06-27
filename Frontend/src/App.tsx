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
import { SalePage } from "./pages/SalePage";
import { AdminPage } from "./pages/adminpage";
import { AccessibilityPage } from "./pages/AccessibilityPage";
import { TermsPage } from "./pages/TermsPage";
import { ReturnsPage } from "./pages/ReturnsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { ContactPage } from "./pages/ContactPage";
import { ThankYouPage } from "./pages/ThankYouPage";
import DesignsIndex from "./pages/designs/DesignsIndex";
import DesignGallery from "./pages/designs/DesignGallery";
import DesignPop from "./pages/designs/DesignPop";
import DesignCraft from "./pages/designs/DesignCraft";
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
        { path: "/sale", element: <SalePage /> },
        { path: "/manage", element: <AdminPage /> },
        { path: "/accessibility", element: <AccessibilityPage /> },
        { path: "/terms", element: <TermsPage /> },
        { path: "/returns", element: <ReturnsPage /> },
        { path: "/privacy", element: <PrivacyPage /> },
        { path: "/contact", element: <ContactPage /> },
        { path: "/thank-you", element: <ThankYouPage /> },
        { path: "/designs", element: <DesignsIndex /> },
        { path: "/designs/a", element: <DesignGallery /> },
        { path: "/designs/b", element: <DesignPop /> },
        { path: "/designs/c", element: <DesignCraft /> },
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
