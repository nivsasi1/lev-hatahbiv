import { useReducer, useState } from "preact/hooks";
import { useRef } from "react";
import { useEffect } from "preact/hooks";
import CartPng from "../../assets/1.png";

type Product = {
  category: number;
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
          productAmount: 3,
          subsLength: 0,
        },
        {
          name: "שפכטלים איטלקים",
          productAmount: 2,
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

const CategoryPage: React.FC<{
  category: number;
  subCategory: number;
  thirdLevel: number;
}> = ({ category, subCategory, thirdLevel }) => {
  const [title, setTitle] = useState<string>("מכחולים ואביזרים");
  const [currentSection, setCurrentSection] = useState<number>(0);
  //   const [currentSubSection, setSubCurrentSection] = useState<number>(0);
  const [sections, setSections] = useState<Array<string> | undefined>();
  const [products, setProducts] = useState<Array<Product | any>>();
  const [tree, setTree] = useState<Tree | undefined | any>();

  useEffect(() => { }, [currentSection]);

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
  let repeats = 1

  if (!isNil(tree) && !isNil(tree!.subs) && tree!.subsLength > 0) {
    sectionsAvailable = true;
    sections = tree!.subs!;
  }

  if (sectionsAvailable && !isNil(sections![currentSection])) {
    console.log("not nil");
    if (sections![currentSection]!.subsLength > 0) {
      subSectionsAvailable = true;
      subSections = sections![currentSection]!.subs;
      if (subSections) {
        repeats = subSections!.length;
      }
    }
  }

  return (
    <>
      {sectionsAvailable ? (
        subSectionsAvailable ? (
          subSections?.map((subSection) => {
            return (
              <>
                <div className={"products-title"}>{subSection?.name}</div>
                <ProductsViewFiltered
                  products={products}
                  filter={(p) => {
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
          maxAmount={tree!.productAmount}
        />
      )}
    </>
  );
};

const ProductsViewFiltered: React.FC<{
  products: Array<Product> | undefined;
  filter: (p: Product) => boolean;
  maxAmount: number,
}> = ({ products, filter, maxAmount = 5}) => {
  const [availableProducts, setAvailableProducts] = useState<Array<Product> | undefined>()

  useEffect(()=>{
    setAvailableProducts(products?.filter(filter).map((p)=> p))
  }, [products])

  return (
    <div className={"products"}>
      {availableProducts?.map((p) => {
        return (
          <ProductView
            title={p.name}
            imgSrc={p.img}
            price={p.price}
            isAdded={false}
            onClick={() => { }}
          />
        );
      })}
      {
        maxAmount > (availableProducts?.length ?? 0) &&
        <div className={"load-more"}>טען עוד</div>
      }
    </div>
  );
};

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
  const img = useRef<HTMLImageElement | null>(null);

  return (
    <a href="/product" className={"product-container"}>
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
