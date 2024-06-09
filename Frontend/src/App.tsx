import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MainPage } from "./pages/MainPage/MainPage";
import { ProductPreview } from "./pages/ProductPreviewPage/ProductPreview";
import { CartPage } from "./pages/CartPage/CartPage";
import { CartContextProvider } from "./context/cart-context";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainPage />,
  },
  {
    path: "/category",
    element: <MainPage />,
  },
  {
    path: "/product/:id",
    element: <ProductPreview />,
  },
  {
    path: "/cart",
    element: <CartPage />
  }
]);

function App() {
  return (
        <CartContextProvider>
        <RouterProvider router={router} />
        </CartContextProvider>
  );
}

export default App;
