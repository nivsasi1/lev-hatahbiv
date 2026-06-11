import { Link } from "react-router-dom";
import { useCart } from "../context/cart-context";
import {
  finalPrice,
  shekel,
  FREE_SHIPPING_FROM,
} from "../data/catalog";
import { ProductThumb } from "./ProductThumb";

export const ShipMeter = ({ total }: { total: number }) => {
  const left = FREE_SHIPPING_FROM - total;
  const pct = Math.min(100, (total / FREE_SHIPPING_FROM) * 100);
  return (
    <div className="ship-meter">
      {left > 0 ? (
        <span>
          עוד {shekel(left)} למשלוח חינם! 🚚
        </span>
      ) : (
        <span>יש! הרווחתם משלוח חינם 🎉</span>
      )}
      <div className="bar">
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export const CartSheet = () => {
  const { items, total, isSheetOpen, closeSheet, setQty, remove } = useCart();

  return (
    <>
      <div
        className={`sheet-veil ${isSheetOpen ? "open" : ""}`}
        onClick={closeSheet}
      />
      <aside className={`cart-sheet ${isSheetOpen ? "open" : ""}`} aria-label="עגלת קניות">
        <div className="head">
          <span className="t display">העגלה שלי</span>
          <button className="x-btn" onClick={closeSheet} aria-label="סגירה">
            ✕
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <span className="big display">העגלה עדיין ריקה</span>
            <span>אבל יש המון השראה על המדפים...</span>
            <button className="btn small" onClick={closeSheet}>
              להמשיך לטייל בחנות
            </button>
          </div>
        ) : (
          <>
            <div className="cart-lines">
              {items.map(({ product, qty }) => (
                <div className="cart-line" key={product.id}>
                  <Link
                    to={`/product/${product.id}`}
                    className="thumb"
                    onClick={closeSheet}
                  >
                    <ProductThumb product={product} />
                  </Link>
                  <div className="mid">
                    <span className="nm">{product.name}</span>
                    <span className="pr">{shekel(finalPrice(product) * qty)}</span>
                  </div>
                  <div className="qty">
                    <button onClick={() => setQty(product.id, qty + 1)} aria-label="הוספה">
                      +
                    </button>
                    <span>{qty}</span>
                    <button onClick={() => setQty(product.id, qty - 1)} aria-label="הפחתה">
                      −
                    </button>
                  </div>
                  <button
                    className="rm"
                    onClick={() => remove(product.id)}
                    aria-label="הסרה מהעגלה"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="foot">
              <ShipMeter total={total} />
              <div className="sheet-total">
                <span>סה"כ</span>
                <span>{shekel(total)}</span>
              </div>
              <Link
                to="/cart"
                className="btn"
                style={{ width: "100%" }}
                onClick={closeSheet}
              >
                לסיכום ההזמנה ←
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
};
