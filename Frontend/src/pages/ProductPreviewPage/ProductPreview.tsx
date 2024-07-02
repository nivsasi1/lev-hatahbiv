import { useState, useRef, useEffect, Dispatch } from "react";
import { useParams } from "react-router";
import { Link } from "react-router-dom";
import { Product } from "../../Types/globalTypes";
import { Header } from "../../global_components/Header/Header";
import { StateUpdater, useContext } from "preact/hooks";
import { CartContext } from "../../context/cart-context";
import CartSheet from "../../global_components/Header/Cart/CartSheet";
import "./ProductPreview.css";
import { Footer } from "../../global_components/Footer/Footer";
import { DropDown } from "../../global_components/DropDown/DropDown";
import { PlusIcon } from "../../global_components/Category/CategoryPage";

const domain = "https://levhatahbiv.s3.eu-north-1.amazonaws.com/";

export const Arrow: React.FC<{ rotate?: number; className?: string }> = ({
  rotate,
  className,
}) => {
  return (
    <svg
      viewBox={"0 0 100 100"}
      className={"arrow " + (className ?? "")}
      style={`transform: rotate(${Number(rotate) || 0}deg)`}
    >
      <path
        d={"M70,17.5 L30,50 L70,82.5"}
        stroke-width={"12.5"}
        fill="none"
        style={{ stroke: "var(--text)" }}
      ></path>
    </svg>
  );
};

const randomColor = () => {
  return `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255
    })`;
};

const isInCart = (product: Product, option: any, context?: any) => {
  if (context) {
    return context.find(
      (info: any) =>
        info.product._id === product._id && info.optionSelected === option
    );
  }
  return false
};

