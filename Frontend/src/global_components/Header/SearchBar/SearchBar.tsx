import { useState } from "preact/hooks";
import SearchPng from "../../../assets/search.svg";
import { Product } from "../../types";

export const SearchBar: React.FC = () => {
  const [searchResults, setSearchResults] = useState<Product[]>([]);

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
    </div>
  );
};
