import { StateUpdater, useState } from "preact/hooks";
import { useRef, useEffect, Dispatch } from "react"
import "./DropDown.css"
import { Arrow } from "../../pages/ProductPreviewPage/ProductPreview";

type DropDownProps = {
    selected: number;
    didSelect: Dispatch<StateUpdater<number>>;
    options: Array<any>;
}

export const DropDown: React.FC<DropDownProps> = ({ selected, didSelect, options }) => {
    const [isOpened, setIsOpened] = useState(false);
    const container = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClickOutside: (e: MouseEvent) => void = (e) => {
            if (container.current && !container.current.contains(e.target as Node)) {
                setIsOpened(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    });
    return (
        <div className={"baka-dropdown no-select" + (isOpened ? " opened " : "")} ref={container} onClick={() => {setIsOpened((current) => !current);}}>
            <div>
                <span>{options[selected]}</span>
                <Arrow rotate={isOpened ? 90 : -90} />
            </div>
            <div className={"baka-dropdown-options" + (isOpened ? " opened" : "")}>
                {options.map((item, index) => {
                    return (
                        <div
                            className={
                                "baka-dropdown-option" + (index === selected ? " selected" : "")
                            }
                            onClick={() => {
                                didSelect(index);
                            }}
                        >
                            <span>{item}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
