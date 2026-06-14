import { useEffect, useRef, useState } from "react";

/**
 * CursorDrip — colour-dropping paint cursor.
 *
 * Flicks small palette-coloured droplets off the cursor as it moves. Each drop
 * falls under gravity, leaves a thin "wet" drip streak from its previous to its
 * current position, elongates as it accelerates downward, and fades over
 * ~0.7-1.3s. Like flicking a loaded, wet brush — drips of colour running down
 * the page, with the occasional long satisfying run.
 *
 * Pure 2D canvas + rAF. Freeze-safe: no feTurbulence, no mix-blend-mode, no
 * backdrop-filter, no CSS filters on large areas.
 *
 * Reference: Tim Holman's "Dripping Paint" canvas experiment
 * (https://github.com/tholman/Dripping-Paint) for the streak + head + gravity
 * drip aesthetic.
 */

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

const GRAVITY = 0.16; // px / frame^2 (tuned at ~60fps)
const DRAG = 0.985; // horizontal damping per frame
const MAX_DROPS = 90;

interface Drop {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  age: number; // frames
  life: number; // frames
  // a tiny fraction of drops are "runners" — slimmer, longer-lived heavy runs
  runner: boolean;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function CursorDrip() {
  const [enabled, setEnabled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Detect capability and subscribe to media-query changes.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const sizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeCanvas();

    const drops: Drop[] = [];

    // Pointer state.
    let px = -1;
    let py = -1;
    let lastX = -1;
    let lastY = -1;
    let pendingX = -1;
    let pendingY = -1;
    let hasPending = false;

    const spawn = (sx: number, sy: number, speed: number, color: string) => {
      if (drops.length >= MAX_DROPS) return;
      // Occasional long "run": slimmer, much longer-lived, almost no sideways drift.
      const runner = Math.random() < 0.16;
      const angle = Math.random() * Math.PI * 2;
      // Flick outward a touch; faster movement throws further.
      const flick = 0.4 + Math.min(speed, 28) * 0.05;
      const r = runner
        ? 1.4 + Math.random() * 1.6
        : 2.2 + Math.random() * 3.4;
      drops.push({
        x: sx,
        y: sy,
        prevX: sx,
        prevY: sy,
        vx: Math.cos(angle) * flick * (runner ? 0.3 : 1),
        vy: Math.sin(angle) * flick * 0.5 + 0.3, // bias slightly downward
        r,
        color,
        age: 0,
        life: runner
          ? 110 + Math.random() * 60 // ~1.8-2.8s long runs
          : 42 + Math.random() * 36, // ~0.7-1.3s
        runner,
      });
    };

    const onMove = (e: PointerEvent) => {
      pendingX = e.clientX;
      pendingY = e.clientY;
      hasPending = true;
    };

    const frame = () => {
      // Process pointer movement: derive velocity, flick fresh drops.
      if (hasPending) {
        if (lastX < 0) {
          lastX = pendingX;
          lastY = pendingY;
        }
        px = pendingX;
        py = pendingY;
        const dx = px - lastX;
        const dy = py - lastY;
        const speed = Math.hypot(dx, dy);
        lastX = px;
        lastY = py;
        hasPending = false;

        if (speed > 1.2) {
          const count = speed > 9 ? 2 : 1;
          for (let i = 0; i < count; i++) {
            // jitter the spawn point a little around the cursor
            const jx = px + (Math.random() - 0.5) * 6;
            const jy = py + (Math.random() - 0.5) * 6;
            spawn(jx, jy, speed, PALETTE[(Math.random() * PALETTE.length) | 0]);
          }
        }
      }

      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";

      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.age++;

        // Physics.
        d.prevX = d.x;
        d.prevY = d.y;
        d.vy += GRAVITY;
        d.vx *= DRAG;
        d.x += d.vx;
        d.y += d.vy;

        const t = d.age / d.life;
        if (t >= 1 || d.y - d.r > height + 40) {
          drops.splice(i, 1);
          continue;
        }

        const alpha = 1 - t;
        const [r, g, b] = hexToRgb(d.color);

        // Streak: thin tail from previous to current position. As the drop
        // accelerates downward it travels further per frame, so the streak
        // naturally elongates (the "running" feel). Runners draw slimmer.
        const tailW = d.runner ? d.r * 0.45 : d.r * 0.7;
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.55})`;
        ctx.lineWidth = Math.max(0.6, tailW);
        ctx.beginPath();
        ctx.moveTo(d.prevX, d.prevY);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();

        // Head: a round bead that stretches vertically as it speeds up.
        const stretch = 1 + Math.min(Math.abs(d.vy) * 0.16, 2.2);
        const rx = d.r * (1 - Math.min(Math.abs(d.vy) * 0.03, 0.45));
        const ry = d.r * stretch;

        ctx.save();
        ctx.translate(d.x, d.y);
        // soft painterly bead via radial gradient (no blur filter — freeze-safe)
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(rx, ry));
        grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
        grad.addColorStop(0.7, `rgba(${r},${g},${b},${alpha * 0.85})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      raf = requestAnimationFrame(frame);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", sizeCanvas);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", sizeCanvas);
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
