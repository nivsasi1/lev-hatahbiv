// import { useEffect, useState } from "preact/hooks";
import { Link } from "react-router-dom";

interface SectionsMenuItem {
    title: string;
    options?: Array<{optionTitle: String, route: String}>;
}

export const SectionsMenu: React.FC = () => {
    // const [setctionMenuTitles, setSectionMenuTitles] = useState<SectionMenuItem[]>({});
    // useEffect({
    //     const setctionData = await getSetctionMenuTitles();
    //     if (sectionData.data){setSectionMenuTitles(sectionData.data)}
    // },[]);
    // const SectionMenuList = {
    //     {title}
    // }
    return (<div className={"sections-menu"}>
        {/* sectionMenuTitles.map((SectionsMenuItem) => {<SectionsMenuItem title={SectionMenuItem.title} options={SectionMenuItem.options}/>}) */}
        <SectionsMenuItem title={"צבעים לאומנות"} options={["wow"]}/>
    </div>)
}


const SectionsMenuItem: React.FC<SectionsMenuItem> = ({ title, options }) => {
    return (<div className={"sections-menu-item"}>
        <span>{title}</span>
        <div className={"sections-menu-list"}>
            <span>{title}</span>
            <div>
            {
                options?.map((option) => {
                    return <Link to={`/catagory?${option.route}`}>{option.optionTitle}</Link>
                })
            }</div>
        </div>
    </div>)
}

export default SectionsMenu;
