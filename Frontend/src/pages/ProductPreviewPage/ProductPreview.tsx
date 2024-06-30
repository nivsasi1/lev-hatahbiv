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

export const Arrow: React.FC<{ rotate?: number, className?: string }> = ({ rotate, className }) => {
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
  return `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`
}

export const ProductPreview: React.FC = () => {
  let img = useRef<HTMLImageElement | null>(null);
  const { id } = useParams();
  const [product, setProduct] = useState<Product>();
  const [link, setLink] = useState<string>("/");
  const [optionSelected, setOptionSelected] = useState(0)
  const { removeProductFromCart, updateProduct, cartData } =
    useContext(CartContext);
  //todo: make the product amount to be the how many in case its already in cart
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
          name: "מכחול",
          price: 10,
          desc: "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Cupiditate quisquam veritatis soluta ab ut quae dolores omnis voluptas, explicabo consequuntur necessitatibus dolor quaerat aliquid iste animi ratione, amet, quidem nobis perferendis temporibus! Nobis ullam dolore sapiente temporibus exercitationem nemo, quos pariatur itaque officiis ipsum doloremque. Optio ut harum, ea voluptates quaerat exercitationem tenetur, quasi id in asperiores aut ipsa illum aliquid alias maiores, quae corporis tempora doloribus doloremque. Nulla aliquam minima corporis saepe velit minus nostrum, nihil vel qui repellat, ea perferendis, amet illum maxime inventore deleniti porro! Quisquam distinctio iure deleniti tenetur itaque cumque debitis quia dignissimos temporibus veniam. Delectus vero quisquam deserunt, nesciunt doloremque modi incidunt cupiditate labore at placeat rerum ipsum. Ad praesentium cumque doloremque, est dolore deleniti, esse reiciendis iure debitis a, maxime illo quae laboriosam nihil totam ex eveniet quis expedita. Quasi neque commodi nesciunt dignissimos! Ratione deleniti porro tempore necessitatibus quod ipsum vero quidem reiciendis nam! Pariatur facilis dolor mollitia iure? Dicta, molestiae dolorem, laudantium sed culpa, atque qui voluptate debitis harum quaerat voluptatum nulla ea? Architecto nisi quidem obcaecati asperiores quis distinctio quibusdam veniam labore corrupti similique, maiores cupiditate. Expedita cumque eveniet sapiente quibusdam quo obcaecati id veritatis molestias consectetur accusantium quidem ea facilis, recusandae sit repudiandae a! Sint quidem aliquam vel fugiat ullam, itaque labore voluptas totam dolorum doloremque ipsum voluptatem fugit repellendus qui laudantium minus, aut ea. Mollitia iste dolores voluptatum animi explicabo sint quae illum placeat minus expedita sequi, praesentium nesciunt, laboriosam similique omnis eaque sit corporis pariatur! Exercitationem aspernatur numquam, temporibus corporis in at debitis similique saepe ipsam non illum placeat voluptas voluptatibus optio officia. Tempora ullam voluptates error, obcaecati cupiditate harum ratione reiciendis natus commodi neque inventore deserunt consectetur eos at doloribus soluta veniam voluptatibus cumque praesentium ipsum illum ab. Nemo unde aliquam ad dignissimos, veritatis dicta? Nisi nihil ducimus molestias incidunt quis qui omnis libero quos. Dolorum, suscipit? Quidem molestiae quod quibusdam? Minus, consectetur molestiae nemo eos voluptatibus molestias. Officiis, beatae, eum iste necessitatibus sequi asperiores, aspernatur repudiandae dignissimos corrupti possimus nemo. Similique voluptate voluptates est repellat animi corporis asperiores nihil omnis beatae ut praesentium, delectus culpa! Debitis velit illo maxime cum vitae. At, alias omnis. Dolorum cum suscipit numquam quod ea ex beatae necessitatibus, est dolore amet fugiat commodi consequatur rerum qui sunt ducimus vero. Ab et velit similique porro magnam nemo dignissimos, aliquam molestiae harum vero numquam. Accusantium dolore maiores voluptatem ea aperiam suscipit debitis veniam explicabo id incidunt aspernatur doloremque voluptate cum facere perspiciatis corrupti, dolor similique fuga! Repudiandae fuga at modi, ipsum porro ut pariatur provident in ipsa, velit aliquam ex, ratione laboriosam. Sint aperiam culpa laborum veniam, vel exercitationem at commodi animi voluptas rem! Officia est quia laboriosam laborum. Est, tempore. Dolores praesentium autem ea ab obcaecati id incidunt magni dolorum dolore quidem suscipit numquam officia, nemo minus ipsum sint dicta illo vero! Nam qui vel necessitatibus labore, expedita illo ipsa. Explicabo libero excepturi aperiam maxime recusandae veniam sunt facere delectus. Itaque sit deleniti temporibus facere consequuntur numquam voluptatem aliquid a. Eveniet maxime tempore impedit architecto. Reiciendis ex unde fuga debitis natus. Corrupti fugiat temporibus atque architecto excepturi! Quo dolore voluptas assumenda, dolores veritatis itaque illo cupiditate fuga, consequatur facilis voluptates ducimus, deleniti aut. Quos voluptatibus magni molestiae excepturi culpa nostrum repudiandae eaque, expedita cum, delectus maxime dicta nam similique nihil eius, exercitationem ut odio cumque debitis blanditiis ex. Sapiente quas laudantium modi illo ea, tempora dolorem eligendi ipsa mollitia, aspernatur repellendus! Iure, earum. Laudantium minus deserunt sequi et cum, voluptates voluptatem doloribus eaque quia voluptate laborum temporibus distinctio minima odio corporis consequatur aliquam rerum, tempora reiciendis voluptatibus praesentium esse explicabo quasi sint. Temporibus laborum delectus magni inventore, cumque eius corporis placeat libero est iste nemo earum optio vitae. Quidem eveniet iure fugit quibusdam esse ut explicabo quo repudiandae facilis? Debitis ut blanditiis rerum id itaque? Quam voluptatem illo minus iusto earum! Ipsa eveniet libero quae harum, repellendus eius molestias maxime pariatur! Perspiciatis ab libero fugit. Alias hic, magni porro illum molestiae officia aliquid, repudiandae tempora rem dolore cumque dolorem impedit. Repellat unde delectus placeat dolore consequuntur culpa obcaecati, doloremque odio enim molestias necessitatibus optio. Enim soluta nesciunt molestiae, reiciendis officia fuga. Atque temporibus voluptates quo, minima quaerat, vel amet aliquam dolor maxime totam ratione dolorem tempore corrupti soluta magni iusto! Quae a, cum veniam corrupti cumque voluptas tempore earum mollitia optio non fugit impedit error explicabo odit sapiente aliquid architecto voluptatum harum facilis recusandae? Quis nulla repudiandae dignissimos eos exercitationem corrupti cupiditate, aut molestias fuga neque cum nostrum, nemo laudantium totam! A culpa placeat at alias maxime repellendus fugiat nihil facere adipisci facilis rerum sunt blanditiis dolore, eum eos eveniet. Cum omnis eveniet dolore eos, autem quibusdam. Sunt, explicabo, inventore dolores non commodi aliquid, obcaecati cupiditate dolorem rerum quis sapiente! Fuga, porro nostrum ullam obcaecati, repellendus assumenda iusto culpa quod vitae corrupti magni molestias sint alias fugit labore omnis. Earum at itaque ea tempore blanditiis alias fugit obcaecati dicta non exercitationem eveniet animi doloribus odit labore, assumenda, quo rerum fugiat delectus. Ipsum in placeat itaque, aperiam vel, omnis, corporis architecto harum fugiat eaque excepturi. Eius, voluptate suscipit minima molestiae consequatur sequi quis maxime, neque nam omnis veniam aut ipsum. Incidunt laborum corporis asperiores. Nemo quisquam dicta odio expedita! Accusantium assumenda, saepe atque, quasi qui expedita debitis hic asperiores exercitationem, corrupti accusamus quam veniam quibusdam? Illo dolor dolorum ullam natus, optio odit culpa fugiat obcaecati id est sapiente, deserunt eum, quaerat ipsa ea dignissimos! Corrupti illo nostrum rerum hic alias voluptate architecto ex magni, quos voluptates deserunt deleniti? Natus itaque numquam dolorum repudiandae sed earum a laudantium maxime ipsum modi, architecto quia aliquid molestias nihil vitae minima pariatur, labore, ex accusantium placeat! Quasi facere quidem atque rem est quibusdam veniam, dolorum quae. Hic debitis eius, officiis dolor minima mollitia ullam id similique consequatur. Qui, delectus nisi quia itaque quidem tempore alias dolore excepturi. Ullam, ab laborum voluptatem, quo non eligendi nobis laboriosam dolorem blanditiis, dolorum minus iure sed doloremque! Doloribus ipsam aperiam corrupti nisi velit ullam optio omnis fuga, vero, a et!</>Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellendus, sint? Beatae, tenetur recusandae tempore eius nemo veniam eaque labore non voluptatem et? Exercitationem corporis consectetur rerum, minus veniam pariatur quod.</>",
          category: "bulbul",
          img: "1.png",
          selectionType: "",
          variantsNew:
            [...new Array(10)].map((_, index) => { return { title: randomColor() + ":option" + index } })
          // {
          //   title: "#f00:nigger color"
          // },
          // {
          //   title: "#0f0:watermelon"
          // }

        });
      });
  }, [id]);

  useEffect(() => {
    document.body.scrollTo({ top: 0 })
  }, [])

  const [showCart, setShowCart] = useState(false);
  const [showAlertView, setShowAlertView] = useState(false);
  const alertViewFullFill = useRef<
    ((product: Product | undefined) => void) | undefined
  >();
  const removeProductFromCartDialog = (product: Product) => {
    if (cartData && cartData.find((info) => info.product._id === product._id)) {
      alertViewFullFill.current = function (product: Product | undefined) {
        product && removeProductFromCart(product);
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
          <div style={{ marginTop: "10rem", minHeight: "100vh" }}>
            <Link to={link} className={"return-button"}>
              <span>חזור</span>
              <Arrow />
            </Link>
            <div className={"product-preview-location"}>
              {product.category && <div>{product.category}</div>}
              {product.sub_cat && (
                <>
                  <Arrow /> <div>{product.sub_cat}</div>
                </>
              )}
              {product.third_level && (
                <>
                  <Arrow /> <div>{product.third_level}</div>
                </>
              )}
            </div>
            <div className={"product-preview"}>
              <div>
                <div className={"product-preview-img"}>
                  <img
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    onLoad={(e) => {
                      e.currentTarget.style.display = "block";
                    }}
                    ref={img}
                    src={"/images/" + product.img}
                    alt=""
                  />
                </div>
                <div class="product-preview-content">
                  <div className={"product-preview-info"}>
                    <div className={"product-preview-info-content"}>
                      <div className={"product-preview-name"}>
                        <div>{product.name}</div>
                      </div>
                      <div>מידע אודות המוצר</div>
                      <div>{product.desc}</div>
                    </div>
                  </div>
                </div>
              </div>
              {product.variantsNew && <div class="product-preview-options">
                {
                  product.selectionType === "COLOR" ? <ColorOptions didSelect={(selected) => setOptionSelected(selected)} selected={optionSelected} options={product.variantsNew} />
                    : <TypeOptions options={product.variantsNew} setSelected={setOptionSelected} selected={optionSelected} />
                }
              </div>}
              <div className={"product-preview-buttons"}>
                {/* TODO: make this bottom sexier */}
                <div>
                  {cartData &&
                    cartData.find((info) => info.product._id === product._id) ? (
                    <div
                      className={"product-preview-add"}
                      style={"margin-right: 1em"}
                      onClick={() => {
                        removeProductFromCartDialog(product);
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
                      updateProduct(product, productsAmount);
                    }}
                  >
                    {cartData &&
                      cartData.find((info) => info.product._id === product._id)
                      ? "עידכון כמות"
                      : "הוספה לסל"}
                  </div>
                </div>
                <div>
                  <ProductCounter
                    productsAmount={productsAmount}
                    setProductsAmount={setProductsAmount}
                    shouldRemove={() => {
                      removeProductFromCartDialog(product);
                    }}
                  />
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

const TypeOptions: React.FC<{ options: Array<any>, selected: number, setSelected: Dispatch<StateUpdater<number>>}> = ({ options, selected, setSelected }) => {
  return <>
    <div class="product-options-title">בחר סוג</div>
    <DropDown options={options.map((item) => item.title)} didSelect={setSelected} selected={selected} />
  </>
}

const ColorOptions: React.FC<{ options: Array<any>, selected: number, didSelect: (v: number) => void }> = ({ options, selected, didSelect }) => {
  return <>
    <div class="product-color-title">
      <span style="font-weight: 550">
        צבע:&nbsp;
      </span>
      {options[selected] ? options[selected].title.split(":")[1] : ""}</div>
    <div class="product-color-options">
      {
        options.map((option, index) => {
          return <div className={index === selected ? "product-color-selected" : ""} onClick={() => didSelect(index)} style={{ background: option.title.split(":")[0] }}>
          </div>
        })
      }
    </div>
  </>
}

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

          <div
            className={"alert-view-content"}
          >{
              `${howMany && howMany > 1 ? howMany + " יחידות של" : "יחידה של  "}
            "${product.name}"`
            }</div>
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
};
