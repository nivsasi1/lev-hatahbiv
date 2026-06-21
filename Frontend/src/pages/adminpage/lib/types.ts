// Shared types for the manager dashboard.

export type AdminProduct = {
  _id: string;
  name: string;
  price: number;
  salePercentage?: number;
  isAvailable?: boolean;
  isActive?: boolean;
  description?: string;
  category: string;
  sub_cat?: string;
  third_level?: string;
  img: string;
  createdAt?: string;
  updatedAt?: string;
};

// promise-based dialog (replaces native prompt/confirm)
export type DialogState = {
  title: string;
  message: string;
  mode: "confirm" | "prompt";
  defaultValue?: string;
  resolve: (value: any) => void;
} | null;

// the product add/edit form. imgs is stored in Mongo as one ";"-joined string.
export type ProductForm = {
  name: string;
  price: string;
  description: string;
  category: string;
  sub_cat: string;
  third_level: string;
  imgs: string[];
  imgInput?: string;
};

export const emptyForm: ProductForm = {
  name: "",
  price: "",
  description: "",
  category: "",
  sub_cat: "",
  third_level: "",
  imgs: [],
};

export type Subscriber = { email: string; coupon_code?: string | null; created_at?: string };

export type Coupon = { code: string; percent: number; maxUses: number | null; usedCount?: number };

// a setState-compatible setter (accepts a value or an updater fn)
export type Setter<T> = (value: T | ((prev: T) => T)) => void;
