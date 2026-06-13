import { useEffect, useRef } from "react";
import { HomeContent } from "../components/HomeContent";
import "./home-grad-c.css";

/**
 * "פריזמה" — VIVID motion homepage variant.
 * Reuses the shared <HomeContent/> untouched and wraps it in a moving,
 * mouse-following gradient field (.grad-c-bg) with floating color blobs.
 * Pointer position is rAF-lerped into --gx/--gy on the <main> root; the
 * neutral section backgrounds are made translucent (in CSS) so the color
 * breathes through. Fully gated by prefers-reduced-motion.
 */
export default () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;

    let raf = 0;
    let cx = 50;
    let cy = 30; // target (from pointer)
    let tx = 50;
    let ty = 30; // current (lerped)

    const onMove = (e: PointerEvent) => {
      cx = (e.clientX / window.innerWidth) * 100;
      cy = (e.clientY / window.innerHeight) * 100;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const tick = () => {
      // faster, livelier response for the VIVID variant
      tx += (cx - tx) * 0.09;
      ty += (cy - ty) * 0.09;
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
    <main className="page-main grad-c" ref={ref}>
      <div className="grad-c-bg" aria-hidden="true">
        <span className="grad-c-blob b1" />
        <span className="grad-c-blob b2" />
        <span className="grad-c-blob b3" />
        <span className="grad-c-blob b4" />
        <span className="grad-c-blob b5" />
      </div>
      <HomeContent />
    </main>
  );
};
