import MainHome from "./MainHome";
import CursorAuroraGlow from "../components/cursor/CursorAuroraGlow";
import "./design-bg1.css";

// /design17 "Aurora" — soft pastel aurora/mesh hero background with a glow cursor.
export default () => (
  <div className="dz1-root">
    <MainHome cursorFx={<CursorAuroraGlow />} />
  </div>
);
