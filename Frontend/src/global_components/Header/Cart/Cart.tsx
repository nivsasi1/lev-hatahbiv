import CartPng from '../../../assets/bag.svg';

export const Cart: React.FC<{amount: number}> = ({amount}) => {
  return (
    <div className={"bag"}>
      <img src={CartPng}/>
      <div>סל קנייה</div>
      {amount > 0 && <div className={"bag-count"}>{amount}</div>}
    </div>
  );
};