export const ProductPreview: React.FC = () => {
  // let img = useRef<HTMLImageElement | null>(null);
  const { id } = useParams();
  const [product, setProduct] = useState<Product>();
  const [link, setLink] = useState<string>("/");

  //----->>>>>>
  //Variant selected
  const [optionSelected, setOptionSelected] = useState(0);

  //Description expanded (for small screen)
  const [descExpanded, setDescExpanded] = useState(false);

  const { removeProductFromCart, addOrUpdate, cartData } =
    useContext(CartContext);

  //TODO: make the product amount to be the how many in case its already in cart
  const [productsAmount, setProductsAmount] = useState<number>(1);

  useEffect(() => {
    // Fetch product data
    fetch(`http://localhost:5000/product/${id}`, { method: "GET" })
      .then((res) => {
        res.json().then((data) => {
          setProduct(data.data);
          setLink((last) => {
            if (data.data.sub_cat) {
              return `/category?cat=${data.data.category}&sub_cat=${data.data.sub_cat}`;
            } else {
              return `/category?cat=${data.data.category}`;
            }
          });
        });
        cartData &&
          cartData.find((info) => info.product._id === id) &&
          setProductsAmount(() => {
            return (
              cartData.find((info) => info.product._id === id)?.howMany || 1
            );
          });
      })
      .catch(() => {
        setProduct({
          _id: "1",
          name: "מכחול עם כותרת - English Michol Very Large Title For No Reason",
          price: 10,
          desc: "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Cupiditate quisquam veritatis soluta ab ut quae dolores omnis voluptas, explicabo consequuntur necessitatibus dolor quaerat aliquid iste animi ratione, amet, quidem nobis perferendis temporibus! Nobis ullam dolore sapiente temporibus exercitationem nemo, quos pariatur itaque officiis ipsum doloremque. Optio ut harum, ea voluptates quaerat exercitationem tenetur, quasi id in asperiores aut ipsa illum aliquid alias maiores, quae corporis tempora doloribus doloremque. Nulla aliquam minima corporis saepe velit minus nostrum, nihil vel qui repellat, ea perferendis, amet illum maxime inventore deleniti porro! Quisquam distinctio iure deleniti tenetur itaque cumque debitis quia dignissimos temporibus veniam.",
          category: "bulbul",
          img: "733145_9c0ba769cc6545949a50620720c5dc8b~mv2.jpg;733145_00629da5cff843d6afa0d86fd0cc0379~mv2.jpg",
          // img: "",
          sub_cat: "nigger",
          third_level: "kushi",
          // selectionType: "",
          selectionType: "COLOR",
          variantsNew:
            [...new Array(10)].map((_, index) => {
              return { title: randomColor() + ":option" + index };
            }),
          //   [
          //   {
          //     title: "כושי קטן - kushi"
          //   },
          //   {
          //     title: "not very small kushi"
          //   }
          // ]
        });
      });
  }, [id]);

  useEffect(() => {
    document.body.scrollTo({ top: 0 });
  }, []);

  const [showCart, setShowCart] = useState(false);
  const [showAlertView, setShowAlertView] = useState(false);
  const alertViewFullFill = useRef<
    ((product: Product | undefined) => void) | undefined
  >();


  const removeProductFromCartDialog = (product: Product, selected?: number) => {
    if (isInCart(product, optionSelected, cartData)) {
      alertViewFullFill.current = function (product: Product | undefined) {
        console.log("THE SELECTED:" + optionSelected);
        if (product) {
          removeProductFromCart(product, selected);
        }
        setShowAlertView(false);
      };
      setShowAlertView(true);
    }
  };

  return (
    <>
      {showAlertView && (
        <AlertView
          message="האם אתה מעוניין להסיר את המוצר?"
          onFullFill={alertViewFullFill.current}
          onReject={() => {
            setShowAlertView(false);
          }}
          product={product}
          howMany={
            (cartData &&
              cartData?.find((info) => info.product._id === product?._id)
                ?.howMany) ||
            1
          }
        />
      )}

      <Header setShowCartSheet={setShowCart} />
      <CartSheet show={showCart} setShow={setShowCart} />
      {product && (
        <>
          <div class="page-content">
            &nbsp;
            <Link to={link} className={"return-button"}>
              <span>חזור</span>
              <Arrow />
            </Link>
            <div className={"product-preview-location"}>
              {product.category && (
                <a href={"/category?cat=" + product.category}>
                  {product.category}
                </a>
              )}
              {product.sub_cat && (
                <>
                  <Arrow />{" "}
                  <a
                    href={
                      "/category?cat=" +
                      product.category +
                      "&sub_cat=" +
                      product.sub_cat
                    }
                  >
                    {product.sub_cat}
                  </a>
                </>
              )}
              {product.third_level && (
                <>
                  <Arrow />{" "}
                  <a
                    href={
                      "/category?cat=" +
                      product.category +
                      "&sub_cat=" +
                      product.sub_cat
                    }
                  >
                    {product.third_level}
                  </a>
                </>
              )}
            </div>
            <div className={"product-preview"}>
              <svg viewBox={"0 0 100 100"} preserveAspectRatio="none" style={"opacity: 0.5; z-index: 0; width: 100%; height: 10em; position: absolute; bottom: 0; left: 0; border-bottom-right-radius: 1.5em; border-bottom-left-radius: 1.5em"}>
                  <path d="M0,0 C50,50 50,100 100,100 L0,100 Z" fill="var(--on-container)"></path>
              </svg>
              <div>
                {/* <div className={"product-preview-img"}> */}
                <ImageCarousel
                  images={product.img.split(";")}
                  path={domain + "images/"}
                />
                {/* </div> */}
                <div class="product-preview-content">
                  <div className={"product-preview-info"}>
                    <div
                      className={
                        "product-preview-info-content " +
                        (descExpanded ? "expanded" : "")
                      }
                    >
                      <div className={"product-preview-name"}>
                        <div>{product.name}</div>
                      </div>
                      <div>מידע אודות המוצר</div>
                      <div>{product.desc}</div>
                    </div>
                  </div>
                  {product.desc && product.desc?.length > 230 && (
                    <div
                      class="product-preview-show-more"
                      onClick={() => setDescExpanded((expanded) => !expanded)}
                    >
                      <span>{descExpanded ? "הצג פחות" : "מידע נוסף"}</span>
                      <PlusIcon rotate={descExpanded ? 135 : 0} />
                    </div>
                  )}
                </div>
              </div>
              {product.variantsNew && (
                <div class="product-preview-options">
                  {product.selectionType === "COLOR" ? (
                    <ColorOptions
                      didSelect={(selected) => setOptionSelected(selected)}
                      selected={optionSelected}
                      options={product.variantsNew}
                    />
                  ) : (
                    <TypeOptions
                      options={product.variantsNew}
                      setSelected={setOptionSelected}
                      selected={optionSelected}
                    />
                  )}
                </div>
              )}
              <div className={"product-preview-buttons"}>
                {/* TODO: make this bottom sexier */}
                <div>
                  {isInCart(product, optionSelected, cartData) ? (
                    <div
                      className={"product-preview-add"}
                      style={"margin-right: 1em"}
                      onClick={() => {
                        removeProductFromCartDialog(product, optionSelected);
                      }}
                    >
                      הסרת מוצר
                    </div>
                  ) : (
                    ""
                  )}

                  {/* TODO: make a toast for updating/adding product */}
                  {/* <div>
                    המוצר עודכן לכמות של {productsAmount} פריטים
                  </div> */}
                  <div
                    className={"product-preview-add"}
                    onClick={() => {
                      console.log(productsAmount)
                      addOrUpdate(product, productsAmount, optionSelected);
                    }}
                  >
                    {isInCart(product, optionSelected, cartData)
                      ? "עידכון כמות"
                      : "הוספה לסל"}
                  </div>
                  <ProductCounter
                    productsAmount={productsAmount}
                    setProductsAmount={setProductsAmount}
                    shouldRemove={() => {
                      removeProductFromCartDialog(product);
                    }}
                  />
                </div>
                <div>
                  <div className={"product-preview-price"}>
                    {product.price}₪
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!product && (
        <div style={{ marginTop: "10rem", minHeight: "100vh" }}>
          <div>טוען...</div>
        </div>
      )}
      <Footer />
    </>
  );
};

const ImageCarousel: React.FC<{ images: Array<string>; path: string }> = ({
  images,
  path,
}) => {
  const [currentImage, setCurrentImage] = useState(0);
  const timer = useRef<number | undefined>();
  const bulletsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    timer.current = setTimeout(() => {
      setCurrentImage((current) =>
        current + 1 >= images.length - 1 ? 0 : current + 1
      );
    }, 1000);

    return () => {
      clearTimeout(timer.current);
    };
  });

  useEffect(() => {
    if (bulletsRef.current) {
      let newLeft =
        (currentImage * bulletsRef.current.clientWidth) / images.length;
      let mod = Math.floor(newLeft / (bulletsRef.current.clientWidth / 2));
      bulletsRef.current.scroll({
        behavior: "smooth",
        left: (mod * bulletsRef.current.clientWidth) / 2,
      });
    }

    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      setCurrentImage((current) =>
        current + 1 >= images.length ? 0 : current + 1
      );
    }, 3000);

    return () => {
      clearTimeout(timer.current);
    };
  }, [currentImage]);
  return (
    <div class="baka-image-carousel">
      <div class="baka-image-carousel-content">
        {images.map((img, index) => {
          return (
            <img
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              onLoad={(e) => {
                e.currentTarget.style.display = "block";
              }}
              // ref={img}
              style={`transform: translateX(${(index - currentImage) * 100
                }%); visibility: ${currentImage + 1 >= index && currentImage - 1 <= index
                }`}
              src={path + img}
              alt=""
            />
          );
        })}
      </div>
      {images.length > 1 && (
        <div class="baka-image-carousel-bullets" ref={bulletsRef}>
          {images.map((_, index) => (
            <div
              class={currentImage === index ? "selected" : ""}
              onClick={() => setCurrentImage(index)}
            ></div>
          ))}
        </div>
      )}
    </div>
  );
};

