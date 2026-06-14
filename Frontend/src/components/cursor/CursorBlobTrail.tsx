import { useEffect, useRef, useState } from "react";

/**
 * CursorBlobTrail — a friendly liquid dot.
 *
 * A small soft gooey blob trails the pointer with a springy lerp and
 * squashes/stretches with velocity: it scales up along its direction of
 * travel and pinches on the perpendicular axis (volume-preserving squash),
 * then settles back to a round dot when the pointer rests. A faint inner
 * highlight gives it a glossy, jelly-like read in a soft brand tint.
 *
 * Implementation is a single transformed <div> (no canvas needed) — a soft
 * radial-gradient fill with a blurred drop-shadow glow, driven by one rAF
 * loop. Freeze-safe: no CSS mix-blend-mode / backdrop-filter / feTurbulence;
 * the only `filter` is a tiny drop-shadow on a ~36px element (not a large
 * area), which is safe.
 *
 * Gated to fine pointers with motion allowed; honours reduced-motion.
 *
 * References folded in:
 *  - Awwwards springy "follow" cursors (lerp easing toward the pointer)
 *  - Liquid / gooey blob cursors (velocity squash-&-stretch, glossy tint)
 */

const SIZE = 34; // base diameter of the blob (px)
const BRAND = "123, 63, 191"; // soft brand purple (rgb) — the dot tint

export default function CursorBlobTrail() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement | null>(null);

  // gating — only on a real fine pointer with motion allowed; stay in sync
  // with the user toggling reduced-motion or plugging in a mouse.
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
    const dot = dotRef.current;
    if (!dot) return;

    // target (true pointer) and rendered (eased) positions
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let x = tx;
    let y = ty;
    let prevX = x;
    let prevY = y;

    // eased velocity used to drive the squash; angle of travel.
    let vmag = 0;
    let angle = 0;
    let visible = false;

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!visible) {
        // place it under the pointer on first move so it doesn't fly in
        x = tx;
        y = ty;
        prevX = tx;
        prevY = ty;
        visible = true;
        dot.style.opacity = "1";
      }
    };

    const onLeave = () => {
      visible = false;
      dot.style.opacity = "0";
    };

    let raf = 0;
    const tick = () => {
      // springy follow — ease the rendered point toward the pointer
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;

      // instantaneous travel of the *rendered* dot → speed & direction
      const dx = x - prevX;
      const dy = y - prevY;
      prevX = x;
      prevY = y;
      const speed = Math.hypot(dx, dy);

      // ease the velocity magnitude so squash swells/relaxes smoothly
      vmag += (speed - vmag) * 0.2;
      if (speed > 0.4) angle = Math.atan2(dy, dx);

      // velocity → squash factor. Cap so it never gets extreme.
      const s = Math.min(vmag / 26, 1); // 0 rest .. 1 fast
      const stretch = 1 + s * 0.55; // grow along travel axis
      const squash = 1 - s * 0.32; // pinch perpendicular (volume-ish)
      // gently grow overall size with speed for a livelier feel
      const grow = 1 + s * 0.12;

      dot.style.transform =
        "translate3d(" +
        (x - SIZE / 2).toFixed(2) +
        "px," +
        (y - SIZE / 2).toFixed(2) +
        "px,0) rotate(" +
        angle.toFixed(3) +
        "rad) scale(" +
        (stretch * grow).toFixed(3) +
        "," +
        (squash * grow).toFixed(3) +
        ")";

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", onLeave);
    document.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 5,
        overflow: "hidden",
      }}
    >
      <div
        ref={dotRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: SIZE,
          height: SIZE,
          borderRadius: "50%",
          opacity: 0,
          willChange: "transform, opacity",
          transition: "opacity 0.25s ease",
          // glossy jelly: bright off-centre highlight → soft brand body
          background:
            "radial-gradient(circle at 34% 30%, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.5) 14%, rgba(" +
            BRAND +
            ",0.62) 46%, rgba(" +
            BRAND +
            ",0.34) 100%)",
          // soft outer glow (small element → safe to filter)
          filter:
            "drop-shadow(0 4px 10px rgba(" + BRAND + ",0.34))",
        }}
      />
    </div>
  );
}
