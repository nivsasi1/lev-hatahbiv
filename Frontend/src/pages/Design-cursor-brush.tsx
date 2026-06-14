import MainHome from "./MainHome";
import CursorBrush from "../components/cursor/CursorBrush";
import CursorBrushPointer from "../components/cursor/CursorBrushPointer";

// /designs preview: the production homepage where the MOUSE CURSOR ITSELF is a
// little paintbrush (tip = hotspot, leans with movement), on top of the brush
// ribbon trail.
export default () => (
  <MainHome
    cursorFx={
      <>
        <CursorBrush />
        <CursorBrushPointer />
      </>
    }
  />
);
