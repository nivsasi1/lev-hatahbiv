// Shared types for the manager dashboard.

// a selectable option (size/color); price empty = the product's base price
export type AdminVariant = {
  key: string;
  price?: number;
  soldOut?: boolean;
  swatch?: string; // CSS color, synced from Wix color choices
};

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
  variantLabel?: string;
  variants?: AdminVariant[];
  noCoupon?: boolean; // excluded from coupon discounts
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

// a variant row while being edited (inputs hold strings)
export type FormVariant = { key: string; price: string; soldOut: boolean; swatch: string };

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
  variantLabel: string;
  variants: FormVariant[];
  noCoupon: boolean;
};

export const emptyForm: ProductForm = {
  name: "",
  price: "",
  description: "",
  category: "",
  sub_cat: "",
  third_level: "",
  imgs: [],
  variantLabel: "",
  variants: [],
  noCoupon: false,
};

export type Subscriber = {
  email: string;
  coupon_code?: string | null;
  created_at?: string;
  unsubscribed_at?: string | null; // set by /api/unsubscribe — exclude from mailings
};

export type Coupon = { code: string; percent: number; maxUses: number | null; usedCount?: number };

export type OrderItem = { id?: string; name?: string; qty?: number; price?: number; variant?: string };

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
  refundedTotal?: number; // shekels refunded so far (partial refunds leave status "paid")
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
