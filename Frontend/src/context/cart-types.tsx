import { Product } from "../Types/globalTypes.tsx";

export type cartData = {
  product: Product;
  howMany: number;
};

export type wholeCartData = Array<cartData>;

export type initState = {
  cartData: wholeCartData | null;
  user: any | null;
};
