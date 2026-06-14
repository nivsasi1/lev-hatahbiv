import MainHome from "./MainHome";
import CursorBrush from "../components/cursor/CursorBrush";

// The real homepage is the merged "MainHome" design (split hero + design-7 body
// + moving rail + micro-interactions), with the chosen BRUSH cursor trail — a
// flowing painted ribbon that trails the pointer and dissolves.
export const HomePage = () => <MainHome cursorFx={<CursorBrush />} />;
