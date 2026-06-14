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

  // Oriented like a real pointer: the bristle TIP is at SVG (4,4) — top-left —
  // and the thin handle runs down to the bottom-right. Rendered at HALF the
  // viewBox size (28px / 56 units = 0.5), so the tip at (4,4) lands at 2px; the
  // SVG is shifted by (-2,-2) so the tip sits exactly on the hotspot.
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
        width="28"
        height="28"
        viewBox="0 0 56 56"
        style={{ display: "block", transform: "translate(-2px,-2px)", overflow: "visible" }}
      >
        {/* thin wooden handle — runs to the BOTTOM-RIGHT (held end) */}
        <line x1="31" y1="31" x2="50" y2="50" stroke="#8f4f24" stroke-width="5.5" stroke-linecap="round" />
        <line x1="32" y1="32" x2="48" y2="48" stroke="#c89456" stroke-width="2.2" stroke-linecap="round" />
        {/* metal ferrule — short band at the neck */}
        <line x1="22" y1="34" x2="34" y2="22" stroke="#aeb4ba" stroke-width="7.5" stroke-linecap="round" />
        <line x1="23" y1="33" x2="33" y2="23" stroke="#e9ecee" stroke-width="2.4" />
        {/* LONG tapered bristle tuft narrowing to a fine point at (4,4) = hotspot */}
        <path d="M4 4 C 18 11, 23 18, 29 29 C 18 23, 11 18, 4 4 Z" fill="#2f2a40" />
        <path ref={tipRef} d="M4 4 C 16 12, 20 16, 26 26 C 16 20, 12 16, 4 4 Z" fill="#7b3fbf" />
        {/* a couple of hairs for brush texture */}
        <path d="M5 5 L22 23" stroke="rgba(255,255,255,0.4)" stroke-width="0.9" fill="none" />
        <path d="M8 4 L25 21" stroke="rgba(0,0,0,0.14)" stroke-width="0.9" fill="none" />
      </svg>
    </div>
  );
}
