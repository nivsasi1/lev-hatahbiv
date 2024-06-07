// import { useEffect, useState } from "preact/hooks";
import { Link } from "react-router-dom";
import SectionMenuList from "./menu.json"

interface SectionsMenuItem {
    title: string;
    route: string;
    options?: Array<{ optionTitle?: string, route?: string }>;
}

export const SectionsMenu: React.FC = () => {
    // const [setctionMenuTitles, setSectionMenuTitles] = useState<SectionMenuItem[]>({});
    // useEffect({
    //     const setctionData = await getSetctionMenuTitles();
    //     if (sectionData.data){setSectionMenuTitles(sectionData.data)}
    // },[]);
    // let data = JSON.parse(SectionMenuList)
    // console.log(SectionMenuList)
    // // let data = SectionMenuList as Array<any>

    return (<div className={"sections-menu"}>
        {SectionMenuList.map((section) => {
            // console.log(section)
            return (<SectionsMenuItem title={section.title} route={section.route} options={section.options} />)
        }
        )}
        {/* <SectionsMenuItem title={"צבעים לאומנות"} options={["wow"]}/> */}
    </div>)
}
//            {/* <span><Link to={`/catagory?${route}`}>{title}</Link></span> */}   

const SectionsMenuItem: React.FC<SectionsMenuItem> = ({ title, route, options }) => {
    // console.log(title, route, options)
    return (<div className={"sections-menu-item"}>
        <span><Link to={`/category?cat=${title}&sub_cat=0`}>{title}</Link></span>
        <div className={"sections-menu-list"}>
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
