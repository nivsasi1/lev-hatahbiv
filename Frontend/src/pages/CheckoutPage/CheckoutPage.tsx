import { Dispatch, StateUpdater, useContext, useEffect, useState } from "preact/hooks"
import { Footer } from "../../global_components/Footer/Footer"
import "./CheckoutPage.css"
import { Arrow } from "../ProductPreviewPage/ProductPreview"
import { Link } from "react-router-dom"
import creditImg from "../../assets/credit.png"
import bitImg from "../../assets/bit.png"
import { CartContext } from "../../context/cart-context"
import { Product } from "../../Types/globalTypes"

const PAGES_AMOUNT = 3
export const CheckoutPage: React.FC<{}> = () => {
    const [currentPage, setCurrentPage] = useState(0)
    const [pagesValid, setPagesValid] = useState([false, true, false, false])
    const [info, setInfo] = useState<PersonalInformation>({
        mail: "",
        name: "",
        lastname: "",
        region: "ישראל",
        address: "",
        homenum: "",
        apartmentnum: "",
        phone: "",
        zip: ""
    })
    const [deliveryType, setDeliveryType] = useState(0)
    const [shouldShowErrors, setShouldShowErrors] = useState(false)

    return (
        <>
            <div className={"checkout-page page-content"} style={"margin-top: 5em!important; margin-bottom: 5em!important"}>
                <Link
                    to={""}
                    className={"checkout-return-button return-button"}
                    onClick={() => {
                        if (window.history.length > 2) {
                            window.history.back();
                        } else {
                            window.location.replace("/")
                        }
                    }}>
                    <span>חזרה לקניות</span>
                    <Arrow />
                </Link>
                <div>
                    <div>
                        תשלום
                    </div>
                    <div className={"checkout-process"}>
                        <span>{"שלב " + (currentPage + 1) + " מתוך " + PAGES_AMOUNT}</span>
                        <svg viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="40" fill="none" stroke-width={12} stroke="#d0d0d0"></circle>
                            <circle cx="50" cy="50" r="40" fill="none" stroke-width={12} stroke="#000" stroke-dasharray={280} stroke-dashoffset={280 / PAGES_AMOUNT * (PAGES_AMOUNT - currentPage - 1)}></circle>
                        </svg>
                    </div>
                </div>
                <div className={"checkout-content"}>
                    {currentPage === 0 && <PersonlInfo shouldShowErrors={shouldShowErrors} setIsValid={(value) => {
                        let newState = [...pagesValid]
                        newState[0] = value
                        setPagesValid(newState)
                    }} info={info} setInfo={setInfo} />}
                    {currentPage === 1 && <DeliveryInfo selected={deliveryType} setSelected={setDeliveryType} />}
                    {currentPage === 2 && <Payment deliveryType={deliveryType} shouldShowErrors={shouldShowErrors}/>}
                    <div className={"checkout-buttons"}>
                        {
                            currentPage !== 0 && <PageButton setShouldShowErrors={setShouldShowErrors} currentPage={currentPage} setCurrentPage={setCurrentPage} calcPage={(c) => Math.max(0, c - 1)} title="לשלב הקודם" />
                        }
                        {
                            <PageButton setShouldShowErrors={setShouldShowErrors} currentPage={currentPage} setCurrentPage={setCurrentPage} valid={pagesValid[currentPage]} calcPage={(c) => Math.min(PAGES_AMOUNT - 1, c + 1)} title="לשלב הבא" />
                        }
                    </div>
                    <Bullets currentPage={currentPage} setCurrentPage={setCurrentPage} amount={PAGES_AMOUNT} />
                </div>
            </div>
            <Footer />
        </>
    )
}

const isNil = (obj: any) => {
    return obj === null || obj === undefined
}

export const PageButton: React.FC<{ setShouldShowErrors: Dispatch<StateUpdater<boolean>>, currentPage: number, setCurrentPage: Dispatch<StateUpdater<number>>, valid?: boolean, title: string, calcPage: (v: number) => number }> = ({ currentPage, setCurrentPage, valid, calcPage, title, setShouldShowErrors }) => {
    console.log("VALID: " + valid)
    console.log("currentPage: " + currentPage)
    return <div className={"no-select checkout-button checkout-proceed " + (valid === false ? "disabled" : "") + (isNil(valid) ? "checkout-back" : "")} onClick={() => {
        setShouldShowErrors(!isNil(valid))
        setTimeout(() => {
            document.body.scrollTo({
                top: 0,
                behavior: "smooth"
            })
        }, 200)
        if (isNil(valid) || valid) {
            setCurrentPage((current) => calcPage(current))
        }
    }}>{title}</div>
}

