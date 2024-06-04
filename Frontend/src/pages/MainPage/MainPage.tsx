import { Header } from "../../global_components/Header/Header";
import CategoryPage from "../../global_components/Category/CategoryPage"
import { ProductPreview } from "../../global_components/ProductPreview/ProductPreview";
 
export const MainPage: React.FC = () => {

  return (
    <>
      <Header />
      <div style={{marginTop: "10rem"}}>
        <CategoryPage category={0} subCategory={0} thirdLevel={0} />
        {/* <CategoryPage category={0} subCategory={0} thirdLevel={0} /> */}
        <ProductPreview />
      </div>
    </>
  );
};
