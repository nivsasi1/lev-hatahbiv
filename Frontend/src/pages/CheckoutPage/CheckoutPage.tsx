import { Dispatch, StateUpdater, useState } from "preact/hooks"
import { Footer } from "../../global_components/Footer/Footer"
import { Header } from "../../global_components/Header/Header"
import "./CheckoutPage.css"
import { Arrow } from "../ProductPreviewPage/ProductPreview"
import { Link } from "react-router-dom"
import creditImg from "../../assets/credit.png"

export const CheckoutPage: React.FC<{}> = () => {
    const [currentPage, setCurrentPage] = useState(0)
    const PAGES_AMOUNT = 3
    return (
        <>
            <Header shouldShowCartIcon={false} />
            <div className={"checkout-page page-content"}>
                <Link
                    to={""}
                    className={"checkout-return-button return-button"}
                    onClick={() => {
                        window.history.back();
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
                    {currentPage === 0 && <PersonlInfo />}
                    {currentPage === 1 && <DeliveryInfo />}
                    {currentPage === 2 && <Payment />}
                    <div className={"checkout-buttons"}>
                        {currentPage !== 0 && <div className={"no-select checkout-button checkout-back"} onClick={() => {
                            document.body.scrollTo({
                                top: 0,
                                behavior: "smooth"
                            })
                            setCurrentPage((current) => Math.max(0, current - 1))

                        }}>לשלב הקודם</div>}
                        {<div className={"no-select checkout-button checkout-proceed disabled"} onClick={() => {
                            document.body.scrollTo({
                                top: 0,
                                behavior: "smooth"
                            })
                            setCurrentPage((current) => Math.min(3 - 1, current + 1))
                        }}>לשלב הבא</div>}
                    </div>
                    <Bullets currentPage={currentPage} setCurrentPage={setCurrentPage} amount={3} />
                </div>
            </div>
            <Footer />
        </>
    )
}

const Payment: React.FC = () => {
    const [selected, setSelected] = useState(0)

    return <>
        <div className={"checkout-section-title"}>אמצעי תשלום</div>
        <div className={"checkout-payment-options"}>
            <div class={"checkout-payment-option "+(selected === 0 ? " selected":"")} onClick={()=> setSelected(0)}>
                <div>
                כרטיס אשראי / חיוב
                </div>
                <div>
                    <img src={creditImg} alt="" style={"vertical-align: middle"} />
                    <span style={{ fontSize: "0.8em", display: "inline-block", margin: "0 0.3em 0 0"}}>ועוד...</span>
                </div>
                </div>
            <div class={"checkout-payment-option "+(selected === 1 ? " selected":"")} onClick={()=> setSelected(1)}>bit</div>
        </div>
        {selected === 0 && <CreditPayment />}
    </>
}

const CreditPayment: React.FC = ()=>{
    return <div className={"checkout-credit-content"}>
        <Input title="מספר כרטיס" name="credit-number" placeholder="מספר כרטיס" type="number" warning="יש למלא מספר כרטיס תקין." check={()=> true} />
        <div class="checkout-input-wrapper">
            <Input title="תאריך תפוגה"　placeholder="MM / YY" name="credit-date" type="number" warning="יש למלא תאריך תפוגה תקין."/>
            <Input title="קוד אבטחה (CVV)" placeholder="XXX" name="credit-code" type="number" warning="יש למלא קוד אבטחה תקין (CVV)." />
        </div>
        <Input title="שם בעל/ת הכרטיס"  name="credit-owner" placeholder="שם מלא" type="number" warning="יש למלא את השם שלך כפי שהוא מוצג בכרטיס" />
    </div>
}

const BitPayment: React.FC = ()=>{
    return <></>
}

const PersonlInfo: React.FC = () => {
    return <>
        <div class={"checkout-section-title"}>פרטים אישיים</div>
        <Input name="mail" title="מייל" type="email" check={(value) => {
            // return value.match(/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/) != null
            return value.match(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/) != null
        }} placeholder="mail@example.com" warning="יש למלא כתובת מייל, לדוגמה: example@mysite.com" />
        <Input name="name" title="שם פרטי" placeholder="שם פרטי" />
        <Input name="lastname" title="שם משפחה" placeholder="שם משפחה" />
        <div class={"checkout-section-title"}>פרטי המשלוח</div>
        <Input name="region" title="מדינה/אזור" value="ישראל" disabled={true} />
        <div className={"checkout-input-wrapper"}>
            <Input name="address" title="שם הרחוב" placeholder="שם הרחוב" />
            <Input name="homenum" title="מספר הבית" placeholder="מספר הבית" type="number" check={(value) => {
                return value.match(/\d+/) != null
            }} warning="יש למלא מספר בית תקין" />
        </div>
        <Input name="phone" title="טלפון" placeholder="מספר טלפון" type="tel" check={(v) => {
            return v.match(/^(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/) != null
        }} />
        <Input name="zip" title="מיקוד" placeholder="מיקוד" type="number" />
    </>
}

const DELIVERY_TYPES = [
    {
        title: "משלוח עד הבית",
        price: "35.00₪",
        note: "(5 - 1) " + "ימי עבודה",
    },
    {
        title: "דואר רשום",
        price: "28.00₪",
        note: "דואר ישראל " + "(14 - 7) " + "ימי עסקים",
    },
    {
        title: "איסוף עצמי",
        price: "חינם",
    },
]

const DeliveryInfo: React.FC = () => {
    const [selected, setSelected] = useState(0)
    return <>
        <div className={"checkout-section-title"}>אופן השילוח</div>
        <div className={"checkout-delivery-options"}>
            {DELIVERY_TYPES.map((type, index) => <DeliveryOption title={type.title} price={type.price} info={type.note} selected={selected === index} onClick={() => { setSelected(index) }} />)}
        </div>
    </>
}

const DeliveryOption: React.FC<{ title: string, price: string, info?: string, selected: boolean, onClick: () => void }> = ({ selected, onClick, title, price, info }) => {
    return (
        <div className={"checkout-delivery-option" + (selected ? " selected" : "")} onClick={onClick}>
            <div>
                <span>{title}</span>
                {info && <span>{info}</span>}
            </div>
            <div>{price}</div>
        </div>)
}

const Input: React.FC<{ title?: string, value?: any, placeholder?: string, warning?: string, check?: (v: string) => boolean, type?: string, disabled?: boolean, name: string }> = ({ title, placeholder, type, check, warning, disabled, value, name }) => {
    const [isValid, setIsValid] = useState(true)
    const [currentValue, setCurrentValue] = useState(value)

    return <div className={"checkout-input " + (!isValid ? "invalid" : "") + (disabled ? " disabled" : "")}>
        {title && <div className={"checkout-input-title"}>{title}</div>}
        <input onInput={(e) => {
            if (check && (disabled !== false)) {
                setIsValid(check(e.currentTarget.value))
                setCurrentValue(e.currentTarget.value)
            }
        }} placeholder={placeholder ?? ""} type={type ?? "text"} disabled={disabled === true} value={currentValue ?? ""} />
        {!isValid && <div className={"checkout-input-hint"}>{warning ?? ""}</div>}
    </div>
}

const Bullets: React.FC<{ currentPage: number, setCurrentPage: Dispatch<StateUpdater<number>>, amount: number }> = ({ currentPage, setCurrentPage, amount }) => {
    return <div className={"bullets"}>
        {
            [...new Array(amount)].map((_, index) => {
                return <Bullet enabled={currentPage === index} onClick={() => { setCurrentPage(index) }} />
            })
        }
    </div>
}

const Bullet: React.FC<{ enabled: boolean, onClick: () => void }> = ({ enabled, onClick }) => {
    return <svg viewBox="0 0 100 100" onClick={onClick}>
        <circle cx="50" cy="50" r="45" fill={enabled ? "#000" : "#a9a9a9"}></circle>
    </svg>
}