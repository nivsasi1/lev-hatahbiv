import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Product, finalPrice } from "../data/catalog";

export type CartItem = {
  product: Product;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  isSheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  add: (product: Product, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "lh-cart-v2";

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

  const add = (product: Product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [{ product, qty }, ...prev];
    });
    setSheetOpen(true);
  };

  const setQty = (productId: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.product.id !== productId)
        : prev.map((i) => (i.product.id === productId ? { ...i, qty } : i))
    );
  };

  const remove = (productId: string) =>
    setItems((prev) => prev.filter((i) => i.product.id !== productId));

  const clear = () => setItems([]);

  const { count, total } = useMemo(() => {
    let count = 0;
    let total = 0;
    for (const i of items) {
      count += i.qty;
      total += finalPrice(i.product) * i.qty;
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
