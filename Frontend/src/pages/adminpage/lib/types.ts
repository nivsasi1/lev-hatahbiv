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

export type OrderItem = { id?: string; name?: string; qty?: number; price?: number };

export type ShipAddress = {
  street?: string;
  city?: string;
  apt?: string;
  zip?: string;
  notes?: string;
};

// A D1 order as returned by the Worker (amounts already in shekels for display).
export type Order = {
  _id: string;
  createdAt: string;
  status: string; // new | paid | failed | refunded | handled | cancelled
  delivery: string;
  shipping?: ShipAddress | null; // set for courier/mail orders
  total: number;
  subtotal?: number;
  discount?: number;
  items?: OrderItem[];
  couponCode?: string | null;
  payerName?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;
  invoiceUrl?: string | null;
  paymentRef?: string | null;
};

// a setState-compatible setter (accepts a value or an updater fn)
export type Setter<T> = (value: T | ((prev: T) => T)) => void;
