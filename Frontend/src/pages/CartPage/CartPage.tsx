import { Link } from "react-router-dom"
import { Header } from "../../global_components/Header/Header"
import { Arrow } from "../ProductPreviewPage/ProductPreview"
import { ProductItem } from "../../global_components/Header/Cart/CartSheet"
import { Dispatch, StateUpdater, useEffect, useState } from "preact/hooks"
import { useRef } from "react"
import printer from "../../assets/printer.svg"

const PRODUCTS = [{
    _id: "",
    category: "",
    img: "",
    name: "wow",
    price: 40
}]

export const CartPage: React.FC = () => {
    const [deliveryType, setDeliveryType] = useState(0)

    return (<>
        <Header />
        <div style={"margin-top: 10em"}>
            <Link to={""} className={"return-button"}>
                <span>חזור</span>
                <Arrow />
            </Link>
            <div className={"cart-content"}>
                <div className={"cart-content-title"}>
                    <div>
                        מוצרים{ },
                        סה״כ פריטים:
                        { }
                    </div>
                    <div className={"cart-print no-select"} onClick={()=>{window.print()}}>
                        <span>הדפס הזמנה</span>
                        <img src={printer} alt="" onError={(e) => { e.currentTarget.style.display = "none" }} />
                    </div>
                </div>
                <div className={"cart-sections"}>
                    <div className={"cart-products "}>
                        <div className={"scrollbar"}>
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                            <ProductItem product={PRODUCTS[0]} amount={1} setAmount={() => { }} />
                        </div>
                    </div>
                    <div className={"cart-purchase-preview"}>
                        <div>
                            <div style={"font-size: 1.05em"}>סיכום הזמנה</div>
                            <div>שיטת איסוף / שילוח</div>
                            <DeliveryTypeSelect selected={deliveryType} didSelect={setDeliveryType} />
                            <div className={"cart-purchase-summary"}>
                                <div>
                                    <span>סכום ביניים</span>
                                    <span>{0}₪</span>
                                </div>
                                <div className={"divider"}></div>
                                <div>
                                    <span>{DELIVERY_TYPES[deliveryType].title}</span>
                                    <span>{DELIVERY_TYPES[deliveryType].price}₪</span>
                                </div>
                            </div>
                        </div>
                        <div className={"cart-final-price"}>
                            <span>סך הכל לתשלום</span>
                            <span>{0}₪</span>
                        </div>
                        <Link to={""} className={"cart-proceed-pay no-select"}>לתשלום</Link>
                    </div>
                </div>
            </div>
        </div>
    </>)
}

const DELIVERY_TYPES = [{
    title: "משלוח עד הבית",
    price: 35.0,
    note: "(5 - 1) " + "ימי עבודה"
},
{
    title: "דואר רשום",
    price: 35,
    note: "דואר ישראל " + "(14 - 7) " + "ימי עסקים"
},
{
    title: "איסוף עצמי",
    price: 0.0
}]

const DeliveryTypeSelect: React.FC<{ selected: number, didSelect: Dispatch<StateUpdater<number>> }> = ({ selected, didSelect }) => {
    const [isOpened, setIsOpened] = useState(false)
    const container = useRef<HTMLDivElement | null>(null)

    //TODO: remove delivery fee when price exceeds limit

    useEffect(() => {
        console.log("wow!")
        const handleClickOutside: (e: MouseEvent) => void = (e) => {
            console.log("CLICK")
            if (container.current && !container.current.contains(e.target as Node)) {
                setIsOpened(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    })
    return (
        <div className={"delivery-select no-select" + (isOpened ? " opened" : "")} ref={container} onClick={() => {
            setIsOpened((current) => !current)
        }}>
            <div>
                <span>
                    {DELIVERY_TYPES[selected].title}
                </span>
                <span>
                    {DELIVERY_TYPES[selected].price}₪
                </span>
                <Arrow rotate={isOpened ? 90 : -90} />
            </div>
            <div className={"delivery-select-options" + (isOpened ? " opened" : "")}>
                {
                    DELIVERY_TYPES.map((type, index) => {
                        return <div className={"delivery-type" + (index === selected ? " selected" : "")} onClick={() => { didSelect(index) }}>
                            <span>{type.title}</span>
                            <span>{type.price}₪</span>
                            {type.note && <span>{type.note}</span>}
                        </div>
                    })
                }
            </div>
        </div>)
}