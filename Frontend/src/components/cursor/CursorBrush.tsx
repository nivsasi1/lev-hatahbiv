import { useEffect, useRef, useState } from "react";

/**
 * CursorBrush — a painted-ribbon trail that follows the cursor like a real
 * brush. Recent cursor points are kept with a per-point width and birth time;
 * each frame we stroke smooth quadratic curves through the midpoints of
 * consecutive points (Blender-style midpoint smoothing) with round caps/joins.
 *
 * The width TAPERS with speed — thick when the cursor crawls, thin when it
 * darts — mimicking the velocity-driven taper of Procreate / Adobe Fresco
 * brushes. Each point fades out over ~1s (alpha = 1 - age/life) and is dropped
 * once dead, so the stroke flows and dissolves organically. The brand hue
 * drifts slowly over time so successive strokes shimmer through the palette.
 *
 * Self-contained, inline styles only. Gated to fine pointers with motion
 * allowed. Freeze-safe: plain 2D canvas, no filters / blend modes /
 * backdrop-filter / feTurbulence.
 *
 * References folded in:
 *  - Awwwards "cursor paint interaction" trails (the painted-ribbon feel)
 *  - Ink-trail cursor pens (age-based fade-out over ~1s)
 *  - Blender brush smoothing (averaging recent locations / midpoint curves)
 *  - Procreate / Adobe Fresco velocity taper (speed-driven thickness)
 */

// Brand / category-art palette. Strokes cycle gently through these hues.
const PALETTE = [
  "#e2574c",
  "#4f9dd0",
  "#3f5fbf",
  "#2a9d8f",
  "#e09f3e",
  "#d94f70",
  "#6a994e",
  "#7b3fbf",
];

interface BrushPoint {
  x: number;
  y: number;
  width: number; // base stroke width at this point (px)
  born: number; // timestamp (ms) for age-based fade
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const PALETTE_RGB = PALETTE.map(hexToRgb);

// Linearly blend between two palette colours by t in [0,1) across the wheel,
// giving a smooth continuous hue drift rather than hard colour jumps.
function paletteAt(t: number): { r: number; g: number; b: number } {
  const len = PALETTE_RGB.length;
  const scaled = ((t % 1) + 1) % 1 * len;
  const i = Math.floor(scaled);
  const f = scaled - i;
  const a = PALETTE_RGB[i % len];
  const b = PALETTE_RGB[(i + 1) % len];
  return {
    r: Math.round(a.r + (b.r - a.r) * f),
    g: Math.round(a.g + (b.g - a.g) * f),
    b: Math.round(a.b + (b.b - a.b) * f),
  };
}

const LIFE = 1000; // ms a point stays visible before it is fully gone
const MAX_POINTS = 110; // hard cap on tracked points
const MAX_WIDTH = 24; // slow-cursor stroke thickness (px) — 20% thinner
const MIN_WIDTH = 3.2; // fast-cursor stroke thickness (px) — 20% thinner
const SPEED_FOR_MIN = 26; // px/frame at which the stroke is fully thin

export default function CursorBrush() {
  const [enabled, setEnabled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Decide once whether the effect may run, and keep it in sync with the media
  // queries (a user toggling reduced-motion, or plugging in a mouse).
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

    const points: BrushPoint[] = [];

    let lastX = 0;
    let lastY = 0;
    let hasLast = false;
    // Smoothed width carried between samples so taper transitions read soft.
    let smoothWidth = MAX_WIDTH;
    let hue = Math.random(); // current palette position (0..1)

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
      if (speed < 0.01) return; // ignore jitter / non-moves

      // Velocity taper: slow -> MAX_WIDTH, fast -> MIN_WIDTH.
      const tSpeed = Math.min(speed / SPEED_FOR_MIN, 1);
      const targetWidth = MAX_WIDTH - (MAX_WIDTH - MIN_WIDTH) * tSpeed;
      // Ease width changes so the ribbon swells/narrows smoothly.
      smoothWidth += (targetWidth - smoothWidth) * 0.35;

      const c = paletteAt(hue);

      // Insert intermediate points on fast flicks so the curve never gaps,
      // keeping the painted ribbon continuous at speed.
      const gap = 6;
      const steps = Math.max(1, Math.floor(speed / gap));
      for (let i = 1; i <= steps; i++) {
        const f = i / steps;
        points.push({
          x: lastX + dx * f,
          y: lastY + dy * f,
          width: smoothWidth,
          born: performance.now(),
          r: c.r,
          g: c.g,
          b: c.b,
        });
      }

      while (points.length > MAX_POINTS) points.shift();

      lastX = x;
      lastY = y;
    };

    let raf = 0;
    const tick = () => {
      const now = performance.now();

      // Drift the hue very slowly (~one full wheel per ~28s) for a living,
      // gently shifting paint colour.
      hue += 0.0006;

      // Drop dead points from the front (oldest first).
      while (points.length && now - points[0].born >= LIFE) points.shift();

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const n = points.length;
      if (n >= 2) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Draw each segment as its own short quadratic so we can vary width,
        // colour and alpha along the ribbon. The curve passes through the
        // midpoints of consecutive points, with the shared point as the
        // control handle — the classic smooth-trail construction.
        for (let i = 1; i < n; i++) {
          const p0 = points[i - 1];
          const p1 = points[i];

          const age = now - p1.born;
          const lifeT = age / LIFE; // 0 fresh .. 1 dead
          if (lifeT >= 1) continue;

          // Position along the *trail* (0 = tail/oldest, 1 = head/newest) gives
          // an extra taper so the brush narrows to a fine tip at the lead.
          const trailT = i / (n - 1);
          // Head tapers to ~55%, plus a soft narrowing of the very tail.
          const tipTaper = 0.55 + 0.45 * Math.min(trailT * 4, 1);
          const headTaper = trailT > 0.85 ? 0.6 + 0.4 * ((1 - trailT) / 0.15) : 1;

          const w =
            ((p0.width + p1.width) * 0.5) * tipTaper * headTaper;
          if (w <= 0.2) continue;

          // Alpha fades with age (1 - age/life), eased and softened so the
          // ribbon dissolves like drying paint rather than snapping off.
          const alpha = (1 - lifeT) * (1 - lifeT) * 0.9;

          // Midpoints of the (i-2,i-1) and (i-1,i) edges. For the first
          // segment fall back to the point itself.
          const prevMidX = i >= 2 ? (points[i - 2].x + p0.x) * 0.5 : p0.x;
          const prevMidY = i >= 2 ? (points[i - 2].y + p0.y) * 0.5 : p0.y;
          const midX = (p0.x + p1.x) * 0.5;
          const midY = (p0.y + p1.y) * 0.5;

          ctx.beginPath();
          ctx.moveTo(prevMidX, prevMidY);
          ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
          ctx.strokeStyle =
            "rgba(" + p1.r + "," + p1.g + "," + p1.b + "," + alpha.toFixed(3) + ")";
          ctx.lineWidth = w;
          ctx.stroke();
        }
      }

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
        zIndex: 4,
      }}
    />
  );
}
