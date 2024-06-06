import { useReducer, useState } from "preact/hooks";
import { useRef } from "react";
import { useEffect } from "preact/hooks";
// import CartPng from "../../assets/1.png";
import { Arrow } from "../ProductPreview/ProductPreview";
import { Link } from "react-router-dom";

type Product = {
  _id: string;
  category: string;
  sub_cat: string | undefined;
  third_level: string | undefined;
  price: number;
  name: string;
  img: string;
};

type Tree = {
  name: string;
  productAmount: number;
  subsLength: number;
  subs?: Array<Tree>;
};

const CONSEPT_TREE: Tree = {
  name: "מכחולים ואביזרים",
  productAmount: 2,
  subsLength: 1,
  subs: [
    {
      name: "שפכטלים",
      productAmount: 5,
      subsLength: 1,
      subs: [
        {
          name: "שפכטלים יוונים",
          productAmount: 11,
          subsLength: 0,
        },
        {
          name: "שפכטל איטלקי",
          productAmount: 20,
          subsLength: 0,
        },
      ],
    },
    {
      name: "מכחולים",
      productAmount: 0,
      subsLength: 0,
    },
  ],
};

// const PRODUCTS: Array<Product> = [
//   {
//     name: "שפכטל - ספטולה דגם 1",
//     price: 43.2,
//     category: "מכחולים ואביזרים",
//     sub_cat: "שפכטלים",
//     third_level: "שפכטל איטלקי",
//     img: "1.png",
//   },
//   {
//     name: "שפכטל - ספטולה דגם 24",
//     price: 22,
//     category: "מכחולים ואביזרים",
//     sub_cat: "שפכטלים",
//     third_level: "שפכטל איטלקי",
//     img: "2.png",
//   },
//   {
//     name: "שפכטל - ספטולה דגם 28",
//     price: 22,
//     category: "מכחולים ואביזרים",
//     sub_cat: "שפכטלים",
//     third_level: "שפכטל איטלקי",
//     img: "3.png",
//   },
//   {
//     name: "שפכטל - ספטולה דגם 10",
//     price: 22,
//     category: "מכחולים ואביזרים",
//     sub_cat: "שפכטלים",
//     third_level: "שפכטל איטלקי",
//     img: "4.png",
//   },
//   {
//     name: "שפכטל - ספטולה דגם 23",
//     price: 22,
//     category: "מכחולים ואביזרים",
//     sub_cat: "שפכטלים",
//     third_level: "שפכטל איטלקי",
//     img: "5.png",
//   },
//   {
//     name: "שפכטל - ספטולה דגם 2",
//     price: 22,
//     category: "מכחולים ואביזרים",
//     sub_cat: "שפכטלים",
//     third_level: "שפכטל איטלקי",
//     img: "6.png",
//   },
//   {
//     name: "שפכטל - ספטולה דגם 26",
//     price: 22,
//     category: "מכחולים ואביזרים",
//     sub_cat: "שפכטלים",
//     third_level: "שפכטל איטלקי",
//     img: "7.png",
//   },
//   {
//     name: "שפכטל - ספטולה דגם 22",
//     price: 22,
//     category: "מכחולים ואביזרים",
//     sub_cat: "שפכטלים",
//     third_level: "שפכטל איטלקי",
//     img: "8.png",
//   },
//   {
//     name: "שפכטל - ספטולה דגם 8",
//     price: 22,
//     category: "מכחולים ואביזרים",
//     sub_cat: "שפכטלים",
//     third_level: "שפכטל איטלקי",
//     img: "9.png",
//   },
//   {
//     name: "שפכטל - ספטולה דגם 12",
//     price: 22,
//     category: "מכחולים ואביזרים",
//     sub_cat: "שפכטלים",
//     third_level: "שפכטל איטלקי",
//     img: "10.png",
//   },
// ];

const CategoryPage: React.FC<{
  category: string;
  subCategory: string | undefined;
}> = ({ category, subCategory }) => {
  const [title, setTitle] = useState<string>("מכחולים ואביזרים");
  const [currentSection, setCurrentSection] = useState<number>(0);
  //   const [currentSubSection, setSubCurrentSection] = useState<number>(0);
  const [sections, setSections] = useState<Array<string> | undefined>([
    "שפכטלים",
  ]);
  const [products, setProducts] = useState<Array<Product | any>>();
  const [tree, setTree] = useState<Tree | undefined | any>();

  useEffect(() => {}, [currentSection]);

  const fetchTreeData = async () => {
    const treeData = await fetch(
      `http://localhost:5000/getTree/` + "מכחולים ואביזרים",
      { method: "GET" }
    );
    return treeData;
  };
  const fetchProductsData = async () => {
    const productsData = await fetch(
      `http://localhost:5000/getProducts/` + "מכחולים ואביזרים",
      { method: "GET" }
    );
    return productsData;
  };
  const fetchData = async () => {
    const [treeData, productsData] = await Promise.all([
      fetchTreeData(),
      fetchProductsData(),
    ]);
    return { treeData, productsData };
  };

  useEffect(() => {
    //fetch -> structure
    //fetch category tree
    //fetch products - category & sub
    //fetch products - category & sub & subsub
    // return;
    const fetchDataAndSetState = async () => {
      const { treeData, productsData } = await fetchData();
      const treeJson = await treeData.json(); // Extract JSON data from response
      console.log(treeJson);
      setTree(treeJson.data); // Pass JSON data to setTree function
      const productsJson = await productsData.json(); // Extract JSON data from response
      console.log(productsJson);
      setProducts(productsJson.data);
      setSections(treeJson.data.subs.map((sub: any) => sub.name));
    };
    fetchDataAndSetState();
  }, []);

  return (
    <div className={"category-page"}>
      <div className={"category-title"}>{title}</div>
      <div className={"sub-categories"}>
        {sections
          ? sections.map((section, index) => {
              return (
                <SubCategoryButton
                  title={section}
                  id={index}
                  isSelected={currentSection === index}
                  setSection={setCurrentSection}
                />
              );
            })
          : ""}
      </div>
      {sections && sections.length > 0 && (
        <div className={"sub-category-title"}>{sections![currentSection]}</div>
      )}
      <ProductsView
        currentSection={currentSection}
        tree={tree}
        products={products}
      />
    </div>
  );
};

