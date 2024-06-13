import { Header } from "../../global_components/Header/Header";
import CartSheet from "../../global_components/Header/Cart/CartSheet";
import { useState } from "preact/hooks";
import { Footer } from "../../global_components/Footer/Footer";
import "./MainPage.css"
import { Link } from "react-router-dom";

export const MainPage: React.FC = () => {
  const [cartSheetVisible, setCartSheetVisible] = useState(false)

  return (
    <>
      <Header setShowCartSheet={setCartSheetVisible} />
      <CartSheet show={cartSheetVisible} setShow={setCartSheetVisible} />
      <div class={"page-content"} style={{ direction: "rtl" }}>
        <div className={"main-page"}>
          <div>לב התחביב</div>
          <div>מקום חביב לחובבי יצירה ואומנות...
            ולכולם בעצם!</div>
            <Bubble title="wow" link="/" linkTitle="wow is here"/>
        </div>
      </div>
      <Footer />
    </>
  );
};


const Bubble: React.FC<{ title: string, linkTitle: string, link: string }> = ({ title, linkTitle, link }) => {
  return <div className={"bubble"}>
    <div>
      <div>{title}</div>
        <Link to={link}>{linkTitle}</Link>
    </div>
  </div>
}
