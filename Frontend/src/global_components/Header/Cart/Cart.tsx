import CartPng from '../../../assets/bag.svg';

export const Cart: React.FC = () => {
  return (
    <button>
      <img src={CartPng} style={{ height: "40px" }} />
    </button>
  );
};
