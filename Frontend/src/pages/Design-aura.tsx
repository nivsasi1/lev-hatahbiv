import { useEffect, useRef } from "react";
import { HomeContent } from "../components/HomeContent";
import "./home-aura.css";

/**
 * "אווירה" — THE AWWWARDS SHOWPIECE motion homepage variant.
 *
 * Reuses the shared <HomeContent/> untouched and wraps it in a warm, living
 * sunset/atelier gradient field (.aura-home-bg) that BOTH drifts on its own
 * (CSS keyframes) AND follows the pointer (rAF-lerped --gx/--gy on the root).
 *
 * Layered premium micro-interactions, all rAF-throttled, {passive:true}, and
 * fully gated by prefers-reduced-motion / coarse pointers:
 *   - mouse-follow warm gradient + soft grain speckle (CSS)
 *   - a custom warm cursor dot+ring that lerps to the pointer and grows over
 *     interactive elements (.btn, a, .cat-card)
 *   - scroll-driven STAGGERED reveals: an IntersectionObserver adds "in" to
 *     sections + cards (fail-open: hidden-initial state only applies once the
 *     JS adds the "is-reveal" root class, and never under reduced motion)
 *   - magnetic CTAs: .btn drift a few px toward the cursor, spring back
 *
 * chrome70-safe, no feTurbulence / mix-blend-mode / backdrop-filter.
 */
export default () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    // FAIL-OPEN: only opt into the hidden-initial reveal state when JS runs and
    // motion is allowed. Under reduced motion everything stays visible.
    if (!reduce) el.classList.add("is-reveal");

    const cleanups: Array<() => void> = [];
    let raf = 0;

    // ---- shared lerped pointer state -------------------------------------
    // pointer target (px) + normalized (%) for the gradient
    let px = window.innerWidth / 2;
    let py = window.innerHeight * 0.3;
    let gx = 50; // gradient target %
    let gy = 30;
    let tgx = 50; // gradient lerped %
    let tgy = 30;

    // custom cursor lerped position
    let curX = px;
    let curY = py;
    let dotX = px;
    let dotY = py;
    let ringX = px;
    let ringY = py;

    // magnetic button state
    let magBtn: HTMLElement | null = null;
    let magX = 0;
    let magY = 0; // target offset
    let magCX = 0;
    let magCY = 0; // current offset

    // ---- custom cursor element -------------------------------------------
    let cursor: HTMLDivElement | null = null;
    let ring: HTMLDivElement | null = null;
    let dot: HTMLDivElement | null = null;
    const enableCursor = !reduce && !coarse;

    if (enableCursor) {
      cursor = document.createElement("div");
      cursor.className = "aura-cursor";
      cursor.setAttribute("aria-hidden", "true");
      ring = document.createElement("div");
      ring.className = "aura-cursor-ring";
      dot = document.createElement("div");
      dot.className = "aura-cursor-dot";
      cursor.appendChild(ring);
      cursor.appendChild(dot);
      el.appendChild(cursor);
      el.classList.add("aura-has-cursor");
      cleanups.push(() => {
        cursor && cursor.remove();
        el.classList.remove("aura-has-cursor");
      });
    }

    // ---- pointer tracking -------------------------------------------------
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      gx = (e.clientX / window.innerWidth) * 100;
      gy = (e.clientY / window.innerHeight) * 100;

      // magnetic pull while hovering a button
      if (magBtn) {
        const r = magBtn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        magX = Math.max(-14, Math.min(14, dx * 0.32));
        magY = Math.max(-12, Math.min(12, dy * 0.32));
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    cleanups.push(() => window.removeEventListener("pointermove", onMove));

    // ---- custom cursor grow + magnetic targets ---------------------------
    if (enableCursor || true) {
      const onOver = (e: Event) => {
        const t = (e.target as HTMLElement)?.closest?.(
          ".btn, a, .cat-card, .rail-arrow"
        );
        if (cursor) {
          if (t) cursor.classList.add("is-active");
          else cursor.classList.remove("is-active");
        }
        const btn = (e.target as HTMLElement)?.closest?.(
          ".btn"
        ) as HTMLElement | null;
        if (btn !== magBtn) {
          if (magBtn) magBtn.classList.remove("aura-magnetic");
          magBtn = btn;
          if (!magBtn) {
            magX = 0;
            magY = 0;
          } else {
            magBtn.classList.add("aura-magnetic");
          }
        }
      };
      el.addEventListener("pointerover", onOver, { passive: true });
      cleanups.push(() => el.removeEventListener("pointerover", onOver));
    }

    // ---- scroll-reveal observer (staggered) ------------------------------
    let observer: IntersectionObserver | null = null;
    if (!reduce && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries, obs) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              obs.unobserve(entry.target);
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
      const targets = el.querySelectorAll(
        "section, .cat-card, .p-card, .note-card, .workshops-card"
      );
      // stagger siblings via a CSS custom property delay index
      const groups = new Map<Element, number>();
      targets.forEach((node) => {
        const parent = node.parentElement as Element;
        const idx = groups.get(parent) ?? 0;
        groups.set(parent, idx + 1);
        (node as HTMLElement).style.setProperty(
          "--rv-i",
          String(Math.min(idx, 8))
        );
        node.classList.add("rv");
        observer!.observe(node);
      });
      cleanups.push(() => observer && observer.disconnect());
    }

    // ---- single rAF loop for gradient + cursor + magnet ------------------
    if (!reduce) {
      const tick = () => {
        // gradient lerp
        tgx += (gx - tgx) * 0.06;
        tgy += (gy - tgy) * 0.06;
        el.style.setProperty("--gx", tgx.toFixed(2) + "%");
        el.style.setProperty("--gy", tgy.toFixed(2) + "%");

        if (enableCursor && cursor && dot && ring) {
          // dot tracks tightly, ring trails softly for a premium feel
          dotX += (px - dotX) * 0.35;
          dotY += (py - dotY) * 0.35;
          ringX += (px - ringX) * 0.18;
          ringY += (py - ringY) * 0.18;
          dot.style.transform =
            "translate3d(" +
            (dotX - 4) +
            "px," +
            (dotY - 4) +
            "px,0)";
          ring.style.transform =
            "translate3d(" +
            (ringX - 19) +
            "px," +
            (ringY - 19) +
            "px,0)";
          curX = dotX;
          curY = dotY;
        }

        // magnetic button spring
        magCX += (magX - magCX) * 0.2;
        magCY += (magY - magCY) * 0.2;
        if (magBtn) {
          magBtn.style.setProperty("--mx", magCX.toFixed(2) + "px");
          magBtn.style.setProperty("--my", magCY.toFixed(2) + "px");
        }

        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      cleanups.push(() => cancelAnimationFrame(raf));
    }

    // touch silence for unused vars under reduced motion
    void curX;
    void curY;
    void ringX;
    void ringY;

    return () => {
      cleanups.forEach((fn) => fn());
      el.classList.remove("is-reveal");
    };
  }, []);

  return (
    <main className="page-main aura-home" ref={ref}>
      <div className="aura-home-bg" aria-hidden="true">
        <span className="aura-grain" />
        <span className="aura-blob a1" />
        <span className="aura-blob a2" />
        <span className="aura-blob a3" />
        <span className="aura-blob a4" />
      </div>
      <HomeContent />
    </main>
  );
};
