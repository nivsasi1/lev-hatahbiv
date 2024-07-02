import {
  Dispatch,
  StateUpdater,
  useContext,
  useEffect,
  useState,
  useRef,
} from "preact/hooks";
import { Product } from "../../../Types/globalTypes";
import {
  AlertView,
  Arrow,
  ProductCounter,
} from "../../../pages/ProductPreviewPage/ProductPreview";
import { Link } from "react-router-dom";
import { CartContext } from "../../../context/cart-context";

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
    let timer: number | null = null;

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
      sheetRef.current.style.transform = "translateX(calc(-100% - 10em))";
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
        let targetClass = (e.target as HTMLElement).className
        if (targetClass.includes("alert-view") || targetClass.includes("product-add")) {
          //Ignores closing when either alert view is on screen or user added a product
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

    window.addEventListener("touchend", handleClickOut)
    window.addEventListener("mousedown", handleClickOut);

    return () => {
      window.removeEventListener("touchend", handleClickOut)
      window.removeEventListener("mousedown", handleClickOut);
    };
  });

  return (
    <>
      {showAlertView && <AlertView message="המוצר יוסר מעגלת הקנייה" onReject={() => { setShowAlertView(false) }} onFullFill={alertViewFullFill.current} product={undefined} />}
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
                option={info.optionSelected}
                setAmount={(amount) => {
                  cartContext.updateProduct(info.product, amount, info.optionSelected);
                }}
                shouldRemove={() => {
                  alertViewFullFill.current = () => {
                    cartContext.removeProductFromCart(info.product, info.optionSelected);
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

const domain = "https://levhatahbiv.s3.eu-north-1.amazonaws.com/";

export const ProductItem: React.FC<{
  product: Product;
  amount: number;
  option?: number;
  className?: string;
  titleLimit?: number;
  setAmount: (amount: number) => void;
  shouldRemove: () => void;
}> = ({ product, amount, setAmount, option, shouldRemove, className, titleLimit }) => {
  if (!product) {
    return <></>;
  }
  let actualTitle = product.name ?? "";
  let limit = titleLimit ?? 26
  if (actualTitle.length > limit) {
    actualTitle = actualTitle.slice(0, limit - 4) + "...";
  }
  return (
    <div class={"cart-sheet-product"}>
      <div class={"cart-sheet-product-content "+(className ?? "")}>
        <div class={"cart-sheet-product-image"}>
          <img
            src={domain+"images/" + product.img.split(";")[0]}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            onLoad={(e) => {
              e.currentTarget.style.display = "block"
            }}
          />
        </div>
        <div className={"cart-sheet-product-head"}>
          <div class="cart-sheet-product-title">
            <span>{actualTitle}</span>
            {product.variantsNew && option !== undefined && <VariantDisplay type={product.selectionType} variant={product.variantsNew[option] ? (product.variantsNew[option].title ?? "") : ""} />}
          </div>
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
      </div>
      <RemoveButton handler={shouldRemove} />
    </div>
  );
};

const VariantDisplay: React.FC<{ type: string, variant: string }> = ({ type, variant }) => {
  const title = type === "COLOR" ? variant.split(":")[1] : variant

  return <span class={type === "COLOR" ? "color" : ""} style={type === "COLOR" ? `--bg: ${variant.split(":")[0]};` : ""}>
    {
      title
    }
  </span>
}

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
