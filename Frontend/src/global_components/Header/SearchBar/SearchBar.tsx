import SearchPng from "../../../assets/search.svg";

export const SearchBar: React.FC = () => {
  return (
    <div className={"search-input"}>
      <input id={"search-input"} placeholder="חיפוש באתר" />
      <img src={SearchPng} alt="search icon" />
    </div>
  );
};
