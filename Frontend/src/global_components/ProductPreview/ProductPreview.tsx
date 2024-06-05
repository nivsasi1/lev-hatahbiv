import { useState, useRef } from "react"

type Product = {
    name: string,
    price: number,
    desc: string,
    category?: string,
    sub_cat?: string,
    third_level?: string,
    img: string
}

const Arrow: React.FC = () => {
    return (
        <svg viewBox={"10 0 70 100"} className={"arrow"}>
            <path d={"M70,17.5 L30,50 L70,82.5"} stroke={"#000000"} stroke-width={"12.5"} fill="none"></path>
        </svg>
    )
}

export const ProductPreview: React.FC<{ product: Product }> = ({ product }) => {
    let img = useRef<HTMLImageElement | null>(null)
    const [productsAmount, setProductsAmount] = useState<number>(1)
    return <>
        <div className={"return-button"}>
            <span>
                חזור
            </span>
            <Arrow />
        </div>
        <div className={"product-preview-location"}>
            {
                product.category && <div>{product.category}</div>
            }
            {

                product.sub_cat && <><Arrow /> <div>{product.sub_cat}</div></>
            }
            {

                product.third_level && <><Arrow /> <div>{product.third_level}</div></>
            }
        </div>
        <div className={"product-preview"}>
            <div className={"product-preview-img"}><img ref={img} onError={() => {
                if (img.current) {
                    img.current!.style.display = 'none'
                }
            }} src="" alt="" /></div>
            <div>
                <div className={"product-preview-info"}>
                    <div className={"product-preview-info-content"}>
                        <div className={"product-preview-name"}>{product.name}</div>
                        <div>מידע אודות המוצר</div>
                        <div>{product.desc}</div>
                    </div>
                </div>
                <div className={"product-preview-buttons"}>
                    <div class={"product-preview-add"}>הוספה לסל</div>
                    <div className={"product-preview-count"}>
                        <div onClick={() => { setProductsAmount((amount) => { return (Math.max(1, amount - 1)) }) }}>
                            <svg viewBox={"0 0 100 100"}>
                                <path d="M22,50 h56" stroke="#000" stroke-width={"10"}></path>
                            </svg>
                        </div>
                        <div>
                            <input type="number" value={productsAmount} onInput={(e) => {
                                console.log(Math.max(Number(e.currentTarget.value), 1))
                                let newValue:number = Math.max(Number(e.currentTarget.value), 1)
                                setProductsAmount(newValue)
                                e.currentTarget.value = newValue.toString()
                            }} />
                        </div>
                        <div onClick={() => {
                            setProductsAmount((amount) => { return amount + 1 })
                        }}>
                            <svg viewBox={"0 0 100 100"}>
                                <path d="M20,50 h60 M50,20 v60" stroke="#000" stroke-width={"10"}></path>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </>
}