import { Dispatch, useEffect, useRef, useState } from "react"
import { Arrow } from "../../pages/ProductPreviewPage/ProductPreview"
import "./AutoCompleteDropDown.css"
import { StateUpdater } from "preact/hooks"

const filterByString = (value: string, options: Array<string>) => {
    return options.filter((option) => {
        if (value === "") {
            return true
        }
        for (let val of value.split(" ")) {
            if (String(option).includes(val)) {
                return true
            }
        }
        return false
    })
}

export const AutoCompleteDropDown: React.FC<{value: string, setValue: (v: string)=> void, placeholder?: string, options: Array<string> }> = ({value, setValue, placeholder, options }) => {
    const ref = useRef<HTMLDivElement | null>(null)
    const [opened, setOpened] = useState(false)
    const [filteredOptions, setFilteredOptions] = useState<Array<string>>(options)
    const isValidSelection = useRef(false)
    const [preferedSelected, setPreferedSelected] = useState(0)

    useEffect(() => {
        setFilteredOptions(filterByString(value, options))
        console.log(value)
    }, [options, value])

    useEffect(() => {
        const clickOut = (e: Event) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpened(false)
                if (!isValidSelection.current) {
                    setValue("")
                }
            }
        }

        const onKeyPress = (e: KeyboardEvent) => {
            switch (e.code) {
                case "Enter":
                    var input = ref.current?.querySelector("input")
                    var filtered = filterByString(input?.value ?? "", options)
                    if (filtered.length > 0) {
                        setValue(filtered[0])
                    }
                    setOpened(false)
                    isValidSelection.current = true
                    input?.blur()
                    break
                case "Escape":
                    ref.current?.querySelector("input")?.blur()
                    setOpened(false)
                    setValue("")
                    isValidSelection.current = false
                    break
                case "ArrowDown":
                case "ArrowUp":
                    let direction = e.code === "ArrowDown" ? 1 : -1
                    var input = ref.current?.querySelector("input")
                    var filtered = filterByString(input?.value ?? "", options)
                    setPreferedSelected((current) => {
                        let next = current + direction
                        if (next >= options.length) {
                            next = 0
                        } else if (next < 0) {
                            next = options.length - 1
                        }
                        return next
                    })
                    break
            }
        }

        window.addEventListener("keyup", onKeyPress)
        window.addEventListener("mousedown", clickOut)
        window.addEventListener("touchdown", clickOut)
        return () => {
            window.removeEventListener("mousedown", clickOut)
            window.removeEventListener("touchdown", clickOut)
            window.removeEventListener("keyup", onKeyPress)
        }
    }, [])

    return <div class={"baka-auto-drop" + (opened ? " opened" : "")} ref={ref}>
        <div>
            <input value={value} onInput={(e) => { isValidSelection.current = false; setValue(e.currentTarget.value); setPreferedSelected(0) }} placeholder={placeholder ?? "בחר"} onFocus={() => setOpened(true)} />
            <Arrow rotate={opened ? 90 : -90} />
        </div>
        <div class={"baka-auto-drop-options" + (opened ? " opened" : "")}>{

            filteredOptions.length > 0 ?

                <>
                    {filteredOptions.map((option, index) =>
                        <AutoCompeleItem selected={Math.min(preferedSelected, filteredOptions.length - 1) === index} value={option} didSelect={() => {
                            setValue(option)
                            isValidSelection.current = true
                            setOpened(false)
                        }} />
                    )}
                    {
                        value !== "" && !filteredOptions.find((v)=> v.trim() === value.trim()) &&
                        <AutoCompeleItem title={"הוסף \"" + value + '\"'} value={value} didSelect={() => {
                            setValue(value)
                            setOpened(false)
                            isValidSelection.current = true
                        }
                        } />}
                </> : <AutoCompeleItem selected={true} title={"הוסף \"" + value + '\"'} value={value} didSelect={() => {
                    setValue(value)
                    setOpened(false)
                    isValidSelection.current = true
                }} />
        }
        </div>
    </div>
}

const AutoCompeleItem: React.FC<{ selected?: boolean, title?: string, value: string, didSelect: () => void }> = ({ selected, title, value, didSelect }) => {
    return <div class={"baka-auto-drop-option " + (selected === true ? "selected" : "")} onClick={didSelect}>
        {title ? title : value}
    </div>
}