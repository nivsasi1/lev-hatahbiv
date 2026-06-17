import { useState } from "react";
import { Link } from "react-router-dom";
import { products } from "../data/catalog";
import { ProductCard } from "../components/ProductCard";
import "./home-photographic.css"; // reuses the .ph-grid product layout

// A product is "on sale" when it has a salePrice, is in stock, and has a photo —
// same rule the homepage "במבצע עכשיו" strip uses, just without the cap of 5.
const onSale = (p: { salePrice?: number; soldOut?: boolean; img?: string }) =>
  Boolean(p.salePrice && !p.soldOut && p.img);

const PAGE = 15; // how many to reveal at a time ("load more" adds another batch)

export const SalePage = () => {
  const sale = products.filter(onSale);
  const [shown, setShown] = useState(PAGE);
  const visible = sale.slice(0, shown);

  return (
    <main className="page-main shell" style={{ paddingBottom: "4rem" }}>
      <h1 className="display" style={{ fontSize: "clamp(2.8rem, 7vw, 4.5rem)" }}>
        כל המבצעים
      </h1>
      {sale.length > 0 ? (
        <>
          <p className="sale-count">{sale.length} מוצרים במבצע 🎉</p>
          <div className="ph-grid" style={{ marginTop: "1.4rem" }}>
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {shown < sale.length && (
            <div className="sale-loadmore">
              <button
                type="button"
                className="btn"
                onClick={() => setShown((n) => n + PAGE)}
              >
                טען עוד ({sale.length - shown})
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="empty-note">
          אין מבצעים פעילים כרגע — אבל תמיד שווה לקפוץ. <Link to="/">לחנות ←</Link>
        </p>
      )}
    </main>
  );
};
