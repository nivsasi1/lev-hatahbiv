import { useEffect, useState } from "preact/hooks";
import { PageButton } from "../CheckoutPage/CheckoutPage";
import { Input, useInput } from "../../global_components/Input/Input";
import { DropDown } from "../../global_components/DropDown/DropDown";
import "./addProductPage.css";
import SectionMenuList from "../../global_components/Header/SectionMenu/menu.json";
import React from "preact/compat";
import FileIcon from "../../assets/file_upload.svg"

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
    isAvailable: true,
    desc: "",
    category: "צבעים לאמנות",
    sub_cat: "צבע אקריליק",
    third_level: "כללי",
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

  const updateProductToDb = async (product: newProduct) => {
    //TODO: check and apply those checks
    console.log(product);
    console.log("submitted")
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
    if (response.status === 200) {
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
    <div className={"add-product-form"}>
      {/* //חובה */}
      {/* <Input {...useInput({
        shouldShowError: shouldShowErrors,
        name: "product-name",
        key: "name",
        info: productInfo,
        setValue: setProductInfo,
        title: "שם המוצר",
        placeholder: "שם המוצר",
        type: "string",
        warning: "השם לא יכול להיות ריק",
        check: (value) => value !== ""
      })}/> */}
      {/* setValue={(value) => setProductInfo({ ...productInfo, name: value })} */}
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
          warning="במידה ויש מבצע/הנחה על המוצר, מלאו כאן באחוזים"
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
          warning="אם אזל המלאי או שהכמות אינה ידועה השאירו 0"
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
                  third_level: third_level_list[0],
                });
                setThirdLevel(() => ["כללי", ...third_level_list]);
                setSubCat(() => sub_cat_list);
              } else {
                setProductInfo({
                  ...productInfo,
                  category: category[index as number],
                  sub_cat: sub_cat_list[0],
                  third_level: "כללי",
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
              third_level: "כללי",
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
                    third_level: third_level_list[0],
                  });
                  setThirdLevel(() => ["כללי", ...third_level_list]);
                } else {
                  setProductInfo({
                    ...productInfo,
                    sub_cat: sub_cat[index as number],
                    third_level: "כללי",
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
      {productInfo.sub_cat !== "" && third_level ? (
        <>
          <div className={"add-product-section-title"}>סוג</div>
          <DropDown
            selected={third_level.indexOf(productInfo.third_level)}
            didSelect={(index) => {
              setProductInfo({
                ...productInfo,
                third_level: third_level[index as number],
              });
            }}
            options={third_level}
          />
        </>
      ) : (
        <></>
      )}

      <div className={"add-product-section-title"}>תמונה</div>
      <FileInput setProductInfo={setProductInfo} />
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
        <button
          onClick={async () => {
            await updateProductToDb(productInfo);
          }}
        />
      </div>
    </div>
  );
};

const FileInput: React.FC<{
  setProductInfo: React.Dispatch<React.SetStateAction<newProduct>>;
}> = ({ setProductInfo }) => {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div class="baka-file-input">
      <div>
        <span>
          {file ? file.name : "בחר קובץ"}
        </span>
        <img src={FileIcon} alt="" onError={(e)=> e.currentTarget.style.display=""} onLoad={(e)=> e.currentTarget.style.display="block"} />
      </div>
      <img src={file ? URL.createObjectURL(file):undefined} alt="" />
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
