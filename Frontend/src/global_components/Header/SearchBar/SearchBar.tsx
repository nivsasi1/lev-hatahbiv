import { useState } from "preact/hooks";
import SearchPng from "../../../assets/search.svg";
import { Product } from "../../types";
import { TEST_VALUES } from "../../../pages/Tests/test";
import { Link } from "react-router-dom";

export const SearchBar: React.FC = () => {
  const [searchResults, setSearchResults] = useState<Array<Product>>([TEST_VALUES.products]);

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
          {searchResults && searchResults.length > 0 ?
            <>{searchResults.map((product)=>{
              <SearchResult product />
            })}</> : <></>
          }
      </div>
    </div>
  );
};

const SearchResult:React.FC<{product: Product}> =({product})=>{
  return <Link to={"/"}><div className={"search-result"}></div></Link>
}
