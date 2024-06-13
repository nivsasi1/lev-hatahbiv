import { Dispatch, StateUpdater, useContext } from "preact/hooks";
import storeLogo from "../../assets/logo_black.png";
import { Cart } from "./Cart/Cart";
import { SearchBar } from "./SearchBar/SearchBar";
import { SectionsMenu } from "./SectionMenu/SectionsMenu";
import { CartContext } from "../../context/cart-context";
import { Link } from "react-router-dom";

export const Header: React.FC<{
  shouldShowCartIcon?: boolean;
  setShowCartSheet?: Dispatch<StateUpdater<boolean>>;
}> = ({ shouldShowCartIcon, setShowCartSheet }) => {
  const cartContext = useContext(CartContext);

  return (
    <>
      <div className={"nav"}>
        <div>
          <Link to={"/"}>
            <img id={"logo"} src={storeLogo} onLoad={(e)=> e.currentTarget.style.display = "block"} onError={(e)=> e.currentTarget.style.display = "none"} alt="storeLogo" />
          </Link>
          <SearchBar />
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
        </div>
        <SectionsMenu />
      </div>
    </>
  );
};
