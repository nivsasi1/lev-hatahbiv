import { useEffect, useRef } from "react";
import { HomeContent } from "../components/HomeContent";
import "./home-sunset.css";

/**
 * "שקיעה" — WARM SUNSET GRADIENT FLOW homepage variant.
 * Reuses the shared <HomeContent/> untouched and wraps it in a fixed, gently
 * auto-drifting warm sunset gradient field (.sunset-home-bg): peach → coral →
 * apricot → dusty-rose → warm-amber. The field also follows the pointer via
 * --gx/--gy, rAF-lerped onto the <main> root, so the glow leans toward the
 * cursor. The neutral sections are made translucent (in CSS) so the sunset
 * glows through, while text stays fully readable.
 *
 * Cozy micro-interactions layered on top:
 *  - Staggered scroll reveals (IntersectionObserver adds "in"). FAIL-OPEN:
 *    the hidden-initial state is gated behind the JS-added "is-reveal" root
 *    class and disabled under prefers-reduced-motion, so content is never
 *    hidden if JS doesn't run.
 *  - Magnetic CTA buttons: .btn elements drift a few px toward the pointer
 *    (rAF-lerped) and spring back on leave.
 *
 * All motion is rAF-throttled, listeners are passive and removed on unmount,
 * and everything is gated by prefers-reduced-motion.
 */
export default () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // ---- scroll reveals (fail-open) -------------------------------------
    // Only opt into the hidden-initial state when JS runs AND motion is OK.
    let io: IntersectionObserver | null = null;
    const revealTargets = Array.from(
      el.querySelectorAll<HTMLElement>("section, .cat-card, .p-card")
    );

    if (!reduce && "IntersectionObserver" in window) {
      el.classList.add("is-reveal"); // gates the hidden-initial CSS
      revealTargets.forEach((t, i) => {
        // small staggered delay within each group for a gentle cascade
        t.style.setProperty("--rv-delay", (i % 8) * 55 + "ms");
      });
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io && io.unobserve(entry.target); // reveal once, then stop
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
      revealTargets.forEach((t) => io!.observe(t));
    }

    if (reduce) {
      // Static, calm field — no pointer follow, no magnetic buttons.
      return () => {
        io && io.disconnect();
      };
    }

    // ---- pointer-follow gradient (rAF-lerped --gx/--gy) ------------------
    let cx = 50;
    let cy = 32; // target from pointer
    let tx = 50;
    let ty = 32; // current (lerped)

    const onMove = (e: PointerEvent) => {
      cx = (e.clientX / window.innerWidth) * 100;
      cy = (e.clientY / window.innerHeight) * 100;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // ---- magnetic CTA buttons -------------------------------------------
    type Mag = { el: HTMLElement; tx: number; ty: number; cx: number; cy: number };
    const mags: Mag[] = Array.from(
      el.querySelectorAll<HTMLElement>(".btn")
    ).map((b) => ({ el: b, tx: 0, ty: 0, cx: 0, cy: 0 }));

    const RANGE = 90; // px radius the magnet reacts within
    const PULL = 0.32; // fraction of the offset the button travels

    const onMagMove = (e: PointerEvent) => {
      for (const m of mags) {
        const r = m.el.getBoundingClientRect();
        const mx = r.left + r.width / 2;
        const my = r.top + r.height / 2;
        const dx = e.clientX - mx;
        const dy = e.clientY - my;
        if (Math.abs(dx) < RANGE && Math.abs(dy) < RANGE) {
          m.cx = dx * PULL;
          m.cy = dy * PULL;
        } else {
          m.cx = 0;
          m.cy = 0;
        }
      }
    };
    if (mags.length) {
      window.addEventListener("pointermove", onMagMove, { passive: true });
    }

    // ---- single rAF loop drives field + magnets -------------------------
    let raf = 0;
    const tick = () => {
      tx += (cx - tx) * 0.06; // soft, dreamy follow
      ty += (cy - ty) * 0.06;
      el.style.setProperty("--gx", tx.toFixed(2) + "%");
      el.style.setProperty("--gy", ty.toFixed(2) + "%");

      for (const m of mags) {
        m.tx += (m.cx - m.tx) * 0.18;
        m.ty += (m.cy - m.ty) * 0.18;
        if (Math.abs(m.tx) < 0.05 && Math.abs(m.ty) < 0.05) {
          m.el.style.transform = "";
        } else {
          m.el.style.transform =
            "translate(" + m.tx.toFixed(2) + "px," + m.ty.toFixed(2) + "px)";
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointermove", onMagMove);
      cancelAnimationFrame(raf);
      io && io.disconnect();
      for (const m of mags) m.el.style.transform = "";
    };
  }, []);

  return (
    <main className="page-main sunset-home" ref={ref}>
      <div className="sunset-home-bg" aria-hidden="true">
        <span className="sunset-home-glow g1" />
        <span className="sunset-home-glow g2" />
        <span className="sunset-home-glow g3" />
        <span className="sunset-home-glow g4" />
      </div>
      <HomeContent />
    </main>
  );
};
