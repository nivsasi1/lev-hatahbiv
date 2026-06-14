import MainHome from "./MainHome";
import CursorWatercolorBrush from "../components/cursor/CursorWatercolorBrush";
import "./design-bg3.css";

// /design19 "Watercolour" — the production homepage on a calm watercolour wash:
// soft brand-tinted colour clouds that slowly breathe and drift over warm paper,
// with a cursor that paints translucent watercolour blooms as you move.
export default () => (
  <div className="dz3-root">
    <MainHome cursorFx={<CursorWatercolorBrush />} />
  </div>
);
