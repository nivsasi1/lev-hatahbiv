import { useEffect, useState } from "preact/hooks";
import { NumberOnly, PageButton } from "../CheckoutPage/CheckoutPage";
import { Input, useInput } from "../../global_components/Input/Input";
import { DropDown } from "../../global_components/DropDown/DropDown";
import "./addProductPage.css";
import SectionMenuList from "../../global_components/Header/SectionMenu/menu.json";
import React from "preact/compat";
import FileIcon from "../../assets/file_upload.svg";
import { Toast, ToastType } from "../../global_components/Toast/Toast";
import { AutoCompleteDropDown } from "../../global_components/AutoCompleteDropDown/AutoCompleteDropDown";
import { useParams } from "react-router";

interface newProduct {
  name: string;
  price: string;
  quantity: number;
  isAvailable: boolean;
  salePercentage: number;
  desc: string;
  category: string;
  sub_cat: string;
  third_level: string;
  img: string;
}

const isProductInfoValid = (product: newProduct) => {
  return (
    product.name !== "" &&
    product.price !== "" &&
    (product.salePercentage >= 0 &&
    product.salePercentage < 100) &&
    product.quantity >= 0 &&
    product.isAvailable !== undefined &&
    product.category !== "" &&
    product.sub_cat !== "" &&
    product.img !== ""
  );
};

const ValidString = (value: string)=>{
  return value.match(/.*/) != null
}

const FloatNumberOnly = (value: string)=>{
  let newValue = String(value ?? "")
  let match = newValue.match(/^(\d+\.?\d*)$/);
  if (match) return match[0];
  match = newValue.slice(0, -1).match(/^(\d+\.?\d*)$/);
  if(match) return match[0];
  return "";
}

