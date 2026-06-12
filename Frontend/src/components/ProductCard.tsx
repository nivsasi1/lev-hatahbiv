import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Product, getCategory, finalPrice, shekel } from "../data/catalog";
import { useCart } from "../context/cart-context";
import { ProductThumb } from "./ProductThumb";

const badgeClass = (badge: string) =>
  badge === "חדש" ? "new" : badge === "רב מכר" ? "hit" : "";

// Multi-photo products slowly crossfade through their gallery while hovered.
const CardGallery = ({ product }: { product: Product }) => {
  const [imgs, setImgs] = useState<string[]>(product.imgs ?? []);
  const [active, setActive] = useState(0);
  const timer = useRef<any>(null);

  useEffect(() => {
    setImgs(product.imgs ?? []);
    setActive(0);
  }, [product.id]);

  useEffect(() => () => clearInterval(timer.current), []);

  if (imgs.length < 2) return <ProductThumb product={product} />;

  const start = () => {
    clearInterval(timer.current);
    timer.current = setInterval(
      () => setActive((a) => (a + 1) % imgs.length),
      1300
    );
  };
  const stop = () => {
    clearInterval(timer.current);
    setActive(0);
  };

  return (
    <div
      className="card-gallery"
      onMouseEnter={start}
      onMouseLeave={stop}
      onTouchStart={start}
      onTouchEnd={stop}
    >
      {imgs.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === 0 ? product.name : ""}
          loading="lazy"
          className={i === active ? "on" : ""}
          onError={() => setImgs((prev) => prev.filter((s) => s !== src))}
        />
      ))}
      <span className="gallery-dots" aria-hidden="true">
        {imgs.map((_, i) => (
          <i key={i} className={i === active ? "on" : ""} />
        ))}
      </span>
    </div>
  );
};

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
        <CardGallery product={product} />
        {/* sale wash — drifting watercolor stain with hand-written discount */}
        {salePct > 0 && !product.soldOut && (
          <div className="sale-aqua" aria-hidden="true">
            <span>
              מבצע <b>{salePct}%-</b>
            </span>
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
