import { useEffect, useState } from "preact/hooks"
import "./Input.css"

type InputArgs = {
    shouldShowError?: boolean;
    flipped?: boolean;
    title?: string;
    value?: any;
    setValue?: (value: any) => void;
    apply?: (v: any) => any;
    placeholder?: string;
    warning?: string;
    check?: (v: string) => boolean;
    type?: string;
    forceWarning?: boolean;
    disabled?: boolean;
    name: string;
    info?: any;
    key?: string;
}

export const useInput: (props: InputArgs) => any = (args) => {
    const [value, setValue] = useState()
    return {
        args,
        value: args.info[String(args.key)],
        setValue: (value: any) => { args.setValue!({ ...args.info, [String(args.key ?? "")]: value }) }
    }
}

const isNil = (value: any)=> value === undefined || value === null;

const isValueValid = (value: any, check?: (v: any) => any, apply?: (v: any) => any, key?: any) => {
    if (isNil(value)) {
        return false
    }

    let returnValue = key ? value[key] : value

    if (isFunc(check)) {
        return check!(isFunc(apply) ? apply!(returnValue) : returnValue)
    }
    return false
}

export const Input: React.FC<InputArgs> = ({forceWarning, key, title, placeholder, type, check, warning, disabled, value, setValue, name, apply, flipped, shouldShowError}) => {
    const [isValid, setIsValid] = useState(isValueValid(value, check, apply, key))

    return <div className={"baka-input " + (shouldShowError && !isValid ? "invalid" : "") + (disabled ? " disabled" : "") + (flipped ? " flipped" : "")}>
        {title && <div className={"baka-input-title"}>{title}</div>}
        <input onInput={(e) => {
            let newValue = apply ? apply(e.currentTarget.value) : e.currentTarget.value
            if (!disabled) {
                if (check) {
                    setIsValid(check(newValue))
                }
                setValue!(key ? { ...value, [key]: newValue } : newValue)
                e.currentTarget.value = newValue
            }
        }} name={name} placeholder={placeholder ?? ""} type={type ?? "text"} disabled={disabled === true} value={key ? value[key] : value ?? ""} />
        {(forceWarning === true || (!isValid && (value !== "")) || (shouldShowError && !isValid)) && <div className={"baka-input-hint"}>{warning ?? ""}</div>}
    </div>
}

const isFunc = (obj: any) => {
    return typeof obj === "function"
}