import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Product, linePrice } from "../data/catalog";
import { trackAddToCart } from "../data/analytics";

export type CartItem = {
  product: Product;
  qty: number;
  // selected variant key (e.g. '500 מ"ל') — absent on regular products and on
  // lines saved before variants existed
  variant?: string;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  isSheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  add: (product: Product, qty?: number, variant?: string) => void;
  setQty: (productId: string, qty: number, variant?: string) => void;
  remove: (productId: string, variant?: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "lh-cart-v2";

// a line is identified by product id + variant (two sizes = two lines)
const sameLine = (i: CartItem, productId: string, variant?: string) =>
  i.product.id === productId && (i.variant ?? "") === (variant ?? "");

export const lineKey = (i: CartItem) => `${i.product.id}::${i.variant ?? ""}`;

const loadItems = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const CartProvider = ({ children }: { children?: any }) => {
  const [items, setItems] = useState<CartItem[]>(loadItems);
  const [isSheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add = (product: Product, qty = 1, variant?: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => sameLine(i, product.id, variant));
      if (existing) {
        return prev.map((i) =>
          sameLine(i, product.id, variant) ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [{ product, qty, ...(variant ? { variant } : {}) }, ...prev];
    });
    setSheetOpen(true);
    trackAddToCart({
      id: product.id,
      name: variant ? `${product.name} — ${variant}` : product.name,
      priceAgorot: Math.round(linePrice(product, variant) * 100),
      qty,
      category: product.category,
    });
  };

  const setQty = (productId: string, qty: number, variant?: string) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => !sameLine(i, productId, variant))
        : prev.map((i) => (sameLine(i, productId, variant) ? { ...i, qty } : i))
    );
  };

  const remove = (productId: string, variant?: string) =>
    setItems((prev) => prev.filter((i) => !sameLine(i, productId, variant)));

  const clear = () => setItems([]);

  const { count, total } = useMemo(() => {
    let count = 0;
    let total = 0;
    for (const i of items) {
      count += i.qty;
      total += linePrice(i.product, i.variant) * i.qty;
    }
    return { count, total };
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        total,
        isSheetOpen,
        openSheet: () => setSheetOpen(true),
        closeSheet: () => setSheetOpen(false),
        add,
        setQty,
        remove,
        clear,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};
