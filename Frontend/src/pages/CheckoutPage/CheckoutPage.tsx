import { Dispatch, StateUpdater, useEffect, useState } from "preact/hooks"
import { Footer } from "../../global_components/Footer/Footer"
import { Header } from "../../global_components/Header/Header"
import "./CheckoutPage.css"
import { Arrow } from "../ProductPreviewPage/ProductPreview"
import { Link } from "react-router-dom"
import creditImg from "../../assets/credit.png"
import bitImg from "../../assets/bit.png"
import { shouldProcessLinkClick } from "react-router-dom/dist/dom"

const PAGES_AMOUNT = 4
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
            {/* <Header shouldShowCartIcon={false} /> */}
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
                    {currentPage === 2 && <Payment />}
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

const PageButton: React.FC<{ setShouldShowErrors: Dispatch<StateUpdater<boolean>>, currentPage: number, setCurrentPage: Dispatch<StateUpdater<number>>, valid?: boolean, title: string, calcPage: (v: number) => number }> = ({ currentPage, setCurrentPage, valid, calcPage, title, setShouldShowErrors }) => {
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

const Payment: React.FC = () => {
    const [selected, setSelected] = useState(0)

    return <>
        <div className={"checkout-section-title"}>אמצעי תשלום</div>
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
        {selected === 0 && <CreditPayment />}
    </>
}

type CreditInformation = {
    number: string,
    date: string,
    code: string,
    owner: string
}

const CreditPayment: React.FC = () => {
    const [info, setInfo] = useState<CreditInformation>({
        number: "",
        date: "",
        code: "",
        owner: ""
    })

    return <div className={"checkout-credit-content"}>
        <Input value={info.number} setValue={(value) => setInfo({ ...info, number: value })} title="מספר כרטיס" name="credit-number" placeholder="מספר כרטיס" type="number" warning="יש למלא מספר כרטיס תקין." check={() => true} />
        <div class="checkout-input-wrapper">
            <Input value={info.date} setValue={(value) => setInfo({ ...info, date: value })} title="תאריך תפוגה" placeholder="MM / YY" name="credit-date" type="number" warning="יש למלא תאריך תפוגה תקין." check={()=> true} />
            <Input value={info.code} setValue={(value) => setInfo({ ...info, code: value })} title="קוד אבטחה (CVV)" placeholder="XXX" name="credit-code" type="number" warning="יש למלא קוד אבטחה תקין (CVV)." check={()=> true}/>
        </div>
        <Input value={info.owner} setValue={(value) => setInfo({ ...info, owner: value })} title="שם בעל/ת הכרטיס" name="credit-owner" placeholder="שם מלא" type="number" warning="יש למלא את השם שלך כפי שהוא מוצג בכרטיס" check={()=> true} />
    </div>
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
    "address":  (value: string) => (value ?? "").length > 0,
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

const PersonlInfo: React.FC<{ shouldShowErrors: boolean, info: PersonalInformation, setInfo: Dispatch<StateUpdater<PersonalInformation>>, setIsValid: (value: boolean) => void }> = ({ setIsValid, info, setInfo, shouldShowErrors}) => {
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
        <Input shouldShowError={shouldShowErrors} value={info.name} setValue={(value) => { setInfo({ ...info, name: value }) }} name="name" title="שם פרטי" placeholder="שם פרטי" check={Validations["name"]}/>
        <Input shouldShowError={shouldShowErrors} value={info.lastname} setValue={(value) => { setInfo({ ...info, lastname: value }) }} name="lastname" title="שם משפחה" placeholder="שם משפחה" check={Validations["lastname"]}/>
        <div class={"checkout-section-title"}>פרטי המשלוח</div>
        <Input setValue={() => { }} name="region" title="מדינה/אזור" value="ישראל" disabled={true} />
        <Input shouldShowError={shouldShowErrors} value={info.address} setValue={(value) => { setInfo({ ...info, address: value }) }} name="address" title="כתובת מגורים" placeholder="כתובת מגורים (עיר + רחוב)" warning="יש למלא את כתובת המגורים" check={Validations["address"]}/>
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

const DeliveryInfo: React.FC<{ selected: number, setSelected: Dispatch<StateUpdater<number>> }> = ({ selected, setSelected }) => {
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

const isFunc = (obj: any)=>{
    return typeof obj === "function"
}

const Input: React.FC<{ shouldShowError?: boolean, flipped?: boolean, title?: string, value: any, setValue: (value: any) => void, apply?: (v: any) => any, placeholder?: string, warning?: string, check?: (v: string) => boolean, type?: string, disabled?: boolean, name: string }> = ({ title, placeholder, type, check, warning, disabled, value, setValue, name, apply, flipped, shouldShowError }) => {
    const [isValid, setIsValid] = useState(isFunc(check) ? check!(isFunc(apply) ? apply!(value) : value) : false)

    console.log(title+"->isValid: "+isValid+", showError:"+shouldShowError)
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