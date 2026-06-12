import "./App.css";
import { useEffect } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
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
import { SaleOptionsPage } from "./pages/SaleOptionsPage";
import { A11yWidget } from "./components/A11yWidget";

const Layout = () => {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <div className="page">
      <Header />
      <Outlet />
      <Footer />
      <CartSheet />
      <NewsletterDialog />
      <A11yWidget />
    </div>
  );
};

const router = createBrowserRouter([
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
      { path: "/sale-options", element: <SaleOptionsPage /> },
      { path: "*", element: <HomePage /> },
    ],
  },
]);

const App = () => (
  <CartProvider>
    <RouterProvider router={router} />
  </CartProvider>
);

export default App;