const isNil = (obj: any) => {
  return obj === undefined || obj === null;
};

const ProductsView: React.FC<{
  currentSection: number;
  tree: Tree | undefined;
  products: Array<Product> | undefined;
}> = ({ currentSection, tree, products }) => {
  if (!products) {
    return <></>;
  }

  //Sub Category
  let sectionsAvailable = false;

  //Third Level
  let subSectionsAvailable = false;
  let sections: Array<Tree | undefined> | undefined;
  let subSections: Array<Tree | undefined> | undefined;

  if (!isNil(tree) && !isNil(tree!.subs) && tree!.subsLength > 0) {
    sectionsAvailable = true;
    sections = tree!.subs!;
  }

  if (
    sectionsAvailable &&
    !isNil(sections![currentSection]) &&
    sections![currentSection]?.subs![0]?.name !== ""
  ) {
    if (sections![currentSection]!.subsLength > 0) {
      subSectionsAvailable = true;
      subSections = sections![currentSection]!.subs;
    }
  }

  return (
    <>
      {sectionsAvailable ? (
        subSectionsAvailable ? (
          subSections?.map((subSection) => {
            return (
              <>
                <div className={"products-title"}>
                  <span>
                    {subSection?.name +
                      " - " +
                      subSection!.productAmount +
                      " מוצרים"}
                  </span>
                  <Arrow />
                </div>
                <ProductsViewFiltered
                  products={products}
                  filter={(p) => {
                    console.log(
                      `\t${p.sub_cat} === ${
                        sections![currentSection]!.name
                      } \n\t ${p.third_level} === ${subSection?.name}`
                    );
                    return (
                      p.sub_cat === sections![currentSection]!.name &&
                      p.third_level === subSection?.name
                    );
                  }}
                  maxAmount={subSection!.productAmount}
                />
              </>
            );
          })
        ) : sections!.length > currentSection ? (
          <ProductsViewFiltered
            products={products}
            filter={(p) => {
              return p.sub_cat === sections![currentSection]?.name;
            }}
            maxAmount={sections![currentSection]!.productAmount}
          />
        ) : (
          <div className={"products-title"}>unavailable</div>
        )
      ) : (
        <ProductsViewFiltered
          filter={() => {
            return true;
          }}
          products={products}
          maxAmount={tree?.productAmount ?? 0}
        />
      )}
    </>
  );
};

const ProductsViewFiltered: React.FC<{
  products: Array<Product> | undefined;
  filter: (p: Product) => boolean;
  maxAmount: number;
}> = ({ products, filter, maxAmount }) => {
  const [availableProducts, setAvailableProducts] = useState<
    Array<Product> | undefined
  >();
  const [loadedAmount, setLoadedAmount] = useState(5);

  useEffect(() => {
    setAvailableProducts(products?.filter(filter).map((p) => p));
    setLoadedAmount(Math.min(maxAmount, 5));
    console.log("\tmaxAmount: " + maxAmount);
  }, [filter]);

  return (
    <div className={"products"}>
      <div>
        {availableProducts?.slice(0, loadedAmount).map((p) => {
          return (
            <>
              <ProductView
                title={p.name}
                id={p._id}
                imgSrc={p.img}
                price={p.price}
                isAdded={false}
                onClick={() => {}}
              />
            </>
          );
        })}
      </div>
      {maxAmount > (loadedAmount ?? 0) && (
        <div
          className={"load-more"}
          onClick={() => {
            setLoadedAmount((last) => Math.min(maxAmount, last + 10));
          }}
        >
          טען עוד
        </div>
      )}
    </div>
  );
};

// const ProductCollection: React.FC = ()=>{}

const ProductView: React.FC<{
  title: string;
  id: string;
  imgSrc: string;
  price: number;
  desc?: string;
  isAdded: boolean;
  onClick: () => void;
}> = ({ title, id, price, imgSrc, isAdded, onClick }) => {
  let actualTitle = title ?? "";
  if (actualTitle.length > 26) {
    actualTitle = actualTitle.slice(0, 22) + "...";
  }
  const [isActivated, setIsActivated] = useState(isAdded);
  const img = useRef<HTMLImageElement | null>(null);

  return (
    <Link to={`/product/${id}`} className={"product-container"}>
      <div className={"product"}>
        <div className={"product-img"}>
          <img
            src={"/images/" + imgSrc}
            ref={img}
            onError={() => {
              if (img.current) {
                img.current!.style.display = "none";
              }
            }}
            onLoad={() => {
              if (img.current) {
                img.current!.style.display = "block";
              }
            }}
            alt="Product Image"
          />
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
    </Link>
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
