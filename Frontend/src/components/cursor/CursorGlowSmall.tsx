import { useEffect, useRef, useState } from "react";

/**
 * CursorGlowSmall — a small, refined warm glow that trails the cursor like a
 * gentle point of light. Single fixed <div> moved only via transform
 * (compositor-only, the gradient itself is never repainted), rAF-lerped toward
 * the pointer for a soft slight trail.
 *
 * Self-contained, inline styles only. Gated to fine pointers with motion
 * allowed. Freeze-safe: plain radial-gradient + transform, no filters / blend
 * modes / backdrop-filter.
 */
export default function CursorGlowSmall() {
  const [enabled, setEnabled] = useState(false);
  const glowRef = useRef<HTMLDivElement | null>(null);

  // Decide once whether the effect may run, and keep it in sync with the
  // media queries (e.g. a user toggling reduced-motion, or plugging a mouse).
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
    const el = glowRef.current;
    if (!el) return;

    // Target = raw pointer, pos = lerped (trailing) position.
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let posX = targetX;
    let posY = targetY;
    let seen = false; // hide until the first real move
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!seen) {
        // Jump straight to the cursor on first sight so it doesn't streak in
        // from the screen centre, then fade up.
        seen = true;
        posX = targetX;
        posY = targetY;
        el.style.opacity = "1";
      }
    };

    const tick = () => {
      // Gentle ~0.2 lerp gives a smooth slight trail without lag-feel.
      posX += (targetX - posX) * 0.2;
      posY += (targetY - posY) * 0.2;
      el.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [enabled]);

  if (!enabled) return null;

  // Total diameter ~2.6rem (41.6px) with a bright ~0.8rem (12.8px) cream core.
  // Centred on the cursor via negative half-size margins so translate3d places
  // its centre exactly at the pointer.
  const SIZE = "2.6rem";

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 4,
        overflow: "hidden",
      }}
    >
      <div
        ref={glowRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: SIZE,
          height: SIZE,
          marginTop: "calc(-1 * " + SIZE + " / 2)",
          marginLeft: "calc(-1 * " + SIZE + " / 2)",
          borderRadius: "50%",
          opacity: 0,
          transition: "opacity 320ms ease",
          willChange: "transform",
          // Cream bright core -> warm gold -> soft transparent gold.
          backgroundImage:
            "radial-gradient(circle at center," +
            " rgba(255,234,199,0.62) 0%," +
            " rgba(255,234,199,0.5) 24%," +
            " rgba(224,159,62,0.22) 55%," +
            " rgba(224,159,62,0.08) 78%," +
            " rgba(224,159,62,0) 100%)",
        }}
      />
    </div>
  );
}
