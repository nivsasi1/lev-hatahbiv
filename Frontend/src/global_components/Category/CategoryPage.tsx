import { useContext, useReducer, useState } from "preact/hooks";
import { useRef } from "react";
import { useEffect } from "preact/hooks";
// import CartPng from "../../assets/1.png";
import { Arrow } from "../../pages/ProductPreviewPage/ProductPreview";
import { Link } from "react-router-dom";
import { TEST_VALUES } from "../../pages/Tests/test";
import { CartContext } from "../../context/cart-context";

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

const CategoryPage: React.FC<{
  category: string;
  subCategory: string | undefined;
}> = ({ category, subCategory }) => {
  const [title, setTitle] = useState<string>(category);
  const [currentSection, setCurrentSection] = useState<number>(0);
  const [sections, setSections] = useState<Array<string> | undefined>();
  const [products, setProducts] = useState<Array<Product | any>>();
  const [tree, setTree] = useState<Tree | undefined | any>();

  const fetchTreeData = async () => {
    // return {data: TEST_VALUES.tree}
    //TODO: revert
    const treeData = await fetch(`http://localhost:5000/getTree/${category}`, {
      method: "GET",
    }).then(res => res.json());
    return treeData;
  };
  const fetchProductsData = async () => {
    // return {data: TEST_VALUES.products}
    //TODO: revert...
    const productsData = await fetch(
      `http://localhost:5000/getProducts/${category}/${subCategory}`,
      { method: "GET" }
    ).then(res => res.json())
    return productsData;
  };
  const fetchData = async () => {
    const [treeJson, productsJson] = await Promise.all([
      fetchTreeData(),
      fetchProductsData(),
    ]);
    return { treeJson, productsJson };
  };

  useEffect(() => {
    const fetchDataAndSetState = async () => {
      const { treeJson, productsJson } = await fetchData();
      setTree(treeJson.data);
      setProducts(productsJson.data);
      setSections(treeJson.data.subs?.map((sub: any) => sub.name));
      if (subCategory != "0" && subCategory != undefined) {
        setCurrentSection(
          treeJson.data.subs.findIndex((sub: any) => sub.name === subCategory)
        );
      }else{
        setCurrentSection(0)
      }
    };
    fetchDataAndSetState();
    setTitle(category);
  }, [category]);

  useEffect(() => {
    if (
      subCategory != "0" &&
      subCategory !== undefined &&
      sections &&
      sections?.length > 0
    ) {
      let index = sections.findIndex((sub: any) => sub === subCategory)
      setCurrentSection(
        index !== -1 ? index : 0
      );
    }else{
      setCurrentSection(0)
    }
  }, [subCategory]);

  return (
    <div className={"category-page"}>
      <div className={"category-title"}>{title}</div>
      <div className={"sub-categories"}>
        {sections
          ? sections.map((section, index) => {
              return (
                <SubCategoryButton
                  cat={category}
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
                      subSection?.productAmount +
                      " מוצרים"}
                  </span>
                  <Arrow />
                </div>
                <ProductsViewFiltered
                  products={products}
                  filter={(p) => {
                    // console.log(
                    //   `\t${p.sub_cat} === ${
                    //     sections![currentSection]!.name
                    //   } \n\t ${p.third_level} === ${subSection?.name}`
                    // );
                    return (
                      p.sub_cat === sections![currentSection]!.name &&
                      p.third_level === subSection?.name
                    );
                  }}
                  maxAmount={subSection?.productAmount ?? 0}
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
            maxAmount={sections![currentSection]?.productAmount ?? 0}
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
  const cartContext = useContext(CartContext)

  useEffect(() => {
    setAvailableProducts(products?.filter(filter).map((p) => p));
    setLoadedAmount(Math.min(maxAmount, 5));
    // console.log("\tmaxAmount: " + maxAmount);
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
                onClick={() => {
                  cartContext.addOrUpdate(p, 1)
                }}
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
interface ProductPreview {
  title: string;
  id: string;
  imgSrc: string;
  price: number;
  desc?: string;
  isAdded: boolean;
  onClick: () => void;
}

const ProductView: React.FC<ProductPreview> = ({
  title,
  id,
  price,
  imgSrc,
  isAdded,
  onClick,
}) => {
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
interface subCategoryButton {
  cat: string;
  title: string;
  id: number;
  isSelected: boolean;
  setSection: (v: number) => void;
}

const SubCategoryButton: React.FC<subCategoryButton> = ({
  cat,
  title,
  id,
  isSelected,
  setSection,
}) => {
  return (
    <div
      onClick={() => {
        window.history.pushState({}, "", `?cat=${cat}&sub_cat=${title}`);
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
