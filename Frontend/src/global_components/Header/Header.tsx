import storeLogo from "../../assets/LevHatahbivLogo.png";
import { Cart } from "./Cart/Cart";
import { SearchBar } from "./SearchBar/SearchBar";
import { SectionsMenu } from "./SectionMenu/SectionsMenu"

export const Header: React.FC = () => {
  return (
    <div className={"nav"}>
      <div>
        <img id={"logo"} src={storeLogo} alt="storeLogo" />
        <SearchBar />
        <Cart amount={1} />
      </div>
      <SectionsMenu />
    </div>
  );
};
