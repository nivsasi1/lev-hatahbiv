import { createContext, useEffect, useState, useReducer } from "react";
import { cartData, initState } from "./cart-types.tsx";
import { Product } from "../Types/globalTypes.tsx";

let initialState: initState = {
  cartData: [],
  user: null,
};

const loadInitialState = () => {
  const localData = localStorage.getItem("cartData");
  return localData ? JSON.parse(localData) : initialState;
};

interface act {
  source?: any;
  type: "REMOVE_PRODUCT" | "ADD_PRODUCT" | "UPDATE_PRODUCTS" | "SET_USER";
  value: {};
}

const reducer = (state: any, action: act) => {
  switch (action.type) {
    case "SET_USER": {
      return {
        ...state,
        user: action.value,
      };
    }

    case "REMOVE_PRODUCT": {
      const value = action.value;
      if ((value as any).option != undefined) {
        const data = (state[action.source] as any[]).filter(
          (current) =>
            !(
              current.product._id === (value as any).product &&
              ((action.value as any).option === undefined ||
                current.optionSelected == (action.value as any).option)
            )
        );
        return {
          ...state,
          [action.source]: data,
        };
      } else {
        const data = (state[action.source] as any[]).filter(
          (current) => current.product._id !== value
        );
        return {
          ...state,
          [action.source]: data,
        };
      }
    }

    case "ADD_PRODUCT": {
      const data = [
        {
          product: (action.value as any).product,
          howMany: (action.value as any).howMany,
          optionSelected: (action.value as any).option,
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
        if (
          current.product._id === (action.value as any).product._id &&
          ((action.value as any).option === undefined ||
            current.optionSelected == (action.value as any).option)
        ) {
          return {
            product: current.product,
            howMany: (action.value as any).howMany,
            optionSelected: current.optionSelected,
          };
        }
        return current;
      });
      if (
        !state[action.source].find(
          (current: any) =>
            current.product._id === (action.value as any).product._id &&
            ((action.value as any).option === undefined ||
              current.optionSelected == (action.value as any).option)
        )
      ) {
        data = [
          {
            product: (action.value as any).product,
            howMany: (action.value as any).howMany,
            optionSelected: (action.value as any).option,
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
  addProductToCart: (
    _product: Product,
    _howMany: number,
    _optionSelected: any | undefined
  ) => {},
  removeProductFromCart: (
    _product: Product,
    _optionSelected: any | undefined
  ) => {},
  updateProduct: (
    _product: Product,
    _howMany: number,
    _optionSelected: any | undefined
  ) => {},
  addOrUpdate: (
    _product: Product,
    _howMany: number,
    _optionSelected: any | undefined
  ) => {},
  onSuccessfulSignIn: (user: any) => undefined,
  fetchUser: async (): Promise<any | null> => {
    return null;
  },
  canUserModify: () => true,
});

export const CartContextProvider: React.FC<React.ReactNode> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, loadInitialState());

  useEffect(() => {
    localStorage.setItem("cartData", JSON.stringify(state));
  }, [state]);

  const onSuccessfulSignIn = async (user: any) => {
    dispatch({ type: "SET_USER", value: user });
  };

  const fetchUser = async (): Promise<any | null> => {
    const res = await fetch("http://localhost:5000/get_user", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("jwt")}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      onSuccessfulSignIn(data);
      return data;
    } else {
      console.log("Unauthorized");
      return null;
    }
  };

  const canUserModify = () => {
    if (!state.user) {
      return false;
    }

    return state.user.role === "0";
  };

  //send the Product, if the add more than one send how many
  const addProductToCart = (
    product: Product,
    howMany: number,
    optionSelected: any | undefined
  ) => {
    dispatch({
      type: "ADD_PRODUCT",
      source: "cartData",
      value: { product, howMany, option: optionSelected },
    });
  };
  //send the Product, will remove from cart
  const removeProductFromCart = (
    product: Product,
    optionSelected: any | undefined
  ) => {
    dispatch({
      type: "REMOVE_PRODUCT",
      source: "cartData",
      value: { product: product._id, option: optionSelected },
    });
  };
  //send the Product, and how many they want to add/remove, + or - for add or remove
  const updateProduct = (
    product: Product,
    howMany: number,
    optionSelected: any | undefined
  ) => {
    dispatch({
      type: "UPDATE_PRODUCTS",
      source: "cartData",
      value: { product, howMany, option: optionSelected },
    });
  };

  const addOrUpdate = (
    product: Product,
    howMany: number,
    optionSelected: any | undefined
  ) => {
    if (
      state["cartData"].find(
        (p: cartData) =>
          p.product._id == product._id &&
          (optionSelected === undefined || p.optionSelected == optionSelected)
      )
    ) {
      updateProduct(product, howMany, optionSelected);
    } else addProductToCart(product, howMany, optionSelected);
  };

  return (
    <CartContext.Provider
      value={{
        ...state,
        addProductToCart,
        removeProductFromCart,
        updateProduct,
        addOrUpdate,
        onSuccessfulSignIn,
        fetchUser,
        canUserModify,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
