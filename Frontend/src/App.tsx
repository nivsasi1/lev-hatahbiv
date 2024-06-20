import "./App.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MainPage } from "./pages/MainPage/MainPage";
import { ProductPreview } from "./pages/ProductPreviewPage/ProductPreview";
import { CartPage } from "./pages/CartPage/CartPage";
import { CartContextProvider } from "./context/cart-context";
import { CheckoutPage } from "./pages/CheckoutPage/CheckoutPage";
import { CategoryPage } from "./pages/CategoryPage/CategoryPage";
import { useEffect, useState } from "preact/hooks";
import { AdminSignIn } from "./pages/AdminSignInPage/AdminSignIn";
import { AddProductPage } from "./pages/AddProducts/AddProductPage";

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
    element: <CartPage />,
  },
  {
    path: "/checkout",
    element: <CheckoutPage />,
  },
  {
    path: "/adminsignin",
    element: <AdminSignIn />,
  },
  {
    path: "/add-product-by-admin",
    element: <AddProductPage />,
  },
]);

function App() {
  useEffect(() => {
    const didChangeScheme = (event: any) => {
      document.body.className = event.matches ? "dark-theme" : "";
      document.documentElement.className = event.matches ? "dark-theme" : "";
    };

    didChangeScheme(window.matchMedia("(prefers-color-scheme: dark)"));
    // setUpApplePay()

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", didChangeScheme);
    return () => {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .removeEventListener("change", didChangeScheme);
    };
  });
  return (
    <CartContextProvider>
      <RouterProvider router={router} />
      {/* <div id="lol" style="position: fixed; z-index: 99; background: red; top: 0; left: 0; padding: 1vw" onClick={setUpApplePay}>click</div> */}
    </CartContextProvider>
  );
}

const setUpApplePay = async () => {
  // const apple_merch_id = ""
  // if(window.ApplePaySession){
  //   if(!window.ApplePaySession.canMakePayments()){
  //     return;
  //   }
  //   if(window.ApplePaySession.canMakePaymentsWithActiveCard){
  //     console.log(`::${await window.ApplePaySession.canMakePaymentsWithActiveCard(apple_merch_id)}`)
  //   }

  let request = {
    countryCode: "IL",
    currencyCode: "ILS",
    supportedNetworks: ["visa"],
    merchantCapabilities: ["supports3DS"],
    total: { label: "Lev Hatahbiv", amount: "1.0" },
  };

  let session = new ApplePaySession(3, request);
  session.begin();
  session.addEventListener("onvalidatemerchant", () => {
    console.log("wow");
  });
  // let id = ""
  // let capabilites = window.ApplePaySession.applePayCapabilities(id)
  // }
};

export default App;
