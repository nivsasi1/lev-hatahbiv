// CursorConstellation — the constellation IS the background AND the cursor.
//
// A fixed full-page canvas renders a slow-drifting field of soft star dots in
// light brand tints. Thin, low-alpha lines connect dots that are near each
// other, and brighter lines link the dots closest to the cursor — the pointer
// becomes a glowing node that the nearest stars reach toward. Everything is
// kept light and airy so it reads as an animated background, not a foreground
// trail.
//
// Hard-machine constraints respected: plain 2D canvas only (no CSS filters /
// blend-modes / backdrop-filter). canvas globalCompositeOperation "lighter" is
// the *canvas* API, which is allowed. Gated on a real fine pointer + motion;
// honours prefers-reduced-motion (renders a calm, near-static field with no
// cursor links). dpr-aware, particle count capped, neighbour loop is O(n²) over
// a small N with squared-distance early-outs.
import { useEffect, useRef, useState } from "react";

// light brand tints — soft, airy star colours (kept pale on purpose)
const STAR_COLORS: Array<[number, number, number]> = [
  [123, 63, 191], // purple
  [79, 157, 208], // blue
  [63, 95, 191], // indigo
  [42, 157, 143], // teal
  [217, 79, 112], // rose
  [224, 159, 62], // amber
];

// the bright cursor node colour (warm brand purple)
const CURSOR_RGB: [number, number, number] = [91, 45, 142];

const MAX_PARTICLES = 90;
const LINK_DIST = 132; // px — neighbour link threshold
const LINK_DIST_SQ = LINK_DIST * LINK_DIST;
const CURSOR_DIST = 188; // px — cursor grabs stars within this radius
const CURSOR_DIST_SQ = CURSOR_DIST * CURSOR_DIST;

type Star = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number; // base radius
  tw: number; // twinkle angular speed
  phase: number; // twinkle phase
  cr: number;
  cg: number;
  cb: number;
};

export default function CursorConstellation() {
  const [enabled, setEnabled] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // gate on a real fine pointer AND motion being allowed — else render null.
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

    let W = window.innerWidth;
    let H = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const stars: Star[] = [];
    // density scales with viewport area but is hard-capped at MAX_PARTICLES.
    const seed = () => {
      stars.length = 0;
      const target = Math.min(
        MAX_PARTICLES,
        Math.round((W * H) / 17000)
      );
      for (let i = 0; i < target; i++) {
        const [cr, cg, cb] =
          STAR_COLORS[(Math.random() * STAR_COLORS.length) | 0];
        // slow, gentle drift — kept airy
        const sp = 0.16;
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * sp,
          vy: (Math.random() - 0.5) * sp,
          r: 0.9 + Math.random() * 1.8,
          tw: 0.6 + Math.random() * 1.4,
          phase: Math.random() * Math.PI * 2,
          cr,
          cg,
          cb,
        });
      }
    };

    resize();

    // pointer state (only meaningful when motion is allowed)
    let mx = -9999;
    let my = -9999;
    let hasPointer = false;
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      hasPointer = true;
    };
    const onLeave = () => {
      hasPointer = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerout", onLeave, { passive: true });
    window.addEventListener("blur", onLeave, { passive: true });
    window.addEventListener("resize", resize);

    let raf = 0;
    let prev = performance.now();
    let t = 0;

    const frame = (now: number) => {
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      t += dt;

      // drift + soft wrap around the edges (with a margin so links fade in/out)
      const m = LINK_DIST;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < -m) s.x = W + m;
        else if (s.x > W + m) s.x = -m;
        if (s.y < -m) s.y = H + m;
        else if (s.y > H + m) s.y = -m;
      }

      ctx.clearRect(0, 0, W, H);

      // ---- neighbour links: faint lines between near stars (O(n²), small N) --
      ctx.lineWidth = 1;
      for (let i = 0; i < stars.length; i++) {
        const a = stars[i];
        for (let j = i + 1; j < stars.length; j++) {
          const b = stars[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dsq = dx * dx + dy * dy;
          if (dsq > LINK_DIST_SQ) continue;
          const d = Math.sqrt(dsq);
          // closer = stronger, but kept low-alpha and airy
          const alpha = (1 - d / LINK_DIST) * 0.16;
          if (alpha < 0.012) continue;
          // blend the two star tints toward a soft lavender line
          const r = (a.cr + b.cr + CURSOR_RGB[0]) / 3;
          const g = (a.cg + b.cg + CURSOR_RGB[1]) / 3;
          const bl = (a.cb + b.cb + CURSOR_RGB[2]) / 3;
          ctx.strokeStyle = `rgba(${r | 0},${g | 0},${bl | 0},${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // ---- cursor links: brighter lines from nearby stars to the bright node -
      const pointerActive = hasPointer;
      if (pointerActive) {
        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          const dx = s.x - mx;
          const dy = s.y - my;
          const dsq = dx * dx + dy * dy;
          if (dsq > CURSOR_DIST_SQ) continue;
          const d = Math.sqrt(dsq);
          const k = 1 - d / CURSOR_DIST;
          const alpha = k * 0.4;
          ctx.strokeStyle = `rgba(${CURSOR_RGB[0]},${CURSOR_RGB[1]},${CURSOR_RGB[2]},${alpha})`;
          ctx.lineWidth = 0.7 + k * 1;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(mx, my);
          ctx.stroke();
        }
      }

      // ---- stars: soft twinkling dots, additive so they glow on light bg -----
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const tw = 0.6 + 0.4 * Math.sin(t * s.tw + s.phase);
        const col = `${s.cr},${s.cg},${s.cb}`;
        // boost stars the cursor is near so the node feels magnetic
        let boost = 0;
        if (pointerActive) {
          const dx = s.x - mx;
          const dy = s.y - my;
          const dsq = dx * dx + dy * dy;
          if (dsq < CURSOR_DIST_SQ) {
            boost = (1 - Math.sqrt(dsq) / CURSOR_DIST) * 0.45;
          }
        }
        const rad = s.r * (1 + boost * 1.6);

        // soft halo
        const haloR = rad * 4;
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, haloR);
        grad.addColorStop(0, `rgba(${col},${(0.18 + boost) * tw})`);
        grad.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, haloR, 0, Math.PI * 2);
        ctx.fill();

        // crisp core
        ctx.fillStyle = `rgba(${col},${Math.min(1, 0.5 * tw + boost)})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // ---- the cursor itself: a bright lavender node with a glowing halo -----
      if (pointerActive) {
        const pulse = 0.78 + 0.22 * Math.sin(t * 3.2);
        const col = `${CURSOR_RGB[0]},${CURSOR_RGB[1]},${CURSOR_RGB[2]}`;
        const haloR = 26 * pulse;
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, haloR);
        grad.addColorStop(0, `rgba(${col},0.42)`);
        grad.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx, my, haloR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${col},0.95)`;
        ctx.beginPath();
        ctx.arc(mx, my, 3 * pulse, 0, Math.PI * 2);
        ctx.fill();
        // white pinpoint glint
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(mx, my, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onLeave);
      window.removeEventListener("blur", onLeave);
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
