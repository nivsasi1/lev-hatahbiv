import { useState } from "react";
import { Link } from "react-router-dom";
import { Product, getCategory, finalPrice, shekel } from "../data/catalog";
import { useCart } from "../context/cart-context";
import { ProductThumb } from "./ProductThumb";

const badgeClass = (badge: string) =>
  badge === "חדש" ? "new" : badge === "רב מכר" ? "hit" : "";

export const ProductCard = ({ product }: { product: Product }) => {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const cat = getCategory(product.category);

  // hidden products never render, even if one slips into the data
  if (product.isActive === false) return null;

  const salePct =
    product.salePrice && product.price > 0
      ? Math.round((1 - product.salePrice / product.price) * 100)
      : 0;

  const onAdd = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.soldOut) return;
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className={`p-card ${product.soldOut ? "soldout" : ""}`}
      style={{ "--pc": cat?.color, "--pc-soft": cat?.soft } as any}
    >
      {product.badge && salePct === 0 && (
        <span className={`p-badge ${badgeClass(product.badge)}`}>
          {product.badge}
        </span>
      )}
      <div className={`frame ${product.img ? "photo" : ""}`}>
        <ProductThumb product={product} />
        {/* sale sash — a ribbon draped over the top corner of the image */}
        {salePct > 0 && !product.soldOut && (
          <div className="sale-sash" aria-hidden="true">
            <span>מבצע {salePct}%-</span>
          </div>
        )}
        {product.soldOut && <div className="oos-strip">אזל מהמלאי</div>}
      </div>
      <div className="body">
        <span className="name">{product.name}</span>
        <div className="foot">
          <span className="price-tag">
            {shekel(finalPrice(product))}
            {product.salePrice && (
              <span className="was">{shekel(product.price)}</span>
            )}
          </span>
          <button
            className={`add-btn ${added ? "added" : ""}`}
            onClick={onAdd}
            disabled={product.soldOut}
            aria-label={
              product.soldOut ? "אזל מהמלאי" : `הוספת ${product.name} לעגלה`
            }
          >
            {product.soldOut ? "אזל" : added ? "✓ נוסף" : "+ לעגלה"}
          </button>
        </div>
      </div>
    </Link>
  );
};
