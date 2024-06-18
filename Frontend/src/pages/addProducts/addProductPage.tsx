import { useState } from "preact/hooks";
import { Product } from "../../Types/globalTypes";
import { Input, PageButton } from "../CheckoutPage/CheckoutPage";

interface newProduct {
  name: string;
  price: string;
  quantity: number;
  isAvailable: boolean;
  salePrecentage: number;
  desc: string;
  category: string;
  sub_cat: string;
  third_level: string;
  img: string;
}

export const AddProductPage: React.FC = () => {
  const [productInfo, setProductInfo] = useState<newProduct>({
    name: "",
    price: "",
    salePrecentage: 0,
    quantity: 0,
    isAvailable: false,
    desc: "",
    category: "",
    sub_cat: "",
    third_level: "",
    img: "",
  });
  const [shouldShowErrors, setShouldShowErrors] = useState(false);

  const updateProductToDb = async (product: newProduct) => {
    //TODO: check and apply those checks
    if (
      product.name === "" ||
      product.price === "" ||
      !/^(\d+|\d+.\d+)$/.test(product.price) ||
      product.salePrecentage < 0 ||
      product.salePrecentage > 100 ||
      product.quantity < 0 ||
      product.isAvailable === undefined ||
      product.desc === "" ||
      product.category === "" ||
      product.sub_cat === "" ||
      product.img === "" ||
      product.third_level === ""
    ) {
      if (product.third_level === "") {
        product.third_level = "כללי";
      } else {
        return false;
      }
    }
    console.log(product);
    const response = await fetch("http://localhost:5000/addProduct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    });

    const addedSuccessfully = await response.json(); 
    if (addedSuccessfully.status === 200) {
      console.log("product added successfuly");
      //TODO: toast message added successfuly
      //TODO: clear all inputs for new product
      return true;
    } else {
      console.log("product not added");
      //TODO: toast message failed to add product
      //TODO: toast why it failed, (error message)
      return false;
    }
  };

  return (
    <div className={"checkout-credit-content"}>
      {/* //חובה */}
      <Input
        shouldShowError={shouldShowErrors}
        value={productInfo.name}
        setValue={(value) => setProductInfo({ ...productInfo, name: value })}
        title="שם המוצר"
        name="product-name"
        placeholder="שם המוצר"
        type="string"
        warning="השם לא יכול להיות ריק"
        check={(value) => value !== ""}
      />
      <div class="checkout-input-wrapper">
        {/* //חובה */}
        <Input
          shouldShowError={shouldShowErrors}
          value={productInfo.price}
          setValue={(value) => setProductInfo({ ...productInfo, price: value })}
          title="מחיר"
          name="credit-date"
          type="string"
          check={(value) => /^(\d+|\d+.\d+)$/.test(value)}
          apply={(value) => {
            let match = String(value ?? "").match(/^(\d+\.?\d*)$/);
            if (match) return match[0];
            return "";
          }}
          warning="יש למלא מחיר תקין."
        />
        {/* //לא חובה, אם לא מכניסים שולחים 0 */}
        <Input
          shouldShowError={shouldShowErrors}
          value={productInfo.salePrecentage}
          setValue={(value) =>
            setProductInfo({ ...productInfo, salePrecentage: value })
          }
          title="אחוז הנחה"
          placeholder="0"
          name="product-salePrecentage"
          type="number"
          warning="למקרה ואין מבצע, השאירו 0, אם יש מבצע תשימו את האחוז של המבצע ונעדכן את המחיר בהתאם אוטומטית"
        />
        {/* //לא חובה, אם לא מכניסים שולחים 0 */}
        <Input
          shouldShowError={shouldShowErrors}
          value={productInfo.quantity}
          setValue={(value) =>
            setProductInfo({ ...productInfo, quantity: value })
          }
          title="כמות במלאי"
          placeholder="0"
          name="product-quantity"
          type="number"
          warning="למקרה ואין הגבלה כרגע, השאירו 0, אם אין במלאי תשאירו 0 ותשנו את האזל במלאי"
        />
      </div>
      {/* TODO: dropdown for isAvailable, יש במלאי \ נגמר במלאי */}
      {/* //לא חובה למלא, אפשרות אוטומטית זה זמין במלאי וזה מה שנשלח אם לא משנים את זה */}
      <Input
        shouldShowError={shouldShowErrors}
        value={productInfo.isAvailable}
        setValue={(value) =>
          setProductInfo({ ...productInfo, isAvailable: value })
        }
        title="זמין במלאי"
        name="is-available"
        placeholder="זמין"
        type="string"
      />
      {/* //לא חובה יכול להשלח ריק */}
      <Input
        shouldShowError={shouldShowErrors}
        value={productInfo.desc}
        setValue={(value) => setProductInfo({ ...productInfo, desc: value })}
        title="תיאור המוצר"
        name="product-desc"
        placeholder="תיאור המוצר"
        type="string"
      />
      {/* //חובה */}
      {/* TODO: dropdown for category tree, קטגוריה, תת קטגוריה, תת תת קטגוריה */}
      {/* חובה, להעלות תמונה, שולחים לבאק את השם שלה */}
      <div className={"checkout-buttons"}>
        {
          <PageButton
            setShouldShowErrors={setShouldShowErrors}
            //TODO: need to make valid accept async functions
            valid={
              true
              // async () => {await updateProductToDb(productInfo); }  ====> onClick check if valid
            }
            title="הוסף מוצר"
            currentPage={0}
            setCurrentPage={() => {
              0;
            }}
            calcPage={(num) => {
              return 0;
            }}
          />
        }
      </div>
    </div>
  );
};
