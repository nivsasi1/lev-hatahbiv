import { Header } from "../../global_components/Header/Header";
import CategoryPage from "../../global_components/Category/CategoryPage";
import { ProductPreview } from "../ProductPreviewPage/ProductPreview";
import { useLocation } from "react-router";
import CartSheet from "../../global_components/Header/Cart/CartSheet";


export const MainPage: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const cat = queryParams.get("cat");
  const sub_cat = queryParams.get("sub_cat");

  return (
    <>
      <Header />
      <CartSheet />
      <div style={{ marginTop: "10rem" }}>
        <CategoryPage category={cat || ""} subCategory={sub_cat || ""} />
      </div>
    </>
  );
};
