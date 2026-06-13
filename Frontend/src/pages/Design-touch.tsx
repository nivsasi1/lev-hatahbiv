import { useEffect, useRef } from "react";
import { HomeContent } from "../components/HomeContent";
import "./home-touch.css";

/**
 * "מגע" — a MICRO-INTERACTION MASTERCLASS homepage variant.
 *
 * Reuses the shared <HomeContent/> untouched and elevates it with restrained,
 * premium, warm-neutral polish (cream + coral/gold accents, no loud background).
 * Three rAF-throttled, reduced-motion-gated behaviours run on top of the body:
 *
 *   1. Scroll-reveal — an IntersectionObserver adds "in" to sections, category
 *      cards and product cards so their titles/eyebrows clip-path wipe in and
 *      the cards fade/slide up in a gentle stagger. FAIL-OPEN: the hidden
 *      initial state only exists when the JS adds "is-reveal" to the root, and
 *      under prefers-reduced-motion we never hide anything.
 *
 *   2. Magnetic CTAs — every .btn gently lerps a few px toward the pointer when
 *      it is near, springing back on leave (one shared rAF loop).
 *
 *   3. Card tilt — category & product cards tilt a hair toward the cursor and
 *      lift; the CSS owns the lift/zoom, the JS only feeds --tx/--ty/--mx/--my.
 *
 * All listeners are passive and removed on unmount. The star is the polish of
 * the interactions, not the (deliberately clean) background.
 */
export default () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // ---- under reduced motion: do nothing, leave everything fully visible ----
    if (reduced) return;

    // FAIL-OPEN: only now (JS confirmed running, motion allowed) do we let the
    // CSS hide the initial reveal state.
    el.classList.add("is-reveal");

    const cleanups: Array<() => void> = [];

    // ----------------------------------------------------------------------
    // 1) Scroll-reveal via IntersectionObserver (staggered, unobserve once in)
    // ----------------------------------------------------------------------
    const revealTargets = el.querySelectorAll<HTMLElement>(
      "section, .cat-card, .p-card"
    );
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const node = entry.target as HTMLElement;
            // small stagger inside a freshly-revealed group of cards
            const group = node.parentElement;
            if (group) {
              const peers = Array.prototype.slice.call(
                group.querySelectorAll(":scope > .cat-card, :scope > .p-card")
              ) as HTMLElement[];
              const idx = peers.indexOf(node);
              node.style.setProperty(
                "--reveal-delay",
                (idx > 0 ? (idx % 6) * 70 : 0) + "ms"
              );
            }
            node.classList.add("in");
            obs.unobserve(node);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      revealTargets.forEach((t) => io.observe(t));
      cleanups.push(() => io.disconnect());
    } else {
      // No IO support → reveal everything immediately (fail-open).
      revealTargets.forEach((t) => t.classList.add("in"));
    }

    // ----------------------------------------------------------------------
    // 2) Magnetic buttons — one shared rAF loop lerps each .btn toward pointer
    // ----------------------------------------------------------------------
    type Mag = { node: HTMLElement; tx: number; ty: number; cx: number; cy: number };
    const mags: Mag[] = Array.prototype.slice
      .call(el.querySelectorAll<HTMLElement>(".btn"))
      .map((node: HTMLElement) => ({ node, tx: 0, ty: 0, cx: 0, cy: 0 }));

    const RADIUS = 110; // px proximity at which the pull begins
    const PULL = 0.32; // fraction of the offset to follow

    const onPointerMove = (e: PointerEvent) => {
      for (const m of mags) {
        const r = m.node.getBoundingClientRect();
        const mx = r.left + r.width / 2;
        const my = r.top + r.height / 2;
        const dx = e.clientX - mx;
        const dy = e.clientY - my;
        const dist = Math.hypot(dx, dy);
        if (dist < RADIUS) {
          m.cx = dx * PULL;
          m.cy = dy * PULL;
        } else {
          m.cx = 0;
          m.cy = 0;
        }
      }
    };
    const onPointerLeaveWin = () => {
      for (const m of mags) {
        m.cx = 0;
        m.cy = 0;
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("blur", onPointerLeaveWin, { passive: true });
    cleanups.push(() => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("blur", onPointerLeaveWin);
    });

    // ----------------------------------------------------------------------
    // 3) Card tilt — feed --mx/--my (cursor %, for glow) and --tx/--ty (tilt)
    // ----------------------------------------------------------------------
    const tiltCards = Array.prototype.slice.call(
      el.querySelectorAll<HTMLElement>(".cat-card, .p-card")
    ) as HTMLElement[];

    const tiltState = new WeakMap<HTMLElement, { px: number; py: number }>();

    const onCardMove = (e: PointerEvent) => {
      const card = (e.currentTarget as HTMLElement) || null;
      if (!card) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width; // 0..1
      const py = (e.clientY - r.top) / r.height; // 0..1
      tiltState.set(card, { px, py });
    };
    const onCardLeave = (e: PointerEvent) => {
      const card = e.currentTarget as HTMLElement;
      tiltState.delete(card);
      card.style.setProperty("--tx", "0deg");
      card.style.setProperty("--ty", "0deg");
    };

    tiltCards.forEach((card) => {
      card.addEventListener("pointermove", onCardMove, { passive: true });
      card.addEventListener("pointerleave", onCardLeave, { passive: true });
    });
    cleanups.push(() => {
      tiltCards.forEach((card) => {
        card.removeEventListener("pointermove", onCardMove);
        card.removeEventListener("pointerleave", onCardLeave);
      });
    });

    // ----------------------------------------------------------------------
    // Single rAF loop drives both the magnetic lerp and the card tilt lerp.
    // ----------------------------------------------------------------------
    let raf = 0;
    const tick = () => {
      // magnetic buttons
      for (const m of mags) {
        m.tx += (m.cx - m.tx) * 0.16;
        m.ty += (m.cy - m.ty) * 0.16;
        if (Math.abs(m.tx) < 0.05 && Math.abs(m.ty) < 0.05 && m.cx === 0 && m.cy === 0) {
          m.tx = 0;
          m.ty = 0;
          m.node.style.setProperty("--mag-x", "0px");
          m.node.style.setProperty("--mag-y", "0px");
        } else {
          m.node.style.setProperty("--mag-x", m.tx.toFixed(2) + "px");
          m.node.style.setProperty("--mag-y", m.ty.toFixed(2) + "px");
        }
      }
      // card tilt (lerp toward target derived from cursor position)
      for (const card of tiltCards) {
        const s = tiltState.get(card);
        if (!s) continue;
        const tiltY = (s.px - 0.5) * 7; // rotateY deg
        const tiltX = (0.5 - s.py) * 7; // rotateX deg
        card.style.setProperty("--ty", tiltY.toFixed(2) + "deg");
        card.style.setProperty("--tx", tiltX.toFixed(2) + "deg");
        card.style.setProperty("--mx", (s.px * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (s.py * 100).toFixed(1) + "%");
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    cleanups.push(() => cancelAnimationFrame(raf));

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <main className="page-main touch-home" ref={ref}>
      <HomeContent />
    </main>
  );
};
