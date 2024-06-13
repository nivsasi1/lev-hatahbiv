import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MainPage } from "./pages/MainPage/MainPage";
import { ProductPreview } from "./pages/ProductPreviewPage/ProductPreview";
import { CartPage } from "./pages/CartPage/CartPage";
import { CartContextProvider } from "./context/cart-context";
import { CheckoutPage } from "./pages/CheckoutPage/CheckoutPage";
import { CategoryPage } from "./pages/CategoryPage/CategoryPage";
import { useEffect, useState } from "preact/hooks";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainPage />,
  },
  {
    path: "/category",
    element: <CategoryPage />,
  },
  {
    path: "/product/:id",
    element: <ProductPreview />,
  },
  {
    path: "/cart",
    element: <CartPage />
  },
  {
    path: "/checkout",
    element: <CheckoutPage />
  }
]);

function App() {
  useEffect(() => {
    const didChangeScheme = (event: any) => {
      document.body.classList.toggle("dark-theme", event.matches)
    }

    didChangeScheme(window.matchMedia('(prefers-color-scheme: dark)'))

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', didChangeScheme)
    return () => {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', didChangeScheme)
    }
  })
  return (
    <CartContextProvider>
      <RouterProvider router={router} />
    </CartContextProvider>
  );
}

export default App;