const TypeOptions: React.FC<{
  options: Array<any>;
  selected: number;
  setSelected: Dispatch<StateUpdater<number>>;
}> = ({ options, selected, setSelected }) => {
  return (
    <>
      <div class="product-options-title">בחר סוג</div>
      <DropDown
        className="product-options-list"
        options={options.map((item) => item.title)}
        didSelect={setSelected}
        selected={selected}
      />
    </>
  );
};

const ColorOptions: React.FC<{
  options: Array<any>;
  selected: number;
  didSelect: (v: number) => void;
}> = ({ options, selected, didSelect }) => {
  return (
    <div class="product-color-options-container">
      <div class="product-color-title">
        <span style="">צבע&nbsp;</span>
        <span style={"--bg: " + options[selected].title.split(":")[0]}>
          {options[selected] ? options[selected].title.split(":")[1] : ""}
        </span>
      </div>
      <div class="product-color-options">
        {options.map((option, index) => {
          return (
            <div
              className={index === selected ? "product-color-selected" : ""}
              onClick={() => didSelect(index)}
              style={{
                background: option.title.split(":")[0],
                "--bg": option.title.split(":")[0],
              }}
            ></div>
          );
        })}
      </div>
    </div>
  );
};

export const ProductCounter: React.FC<{
  productsAmount: number;
  setProductsAmount: (func: (value: number) => number) => void;
  shouldRemove: () => void;
}> = ({ productsAmount, setProductsAmount, shouldRemove }) => {
  return (
    <>
      <div className={"product-preview-count"}>
        <div
          onClick={() => {
            if (productsAmount === 1) {
              shouldRemove();
              return;
            }
            setProductsAmount((amount) => {
              return Math.max(1, amount - 1);
            });
          }}
        >
          <svg viewBox={"0 0 100 100"}>
            <path d="M22,50 h56" stroke="#000" stroke-width={"10"}></path>
          </svg>
        </div>
        <div>
          <input
            type="number"
            value={productsAmount}
            onInput={(e) => {
              let newValue: number = Math.max(Number(e.currentTarget.value), 1);
              if (e.currentTarget.value !== "") {
                setProductsAmount(() => newValue);
                e.currentTarget.value = newValue.toString();
              }
            }}
            onKeyPress={(e) => {
              let newValue: number = Math.max(Number(e.currentTarget.value), 1);
              if (e.key === "Enter") {
                setProductsAmount(() => newValue);
                e.currentTarget.value = newValue.toString();
              }
            }}
            onBlur={(e) => {
              e.currentTarget.value = productsAmount.toString();
            }}
          />
        </div>
        <div
          onClick={() => {
            setProductsAmount((amount) => {
              return amount + 1;
            });
          }}
        >
          <svg viewBox={"0 0 100 100"}>
            <path
              d="M20,50 h60 M50,20 v60"
              stroke="#000"
              stroke-width={"10"}
            ></path>
          </svg>
        </div>
      </div>
    </>
  );
};

