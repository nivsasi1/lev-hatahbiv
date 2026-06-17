import { Link } from "react-router-dom";
import { products } from "../data/catalog";
import { ProductCard } from "../components/ProductCard";
import "./home-photographic.css"; // reuses the .ph-grid product layout

// A product is "on sale" when it has a salePrice, is in stock, and has a photo —
// same rule the homepage "במבצע עכשיו" strip uses, just without the cap of 5.
const onSale = (p: { salePrice?: number; soldOut?: boolean; img?: string }) =>
  Boolean(p.salePrice && !p.soldOut && p.img);

export const SalePage = () => {
  const sale = products.filter(onSale);

  return (
    <main className="page-main shell">
      <h1 className="display">כל המבצעים</h1>
      {sale.length > 0 ? (
        <>
          <p className="sale-count">{sale.length} מוצרים במבצע 🎉</p>
          <div className="ph-grid" style={{ marginTop: "1.4rem" }}>
            {sale.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      ) : (
        <p className="empty-note">
          אין מבצעים פעילים כרגע — אבל תמיד שווה לקפוץ. <Link to="/">לחנות ←</Link>
        </p>
      )}
    </main>
  );
};
