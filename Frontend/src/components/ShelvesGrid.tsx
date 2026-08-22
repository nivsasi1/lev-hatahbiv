import { Link } from "react-router-dom";
import { categories, productsByCategory } from "../data/catalog";
import { ProductArt } from "./ProductArt";
import { Blob } from "./Splat";

// The 9 shelves as rotated sticker cards (.cat-grid / .cat-card from App.css).
// Shared by the 404 page and the empty search state — anywhere we need to
// hand a lost shopper a way back to the products.
export const ShelvesGrid = ({ title }: { title?: string }) => (
  <>
    {title && (
      <div className="section-head">
        <h2 className="display">{title}</h2>
        <div className="scribble" />
        <Link to="/" className="more">
          לעמוד הראשי ←
        </Link>
      </div>
    )}
    <div className="cat-grid">
      {categories.map((c) => (
        <Link
          key={c.slug}
          to={`/category/${c.slug}`}
          className="cat-card"
          style={{ "--cc": c.color } as any}
        >
          <Blob color={c.soft} />
          <span className="cat-art">
            <ProductArt kind={c.art} color={c.color} />
          </span>
          <h3 className="display">{c.name}</h3>
          <p>{c.blurb}</p>
          <span className="count">{productsByCategory(c.slug).length} מוצרים ←</span>
        </Link>
      ))}
    </div>
  </>
);
