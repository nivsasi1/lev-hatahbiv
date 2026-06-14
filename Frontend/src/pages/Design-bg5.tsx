import MainHome from "./MainHome";
import CursorConstellation from "../components/cursor/CursorConstellation";
import "./design-bg5.css";

export default () => (
  <div className="dz5-root">
    <MainHome cursorFx={<CursorConstellation />} />
  </div>
);
