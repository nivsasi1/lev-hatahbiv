import { useReducer, useState } from "preact/hooks";
import { useEffect } from "preact/hooks";
import CartPng from "../../assets/1.png";

type Product = {
    category: number;
    sub_cat: number | undefined;
    third_level: number | undefined;
    price: number;
    name: string;
    img: string;
};

type Tree = {
    name: string;
    subAmount: number;
    subsLength: number;
    subs?: Array<Tree>;
};

const CONSEPT_TREE: Tree = {
    name: "מכחולים ואביזרים",
    subAmount: 2,
    subsLength: 1,
    subs: [
        {
            name: "שפכטלים",
            subAmount: 5,
            subsLength: 1,
            subs: [
                {
                    name: "שפכטלים יוונים",
                    subAmount: 3,
                    subsLength: 0
                },
                {
                    name: "שפכטלים איטלקים",
                    subAmount: 2,
                    subsLength: 0
                }
            ]
        },
        {
            name: "מכחולים",
            subAmount: 0,
            subsLength: 0
        }
    ]
}

const PRODUCTS: Array<Product> = [
    {
        category: 0,
        sub_cat: 0,
        third_level: 0,
        price: 17,
        name: "wow",
        img: "",
    },
    {
        category: 0,
        sub_cat: 0,
        third_level: 0,
        price: 12,
        name: "damm",
        img: "",
    },
    {
        category: 0,
        sub_cat: 0,
        third_level: 0,
        price: 12,
        name: "shriki",
        img: "",
    },
    {
        category: 0,
        sub_cat: 0,
        third_level: 1,
        price: 12,
        name: "freaky",
        img: "",
    },
    {
        category: 0,
        sub_cat: 1,
        third_level: 0,
        price: 12,
        name: "pele",
        img: "",
    },
    {
        category: 0,
        sub_cat: 1,
        third_level: 0,
        price: 12,
        name: "shahar",
        img: "",
    },
];

const CategoryPage: React.FC<{
    category: number;
    subCategory: number;
    thirdLevel: number;
}> = ({ category, subCategory, thirdLevel }) => {
    const [title, setTitle] = useState<string>("מכחולים ואביזרים");
    const [currentSection, setCurrentSection] = useState<number>(0);
    //   const [currentSubSection, setSubCurrentSection] = useState<number>(0);
    const [sections, setSections] = useState<Array<string>>([
        "שפכטלים",
        "מכחולים",
        "חומרי עזר",
    ]);
    const [products, setProducts] = useState<Array<Product>>(PRODUCTS);
    const [tree, setTree] = useState<Tree | undefined>(CONSEPT_TREE);

    useEffect(() => { }, [currentSection]);

    useEffect(() => {
        //fetch -> structure
        //fetch category tree
        //fetch products - category & sub
        //fetch products - category & sub & subsub
    }, []);

    return (
        <div className={"category-page"}>
            <div className={"category-title"}>{title}</div>
            <div className={"sub-categories"}>
                {sections.map((section, index) => {
                    return (
                        <SubCategoryButton
                            title={section}
                            id={index}
                            isSelected={currentSection === index}
                            setSection={setCurrentSection}
                        />
                    );
                })}
            </div>
            {sections.length > 0 && (
                <div className={"sub-category-title"}>{sections[currentSection]}</div>
            )}
            <ProductsView currentSection={currentSection} tree={tree} products={products} />
        </div>
    );
};

const isNil = (obj: any) => {
    return obj === undefined || obj === null
}

const ProductsView: React.FC<{ currentSection: number, tree: Tree | undefined, products: Array<Product> }> = ({ currentSection, tree, products }) => {
    //Sub Category
    let sectionsAvailable = false
    //Third Level
    let subSectionsAvailable = false
    let sections: Array<Tree | undefined> | undefined
    let subSections: Array<Tree | undefined> | undefined

    if (!isNil(tree) && !isNil(tree!.subs) && tree!.subsLength > 0) {
        sectionsAvailable = true
        sections = tree!.subs!
    }

    if (sectionsAvailable && !isNil(sections![currentSection])) {
        console.log("not nil")
        if (sections![currentSection]!.subsLength > 0) {
            subSectionsAvailable = true
            subSections = sections![currentSection]!.subs
        }
    }

    return (<>
        {
            sectionsAvailable ?
                (
                    subSectionsAvailable ? (
                        subSections?.map((subSection, index) => {
                            return <>
                                <div className={"products-title"}>{subSection?.name}</div>
                                <div className={"products"}>
                                    {
                                        products.filter((p) => {
                                            return p.sub_cat === currentSection && p.third_level === index
                                        }).map((p) => {
                                            return <ProductView title={p.name} imgSrc={CartPng} price={p.price} isAdded={false} onClick={() => { }} />
                                        })
                                    }
                                </div>
                            </>
                        })) : (
                        sections!.length > currentSection ?
                            <div className={"products"}>
                                {
                                    products.filter((p) => {
                                        return p.sub_cat === currentSection
                                    }).map((p) => {
                                        return <ProductView title={p.name} imgSrc={CartPng} price={p.price} isAdded={false} onClick={() => { }} />
                                    })
                                }
                            </div>
                            : <div className={"products-title"}>unavailable</div>
                    )
                ) : (
                    <div className={"products"}>
                        {products.map((p) => { return <ProductView title={p.name} imgSrc={CartPng} price={p.price} isAdded={false} onClick={() => { }} /> })}
                    </div>
                )
        }
    </>)
}

// const ProductCollection: React.FC = ()=>{}

const ProductView: React.FC<{
    title: string;
    imgSrc: string;
    price: number;
    desc?: string;
    isAdded: boolean;
    onClick: () => void;
}> = ({ title, price, imgSrc, isAdded, onClick }) => {
    let actualTitle = title ?? "";
    if (actualTitle.length > 26) {
        actualTitle = actualTitle.slice(0, 22) + "...";
    }
    const [isActivated, setIsActivated] = useState(isAdded);

    return (
        <a href="/product" className={"product-container"}>
            <div className={"product"}>
                <div className={"product-img"}>
                    <img src={imgSrc} />
                </div>
                <div className={"product-title"}>{actualTitle}</div>
                <div className={"product-bottom"}>
                    <div
                        className={"product-add " + (isActivated ? "added" : "")}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClick();
                            // setIsActivated(!isActivated)
                            setIsActivated(true);
                        }}
                    >
                        {isActivated ? "נתווסף" : "הוסף"}
                    </div>
                    <div>{price + "₪"}</div>
                </div>
            </div>
        </a>
    );
};

const SubCategoryButton: React.FC<{
    title: string;
    id: number;
    isSelected: boolean;
    setSection: (v: number) => void;
}> = ({ isSelected, title, id, setSection }) => {
    return (
        <div
            onClick={() => {
                setSection(id);
            }}
            className={
                isSelected ? "sub-category-button selected" : "sub-category-button"
            }
        >
            {title}
        </div>
    );
};
export default CategoryPage;
