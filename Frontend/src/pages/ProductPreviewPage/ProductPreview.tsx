import { useState, useRef, useEffect, Dispatch } from "react";
import { useParams } from "react-router";
import { Link } from "react-router-dom";
import { Product } from "../../types";
import { Header } from "../../global_components/Header/Header";
import { StateUpdater, useContext } from "preact/hooks";
import { CartContext } from "../../context/cart-context";

export const Arrow: React.FC<{ rotate?: number }> = ({ rotate }) => {
  return (
    <svg
      viewBox={"0 0 100 100"}
      className={"arrow"}
      style={`transform: rotate(${Number(rotate) || 0}deg)`}
    >
      <path
        d={"M70,17.5 L30,50 L70,82.5"}
        stroke={"#000000"}
        stroke-width={"12.5"}
        fill="none"
      ></path>
    </svg>
  );
};

export const ProductPreview: React.FC = () => {
  let img = useRef<HTMLImageElement | null>(null);
  const [productsAmount, setProductsAmount] = useState<number>(1);
  const { id } = useParams();
  const [product, setProduct] = useState<Product>();
  const [link, setLink] = useState<string>("/");
  const { removeProductFromCart, updateProduct, cartData } =
    useContext(CartContext);

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
      })
      .catch(() => {
        setProduct({
          name: "מכחול",
          price: 10,
          desc: "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Cupiditate quisquam veritatis soluta ab ut quae dolores omnis voluptas, explicabo consequuntur necessitatibus dolor quaerat aliquid iste animi ratione, amet, quidem nobis perferendis temporibus! Nobis ullam dolore sapiente temporibus exercitationem nemo, quos pariatur itaque officiis ipsum doloremque. Optio ut harum, ea voluptates quaerat exercitationem tenetur, quasi id in asperiores aut ipsa illum aliquid alias maiores, quae corporis tempora doloribus doloremque. Nulla aliquam minima corporis saepe velit minus nostrum, nihil vel qui repellat, ea perferendis, amet illum maxime inventore deleniti porro! Quisquam distinctio iure deleniti tenetur itaque cumque debitis quia dignissimos temporibus veniam. Delectus vero quisquam deserunt, nesciunt doloremque modi incidunt cupiditate labore at placeat rerum ipsum. Ad praesentium cumque doloremque, est dolore deleniti, esse reiciendis iure debitis a, maxime illo quae laboriosam nihil totam ex eveniet quis expedita. Quasi neque commodi nesciunt dignissimos! Ratione deleniti porro tempore necessitatibus quod ipsum vero quidem reiciendis nam! Pariatur facilis dolor mollitia iure? Dicta, molestiae dolorem, laudantium sed culpa, atque qui voluptate debitis harum quaerat voluptatum nulla ea? Architecto nisi quidem obcaecati asperiores quis distinctio quibusdam veniam labore corrupti similique, maiores cupiditate. Expedita cumque eveniet sapiente quibusdam quo obcaecati id veritatis molestias consectetur accusantium quidem ea facilis, recusandae sit repudiandae a! Sint quidem aliquam vel fugiat ullam, itaque labore voluptas totam dolorum doloremque ipsum voluptatem fugit repellendus qui laudantium minus, aut ea. Mollitia iste dolores voluptatum animi explicabo sint quae illum placeat minus expedita sequi, praesentium nesciunt, laboriosam similique omnis eaque sit corporis pariatur! Exercitationem aspernatur numquam, temporibus corporis in at debitis similique saepe ipsam non illum placeat voluptas voluptatibus optio officia. Tempora ullam voluptates error, obcaecati cupiditate harum ratione reiciendis natus commodi neque inventore deserunt consectetur eos at doloribus soluta veniam voluptatibus cumque praesentium ipsum illum ab. Nemo unde aliquam ad dignissimos, veritatis dicta? Nisi nihil ducimus molestias incidunt quis qui omnis libero quos. Dolorum, suscipit? Quidem molestiae quod quibusdam? Minus, consectetur molestiae nemo eos voluptatibus molestias. Officiis, beatae, eum iste necessitatibus sequi asperiores, aspernatur repudiandae dignissimos corrupti possimus nemo. Similique voluptate voluptates est repellat animi corporis asperiores nihil omnis beatae ut praesentium, delectus culpa! Debitis velit illo maxime cum vitae. At, alias omnis. Dolorum cum suscipit numquam quod ea ex beatae necessitatibus, est dolore amet fugiat commodi consequatur rerum qui sunt ducimus vero. Ab et velit similique porro magnam nemo dignissimos, aliquam molestiae harum vero numquam. Accusantium dolore maiores voluptatem ea aperiam suscipit debitis veniam explicabo id incidunt aspernatur doloremque voluptate cum facere perspiciatis corrupti, dolor similique fuga! Repudiandae fuga at modi, ipsum porro ut pariatur provident in ipsa, velit aliquam ex, ratione laboriosam. Sint aperiam culpa laborum veniam, vel exercitationem at commodi animi voluptas rem! Officia est quia laboriosam laborum. Est, tempore. Dolores praesentium autem ea ab obcaecati id incidunt magni dolorum dolore quidem suscipit numquam officia, nemo minus ipsum sint dicta illo vero! Nam qui vel necessitatibus labore, expedita illo ipsa. Explicabo libero excepturi aperiam maxime recusandae veniam sunt facere delectus. Itaque sit deleniti temporibus facere consequuntur numquam voluptatem aliquid a. Eveniet maxime tempore impedit architecto. Reiciendis ex unde fuga debitis natus. Corrupti fugiat temporibus atque architecto excepturi! Quo dolore voluptas assumenda, dolores veritatis itaque illo cupiditate fuga, consequatur facilis voluptates ducimus, deleniti aut. Quos voluptatibus magni molestiae excepturi culpa nostrum repudiandae eaque, expedita cum, delectus maxime dicta nam similique nihil eius, exercitationem ut odio cumque debitis blanditiis ex. Sapiente quas laudantium modi illo ea, tempora dolorem eligendi ipsa mollitia, aspernatur repellendus! Iure, earum. Laudantium minus deserunt sequi et cum, voluptates voluptatem doloribus eaque quia voluptate laborum temporibus distinctio minima odio corporis consequatur aliquam rerum, tempora reiciendis voluptatibus praesentium esse explicabo quasi sint. Temporibus laborum delectus magni inventore, cumque eius corporis placeat libero est iste nemo earum optio vitae. Quidem eveniet iure fugit quibusdam esse ut explicabo quo repudiandae facilis? Debitis ut blanditiis rerum id itaque? Quam voluptatem illo minus iusto earum! Ipsa eveniet libero quae harum, repellendus eius molestias maxime pariatur! Perspiciatis ab libero fugit. Alias hic, magni porro illum molestiae officia aliquid, repudiandae tempora rem dolore cumque dolorem impedit. Repellat unde delectus placeat dolore consequuntur culpa obcaecati, doloremque odio enim molestias necessitatibus optio. Enim soluta nesciunt molestiae, reiciendis officia fuga. Atque temporibus voluptates quo, minima quaerat, vel amet aliquam dolor maxime totam ratione dolorem tempore corrupti soluta magni iusto! Quae a, cum veniam corrupti cumque voluptas tempore earum mollitia optio non fugit impedit error explicabo odit sapiente aliquid architecto voluptatum harum facilis recusandae? Quis nulla repudiandae dignissimos eos exercitationem corrupti cupiditate, aut molestias fuga neque cum nostrum, nemo laudantium totam! A culpa placeat at alias maxime repellendus fugiat nihil facere adipisci facilis rerum sunt blanditiis dolore, eum eos eveniet. Cum omnis eveniet dolore eos, autem quibusdam. Sunt, explicabo, inventore dolores non commodi aliquid, obcaecati cupiditate dolorem rerum quis sapiente! Fuga, porro nostrum ullam obcaecati, repellendus assumenda iusto culpa quod vitae corrupti magni molestias sint alias fugit labore omnis. Earum at itaque ea tempore blanditiis alias fugit obcaecati dicta non exercitationem eveniet animi doloribus odit labore, assumenda, quo rerum fugiat delectus. Ipsum in placeat itaque, aperiam vel, omnis, corporis architecto harum fugiat eaque excepturi. Eius, voluptate suscipit minima molestiae consequatur sequi quis maxime, neque nam omnis veniam aut ipsum. Incidunt laborum corporis asperiores. Nemo quisquam dicta odio expedita! Accusantium assumenda, saepe atque, quasi qui expedita debitis hic asperiores exercitationem, corrupti accusamus quam veniam quibusdam? Illo dolor dolorum ullam natus, optio odit culpa fugiat obcaecati id est sapiente, deserunt eum, quaerat ipsa ea dignissimos! Corrupti illo nostrum rerum hic alias voluptate architecto ex magni, quos voluptates deserunt deleniti? Natus itaque numquam dolorum repudiandae sed earum a laudantium maxime ipsum modi, architecto quia aliquid molestias nihil vitae minima pariatur, labore, ex accusantium placeat! Quasi facere quidem atque rem est quibusdam veniam, dolorum quae. Hic debitis eius, officiis dolor minima mollitia ullam id similique consequatur. Qui, delectus nisi quia itaque quidem tempore alias dolore excepturi. Ullam, ab laborum voluptatem, quo non eligendi nobis laboriosam dolorem blanditiis, dolorum minus iure sed doloremque! Doloribus ipsam aperiam corrupti nisi velit ullam optio omnis fuga, vero, a et!</>Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellendus, sint? Beatae, tenetur recusandae tempore eius nemo veniam eaque labore non voluptatem et? Exercitationem corporis consectetur rerum, minus veniam pariatur quod.</>",
          category: "bulbul",
          img: "",
        });
      });
  }, [id]);
  return (
    <>
      <Header />
      {product && (
        <>
          <div style={{ marginTop: "10rem" }}>
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
              <div className={"product-preview-img"}>
                <img
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
                  ref={img}
                  src={"/images/" + product.img}
                  alt=""
                />
              </div>
              <div>
                <div className={"product-preview-info"}>
                  <div className={"product-preview-info-content"}>
                    <div className={"product-preview-name"}>
                      <div>{product.name}</div>
                    </div>
                    <div>מידע אודות המוצר</div>
                    <div>{product.desc}</div>
                  </div>
                </div>
                <div className={"product-preview-buttons"}>
                  {/* TODO: make this bottum sexier */}
                  {cartData &&
                  cartData.find((info) => info.product._id === product._id) ? (
                    <div
                      className={"product-preview-add"}
                      onClick={() => {
                        removeProductFromCart(product);
                      }}
                    >
                      {cartData &&
                      cartData.find((info) => info.product._id === product._id)
                        ? "הסרת מוצר"
                        : ""}
                    </div>
                  ) : (
                    <></>
                  )}
                  <div
                    className={"product-preview-add"}
                    onClick={() => {
                      updateProduct(product, productsAmount);
                    }}
                  >
                    {cartData &&
                    cartData.find((info) => info.product._id === product._id)
                      ? "עידכון הסל"
                      : "הוספה לסל"}
                  </div>
                  <ProductCounter
                    productsAmount={productsAmount}
                    setProductsAmount={setProductsAmount}
                    shouldRemove={() => {}}
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
        <div style={{ marginTop: "10rem" }}>
          <div>טוען...</div>
        </div>
      )}
    </>
  );
};

export const ProductCounter: React.FC<{
  productsAmount: number;
  setProductsAmount: (func: (value: number) => number) => void;
  shouldRemove: () => void;
}> = ({ productsAmount, setProductsAmount, shouldRemove }) => {
  console.log("WOWOWOWWO: " + productsAmount);
  return (
    <div className={"product-preview-count"}>
      <div
        onClick={() => {
          if (productsAmount === 1) {
            //add popup if sure u want to remove, yes -> shouldRemove, no - return
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
            console.log(Math.max(Number(e.currentTarget.value), 1));
            let newValue: number = Math.max(Number(e.currentTarget.value), 1);
            setProductsAmount(() => newValue);
            e.currentTarget.value = newValue.toString();
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
  );
};
