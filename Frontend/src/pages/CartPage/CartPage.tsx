import { Link } from "react-router-dom";
import { Header } from "../../global_components/Header/Header";
import { AlertView, Arrow } from "../ProductPreviewPage/ProductPreview";
import { ProductItem } from "../../global_components/Header/Cart/CartSheet";
import { Dispatch, StateUpdater, useEffect, useState } from "preact/hooks";
import { useRef, useContext } from "react";
import "./CartPage.css";
import printer from "../../assets/printer.svg";
import { CartContext } from "../../context/cart-context";
import { Footer } from "../../global_components/Footer/Footer";

const DELIVERY_FEE_LIMIT = 200;

export const CartPage: React.FC = () => {
  const [deliveryType, setDeliveryType] = useState(0);
  const cartContext = useContext(CartContext);
  const [totalPrice, setTotalPrice] = useState(0);
  const [showAlertView, setShowAlertView] = useState(false)
  const alertViewFullFill = useRef<() => void | undefined>()

  console.log("context: " + cartContext.cartData?.toString());

  useEffect(() => {
    setTotalPrice(
      Math.floor(
        (cartContext.cartData?.reduce((sum, info) => {
          return sum + info.product.price * info.howMany;
        }, 0) ?? 0) * 10
      ) / 10
    );
  }, [cartContext.cartData]);

  return (
    <>
      {showAlertView && <AlertView message="המוצר יוסר מעגלת הקנייה" onReject={() => { setShowAlertView(false) }} onFullFill={alertViewFullFill.current} product={undefined} />}
      <Header shouldShowCartIcon={false} />
      <div className={"page-content"}>
        <Link
          to={""}
          className={"return-button"}
          onClick={() => {
            window.history.back();
          }}>
          <span>חזור</span>
          <Arrow />
        </Link>
        <div className={"page-title"}>סל הקניות שלי</div>
        <div className={"cart-content"}>
          <div className={"cart-content-title"}>
            <div>
              מוצרים&nbsp;({cartContext.cartData?.length ?? 0}) , סה״כ
              פריטים&nbsp;
              {cartContext.cartData
                ? cartContext.cartData?.reduce((previous, product) => {
                    return previous + product.howMany;
                  }, 0)
                : 0}
              :
            </div>
            <div
              className={"cart-print no-select"}
              onClick={() => {
                window.print();
              }}>
              <span>הדפס הזמנה</span>
              <img
                src={printer}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          </div>
          <div className={"cart-sections"}>
            <div className={"cart-products "}>
              <div className={"scrollbar"}>
                {cartContext.cartData &&
                  cartContext.cartData.map((info, index) => {
                    return (
                      <ProductItem
                        product={info.product}
                        amount={info.howMany}
                        setAmount={(amount) => {
                          cartContext.updateProduct(info.product, amount);
                        }}
                        shouldRemove={() => {
                            alertViewFullFill.current = ()=>{
                                cartContext.removeProductFromCart(info.product);
                                setShowAlertView(false)
                            }
                            setShowAlertView(true)
                        }}
                      />
                    );
                  })}
              </div>
            </div>
            <div className={"cart-purchase-preview"}>
              <div>
                <div style={"font-size: 1.05em"}>סיכום הזמנה</div>
                <div>שיטת איסוף / שילוח</div>
                <DeliveryTypeSelect
                  selected={deliveryType}
                  didSelect={setDeliveryType}
                  cartTotalPrice={totalPrice}
                />
                <div className={"cart-purchase-summary"}>
                  <div>
                    <span>סכום ביניים</span>
                    <span>{totalPrice}₪</span>
                  </div>
                  <div className={"divider"}></div>
                  <div>
                    <span>{DELIVERY_TYPES[deliveryType].title}</span>
                    <span>
                      {totalPrice >= DELIVERY_FEE_LIMIT
                        ? 0
                        : DELIVERY_TYPES[deliveryType].price}
                      ₪
                    </span>
                  </div>
                </div>
              </div>
              <div className={"cart-final-price"}>
                <span>סך הכל לתשלום</span>
                <span>
                  {totalPrice >= DELIVERY_FEE_LIMIT
                    ? totalPrice
                    : totalPrice + DELIVERY_TYPES[deliveryType].price}
                  ₪
                </span>
              </div>
              <Link to={""} className={"cart-proceed-pay no-select"}>
                לתשלום
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

const DELIVERY_TYPES = [
  {
    title: "משלוח עד הבית",
    price: 35.0,
    note: "(5 - 1) " + "ימי עבודה",
  },
  {
    title: "דואר רשום",
    price: 35,
    note: "דואר ישראל " + "(14 - 7) " + "ימי עסקים",
  },
  {
    title: "איסוף עצמי",
    price: 0.0,
  },
];

const DeliveryTypeSelect: React.FC<{
  selected: number;
  didSelect: Dispatch<StateUpdater<number>>;
  cartTotalPrice: number;
}> = ({ selected, didSelect, cartTotalPrice }) => {
  const [isOpened, setIsOpened] = useState(false);
  const [isFeeFree, setIsFeeFree] = useState(
    cartTotalPrice >= DELIVERY_FEE_LIMIT
  );
  const container = useRef<HTMLDivElement | null>(null);

  //TODO: remove delivery fee when price exceeds limit
  useEffect(() => {
    setIsFeeFree(cartTotalPrice >= DELIVERY_FEE_LIMIT);
  }, [cartTotalPrice]);

  useEffect(() => {
    const handleClickOutside: (e: MouseEvent) => void = (e) => {
      if (container.current && !container.current.contains(e.target as Node)) {
        setIsOpened(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  });
  return (
    <div
      className={
        "delivery-select no-select" +
        (isOpened ? " opened " : "") +
        (isFeeFree ? " delivery-no-fee" : " delivery-fee")
      }
      ref={container}
      onClick={() => {
        setIsOpened((current) => !current);
      }}
    >
      <div>
        <span>{DELIVERY_TYPES[selected].title}</span>
        <span>{isFeeFree ? 0 : DELIVERY_TYPES[selected].price}₪</span>
        <Arrow rotate={isOpened ? 90 : -90} />
      </div>
      <div className={"delivery-select-options" + (isOpened ? " opened" : "")}>
        {DELIVERY_TYPES.map((type, index) => {
          return (
            <div
              className={
                "delivery-type" + (index === selected ? " selected" : "")
              }
              onClick={() => {
                didSelect(index);
              }}
            >
              <span>{type.title}</span>
              <span>{isFeeFree ? 0 : type.price}₪</span>
              {type.note && <span>{type.note}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
