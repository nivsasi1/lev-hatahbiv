import storeLogo from "../../assets/LevHatahbivLogo.png";
import { Cart } from "./Cart/Cart";
import { SearchBar } from "./SearchBar/SearchBar";

export const Header: React.FC = () => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "15%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "white",
      }}
    >
      <div style={{ marginLeft: "30px" }}>
        <Cart />
      </div>
      
      <div style={{ display: "flex", alignItems: "center", marginRight: "20px" }}>
        <SearchBar />
        <img className="storeLogo" src={storeLogo} alt="storeLogo" style={{ marginLeft: "10px" }} />
      </div>
    </div>
  );
};
