import { Header } from "../../global_components/Header/Header";
import CategoryContent from "../../global_components/Category/CategoryPage";
import { useLocation } from "react-router";
import CartSheet from "../../global_components/Header/Cart/CartSheet";
import { useState } from "preact/hooks";
import { Footer } from "../../global_components/Footer/Footer";

export const CategoryPage: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const cat = queryParams.get("cat");
  const sub_cat = queryParams.get("sub_cat");
  const [cartSheetVisible, setCartSheetVisible] = useState(false)

  return (
    <>
      <Header setShowCartSheet={setCartSheetVisible}/>
      <CartSheet show={cartSheetVisible} setShow={setCartSheetVisible}/>
      <div style={{ marginTop: "10rem" }}>
        <CategoryContent category={cat || ""} subCategory={sub_cat || ""} />
      </div>
      <Footer />
    </>
  );
};
