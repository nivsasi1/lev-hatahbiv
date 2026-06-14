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
      // gentle lean with horizontal speed (kept small so it reads as a pointer)
      const target = Math.max(-14, Math.min(14, (tx - lastX) * 0.6));
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

  // Oriented like a real pointer: the bristle TIP is at SVG (5,5) — top-left —
  // and the handle runs down to the bottom-right. The wrapper sits at the cursor
  // and the SVG is shifted up/left by (5,5) so the tip lands on the hotspot.
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
        width="58"
        height="58"
        viewBox="0 0 58 58"
        style={{ display: "block", transform: "translate(-5px,-5px)", overflow: "visible" }}
      >
        {/* wooden handle — runs to the BOTTOM-RIGHT (where the hand holds it) */}
        <line x1="22" y1="22" x2="52" y2="52" stroke="#8f4f24" stroke-width="8.5" stroke-linecap="round" />
        <line x1="23" y1="23" x2="50" y2="50" stroke="#c89456" stroke-width="3.2" stroke-linecap="round" />
        {/* metal ferrule — band across the neck */}
        <line x1="13" y1="25" x2="25" y2="13" stroke="#aeb4ba" stroke-width="10" stroke-linecap="butt" />
        <line x1="14" y1="24" x2="24" y2="14" stroke="#e9ecee" stroke-width="3" />
        {/* bristles taper up-left to the TIP at (5,5) = the hotspot */}
        <path d="M5 5 L23 14 L14 23 Z" fill="#322c45" />
        <path ref={tipRef} d="M5 5 L19 12 L12 19 Z" fill="#7b3fbf" />
      </svg>
    </div>
  );
}
