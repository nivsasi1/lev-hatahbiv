import CartPng from "../../../assets/shopping-cart.png";

export const Cart: React.FC = () => {
  return (
    <button>
      <img src={CartPng} style={{ height: "40px" }} />
    </button>
  );
};
