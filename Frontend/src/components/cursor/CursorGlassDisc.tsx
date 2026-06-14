// CursorGlassDisc — a translucent GLASS DISC that lerps to the pointer, with a
// second softer ring trailing behind it. The glass look is faked with layered
// rgba: a soft white radial fill, a faint off-centre inner highlight, and a
// thin refraction ring (a brighter arc on the top-left, dimmer elsewhere). No
// backdrop-filter / no CSS filter — everything is painted on a 2D canvas.
//
// Gated on a real fine pointer with motion allowed (else renders null).
// dpr-aware canvas, single rAF loop, listeners cleaned up on unmount.
import { useEffect, useRef, useState } from "react";

// lerp factors — the lead disc tracks tightly, the trailing ring lags behind
const LEAD = 0.22;
const TRAIL = 0.12;

// radii (css px)
const DISC_R = 17; // the glass disc
const RING_R = 30; // the trailing refraction ring

export default function CursorGlassDisc() {
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

    // pointer target + the two eased followers
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let lx = tx;
    let ly = ty; // lead disc
    let rx = tx;
    let ry = ty; // trailing ring
    let seen = false; // hide until the first real move
    let pressed = false; // gentle squeeze on press

    const onMove = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
      seen = true;
    };
    const onDown = () => {
      pressed = true;
    };
    const onUp = () => {
      pressed = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("resize", resize);

    // draws the trailing refraction ring — a thin translucent circle with a
    // brighter top-left arc, faintly glassy
    const drawTrailRing = (x: number, y: number, r: number) => {
      // soft outer halo
      const halo = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 1.25);
      halo.addColorStop(0, "rgba(255,255,255,0)");
      halo.addColorStop(0.78, "rgba(255,255,255,0.05)");
      halo.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.25, 0, Math.PI * 2);
      ctx.fill();

      // the thin ring stroke — dimmer base all around
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();

      // brighter refraction arc on the top-left (the "light edge")
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      // top-left quadrant-ish, in canvas angles (RTL-agnostic, purely visual)
      ctx.arc(x, y, r, Math.PI * 0.78, Math.PI * 1.5);
      ctx.stroke();
    };

    // draws the lead glass disc — soft white fill, faint inner highlight, thin
    // refraction rim, and a tiny bright specular dot
    const drawDisc = (x: number, y: number, r: number) => {
      // body: soft white glass, denser at centre, almost gone at the rim
      const body = ctx.createRadialGradient(x, y, 0, x, y, r);
      body.addColorStop(0, "rgba(255,255,255,0.42)");
      body.addColorStop(0.6, "rgba(255,255,255,0.26)");
      body.addColorStop(0.86, "rgba(255,255,255,0.14)");
      body.addColorStop(1, "rgba(255,255,255,0.04)");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // faint off-centre inner highlight (top-left), like light pooling in glass
      const hx = x - r * 0.34;
      const hy = y - r * 0.34;
      const hi = ctx.createRadialGradient(hx, hy, 0, hx, hy, r * 0.82);
      hi.addColorStop(0, "rgba(255,255,255,0.5)");
      hi.addColorStop(0.55, "rgba(255,255,255,0.12)");
      hi.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hi;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // thin refraction rim — bright top-left, dim bottom-right
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath();
      ctx.arc(x, y, r - 0.7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(x, y, r - 0.7, Math.PI * 0.82, Math.PI * 1.46);
      ctx.stroke();

      // tiny bright specular glint near the top-left edge
      const gx = x - r * 0.42;
      const gy = y - r * 0.42;
      const glint = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 0.3);
      glint.addColorStop(0, "rgba(255,255,255,0.9)");
      glint.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glint;
      ctx.beginPath();
      ctx.arc(gx, gy, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    };

    let raf = 0;
    const frame = () => {
      // ease both followers toward the pointer
      lx += (tx - lx) * LEAD;
      ly += (ty - ly) * LEAD;
      rx += (lx - rx) * TRAIL;
      ry += (ly - ry) * TRAIL;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      if (seen) {
        // gentle press squeeze: shrink the disc a touch, grow the ring
        const dr = DISC_R * (pressed ? 0.82 : 1);
        const rr = RING_R * (pressed ? 1.12 : 1);
        drawTrailRing(rx, ry, rr);
        drawDisc(lx, ly, dr);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
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
