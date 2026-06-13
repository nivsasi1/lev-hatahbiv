import { useEffect, useRef } from "react";
import { HomeContent } from "../components/HomeContent";
import "./home-grad-a.css";

// "לחישת צבע" — a VERY SUBTLE motion homepage: the shared <HomeContent/>
// wrapped with a barely-there living wash. A fixed full-viewport gradient
// drifts slowly and follows the pointer with a gentle lerp; neutral sections
// are made lightly translucent so the wash breathes through. Fully gated by
// prefers-reduced-motion (then it sits perfectly still).
export default () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;

    let raf = 0;
    let cx = 50;
    let cy = 30; // pointer target (%)
    let tx = 50;
    let ty = 30; // lerped current (%)

    const onMove = (e: PointerEvent) => {
      cx = (e.clientX / window.innerWidth) * 100;
      cy = (e.clientY / window.innerHeight) * 100;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const tick = () => {
      // very gentle follow — most people barely notice until they move
      tx += (cx - tx) * 0.04;
      ty += (cy - ty) * 0.04;
      el.style.setProperty("--gx", tx.toFixed(2) + "%");
      el.style.setProperty("--gy", ty.toFixed(2) + "%");
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <main className="page-main grad-a" ref={ref}>
      <div className="grad-a-bg" aria-hidden="true" />
      <HomeContent />
    </main>
  );
};
