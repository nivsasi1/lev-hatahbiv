import { Header } from "../../global_components/Header/Header";
import CategoryPage from "../../global_components/Category/CategoryPage";
import { ProductPreview } from "../../global_components/ProductPreview/ProductPreview";
import { useLocation } from "react-router";

const product = {
  name: "מכחול גומי - סט 5 מונט מרט",
  price: 0,
  desc: "סט של 5 מכחולי גומי לציור ופיסול, כל מכחול בצורה שונה . משמש להנחת והסרת צבע, טשטוש פחם ופסטלים, החלקה ויצרת תבליט על חימר לסוגיו, כמו כן מתאים לדבק ולנוזל מיסוך לצבעי מים.",
  category: "מכחולים ואביזרים",
  sub_cat: "מכחולים",
  third_level: "",
  img: "",
};

export const MainPage: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const cat = queryParams.get("cat");
  const sub_cat = queryParams.get("sub_cat");

  return (
    <>
      <Header />
      <div style={{ marginTop: "10rem" }}>
        {/* <CategoryPage category={0} subCategory={0} thirdLevel={0} /> */}
        <CategoryPage category={cat || ""} subCategory={sub_cat || ""} />
        {/* <ProductPreview product={product}/> */}
      </div>
    </>
  );
};
