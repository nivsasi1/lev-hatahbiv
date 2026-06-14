// CursorAuroraGlow — a soft, large pastel glow that pools around the pointer
// like the aurora gathering light. A radial-gradient div lerps toward the
// cursor (moved purely by transform) while its hue gently cycles through the
// pastel set; a second, smaller inner bloom adds a brighter core.
//
// It ALSO drives the dreamy background parallax: each frame it writes rAF-lerped
// --gx / --gy custom properties (a few px of normalized pointer offset) onto the
// nearest .dz1-root, so the aurora blob layers nudge with the mouse. No canvas,
// no CSS filter on large areas — just two transformed radial-gradient divs.
import { useEffect, useRef, useState } from "react";

// pastel aurora hues the glow cycles through (HSL hue, sat%, light%)
const HUES = [
  [264, 60, 82], // lavender
  [22, 90, 84], // peach
  [150, 52, 82], // mint
  [210, 80, 85], // sky
  [330, 70, 86], // blush
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function CursorAuroraGlow() {
  const [enabled, setEnabled] = useState(false);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const coreRef = useRef<HTMLDivElement | null>(null);

  // gating — only on a real fine pointer with motion allowed
  useEffect(() => {
    const fineMq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(fineMq.matches && !reducedMq.matches);
    update();
    fineMq.addEventListener("change", update);
    reducedMq.addEventListener("change", update);
    return () => {
      fineMq.removeEventListener("change", update);
      reducedMq.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const glow = glowRef.current;
    const core = coreRef.current;
    if (!glow || !core) return;

    // the wrapper we feed parallax vars to (nearest .dz1-root, else <html>)
    const root: HTMLElement =
      (glow.closest(".dz1-root") as HTMLElement | null) ||
      document.documentElement;

    let tx = window.innerWidth / 2; // target (pointer)
    let ty = window.innerHeight / 2;
    let gx = tx; // glow position (lags)
    let gy = ty;
    let cx = tx; // core position (lags less)
    let cy = ty;
    let px = 0; // parallax offset, normalized -1..1, lerped
    let py = 0;
    let hue = 0; // continuous hue phase
    let started = false; // hold hidden until first real move

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!started) {
        // snap on first appearance so it fades in where the cursor is
        gx = cx = tx;
        gy = cy = ty;
        started = true;
        glow.style.opacity = "1";
        core.style.opacity = "1";
      }
    };
    const onLeave = () => {
      glow.style.opacity = "0";
      core.style.opacity = "0";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", onLeave, { passive: true });
    document.addEventListener("mouseleave", onLeave, { passive: true });

    let raf = 0;
    let prev = performance.now();
    const frame = (now: number) => {
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;

      // lerp the two blooms toward the pointer (frame-rate independent-ish)
      const e1 = 1 - Math.pow(0.0012, dt); // soft, trailing
      const e2 = 1 - Math.pow(0.00005, dt); // snappier core
      gx = lerp(gx, tx, e1);
      gy = lerp(gy, ty, e1);
      cx = lerp(cx, tx, e2);
      cy = lerp(cy, ty, e2);

      // gentle hue cycle through the pastel aurora
      hue += dt * 0.12; // ~one full sweep per ~8s
      const fp = (hue % 1) * HUES.length;
      const i = Math.floor(fp);
      const f = fp - i;
      const a = HUES[i % HUES.length];
      const b = HUES[(i + 1) % HUES.length];
      const h = lerp(a[0], a[0] + (((b[0] - a[0] + 540) % 360) - 180), f);
      const s = lerp(a[1], b[1], f);
      const l = lerp(a[2], b[2], f);
      const c1 = `hsla(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%, 0.30)`;
      const c2 = `hsla(${h.toFixed(0)}, ${s.toFixed(0)}%, ${(l + 6).toFixed(
        0
      )}%, 0.42)`;

      glow.style.transform = `translate3d(${(gx - 240).toFixed(1)}px, ${(
        gy - 240
      ).toFixed(1)}px, 0)`;
      glow.style.background = `radial-gradient(closest-side, ${c1}, transparent 72%)`;

      core.style.transform = `translate3d(${(cx - 90).toFixed(1)}px, ${(
        cy - 90
      ).toFixed(1)}px, 0)`;
      core.style.background = `radial-gradient(closest-side, ${c2}, transparent 70%)`;

      // background parallax: normalize pointer to -1..1, lerp, expose as px vars
      const nx = (tx / window.innerWidth - 0.5) * 2;
      const ny = (ty / window.innerHeight - 0.5) * 2;
      const ep = 1 - Math.pow(0.02, dt);
      px = lerp(px, nx, ep);
      py = lerp(py, ny, ep);
      root.style.setProperty("--gx", (px * 14).toFixed(2) + "px");
      root.style.setProperty("--gy", (py * 14).toFixed(2) + "px");

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("mouseleave", onLeave);
      root.style.removeProperty("--gx");
      root.style.removeProperty("--gy");
    };
  }, [enabled]);

  if (!enabled) return null;

  const base: any = {
    position: "fixed",
    top: 0,
    left: 0,
    pointerEvents: "none",
    borderRadius: "50%",
    opacity: 0,
    willChange: "transform, opacity, background",
    transition: "opacity 0.5s ease",
  };

  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 5 }}>
      <div
        ref={glowRef}
        style={{ ...base, width: 480, height: 480 }}
      />
      <div
        ref={coreRef}
        style={{ ...base, width: 180, height: 180 }}
      />
    </div>
  );
}
