import { useEffect, useRef, useState } from "react";

/**
 * CursorWatercolorBrush — moving the mouse lays down soft translucent
 * watercolour BLOOMS: overlapping low-alpha radial blobs in light brand tints
 * that spread a little and fade over ~1.4s. The feel is "painting with water" —
 * each daub is a wet pigment pool that blossoms outward, its edge softened by a
 * radial gradient, then dries away.
 *
 * Pigment is kept deliberately LIGHT (peak alpha ~0.10) so page text under the
 * canvas stays readable. We use canvas globalCompositeOperation "multiply" so
 * overlapping blooms darken/mix like real wet pigment rather than washing out —
 * that is the CANVAS op, NOT the forbidden CSS mix-blend-mode property.
 *
 * Self-contained, inline styles only. Gated to fine pointers with motion
 * allowed (renders null otherwise) and honours prefers-reduced-motion live.
 * Freeze-safe: plain 2D canvas — no CSS filters / blend modes / backdrop-filter
 * / feTurbulence. dpr-aware with a resize handler; particle count is capped.
 *
 * References folded in:
 *  - jangmi-jo/watercolor (browser canvas wet-pigment blooms, soft radial edges)
 *  - p5.brush watercolour fill (low-opacity layered diffusion for an organic feel)
 *  - Awwwards "watercolour cursor" interactions (water-trail blooms that dry out)
 */

// Light brand tints — soft, gallery pastels drawn from the store palette.
const PALETTE: Array<[number, number, number]> = [
  [226, 87, 76], // ribbon red
  [79, 157, 208], // sky blue
  [63, 95, 191], // indigo
  [42, 157, 143], // teal
  [224, 159, 62], // amber
  [217, 79, 112], // rose
  [106, 153, 78], // leaf
  [123, 63, 191], // brand purple
];

interface Bloom {
  x: number;
  y: number;
  r0: number; // start radius (px)
  r1: number; // end radius after spread (px)
  born: number; // ms
  life: number; // ms
  peak: number; // peak alpha
  r: number;
  g: number;
  b: number;
}

const LIFE_MIN = 1100; // ms — bottom of the 1-2s spread/fade window
const LIFE_VAR = 700; // + up to this many ms
const MAX_BLOOMS = 90; // hard particle cap
const PEAK_ALPHA = 0.1; // keep pigment light for readable text

export default function CursorWatercolorBrush() {
  const [enabled, setEnabled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Decide once, then track media-query changes (user enabling reduced-motion,
  // or plugging in a mouse) so the effect turns itself off/on live.
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const blooms: Bloom[] = [];
    let hue = Math.random() * PALETTE.length; // float index → gentle drift

    let lastX = 0;
    let lastY = 0;
    let hasLast = false;

    // Spawn a wet daub with a touch of jitter so each pool reads hand-laid.
    const spawn = (x: number, y: number, speed: number) => {
      const idx = Math.floor(hue) % PALETTE.length;
      const [r, g, b] = PALETTE[idx];
      // Faster strokes → slightly larger, more spread-out pools, like more
      // water carried across the paper.
      const base = 18 + Math.min(speed * 0.6, 26);
      const jx = (Math.random() - 0.5) * 10;
      const jy = (Math.random() - 0.5) * 10;
      blooms.push({
        x: x + jx,
        y: y + jy,
        r0: base * (0.5 + Math.random() * 0.2),
        r1: base * (1.15 + Math.random() * 0.5),
        born: performance.now(),
        life: LIFE_MIN + Math.random() * LIFE_VAR,
        peak: PEAK_ALPHA * (0.7 + Math.random() * 0.5),
        r,
        g,
        b,
      });
      if (blooms.length > MAX_BLOOMS) blooms.shift();
    };

    const onMove = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;

      if (!hasLast) {
        hasLast = true;
        lastX = x;
        lastY = y;
        return;
      }

      const dx = x - lastX;
      const dy = y - lastY;
      const speed = Math.hypot(dx, dy);
      if (speed < 0.6) return; // ignore jitter / non-moves

      // Drift the hue slowly so a continuous stroke shifts through the palette.
      hue += 0.06;

      // Lay overlapping daubs along the travelled segment so the stroke is a
      // continuous wet ribbon rather than dotted pools at speed.
      const gap = 9;
      const steps = Math.min(Math.max(1, Math.floor(speed / gap)), 6);
      for (let i = 1; i <= steps; i++) {
        const f = i / steps;
        spawn(lastX + dx * f, lastY + dy * f, speed);
      }

      lastX = x;
      lastY = y;
    };

    let raf = 0;
    const tick = () => {
      const now = performance.now();

      // Drop fully-dried pools from the front (oldest first).
      while (blooms.length && now - blooms[0].born >= blooms[0].life) {
        blooms.shift();
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // "multiply" makes overlapping wet pigment mix and deepen like watercolour
      // on paper. This is the CANVAS composite op (allowed), not CSS blend.
      ctx.globalCompositeOperation = "multiply";

      for (let i = 0; i < blooms.length; i++) {
        const bl = blooms[i];
        const t = (now - bl.born) / bl.life; // 0 fresh .. 1 dried
        if (t >= 1) continue;

        // Spread: radius eases outward as the pool blossoms.
        const ease = 1 - (1 - t) * (1 - t); // easeOutQuad
        const radius = bl.r0 + (bl.r1 - bl.r0) * ease;

        // Alpha: a quick wet-in (first ~18%) then a long gentle dry-out, so the
        // bloom appears, settles, and fades like drying paint.
        const wetIn = Math.min(t / 0.18, 1);
        const dryOut = 1 - Math.max((t - 0.18) / 0.82, 0);
        const alpha = bl.peak * wetIn * (dryOut * dryOut);
        if (alpha <= 0.002 || radius <= 0.5) continue;

        // Soft radial pool: saturated-ish near the centre, feathering to fully
        // transparent at the rim → the signature soft watercolour edge.
        const grad = ctx.createRadialGradient(
          bl.x,
          bl.y,
          0,
          bl.x,
          bl.y,
          radius
        );
        const rgb = bl.r + "," + bl.g + "," + bl.b;
        grad.addColorStop(0, "rgba(" + rgb + "," + alpha.toFixed(3) + ")");
        grad.addColorStop(
          0.55,
          "rgba(" + rgb + "," + (alpha * 0.5).toFixed(3) + ")"
        );
        grad.addColorStop(1, "rgba(" + rgb + ",0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bl.x, bl.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Reset for safety so nothing outside this loop inherits the op.
      ctx.globalCompositeOperation = "source-over";

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}
