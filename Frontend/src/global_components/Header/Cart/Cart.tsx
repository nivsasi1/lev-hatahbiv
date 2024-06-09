import { Dispatch, StateUpdater } from 'preact/hooks';
import CartPng from '../../../assets/bag.svg';

export const Cart: React.FC<{amount: number, setShowCartSheet?: Dispatch<StateUpdater<boolean>>}> = ({amount, setShowCartSheet}) => {
  return (
    <div className={"bag"} onClick={
          ()=>{
            console.log("LOL!")
            if(setShowCartSheet){
              setShowCartSheet((previous) => !previous)
            }
          }
        }>
      <img src={CartPng}/>
      <div>סל קנייה</div>
      {amount > 0 && <div className={"bag-count"}>{amount}</div>}
    </div>
  );
};
