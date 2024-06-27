import { Dispatch, StateUpdater, useContext, useState } from "preact/hooks";
import storeLogo from "../../assets/logo_black.png";
import { Cart } from "./Cart/Cart";
import { SearchBar } from "./SearchBar/SearchBar";
import { SectionsMenu } from "./SectionMenu/SectionsMenu";
import { CartContext } from "../../context/cart-context";
import { Link } from "react-router-dom";
import { SearchView } from "../SearchView/SearchView";

export const Header: React.FC<{
  shouldShowCartIcon?: boolean;
  setShowCartSheet?: Dispatch<StateUpdater<boolean>>;
}> = ({ shouldShowCartIcon, setShowCartSheet }) => {
  const cartContext = useContext(CartContext);
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false)

  return (
    <>
      <div className={"nav"}>
        <div>
          <Link to={"/"}>
            <img
              id={"logo"}
              src={storeLogo}
              onLoad={(e) => (e.currentTarget.style.display = "block")}
              onError={(e) => (e.currentTarget.style.display = "none")}
              alt="storeLogo"
            />
          </Link>
          <SearchBar setSearchVisible={setSearchVisible} />
          <Link
            to={`/add-product-by-admin`}
            className={
              "product-edit " + (cartContext.canUserModify() ? "" : "disabled")
            }
            disabled={cartContext.canUserModify() ? false : true}
          >
            הוספת מוצרים
          </Link>
          {shouldShowCartIcon === false ? (
            <></>
          ) : (
            <Cart
              setShowCartSheet={setShowCartSheet}
              amount={
                cartContext.cartData?.reduce(
                  (sum, info) => sum + info.howMany,
                  0
                ) ?? 0
              }
            />
          )}
          <MenuToggleButton
            margin={shouldShowCartIcon === false ? "0 auto 0 0" : ""}
            opened={menuVisible}
            setOpened={setMenuVisible}
          />
        </div>
        <SectionsMenu visible={menuVisible} setVisible={setMenuVisible} />
      </div>
      <SearchView visible={searchVisible} setVisible={setSearchVisible}/>
    </>
  );
};

const MenuToggleButton: React.FC<{
  opened: boolean;
  margin?: string;
  setOpened: Dispatch<StateUpdater<boolean>>;
}> = ({ opened, setOpened, margin }) => {
  return (
    <div
      className="menu-toggle-button"
      style={{ margin: margin }}
      onClick={(e) => {
        setOpened((v) => !v);
        e.preventDefault();
      }}
    >
      <div
        style={opened ? "transform: translateY(6px) rotate(45deg)" : ""}
      ></div>
      <div style={opened ? "tranform: translateX(20px); opacity: 0" : ""}></div>
      <div
        style={opened ? "transform: translateY(-6px) rotate(-45deg)" : ""}
      ></div>
    </div>
  );
};
