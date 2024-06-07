export type Product = {
  _id: string;
  name: string;
  price: number;
  quantity?: number;
  isAvailable?: boolean;
  desc?: string;
  category: string;
  sub_cat?: string;
  third_level?: string;
  img: string;
};
