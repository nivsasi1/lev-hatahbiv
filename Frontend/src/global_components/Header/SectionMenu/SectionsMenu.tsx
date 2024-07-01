// import { useEffect, useState } from "preact/hooks";
import { Link } from "react-router-dom";
import SectionMenuList from "./menu.json"
import { Dispatch, StateUpdater, useEffect, useRef, useState } from "preact/hooks";
import { Arrow } from "../../../pages/ProductPreviewPage/ProductPreview";

interface SectionsMenuItem {
    title: string;
    route: string;
    options?: Array<{ optionTitle?: string, route?: string }>;
}

export const SectionsMenu: React.FC<{ visible: boolean, setVisible: Dispatch<StateUpdater<boolean>> }> = ({ visible, setVisible }) => {
    const ref = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const clickOut = (e: Event) => {
            let target = (e.target as HTMLElement)
            if (target instanceof HTMLElement && (target.className.includes("menu-toggle-button") || (target.parentElement && target.parentElement.className.includes("menu-toggle-button")))) {
                return;
            }
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setVisible(false)
            }
        }

        window.addEventListener("mousedown", clickOut)
        window.addEventListener("touchstart", clickOut)
        return () => {
            window.removeEventListener("mousedown", clickOut)
            window.removeEventListener("touchstart", clickOut)
        }
    })

    return (<div className={"sections-menu " + (visible ? "visible" : "")} ref={ref}>
        <>
            {SectionMenuList.map((section) => {
                return (<SectionsMenuItem title={section.title} route={section.route} options={section.options} />)
            }
            )}
            <SectionsMenuItemNoOptions title="אודותינו" route="about"/>
        </>
    </div>)
}

const SectionsMenuItemNoOptions: React.FC<{ title: string, route: string  }> = ({ title, route}) => {
    return <div className={"sections-menu-item no-select"}>
        <span>
            <Link to={`/`+route}>{title}</Link>
        </span>
    </div>
}

const SectionsMenuItem: React.FC<SectionsMenuItem> = ({ title, route, options }) => {
    const [expanded, setExpanded] = useState(false)

    return (<div className={"sections-menu-item no-select"} onClick={() => { setExpanded((v) => !v) }}>
        <span>
            <Link to={`/category?cat=${title}&sub_cat=0`}>{title}</Link>
            <Arrow rotate={expanded ? -90 : 0} className={"sections-menu-item-arrow"} />
        </span>
        <div className={"sections-menu-list" + (expanded ? " expanded" : "")}>
            <div>
                <span>{title}</span>
                <div className={"sections-menu-list-subs"}>
                    {
                        options?.map((option) => {
                            return <Link to={`/category?cat=${title}&sub_cat=${option.optionTitle}`}>{option.optionTitle}</Link>
                        })
                    }</div>

            </div>
        </div>
    </div>)
}

export default SectionsMenu;