const Payment: React.FC<{ deliveryType: number, shouldShowErrors?: boolean }> = ({ deliveryType, shouldShowErrors }) => {
    const [selected, setSelected] = useState(0)

    return <>
        <div className={"checkout-section-title"}>אמצעי תשלום</div>
        <div className={"checkout-payment"}>

            <div>
                <div className={"checkout-payment-options"}>
                    <div class={"checkout-payment-option " + (selected === 0 ? " selected" : "")} onClick={() => setSelected(0)}>
                        <div>
                            כרטיס אשראי / חיוב
                        </div>
                        <div>
                            <img src={creditImg} alt="" style={"vertical-align: middle"} />
                            <span style={{ fontSize: "0.8em", display: "inline-block", margin: "0 0.3em 0 0" }}>ועוד...</span>
                        </div>
                    </div>
                    <div class={"checkout-payment-option " + (selected === 1 ? " selected" : "")} onClick={() => setSelected(1)}>
                        <div>bit</div>
                        <div>
                            <img src={bitImg} alt="" />
                        </div>
                    </div>
                </div>
                {selected === 0 && <CreditPayment shouldShowErrors={shouldShowErrors} />}
            </div>
            <div>
                <CartSummary deliveryType={deliveryType} />
            </div>
        </div>
    </>
}

type CreditInformation = {
    number: string,
    date: string,
    code: string,
    owner: string
}

const CreditPayment: React.FC<{shouldShowErrors?: boolean}> = ({shouldShowErrors}) => {
    const [info, setInfo] = useState<CreditInformation>({
        number: "",
        date: "",
        code: "",
        owner: ""
    })

    return <div className={"checkout-credit-content"}>
        <Input shouldShowError={shouldShowErrors} value={info.number} setValue={(value) => setInfo({ ...info, number: value })} title="מספר כרטיס" name="credit-number" placeholder="מספר כרטיס" type="string" warning="יש למלא מספר כרטיס תקין." check={ValidCreditNumber} />
        <div class="checkout-input-wrapper">
            <Input shouldShowError={shouldShowErrors} value={info.date} setValue={(value) => setInfo({ ...info, date: value })} title="תאריך תפוגה" placeholder="MM / YY" name="credit-date" type="string" apply={applyCreditDate} warning="יש למלא תאריך תפוגה תקין." check={ValidCreditDate} />
            <Input shouldShowError={shouldShowErrors} value={info.code} setValue={(value) => setInfo({ ...info, code: value })} title="קוד אבטחה (CVV)" placeholder="XXX" name="credit-code" type="string" apply={(value) => NumberOnlyRanged(value, 4)} warning="יש למלא קוד אבטחה תקין (CVV)." check={(value) => String(value ?? "").match(/^\d{3,4}$/) != null} />
        </div>
        <Input shouldShowError={shouldShowErrors} value={info.owner} setValue={(value) => setInfo({ ...info, owner: value })} title="שם בעל/ת הכרטיס" name="credit-owner" placeholder="שם מלא" type="number" warning="יש למלא את השם שלך כפי שהוא מוצג בכרטיס" check={(value) => value !== ""} />
    </div>
}

const applyCreditDate = (value: any) => {
    if (!value || value === "") {
        return ""
    }
    let str = String(value)
    if(!str.match(/^(0?[2-9]|1[0-2]?)\/?\d*$/)){
        return str.slice(0, str.length - 1)
        // return ""
    }
    if (str.match(/^1[0-2]\d+$/)) {
        return str.slice(0, 2) + "/" + str.slice(2)
    }else if (str.match(/^0[2-9]\d+$/)) {
        return str.slice(0, 2) + "/" + str.slice(2)
    } else if (str.match(/^[2-9]\d+$/)) {
        return str[0] + "/" + str.slice(1)
    } 
    return str.slice(0, 7)
}

const ValidCreditDate = (value: any) => {
    // return String(value ?? "").match(/^(0?[2-9]|1[0-2]?)\/?([0-9]{4}|[0-9]{2})$/) != null
    // return String(value ?? "").match(/^(0?[2-9]|1[0-2]?)\/?(2[0-9]{3}|[0-9]{2})$/) != null
    return String(value ?? "").match(/^(0?[2-9]|1[0-2]?)\/?([0-9]{2})$/) != null
}

