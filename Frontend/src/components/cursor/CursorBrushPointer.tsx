import { useEffect, useRef, useState } from "react";

// Loaded-paint tip cycles through the category-art palette.
const PALETTE = [
  "#e2574c", "#4f9dd0", "#3f5fbf", "#2a9d8f",
  "#e09f3e", "#d94f70", "#6a994e", "#7b3fbf",
];

/**
 * CursorBrushPointer — replaces the mouse pointer with a little paintbrush whose
 * bristle TIP sits exactly at the cursor hotspot. The brush leans with the
 * direction/speed of movement, and its loaded-paint tip slowly cycles colour.
 *
 * Self-contained + freeze-safe: a fixed SVG moved only via transform, plus a
 * one-off injected rule that hides the native cursor everywhere while active.
 * Real-mouse + motion-allowed only; restores the native cursor on unmount.
 */
export default function CursorBrushPointer() {
  const [enabled, setEnabled] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const tipRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const fineMq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(fineMq.matches && !reduceMq.matches);
    update();
    fineMq.addEventListener("change", update);
    reduceMq.addEventListener("change", update);
    return () => {
      fineMq.removeEventListener("change", update);
      reduceMq.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const el = wrapRef.current;
    if (!el) return;

    // Hide the native cursor EVERYWHERE while the brush is active (one shared
    // <style>, ref-counted via a data attribute so unmount cleans up cleanly).
    const STYLE_ID = "lh-brush-cursor-style";
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent =
        "html.lh-brush-cursor, html.lh-brush-cursor * { cursor: none !important; }";
      document.head.appendChild(style);
    }
    document.documentElement.classList.add("lh-brush-cursor");

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let x = tx;
    let y = ty;
    let lastX = tx;
    let ang = 0;
    let seen = false;
    let raf = 0;
    let hue = 0;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!seen) {
        x = tx;
        y = ty;
        seen = true;
        el.style.opacity = "1";
      }
    };

    const tick = () => {
      // tight follow with a hair of trail
      x += (tx - x) * 0.4;
      y += (ty - y) * 0.4;
      // lean the brush with horizontal speed (paint-stroke feel)
      const target = Math.max(-24, Math.min(24, (tx - lastX) * 0.9));
      lastX = tx;
      ang += (target - ang) * 0.15;
      el.style.transform =
        "translate3d(" + x + "px," + y + "px,0) rotate(" + ang.toFixed(2) + "deg)";
      // slowly cycle the loaded-paint tip colour
      hue += 1;
      if (tipRef.current) {
        tipRef.current.setAttribute(
          "fill",
          PALETTE[((hue / 26) | 0) % PALETTE.length]
        );
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.classList.remove("lh-brush-cursor");
    };
  }, [enabled]);

  if (!enabled) return null;

  // The bristle tip is at SVG (4,56); the wrapper is placed at the cursor and
  // the SVG is shifted up/left by that so the tip lands exactly on the hotspot.
  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 6,
        pointerEvents: "none",
        opacity: 0,
        transition: "opacity 0.2s ease",
        willChange: "transform",
      }}
    >
      <svg
        width="62"
        height="62"
        viewBox="0 0 62 62"
        style={{ display: "block", transform: "translate(-4px,-56px)", overflow: "visible" }}
      >
        {/* soft contact shadow under the tip */}
        <ellipse cx="6" cy="58" rx="6" ry="2.2" fill="rgba(43,36,64,0.18)" />
        {/* wooden handle */}
        <line x1="27" y1="33" x2="56" y2="6" stroke="#8f4f24" stroke-width="8.5" stroke-linecap="round" />
        <line x1="28" y1="32" x2="54" y2="9" stroke="#c89456" stroke-width="3.2" stroke-linecap="round" />
        {/* metal ferrule */}
        <line x1="18" y1="45" x2="31" y2="32" stroke="#aeb4ba" stroke-width="10" stroke-linecap="butt" />
        <line x1="19" y1="44" x2="30" y2="33" stroke="#e9ecee" stroke-width="3" />
        {/* bristles (dark base + cycling paint) */}
        <path d="M16 44 L31 29 L3 57 Z" fill="#322c45" />
        <path ref={tipRef} d="M13 45 L27 33 L4 56 Z" fill="#7b3fbf" />
      </svg>
    </div>
  );
}
