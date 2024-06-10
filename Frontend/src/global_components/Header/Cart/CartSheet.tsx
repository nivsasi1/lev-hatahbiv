import {
  Dispatch,
  StateUpdater,
  useContext,
  useEffect,
  useState,
} from "preact/hooks";
import { Product } from "../../../Types/globalTypes";
import {
  AlertView,
  Arrow,
  ProductCounter,
} from "../../../pages/ProductPreviewPage/ProductPreview";
import { Link } from "react-router-dom";
import { CartContext } from "../../../context/cart-context";
import { useRef } from "React";

const CartSheet: React.FC<{
  show: boolean;
  setShow: Dispatch<StateUpdater<boolean>>;
}> = ({ show, setShow }) => {
  const [totalPrice, setTotalPrice] = useState(0);
  const cartContext = useContext(CartContext);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [showAlertView, setShowAlertView] = useState(false)
  const alertViewFullFill = useRef<() => void | undefined>()

  useEffect(() => {
    setTotalPrice(
      Math.floor(
        (cartContext.cartData?.reduce((sum, info) => {
          return sum + info.product.price * info.howMany;
        }, 0) ?? 0) * 10
      ) / 10
    );
  }, [cartContext.cartData]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (show === true) {
      if (sheetRef.current) {
        sheetRef.current.style.display = "flex";
        timer = setTimeout(() => {
          if (sheetRef.current) {
            sheetRef.current.style.transform = "translateX(0)";
          }
        }, 0);
      }
    } else if (sheetRef.current) {
      sheetRef.current.style.transform = "translateX(-25em)";
      timer = setTimeout(() => {
        if (sheetRef.current) {
          sheetRef.current.style.display = "none";
        }
      }, 1000);
    }

    return () => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [show]);

  useEffect(() => {
    const handleClickOut: (e: Event) => void = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        let alertView = document.querySelector(".alert-view")
        console.log(alertView)
        console.log("target: " + e.target)
        if (e.target.className.includes("alert-view")) {
        }
        else if (alertView) {
          if (!alertView.contains(e.target as Node)) {
            setShow(false)
          }
        } else {
          setShow(false);
        }
      }
    };

    window.addEventListener("mousedown", handleClickOut);

    return () => {
      window.removeEventListener("mousedown", handleClickOut);
    };
  });

  return (
    <>
      {showAlertView && <AlertView message="המוצר יוסר מעגלת הקנייה" onReject={() => { setShowAlertView(false) }} onFullFill={alertViewFullFill.current} />}
      <div className={"cart-sheet" + (show ? " visible" : "")} ref={sheetRef}>
        <div
          className={"cart-sheet-close"}
          onClick={() => {
            setShow((previous) => !previous);
          }}
        >
          <Arrow />
        </div>
        <div className={"cart-sheet-title"}>
          מוצרים&nbsp;({cartContext.cartData?.length ?? 0}), סה״כ פריטים&nbsp;
          {cartContext.cartData?.reduce((sum, info) => sum + info.howMany, 0)}:
        </div>
        <div className={"cart-sheet-products scrollbar"}>
          {cartContext.cartData?.map((info) => {
            return (
              <ProductItem
                product={info.product}
                amount={info.howMany}
                setAmount={(amount) => {
                  cartContext.updateProduct(info.product, amount);
                }}
                shouldRemove={() => {
                  alertViewFullFill.current = () => {
                    cartContext.removeProductFromCart(info.product);
                    setShowAlertView(false)
                  }
                  setShowAlertView(true)
                }}
              />
            );
          })}
        </div>
        <div className={"cart-sheet-amount"}>
          <div>סכום ביניים</div>
          <div>{totalPrice}₪</div>
        </div>
        <Link to={"/cart"} className={"cart-sheet-link"}>
          לצפייה בסל
        </Link>
      </div>
    </>
  );
};

export default CartSheet;

export const ProductItem: React.FC<{
  product: Product;
  amount: number;
  setAmount: (amount: number) => void;
  shouldRemove: () => void;
}> = ({ product, amount, setAmount, shouldRemove }) => {
  if (!product) {
    return <></>;
  }

  return (
    <div class={"cart-sheet-product"}>
      <div className={"cart-sheet-product-head"}>
        <div>{product.name}</div>
        <div className={"cart-sheet-product-counter"}>
          <ProductCounter
            productsAmount={amount}
            setProductsAmount={(calc) => {
              setAmount(calc(amount));
            }}
            shouldRemove={() => shouldRemove()}
          />
          <div style="direction: ltr">
            {amount} x {product.price}₪ ={" "}
            {Math.floor(product.price * amount * 10) / 10}₪
          </div>
        </div>
      </div>
      <div>
        <img
          src=""
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>
      <RemoveButton handler={shouldRemove} />
    </div>
  );
};

const RemoveButton: React.FC<{ handler?: () => void }> = ({ handler }) => {
  return (
    <div
      className={"cart-sheet-remove-item"}
      onClick={() => {
        if (handler) {
          handler();
        }
      }}
    >
      <svg viewBox={"0 0 100 100"}>
        <path
          d="M20,20 L80,80 M80,20 L20,80"
          stroke="#000"
          stroke-width={"10"}
          stroke-linecap={"round"}
          fill="none"
        ></path>
      </svg>
    </div>
  );
};
