import { useEffect, useRef } from "react";
import { HomeContent } from "../components/HomeContent";
import "./home-grad-b.css";

// "זרם צבעים" — a clearly-visible flowing colour-stream homepage.
// Wraps the shared <HomeContent/> with a moving background gradient:
// one mouse-follow radial layer (rAF-lerped) + one auto-drifting layer.
// The neutral sections are made translucent (in CSS) so the colour breathes through.
export default () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;

    let raf = 0;
    let cx = 50,
      cy = 30; // pointer target (% of viewport)
    let tx = 50,
      ty = 30; // lerped position

    const onMove = (e: PointerEvent) => {
      cx = (e.clientX / window.innerWidth) * 100;
      cy = (e.clientY / window.innerHeight) * 100;
    };

    window.addEventListener("pointermove", onMove, { passive: true });

    const tick = () => {
      tx += (cx - tx) * 0.06;
      ty += (cy - ty) * 0.06;
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
    <main className="page-main grad-b" ref={ref}>
      <div className="grad-b-bg" aria-hidden="true" />
      <HomeContent />
    </main>
  );
};
