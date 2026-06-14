import MainHome from "./MainHome";
import CursorBlobTrail from "../components/cursor/CursorBlobTrail";
import "./design-bg2.css";

export default () => (
  <div className="dz2-root">
    <MainHome cursorFx={<CursorBlobTrail />} />
  </div>
);
