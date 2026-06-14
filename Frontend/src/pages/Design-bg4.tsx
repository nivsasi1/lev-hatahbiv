import MainHome from "./MainHome";
import CursorGlassDisc from "../components/cursor/CursorGlassDisc";
import "./design-bg4.css";

/* ---------------------------------------------------------------------------
   Design variant 4 — "זכוכית" (Glass).
   A soft GLASSMORPHISM hero: a gentle light pastel gradient (lavender → peach →
   sky) that slowly shifts, with a few translucent frosted PANELS floating and
   parallaxing over it. FAKE glass only — layered rgba fills + bright highlight
   borders + big soft shadows (NO backdrop-filter, NO CSS filter on large areas,
   NO mix-blend-mode). The body stays <MainHome/>; the GlassDisc cursor (a
   translucent glass disc with a refraction ring + trailing ring) is passed in
   as the overlay element.
   --------------------------------------------------------------------------- */
export default () => (
  <div className="dz4-root">
    <MainHome cursorFx={<CursorGlassDisc />} />
  </div>
);
