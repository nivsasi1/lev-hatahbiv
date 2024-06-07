import { Product } from "../Types/globalTypes.tsx";

export type cartData = Array<{
    product: Product;
    howMany: number;
  }>;
  
export type initState = {
      cartData: cartData | null;
}
  