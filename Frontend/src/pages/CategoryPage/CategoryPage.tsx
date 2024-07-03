import { Header } from "../../global_components/Header/Header";
import CategoryContent from "../../global_components/Category/CategoryPage";
import { useLocation } from "react-router";
import CartSheet from "../../global_components/Header/Cart/CartSheet";
import { useEffect, useState } from "preact/hooks";
import { Footer } from "../../global_components/Footer/Footer";
import flowers from "../../assets/flowers2.png"
import heart from "../../assets/heart.png"

export const CategoryPage: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const cat = queryParams.get("cat");
  const sub_cat = queryParams.get("sub_cat");
  const [cartSheetVisible, setCartSheetVisible] = useState(false)

  useEffect(()=>{
    document.body.scrollTo({
      top: 0
    })
  },[])

  return (
    <>
      <Header setShowCartSheet={setCartSheetVisible}/>
      <CartSheet show={cartSheetVisible} setShow={setCartSheetVisible}/>
      <div class={"page-content"}>
        &nbsp;
        {/* <div class="page-head-banner">
          <div></div>
          <img src={flowers} alt="" />
          <div></div>
          <img src={heart} alt="" />
        </div> */}
        <CategoryContent category={cat || ""} subCategory={sub_cat || ""} />
      </div>
      <Footer />
    </>
  );
};