export const AddProductPage: React.FC = () => {
  // const { id } = useParams();

  const [productInfo, setProductInfo] = useState<newProduct>({
    name: "",
    price: "",
    salePercentage: 0,
    quantity: 0,
    isAvailable: true,
    desc: "",
    category: "צבעים לאמנות",
    sub_cat: "צבע אקריליק",
    third_level: "",
    img: "",
  });
  const [shouldShowErrors, setShouldShowErrors] = useState(false);
  // const category = SectionMenuList.map((section) => {
  //   return section.title;
  // });
  const [category, setCategory] = useState<string[]>(
    SectionMenuList.map((section) => {
      return section.title;
    })
  );
  const [sub_cat, setSubCat] = useState<string[] | undefined>(
    SectionMenuList.find(
      (section) => section.title === "צבעים לאמנות"
    )?.options.map((option) => {
      return option.optionTitle;
    })
  );
  const [third_level, setThirdLevel] = useState<string[] | undefined>(["כללי"]);
  const [third_levelTree, setThirdLevelTree] = useState<any>();
  const [file, setFile] = useState<File | null>(null);

  const fetchTreeData = async () => {
    const treeData = await fetch(`http://localhost:5000/getThirdLevelTree`, {
      method: "GET",
    }).then((res) => res.json());
    return treeData;
  };

  useEffect(() => {
    if (sub_cat) {
      fetchTreeData().then((treeData) => {
        setThirdLevelTree(treeData.data);
      });
    }
  }, []);

  const resetProductInfo = () => {
    setProductInfo({
      name: "",
      price: "",
      salePercentage: 0,
      quantity: 0,
      isAvailable: true,
      desc: "",
      category: "צבעים לאמנות",
      sub_cat: "צבע אקריליק",
      third_level: "",
      img: "",
    });
    setSubCat(
      SectionMenuList.find(
        (section) => section.title === "צבעים לאמנות"
      )?.options.map((option) => {
        return option.optionTitle;
      })
    );
    setThirdLevel(undefined);
    setFile(null);
  };

  const updateProductToDb = async (product: newProduct) => {
    console.log("submitted");
    setShouldShowErrors(true)
    if (!isProductInfoValid(productInfo)) {
      setToastType(ToastType.Error);
      setToastTitle("אחד או יותר מהשדות אינם תקינים");
      setShowToast(true);
      return false;
    }
    if (product.third_level === "") {
      product.third_level = "כללי";
    }
    const response = await fetch("http://localhost:5000/addProduct", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    });
    if (response.status === 200) {
      setShouldShowErrors(false)
      console.log("product added successfuly");
      setToastType(ToastType.Normal);
      setToastTitle("המוצר הועלה בהצלחה");
      setShowToast(true);
      resetProductInfo();
      return true;
    } else {
      console.log("product not added");
      setToastType(ToastType.Error);
      const error = await response.json();
      setToastTitle(error.error_message);
      setShowToast(true);
      return false;
    }
  };

  const [showToast, setShowToast] = useState(false);
  const [toastTitle, setToastTitle] = useState("");
  const [toastType, setToastType] = useState<ToastType>(ToastType.Action);

  return (
    <div className={"page-content"}>
    <div className={"add-product-main-title"}>הוספת מוצר</div>
    <div className={"add-product-form"}>
      {showToast && (
        <Toast
          show={showToast}
          setShow={setShowToast}
          title={toastTitle}
          maxTime={4000}
          type={toastType}
          top={"1em"}
          actionTitle="cancel"
        />
      )}

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

      <div class="baka-input-wrapper">
        {/* //חובה */}
        <Input
          shouldShowError={shouldShowErrors}
          value={productInfo.price}
          setValue={(value) => setProductInfo({ ...productInfo, price: value })}
          title="מחיר"
          placeholder="מחיר"
          name="credit-date"
          type="string"
          check={(value) => Number(value) > 0/*/^(\d+|\d+.\d+)$/.test(value)*/}
          apply={FloatNumberOnly}
          warning="יש למלא מחיר תקין."
        />
        {/* //לא חובה, אם לא מכניסים שולחים 0 */}
        <Input
          shouldShowError={shouldShowErrors}
          value={productInfo.salePercentage}
          setValue={(value) =>
            setProductInfo({ ...productInfo, salePercentage: value })
          }
          title="אחוז הנחה"
          name="product-salePercentage "
          type="string"
          warning="אחוזים בן 0 ל100"
          check={(value) => {
            return Number(value) >= 0 && Number(value) <= 100
          }}
          apply={NumberOnly}
          forceWarning={true}
        />
        {/* //לא חובה, אם לא מכניסים שולחים 0 */}
        <Input
          shouldShowError={shouldShowErrors}
          value={productInfo.quantity}
          setValue={(value) =>
            setProductInfo({ ...productInfo, quantity: value })
          }
          title="כמות במלאי"
          placeholder=""
          name="product-quantity"
          type="number"
          warning="אם אזל המלאי או שהכמות אינה ידועה השאירו 0"
          check={(v)=> Number(v) >= 0}
          apply={NumberOnly}
          forceWarning={true}
        />
      </div>
      {/* TODO: dropdown for isAvailable, יש במלאי \ נגמר במלאי */}
      {/* לא חובה למלא, אפשרות אוטומטית זה זמין במלאי וזה מה שנשלח אם לא משנים את זה */}
      <div className="add-product-section-title">זמינות במלאי</div>
      <DropDown
        selected={productInfo.isAvailable ? 0 : 1}
        didSelect={(index) =>
          setProductInfo({ ...productInfo, isAvailable: index === 0 })
        }
        options={["זמין", "לא זמין"]}
      />
      {/* לא חובה יכול להשלח ריק */}
      <Input
        shouldShowError={shouldShowErrors}
        value={productInfo.desc}
        setValue={(value) => setProductInfo({ ...productInfo, desc: value })}
        title="תיאור המוצר"
        name="product-desc"
        placeholder="תיאור המוצר"
        type="string"
        check={()=> true}
      />
      {/* חובה */}
      {/* TODO: dropdown for category tree, קטגוריה, תת קטגוריה, תת תת קטגוריה */}

      <div className={"add-product-section-title"}>קטגוריה</div>
      <DropDown
        selected={category.indexOf(productInfo.category)}
        didSelect={(index) => {
          const sub_cat_list = SectionMenuList.find(
            (section) => section.title === category[index as number]
          )?.options.map((option) => {
            return option.optionTitle;
          });
          if (sub_cat_list) {
            if (third_levelTree) {
              const third_level_list = third_levelTree.find(
                (section: any) => section.sub_cat === sub_cat_list[0]
              )?.third_level;
              if (third_level_list) {
                setProductInfo({
                  ...productInfo,
                  category: category[index as number],
                  sub_cat: sub_cat_list[0],
                  third_level: "",
                });
                setThirdLevel((prevThirdLevel) => {
                  const updatedThirdLevel = ["כללי", ...third_level_list];
                  return Array.from(new Set(updatedThirdLevel));
                });
                setSubCat(() => sub_cat_list);
              } else {
                setProductInfo({
                  ...productInfo,
                  category: category[index as number],
                  sub_cat: sub_cat_list[0],
                  third_level: "",
                });
                setSubCat(() => sub_cat_list);
                setThirdLevel(["כללי"]);
              }
            }
          } else {
            setProductInfo({
              ...productInfo,
              category: category[index as number],
              sub_cat: "",
              third_level: "",
            });
            setSubCat(undefined);
            setThirdLevel(["כללי"]);
          }
        }}
        options={category}
      />
      {productInfo.category !== "" && sub_cat ? (
        <>
          <div className={"add-product-section-title"}>קטגוריה משנית</div>
          {/* TODO: autocomplete with freesolo (take a look at material ui autocomplete) */}
          <DropDown
            selected={sub_cat.indexOf(productInfo.sub_cat)}
            didSelect={(index) => {
              if (third_levelTree) {
                const third_level_list = third_levelTree.find(
                  (section: any) => section.sub_cat === sub_cat[index as number]
                )?.third_level;
                if (third_level_list && third_level_list.length > 0) {
                  setProductInfo({
                    ...productInfo,
                    sub_cat: sub_cat[index as number],
                    third_level: "",
                  });
                  setThirdLevel((prevThirdLevel) => {
                    const updatedThirdLevel = ["כללי", ...third_level_list];
                    return Array.from(new Set(updatedThirdLevel));
                  });
                } else {
                  setProductInfo({
                    ...productInfo,
                    sub_cat: sub_cat[index as number],
                    third_level: "",
                  });
                  setThirdLevel(["כללי"]);
                }
              }
            }}
            options={sub_cat}
          />
        </>
      ) : (
        <></>
      )}
      {productInfo.sub_cat !== "" && (third_level || third_level === "") ? (
        <>
          <div className={"add-product-section-title"}>סוג</div>
          <AutoCompleteDropDown
            value={productInfo.third_level}
            setValue={(value) => {
              setProductInfo((p) => ({
                ...p,
                third_level: value as string,
              }));
            }}
            options={third_level}
          />
        </>
      ) : (
        <></>
      )}

      <div className={"add-product-section-title"}>תמונה</div>
      <FileInput
        file={file}
        setFile={setFile}
        setProductInfo={setProductInfo}
      />
      <div className={"add-product-section-title"}>&nbsp;</div>
      {/* חובה, להעלות תמונה, שולחים לבאק את השם שלה */}
      <div className={"checkout-buttons"}>
        <button
          className={"add-product-submit"}
          onClick={async () => {
            await updateProductToDb(productInfo);
          }}
        >
          העלאת המוצר
        </button>
      </div>
    </div>
  </div>);
};

const FileInput: React.FC<{
  file: File | null;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
  setProductInfo: React.Dispatch<React.SetStateAction<newProduct>>;
}> = ({ file, setFile, setProductInfo }) => {
  return (
    <div class="baka-file-input">
      <div>
        <span>{file ? file.name : "בחר קובץ"}</span>
        <img
          src={FileIcon}
          alt=""
          onError={(e) => (e.currentTarget.style.display = "")}
          onLoad={(e) => (e.currentTarget.style.display = "block")}
        />
      </div>
      <img src={file ? URL.createObjectURL(file) : undefined} alt="" />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const inputElement = e.target as HTMLInputElement;
          if (inputElement.files) {
            const selectedFile = inputElement.files[0];
            setFile(selectedFile);
            setProductInfo((prevProductInfo) => ({
              ...prevProductInfo,
              img: selectedFile?.name ?? "",
            }));
          }
        }}
      />
    </div>
  );
};
