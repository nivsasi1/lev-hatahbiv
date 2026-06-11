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

  const onAdd = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="p-card"
      style={{ "--pc": cat?.color, "--pc-soft": cat?.soft } as any}
    >
      {product.badge && (
        <span className={`p-badge ${badgeClass(product.badge)}`}>
          {product.badge}
        </span>
      )}
      <div className={`frame ${product.img ? "photo" : ""}`}>
        <ProductThumb product={product} />
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
            aria-label={`הוספת ${product.name} לעגלה`}
          >
            {added ? "✓ נוסף" : "+ לעגלה"}
          </button>
        </div>
      </div>
    </Link>
  );
};