export const AlertView: React.FC<{
  message: string;
  onFullFill?: (product: Product | undefined) => void;
  onReject?: () => void;
  product?: Product;
  howMany?: number | null | undefined;
}> = ({ message, onFullFill, onReject, product, howMany }) => {
  const alertView = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onClickOut = (e: Event) => {
      if (alertView.current && !alertView.current.contains(e.target as Node)) {
        if (onReject) {
          onReject();
        }
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (onReject) {
          onReject();
        }
      }
    };

    window.addEventListener("touchend", onClickOut);
    window.addEventListener("mousedown", onClickOut);
    window.addEventListener("keypress", onKey);
    return () => {
      window.removeEventListener("touchend", onClickOut);
      window.removeEventListener("mousedown", onClickOut);
      window.removeEventListener("keypress", onKey);
    };
  });
  return (
    <div className={"alert-view"}>
      <div ref={alertView}>
        <div className={"alert-view-title"}>{message}</div>
        {product && (
          <div className={"alert-view-content"}>{`${howMany && howMany > 1 ? howMany + " יחידות של" : "יחידה של  "
            }
            "${product.name}"`}</div>
        )}
        <div className={"alert-view-buttons"}>
          <div
            onClick={() => {
              if (onFullFill) {
                console.log("clicked");
                onFullFill(product);
              }
            }}
          >
            אישור
          </div>
          <div
            onClick={() => {
              if (onReject) {
                onReject();
              }
            }}
          >
            ביטול
          </div>
        </div>
      </div>
    </div>
  );
}; //
