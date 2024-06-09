import { Dispatch, StateUpdater, useEffect, useState } from "preact/hooks"
import { Product } from "../../../Types/globalTypes"
import { Arrow, ProductCounter } from "../../../pages/ProductPreviewPage/ProductPreview"
import { Link } from "react-router-dom"

const CartSheet: React.FC = () => {
    const [products, setProducts] = useState<Array<Product> | undefined>([{
        _id: "",
        category: "",
        img: "",
        name: "wow",
        price: 40
    }])
    const [amounts, setAmounts] = useState<Array<number> | undefined>()

    useEffect(() => {
        setAmounts(products?.map(() => 2))
    }, [products])

    return (
        <div className={"cart-sheet"}>
            <div className={"cart-sheet-close"}>
                <Arrow />
            </div>
            <div className={"cart-sheet-title"}>
                מוצרים{ },
                סה״כ פריטים:
                { }
            </div>
            <div className={"cart-sheet-products scrollbar"}>
                {
                    products && products.map((product, index) => {
                        return <ProductItem product={product} amount={amounts ? amounts![index] : 1} setAmount={(amount) => {
                            setAmounts((value) => {
                                let copy 
                                if (value) {
                                    copy = [...value]
                                    copy[index] = amount
                                }
                                return copy
                            })
                        }} />
                    })
                }
            </div>
            <div className={"cart-sheet-amount"}>
                <div>סכום ביניים</div>
                <div>{
                    amounts ? amounts?.reduce((previous, current, index) => {
                        console.log("INDEX: " + index)
                        return previous + current * (products && index < products.length ? products[index].price : 1)
                    }, 0) : 0
                }$</div>
            </div>
            <Link to={"/cart"} className={"cart-sheet-link"}>לצפייה בסל</Link>
        </div>
    )
}

export default CartSheet

export const ProductItem: React.FC<{ product: Product, amount: number, setAmount: (amount: number) => void }> = ({ product, amount, setAmount }) => {
    const [productAmount, setProductAmount] = useState(Number(amount) || 1)

    useEffect(() => {
        setAmount(productAmount)
    }, [productAmount])

    return (
        <div class={"cart-sheet-product"}>
            <div className={"cart-sheet-product-head"}>
                <div>{"wowowowowo"}</div>
                <div className={"cart-sheet-product-counter"}>
                    <ProductCounter productsAmount={productAmount} setProductsAmount={setProductAmount} />
                    <div style="direction: ltr">{productAmount} x {product.price}$ = {product.price * productAmount}$</div>
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

const RemoveButton: React.FC<{ handler?: () => void }> = ({ handler }) => {
    return (
        <div className={"cart-sheet-remove-item"} onClick={() => {
            if (handler) {
                handler()
            }
        }}>
            <svg viewBox={"0 0 100 100"}>
                <path d="M20,20 L80,80 M80,20 L20,80" stroke="#000" stroke-width={"10"} stroke-linecap={"round"} fill="none"></path>
            </svg>
        </div>
    )
}