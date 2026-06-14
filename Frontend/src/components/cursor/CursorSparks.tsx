// CursorSparks — sparkler-style glitter trail.
// Tiny bright sparks shoot outward from the cursor on movement, twinkle
// (sine-flicker their brightness over a short life), drift + decelerate, and
// fade in ~0.4–0.7s. Warm gold + white, with the occasional palette colour and
// a 4-point star glint on the brightest ones. Plain 2D canvas, additive glow.
import { useEffect, useRef, useState } from "react";

// category art colours — the occasional coloured spark is drawn from here
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
const GOLD = "#e09f3e";
const WHITE = "#fff";

const MAX = 120;

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // seconds elapsed
  max: number; // total lifespan in seconds
  size: number; // base radius in px
  r: number; // colour channels (0–255)
  g: number;
  b: number;
  twinkle: number; // angular speed of the flicker sine
  phase: number; // flicker phase offset
  star: boolean; // brightest sparks get a 4-point glint
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function CursorSparks() {
  const [enabled, setEnabled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    const sparks: Spark[] = [];
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let lastMx = mx;
    let lastMy = my;
    let moved = false;

    const emit = (x: number, y: number, speed: number) => {
      // faster moves spit more sparks; slow drifts barely glitter
      const count =
        speed > 9 ? 4 : speed > 4.5 ? 3 : speed > 1.4 ? 2 : Math.random() < 0.4 ? 1 : 0;
      for (let i = 0; i < count; i++) {
        if (sparks.length >= MAX) sparks.shift();
        // mostly gold/white; ~1 in 5 a palette colour for a touch of magic
        let r: number, g: number, b: number;
        const roll = Math.random();
        if (roll < 0.18) {
          [r, g, b] = hexToRgb(PALETTE[(Math.random() * PALETTE.length) | 0]);
        } else if (roll < 0.6) {
          [r, g, b] = hexToRgb(GOLD);
        } else {
          [r, g, b] = hexToRgb(WHITE);
        }
        const ang = Math.random() * Math.PI * 2;
        // outward burst, nudged along the travel direction
        const burst = 0.6 + Math.random() * 2.6 + speed * 0.18;
        const dirLen = speed || 1;
        const dirx = (x - lastMx) / dirLen;
        const diry = (y - lastMy) / dirLen;
        const max = 0.4 + Math.random() * 0.3; // 0.4–0.7s
        sparks.push({
          x: x + (Math.random() - 0.5) * 6,
          y: y + (Math.random() - 0.5) * 6,
          vx: Math.cos(ang) * burst + dirx * 0.9,
          vy: Math.sin(ang) * burst + diry * 0.9 - 0.4, // slight upward float
          life: 0,
          max,
          size: 1 + Math.random() * 2, // 1–3px
          r,
          g,
          b,
          twinkle: 16 + Math.random() * 26,
          phase: Math.random() * Math.PI * 2,
          star: Math.random() < 0.22,
        });
      }
    };

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      moved = true;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", resize);

    let raf = 0;
    let prev = performance.now();

    const frame = (now: number) => {
      const dt = Math.min((now - prev) / 1000, 0.05); // clamp big tab-switch gaps
      prev = now;

      if (moved) {
        const dx = mx - lastMx;
        const dy = my - lastMy;
        const speed = Math.hypot(dx, dy);
        if (speed > 0.5) emit(mx, my, speed);
        lastMx = mx;
        lastMy = my;
        moved = false;
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = "lighter"; // additive — sparks glow

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += dt;
        if (s.life >= s.max) {
          sparks.splice(i, 1);
          continue;
        }
        // motion: decelerate, gentle gravity, slight drift
        s.vx *= 0.92;
        s.vy = s.vy * 0.92 + 2.4 * dt;
        s.x += s.vx;
        s.y += s.vy;

        const t = s.life / s.max; // 0→1
        // brightness: ease-out fade × twinkle sine (flicker over life)
        const fade = 1 - t;
        const flick = 0.55 + 0.45 * Math.sin(s.life * s.twinkle + s.phase);
        const alpha = fade * fade * flick;
        if (alpha <= 0.01) continue;

        const col = `${s.r},${s.g},${s.b}`;
        const rad = s.size * (0.7 + 0.3 * flick);

        // soft halo
        const haloR = rad * 3.4;
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, haloR);
        grad.addColorStop(0, `rgba(${col},${alpha * 0.5})`);
        grad.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, haloR, 0, Math.PI * 2);
        ctx.fill();

        // bright core
        ctx.fillStyle = `rgba(${col},${Math.min(1, alpha + 0.15)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
        ctx.fill();

        // 4-point star glint on the brightest sparks
        if (s.star && alpha > 0.35) {
          const len = rad * (3 + 2 * flick);
          ctx.strokeStyle = `rgba(${col},${alpha * 0.85})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(s.x - len, s.y);
          ctx.lineTo(s.x + len, s.y);
          ctx.moveTo(s.x, s.y - len);
          ctx.lineTo(s.x, s.y + len);
          ctx.stroke();
        }
      }

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

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
