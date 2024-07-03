import { useContext, useReducer, useState } from "preact/hooks";
import { useRef } from "react";
import { useEffect } from "preact/hooks";
// import CartPng from "../../assets/1.png";
import { Arrow } from "../../pages/ProductPreviewPage/ProductPreview";
import { Link } from "react-router-dom";
// import { TEST_VALUES } from "../../pages/Tests/test";
import { CartContext } from "../../context/cart-context";
import { TEST_VALUES } from "../../pages/Tests/test";
import { Product } from "../../Types/globalTypes";
import "./CategoryPage.css"

// type Product = {
//   _id: string;
//   category: string;
//   sub_cat: string | undefined;
//   third_level: string | undefined;
//   price: number;
//   name: string;
//   img: string;
// };

type Tree = {
  name: string;
  productAmount: number;
  subsLength: number;
  subs?: Array<Tree>;
};

const CategoryContent: React.FC<{
  category: string;
  subCategory: string | undefined;
}> = ({ category, subCategory }) => {
  const [title, setTitle] = useState<string>(category);
  const [currentSection, setCurrentSection] = useState<number>(0);
  const [sections, setSections] = useState<Array<string> | undefined>();
  const [products, setProducts] = useState<Array<Product | any>>();
  const [tree, setTree] = useState<Tree | undefined | any>();

  const fetchTreeData = async () => {
    // return { data: TEST_VALUES.tree }
    //TODO: revert
    const treeData = await fetch(`http://localhost:5000/getTree/${category}`, {
      method: "GET",
    }).then((res) => res.json());
    return treeData;
  };
  const fetchProductsData = async () => {
    // return { data: TEST_VALUES.products }
    //TODO: revert...
    const productsData = await fetch(
      `http://localhost:5000/getProducts/${category}/${subCategory}`,
      { method: "GET" }
    ).then((res) => res.json());
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
      } else {
        setCurrentSection(0);
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
      let index = sections.findIndex((sub: any) => sub === subCategory);
      setCurrentSection(index !== -1 ? index : 0);
    } else {
      setCurrentSection(0);
    }
  }, [subCategory]);

  return (
    <div className={"category-page"}>
      <div className={"category-title"}>{title}</div>
      {/* <div className={"sub-categories"}> */}
      {
        <SubCategories category={category} sections={sections} selected={currentSection} setSelected={setCurrentSection} />
      }
      {/* {sections
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
          : ""} */}
      {/* </div> */}

      <ProductsView
        sectionTitle={sections ? sections[currentSection] : undefined}
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
  sectionTitle?: string;
  currentSection: number;
  tree: Tree | undefined;
  products: Array<Product> | undefined;
}> = ({ currentSection, tree, products, sectionTitle }) => {
  if (!products) {
    return <></>;
  }

  //Sub Category
  let sectionsAvailable = false;

  //Third Level
  let subSectionsAvailable = false;
  let sections: Array<Tree | undefined> | undefined;
  let subSections: Array<any | undefined> | undefined;
  const [subSectionsState, setSubSectionsState] = useState<Array<any>>([]);

  useEffect(() => {
    if (
      tree &&
      tree.subs &&
      tree.subs[currentSection] &&
      tree.subs[currentSection].subs
    ) {
      let subs_subs = tree.subs[currentSection].subs;
      setSubSectionsState(
        subs_subs!.map((subSection) => {
          return { ...subSection, show: true };
        })
      );
    } else {
      setSubSectionsState([]);
    }
  }, [tree, products, currentSection]);

  if (!isNil(tree) && !isNil(tree!.subs) && tree!.subsLength > 0) {
    sectionsAvailable = true;
    sections = tree!.subs!;
  }

  if (
    sectionsAvailable &&
    !isNil(sections![currentSection]) &&
    sections![currentSection]?.subs &&
    sections![currentSection]?.subs![0]?.name !== ""
  ) {
    if (sections![currentSection]!.subsLength > 0) {
      subSectionsAvailable = true;
      subSections = sections![currentSection]!.subs;
    }
  }

  return (
    <>
      <div class="filter-section">
        <svg viewBox={"0 0 100 100"} preserveAspectRatio={"none"}>
          <path d="M0,100 L100,100 L100,50 C70,20 30,80 0,90 Z" fill="var(--categories)"></path>
        </svg>
        {sectionTitle && (
          <div className={"sub-category-title"}>{sectionTitle}</div>
        )}
        <div className={"sub-sub-filters"}>
          {subSectionsState?.map((subSection: any) => {
            return (
              <>
                <div
                  className={
                    "sub-sub-filter no-select " +
                    (subSection.show ? "" : " toggled")
                  }
                  onClick={() => {
                    const updatedSubs = subSectionsState.map((sub) => {
                      if (sub.name === subSection.name) {
                        const flag = !sub.show;
                        return { ...sub, show: flag };
                      }
                      return sub;
                    });
                    setSubSectionsState(updatedSubs);
                  }}
                >
                  <span>{subSection.name}</span>
                  <PlusIcon rotate={subSection.show ? 135 : 0} />
                </div>
              </>
            );
          })}
        </div>
      </div>

      <div class="category-sections">
        {sectionsAvailable ? (
          subSectionsAvailable ? (
            subSectionsState?.map((subSection) => {
              return (
                subSection.show && (
                  <>
                    <div className={"products-title"}>
                      <span>
                        {subSection?.name
                          // +
                          //   " - " +
                          //   subSection?.productAmount +
                          //   " מוצרים"
                        }
                      </span>
                      {/* <Arrow /> */}
                    </div>
                    <ProductsViewFiltered
                      products={products}
                      filter={(p) => {
                        return (
                          p.sub_cat === sections![currentSection]!.name &&
                          p.third_level === subSection?.name
                        );
                      }}
                      maxAmount={subSection?.productAmount ?? 0}
                    />
                  </>
                )
              );
            })
          ) : sections!.length > currentSection ? (
            <>
              <div className={"products-title"}>
                <span>
                  {sections![currentSection]?.name
                    // +" - " +
                    // sections![currentSection]?.productAmount +
                    // " מוצרים"
                  }
                </span>
                {/* <Arrow /> */}
              </div>
              <ProductsViewFiltered
                products={products}
                filter={(p) => {
                  return p.sub_cat === sections![currentSection]?.name;
                }}
                maxAmount={sections![currentSection]?.productAmount ?? 0}
              />
            </>
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
      </div>
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
  const { cartData, addOrUpdate } = useContext(CartContext);

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
                product={p}
                isAdded={
                  cartData
                    ? cartData.some((item: any) => item.product._id === p._id)
                    : false
                }
                onClick={(selectedVariant) => {
                  console.log("Selected Variant: ", selectedVariant);
                  console.log("Product: ", p);
                  addOrUpdate(p, 1, selectedVariant);
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
  product: Product,
  isAdded: boolean;
  onClick: (v: number) => void;
}

const ProductView: React.FC<ProductPreview> = ({
  product,
  isAdded,
  onClick,
}) => {
  let actualTitle = product.name ?? "";
  if (actualTitle.length > 26) {
    actualTitle = actualTitle.slice(0, 22) + "...";
  }
  const [isActivated, setIsActivated] = useState(isAdded);
  const img = useRef<HTMLImageElement | null>(null);
  const ctx = useContext(CartContext);
  const [selectedVariant, setSelectVariant] = useState(0)

  const onEditClick = () => {
    console.log("Edit Clicked");
  };
  return (
    <Link to={`/product/${product._id}`} className={"product-container"}>
      <div className={"product"}>
        <Link
          to={`/edit_product/${product._id}`}
          className={"product-edit " + (ctx.canUserModify() ? "" : "disabled")}
          disabled={ctx.canUserModify() ? false : true}
        >
          עריכת מוצר
        </Link>
        <div className={"product-img"}>
          
          <img
            src={product.img ? "https://levhatahbiv.s3.eu-north-1.amazonaws.com/images/" + product.img.split(";")[0] : ""}
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
        {
          product.selectionType === "COLOR" && product.variantsNew &&
          <div class="product-color-variants">
            {
              product.variantsNew?.filter((_, index) => index < 3).map((variant, index) => <div onClick={(e) => { e.stopPropagation(); e.preventDefault(); setSelectVariant(index) }} class={selectedVariant === index ? "selected" : ""} style={`--bg: ${variant.title.split(":")[0]};`}></div>)
            }
            {
              product.variantsNew?.length > 3 && <span>{product.variantsNew.length - 3}+</span>
            }
          </div>
        }
        <div className={"product-bottom"}>
          <div
            className={"product-add " + (isActivated ? "added" : "")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClick(selectedVariant);
              // setIsActivated(!isActivated)
              setIsActivated(true);
            }}
          >
            {isActivated ? "נתווסף" : "הוסף"}
          </div>
          <div>{product.price + "₪"}</div>
        </div>
      </div>
    </Link>
  );
};
interface subCategoryButton {
  category: string;
  title: string;
  id: number;
  isSelected: boolean;
  setSection: (v: number) => void;
}

const SubCategories: React.FC<{ category: string, sections?: Array<string>, selected: number, setSelected: (v: number) => void }> = ({
  category,
  sections,
  selected,
  setSelected
}) => {
  if (!sections) {
    return <></>
  }

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [rightArrowVisible, setRightArrowVisible] = useState(false)
  const [leftArrowVisible, setLeftArrowVisible] = useState(true)

  useEffect(() => {
    if (scrollRef.current) {
      let view = scrollRef.current
      let x = view.scrollLeft * -1
      setRightArrowVisible(x > 0)
      setLeftArrowVisible(view.scrollWidth - x > view.clientWidth)
      scrollRef.current.addEventListener("scroll", (e) => {
        let view = e.currentTarget as HTMLDivElement
        if (view) {
          let x = view.scrollLeft * -1
          console.log(x)
          setRightArrowVisible(x > 20)
          setLeftArrowVisible(view.scrollWidth - x > view.clientWidth)
        }
      })
    }
  }, [])
  return (
    <div className={"sub-categories"}>
      <div ref={scrollRef}>
        {
          sections.map((item, index) => {
            return <SubCategoryButton id={index} category={category} title={item} isSelected={selected === index} setSection={setSelected} />
          })
        }</div>
      {rightArrowVisible && <div id="sub-categories-right" onClick={()=> {if(scrollRef.current) scrollRef.current.scrollBy({left:200})}}><Arrow rotate={-180}/></div>}
      {leftArrowVisible && <div id="sub-categories-left" onClick={()=> {if(scrollRef.current) scrollRef.current.scrollBy({left:-200})}}><Arrow rotate={0}/></div>}
    </div>)
}

const SubCategoryButton: React.FC<subCategoryButton> = ({
  category,
  title,
  id,
  isSelected,
  setSection,
}) => {
  return (
    <div
      onClick={() => {
        window.history.pushState({}, "", `?cat=${category}&sub_cat=${title}`);
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

export const PlusIcon: React.FC<{ rotate?: number }> = ({ rotate }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      style={{ transform: `rotate(${rotate ?? 0}deg)` }}
    >
      <path
        d="M15,50 h70 M50,15 v70"
        fill="none"
        stroke-width="12.5"
        stroke-linecap={"round"}
      ></path>
    </svg>
  );
};

export default CategoryContent;
