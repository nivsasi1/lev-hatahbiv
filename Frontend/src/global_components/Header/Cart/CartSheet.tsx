import { useState } from "preact/hooks"
import { Product } from "../../../Types/globalTypes"
import { ProductCounter } from "../../../pages/ProductPreviewPage/ProductPreview"

const CartSheet: React.FC = () => {
    const [products, setProducts] = useState<Array<Product> | undefined>()

    return (
        <div className={"cart-sheet"}>
            <div className={"cart-sheet-title"}>
                מוצרים{ },
                סה״כ פריטים:
                { }
            </div>
            <div className={"cart-sheet-products"}>
                <ProductItem amount={1} />
                <ProductItem amount={1} />
            </div>
            <div></div>
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