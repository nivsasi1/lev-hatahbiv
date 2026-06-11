import { useState, useEffect } from "react";
import { Product } from "../data/catalog";
import { ProductArt } from "./ProductArt";

// A product's visual: photo when we have one (S3), with automatic fallback
// to the category's SVG illustration when the photo is missing or 404s.
export const ProductThumb = ({ product }: { product: Product }) => {
  const [broken, setBroken] = useState(false);

  useEffect(() => setBroken(false), [product.id]);

  if (product.img && !broken) {
    return (
      <img
        src={product.img}
        alt={product.name}
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );
  }
  return <ProductArt kind={product.art ?? "tube"} color={product.artColor} />;
};
