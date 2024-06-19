import { useState } from "preact/hooks";
import SearchPng from "../../../assets/search.svg";
import { TEST_VALUES } from "../../../pages/Tests/test";
import { Link } from "react-router-dom";
import { Product } from "../../../Types/globalTypes";
import { Arrow } from "../../../pages/ProductPreviewPage/ProductPreview";

export const SearchBar: React.FC = () => {
  const [searchResults, setSearchResults] = useState<Array<Product>>(
    TEST_VALUES.products
  );

  const changeHandler = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    console.log(input.value);
    if (input.value != "") {
      const products: any = await fetch(
        `http://localhost:5000/findProducts/${input.value}`,
        { method: "GET" }
      );
      const jsonProducts = await products.json();
      console.log("products found" + jsonProducts.data);
      setSearchResults(jsonProducts.data);
    }
  };

  return (
    <div className={"search-input"}>
      <input
        id={"search-input"}
        placeholder="חיפוש באתר"
        onInput={changeHandler}
      />
      <img src={SearchPng} alt="search icon" />
      <div className={"search-results"}>
        <div>תוצאות חיפוש</div>
        {searchResults && searchResults.length > 0 ? (
          <>
            {searchResults.map((product) => {
              return <SearchResult product={product} />;
            })}
            {searchResults.length > 0 && <Link to={""} className="search-results-more">
            <span>לצפייה בכלל התוצאות</span> 
            <Arrow />
            </Link>}
          </>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

const SearchResult: React.FC<{ product: Product }> = ({ product }) => {
  // console.log(product);
  return (
    <Link to={"/product/" + product._id} className={"search-result"}>
      <div class="search-result-content">
        <div>
          <img
            src={"/images/" + product.img}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            onLoad={(e) => {
              e.currentTarget.style.display = "block";
            }}
          />
        </div>
        <div>
          <span>{product.name}</span>
          <span style={{fontSize: "0.9em", opacity: 0.5}}>{product.desc ?? ""}</span>
        </div>
      </div>
    </Link>
  );
};