const ValidCreditNumber = (value: any) =>{
    // return String(value ?? "").match(/^[0-9]{4}-?[0-9]{4}-?[0-9]{4}-?[0-9]{4}$/) != null
    return String(value ?? "").replace(/[,\-]/g,"").match(/^(?:4[0-9]{12}(?:[0-9]{3})?|[25][1-7][0-9]{14}|6(?:011|5[0-9][0-9])[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|(?:2131|1800|35\d{3})\d{11})$/) != null
}

const BitPayment: React.FC = () => {
    return <></>
}

type PersonalInformation = {
    mail: string,
    name: string,
    lastname: string,
    region: string,
    address: string,
    homenum: string,
    apartmentnum: string,
    phone: string,
    zip: string
}

type useInputArgs = {
    initialValue?: any,
    apply?: (v: any) => any,
    validate?: (v: any) => boolean,
    pattern?: RegExp
}

const useInput: (props: useInputArgs) => any = ({ initialValue, apply, validate, pattern }) => {
    const [value, setValue] = useState(initialValue ?? "")
    const [isValid, setIsValid] = useState(false)

    const onValueChange = (value: any) => {
        let newValue = apply ? apply(value) : value
        setValue(newValue)
        if (validate) {
            setIsValid(validate(newValue))
        } else if (pattern) {
            setIsValid(String(value ?? "").match(pattern) != null)
        }
    }

    return {
        value,
        isValid,
        onValueChange
    }
}

const Validations: any = {
    "mail": (value: string) => String(value ?? "").match(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/) != null,
    "name": (value: string) => (value ?? "").length > 0,
    "lastname": (value: string) => (value ?? "").length > 0,
    "address": (value: string) => (value ?? "").length > 0,
    "region": null,
    "homenum": (value: string) => String(value ?? "").match(/^\d+$/) != null,
    "apartmentnum": (value: string) => String(value ?? "").match(/^\d+$/) != null,
    "phone": (value: string) => String(value ?? "").match(/^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/) != null,
    "zip": (value: string) => String(value ?? "").match(/^\d{7}$/) != null
}

const NumberOnly = (value: any) => {
    if (value !== undefined && value !== null) {
        let match = String(value).match(/\d+/)
        if (match) {
            return match[0]
        }
        return ""
    }
    return ""
}

const NumberOnlyRanged = (value: any, max: number)=>{
    return NumberOnly(value).slice(0, max)
}

const PersonlInfo: React.FC<{ shouldShowErrors: boolean, info: PersonalInformation, setInfo: Dispatch<StateUpdater<PersonalInformation>>, setIsValid: (value: boolean) => void }> = ({ setIsValid, info, setInfo, shouldShowErrors }) => {
    useEffect(() => {
        let isValid = true
        for (let key in info) {
            //TODO: undo the break
            // break;
            if (typeof Validations[key] === "function") {
                console.log(`validations[${key}]: ${Validations[key]}`)
                if (Validations[key]((info as any)[key]) === false) {
                    isValid = false
                    break
                }
            }
        }
        setIsValid(isValid)
    }, [info])

    return <>
        <div class={"checkout-section-title"}>פרטים אישיים</div>
        <Input shouldShowError={shouldShowErrors} value={info.mail} setValue={(value) => { setInfo({ ...info, mail: value }) }} name="mail" title="מייל" type="email" check={Validations["mail"]} placeholder="mail@example.com" warning="יש למלא כתובת מייל, לדוגמה: example@mysite.com" flipped={true} />
        <Input shouldShowError={shouldShowErrors} value={info.name} setValue={(value) => { setInfo({ ...info, name: value }) }} name="name" title="שם פרטי" placeholder="שם פרטי" check={Validations["name"]} />
        <Input shouldShowError={shouldShowErrors} value={info.lastname} setValue={(value) => { setInfo({ ...info, lastname: value }) }} name="lastname" title="שם משפחה" placeholder="שם משפחה" check={Validations["lastname"]} />
        <div class={"checkout-section-title"}>פרטי המשלוח</div>
        <Input setValue={() => { }} name="region" title="מדינה/אזור" value="ישראל" disabled={true} />
        <Input shouldShowError={shouldShowErrors} value={info.address} setValue={(value) => { setInfo({ ...info, address: value }) }} name="address" title="כתובת מגורים" placeholder="כתובת מגורים (עיר + רחוב)" warning="יש למלא את כתובת המגורים" check={Validations["address"]} />
        <div className={"checkout-input-wrapper"}>
            <Input shouldShowError={shouldShowErrors} value={info.homenum} setValue={(value) => { setInfo({ ...info, homenum: value }) }} name="homenum" title="מספר בית" placeholder="מספר בית" type="text" check={Validations["homenum"]} warning="יש למלא מספר בית" apply={NumberOnly} />
            <Input shouldShowError={shouldShowErrors} value={info.apartmentnum} setValue={(value) => { setInfo({ ...info, apartmentnum: value }) }} name="apartmentnum" title="מספר דירה" placeholder="מספר דירה" type="text" check={Validations["apartmentnum"]} warning="יש למלא מספר דירה" apply={NumberOnly} />
        </div>
        <Input shouldShowError={shouldShowErrors} value={info.phone} setValue={(value) => { setInfo({ ...info, phone: value }) }} name="phone" title="טלפון" placeholder="מספר טלפון" type="tel" check={Validations["phone"]} flipped={true} warning="יש למלא מספר טלפון תקין" />
        <Input shouldShowError={shouldShowErrors} value={info.zip} setValue={(value) => { setInfo({ ...info, zip: value }) }} name="zip" title="מיקוד" placeholder="מיקוד" type="text" check={Validations["zip"]} apply={NumberOnly} warning="יש למלא מספר מיקוד תקין (7 ספרות)" />
    </>
}

const DELIVERY_TYPES = [
    {
        title: "משלוח עד הבית",
        price: 35,
        note: "(5 - 1) " + "ימי עבודה",
    },
    {
        title: "דואר רשום",
        price: 28,
        note: "דואר ישראל " + "(14 - 7) " + "ימי עסקים",
    },
    {
        title: "איסוף עצמי",
        price: 0,
    },
]

const DeliveryInfo: React.FC<{ selected: number, setSelected: Dispatch<StateUpdater<number>> }> = ({ selected, setSelected }) => {
    return <>
        <div className={"checkout-section-title"}>אופן השילוח</div>
        <div className={"checkout-delivery-options"}>
            {DELIVERY_TYPES.map((type, index) => <DeliveryOption title={type.title} price={type.price} info={type.note} selected={selected === index} onClick={() => { setSelected(index) }} />)}
        </div>
    </>
}

const DeliveryOption: React.FC<{ title: string, price: number, info?: string, selected: boolean, onClick: () => void }> = ({ selected, onClick, title, price, info }) => {
    return (
        <div className={"checkout-delivery-option" + (selected ? " selected" : "")} onClick={onClick}>
            <div>
                <span>{title}</span>
                {info && <span>{info}</span>}
            </div>
            <div>{Number(price) === 0 ? "חינם" : price + "₪"}</div>
        </div>)
}

const CartSummary: React.FC<{ deliveryType: number }> = ({ deliveryType }) => {
    const cartContext = useContext(CartContext)
    const [expanded, setExpanded] = useState(false)
    const [productsAmount, setProductsAmount] = useState(0)
    const [totalPrice, setTotalPrice] = useState(0)

    useEffect(() => {
        setProductsAmount(cartContext.cartData?.reduce((sum, info) => sum + info.howMany, 0) ?? 0)
        setTotalPrice(getTotalPrice(cartContext))
    }, [cartContext])

    return <div className={"checkout-cart-summary"}>
        <div className={"checkout-cart-toggle no-select"} onClick={() => setExpanded((last) => !last)}>
            <div>
                <span>סיכום ההזמנה</span>&nbsp;
                <span>{productsAmount} פריטים</span>
            </div>
            <div>
                <Arrow rotate={expanded ? 90 : -90} />
            </div>
        </div>
        <div className={"cart-summary-content" + (expanded ? " expanded" : "")}>
            <div className={"checkout-cart-products scrollbar"}>
                {
                    cartContext.cartData?.map((info) =>
                        <ProductSummary product={info.product} amount={info.howMany} />) ?? "nothing"
                }
            </div>
            <div className="ho-divider"></div>
            <div className={"checkout-cart-title"}>אופן שילוח</div>
            <div className={"checkout-cart-section"}>
                <span>
                    {DELIVERY_TYPES[deliveryType].title}
                    <span style="font-size: 0.9em; opacity: 0.5; display: inline-block; font-weight: 550; margin-right: 0.5em">{DELIVERY_TYPES[deliveryType].note}</span>
                </span>
                <span>{DELIVERY_TYPES[deliveryType].price === 0 ? "חינם" : DELIVERY_TYPES[deliveryType].price + "₪"}</span>
            </div>
            <div className="ho-divider"></div>
            <div className="checkout-cart-title">
                סיכום
            </div>
            <div class={"checkout-cart-section"}>
                <span>סכום ביניים</span>
                <span>
                    {totalPrice}₪
                </span>
            </div>
            <div class={"checkout-cart-section"}>
                <span>סכום + שילוח לפני מע״מ</span>
                <span>
                    {totalPrice + DELIVERY_TYPES[deliveryType].price}₪
                </span>
            </div>
            <div class={"checkout-cart-section"}>
                <span></span>
                <span>+ x0.17</span>
            </div>
        </div>
        <div class={"checkout-cart-final-price"}>
            <span>
                סכום סופי
                (כולל מע״מ)
            </span>
            <span>{Math.floor(totalPrice * 1.17) + DELIVERY_TYPES[deliveryType].price}₪</span>
        </div>
    </div>
}

const ProductSummary: React.FC<{ product: Product, amount: number }> = ({ product, amount }) => {
    return <div className={"checkout-product-summary"}>
        <div>
            <img src={"/images/" + product.img} onError={(e) => e.currentTarget.style.display = 'none'} onLoad={(e) => e.currentTarget.style.display = 'block'} />
        </div>
        <div>
            <div>{product.name}</div>
        </div>
        <div className={"checkout-product-sum-price"}>{amount} x {product.price}₪ = {product.price * amount}</div>
    </div>
}

const getTotalPrice = (cartContext: any) => {
    return cartContext.cartData?.reduce((sum: any, info: any) => sum + info.howMany * info.product.price, 0) ?? 0
}

const isFunc = (obj: any) => {
    return typeof obj === "function"
}

export const Input: React.FC<{ shouldShowError?: boolean, flipped?: boolean, title?: string, value: any, setValue: (value: any) => void, apply?: (v: any) => any, placeholder?: string, warning?: string, check?: (v: string) => boolean, type?: string, disabled?: boolean, name: string }> = ({ title, placeholder, type, check, warning, disabled, value, setValue, name, apply, flipped, shouldShowError }) => {
    const [isValid, setIsValid] = useState(isFunc(check) ? check!(isFunc(apply) ? apply!(value) : value) : false)

    console.log(title + "->isValid: " + isValid + ", showError:" + shouldShowError)
    return <div className={"checkout-input " + (shouldShowError && !isValid ? "invalid" : "") + (disabled ? " disabled" : "") + (flipped ? " flipped" : "")}>
        {title && <div className={"checkout-input-title"}>{title}</div>}
        <input onInput={(e) => {
            let newValue = apply ? apply(e.currentTarget.value) : e.currentTarget.value
            if (!disabled) {
                if (check) {
                    setIsValid(check(newValue))
                }
                setValue(newValue)
                e.currentTarget.value = newValue
            }
        }} name={name} placeholder={placeholder ?? ""} type={type ?? "text"} disabled={disabled === true} value={value ?? ""} />
        {(!isValid && (value !== "") || (shouldShowError && !isValid)) && <div className={"checkout-input-hint"}>{warning ?? ""}</div>}
    </div>
}

const Bullets: React.FC<{ currentPage: number, setCurrentPage: Dispatch<StateUpdater<number>>, amount: number }> = ({ currentPage, setCurrentPage, amount }) => {
    return <div className={"bullets"}>
        {
            [...new Array(amount)].map((_, index) => {
                return <Bullet enabled={currentPage === index} onClick={() => { /*setCurrentPage(index)*/ }} />
            })
        }
    </div>
}

const Bullet: React.FC<{ enabled: boolean, onClick: () => void }> = ({ enabled, onClick }) => {
    return <svg viewBox="0 0 100 100" onClick={onClick}>
        <circle cx="50" cy="50" r="45" fill={enabled ? "var(--text)" : "var(--on-container)"}></circle>
    </svg>
}