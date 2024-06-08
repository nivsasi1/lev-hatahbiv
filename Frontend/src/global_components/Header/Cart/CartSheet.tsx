import { useEffect, useState } from "preact/hooks"
import { Product } from "../../../Types/globalTypes"
import { Arrow, ProductCounter } from "../../../pages/ProductPreviewPage/ProductPreview"
import { Link } from "react-router-dom"

const amountHook = ()=>{
}

const CartSheet: React.FC = () => {
    const [products, setProducts] = useState<Array<Product> | undefined>([{
        _id: "",
        category: "",
        img: "",
        name: "wow",
        price: 40
    }])
    const [amounts, setAmounts] = useState<Array<number> | undefined>()

    useEffect(()=>{
        setAmounts(products?.map(() => 2))
    }, [products])

    return (
        <div className={"cart-sheet"}>
            <div className={"cart-sheet-close"}>
                <Arrow/>
            </div>
            <div className={"cart-sheet-title"}>
                מוצרים{ },
                סה״כ פריטים:
                { }
            </div>
            <div className={"cart-sheet-products scrollbar"}>
                <ProductItem amount={1} />
            </div>
            <div className={"cart-sheet-amount"}>
                <div>סכום ביניים</div>
                <div>{
                    amounts ? amounts?.reduce((previous, current, index)=>{
                        console.log("INDEX: "+index)
                        return previous + current * (products && index < products.length ? products[index].price : 1)
                    }, 0) : 0
                }$</div>
            </div>
            <Link to={"/cart"} className={"cart-sheet-link"}>לצפייה בסל</Link>
        </div>
    )
}

export default CartSheet

const ProductItem: React.FC<{ product: Product, amount: number }> = ({ product, amount }) => {
    const [productsAmount, setProductsAmount] = useState<number>(amount)
    return (
        <div class={"cart-sheet-product"}>
            <div className={"cart-sheet-product-head"}>
                <div>{"wowowowowo"}</div>
                <div className={"cart-sheet-product-counter"}>
                    <ProductCounter productsAmount={productsAmount} setProductsAmount={setProductsAmount} />
                    <div style="direction: ltr">{25}$ x {2} = {50}$</div>
                </div>
            </div>
            <div>
                <img src="" alt="" onError={(e) => {
                    e.currentTarget.style.display = "none"
                }} />
            </div>
            <RemoveButton />
        </div>
    )
}

const RemoveButton: React.FC<{ handler?: () => void }> = ({handler}) => {
    return (
        <div className={"cart-sheet-remove-item"} onClick={()=>{
            if(handler){
                handler()
            }
        }}>
            <svg viewBox={"0 0 100 100"}>
                <path d="M20,20 L80,80 M80,20 L20,80" stroke="#000" stroke-width={"10"} stroke-linecap={"round"} fill="none"></path>
            </svg>
        </div>
    )
}