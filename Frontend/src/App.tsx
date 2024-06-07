import "./App.css";
// import { ThemeProvider } from "@mui/material";
// import { LoginForm } from "./pages/Login/LoginForm.tsx";
// import { theme } from "./themes/themePalatte.ts";
// import { MainPage } from "./pages/MainPage/MainPage.tsx";
// import { AddTank } from "./pages/AddTank/AddTank.tsx";
// import { Page } from "./components/Page.tsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { MainPage } from "./pages/MainPage/MainPage";
import { ProductPreview } from "./pages/ProductPreviewPage/ProductPreview";
// import { ErrorPage } from "./pages/Error/ErrorPage.tsx";
// import { TankContextProvider } from "./store/tank-info-context.tsx";

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
]);

function App() {
  return (
    // <ThemeProvider theme={theme}>
      // <TankContextProvider>
        <RouterProvider router={router} />
      // </TankContextProvider> 
    // </ThemeProvider>
  );
}

export default App;
