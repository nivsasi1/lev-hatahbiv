import "./SearchBar.css";
import SearchPng from "../../../assets/search.svg";

export const SearchBar: React.FC = () => {
  return (
    <form>
      <input type="search" placeholder="Search..." />
      {/* <img src={SearchPng} alt="search icon" /> */}
    </form>
  );
};
