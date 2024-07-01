import SearchPng from "../../../assets/search.svg";
import { Link } from "react-router-dom";
import { Product } from "../../../Types/globalTypes";

export const SearchBar: React.FC<{ setSearchVisible?: (v: boolean) => void }> = ({ setSearchVisible }) => {

  return (
    // <div class="search-input-container">
      <div className={"search-input"} onClick={() => {
        if (setSearchVisible) {
          setSearchVisible(true)
        }
      }}>
        {/* <input
        id={"search-input"}
        placeholder="חיפוש באתר"
        onInput={changeHandler}
      /> */}
        <span>חיפוש באתר</span>
        <img src={SearchPng} alt="search icon" />

      </div>
    // </div>
  );
};