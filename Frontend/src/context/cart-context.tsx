import { createContext, useEffect, useState, useReducer } from "react";
import { cartData, initState } from "./cart-types.tsx";
import { Product } from "../Types/globalTypes.tsx";

let initialState: initState = {
  cartData: [],
};

interface act {
  source?: any;
  type: "REMOVE_PRODUCT" | "ADD_PRODUCT" | "UPDATE_PRODUCTS";
  value: {};
}

const reducer = (state: any, action: act) => {
  switch (action.type) {
    case "REMOVE_PRODUCT": {
      const productId = action.value;
      const data = (state[action.source] as any[]).filter(
        (current) => current.product._id !== productId
      );
      return {
        ...state,
        [action.source]: data,
      };
    }

    case "ADD_PRODUCT": {
      const data = [
        {
          product: (action.value as any).product,
          howMany: (action.value as any).howMany,
        },
        ...(state[action.source] as any[]),
      ];
      return {
        ...state,
        [action.source]: data,
      };
    }

    case "UPDATE_PRODUCTS": {
      let data;
      data = (state[action.source] as any[]).map((current) => {
        if (current.product._id === (action.value as any).product._id) {
          return {
            product: current.product,
            howMany: (action.value as any).howMany,
          };
        }
        return current;
      });
      if (
        !state[action.source].find(
          (current: any) =>
            current.product._id === (action.value as any).product._id
        )
      ) {
        data = [
          {
            product: (action.value as any).product,
            howMany: (action.value as any).howMany,
          },
          ...(state[action.source] as any[]),
        ];
      }
      return {
        ...state,
        [action.source]: data,
      };
    }
  }
};

export const CartContext = createContext({
  ...initialState,
  addProductToCart: () => {},
  removeProductFromCart: (product: Product) => {},
  updateProduct: (product: Product, count: number) => {},
  addOrUpdate: (product: Product, amount: number) => {},
});

export const CartContextProvider: React.FC<React.ReactNode> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  //send the Product, if the add more than one send how many
  const addProductToCart = (product: Product, howMany: number) => {
    dispatch({
      type: "ADD_PRODUCT",
      source: "cartData",
      value: { product, howMany },
    });
  };
  //send the Product, will remove from cart
  const removeProductFromCart = (product: Product) => {
    dispatch({
      type: "REMOVE_PRODUCT",
      source: "cartData",
      value: product._id,
    });
  };
  //send the Product, and how many they want to add/remove, + or - for add or remove
  const updateProduct = (product: Product, howMany: number) => {
    dispatch({
      type: "UPDATE_PRODUCTS",
      source: "cartData",
      value: { product, howMany },
    });
  };

  const addOrUpdate = (product: Product, howMany: number) => {
    if (state["cartData"].find((p: cartData) => p.product._id == product._id)) {
      // updateProduct(product, howMany)
    } else addProductToCart(product, howMany);
  };

  return (
    <CartContext.Provider
      value={{
        ...state,
        addProductToCart,
        removeProductFromCart,
        updateProduct,
        addOrUpdate,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
