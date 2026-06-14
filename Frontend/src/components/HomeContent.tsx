import { useEffect, useRef } from "react";
import { Product } from "../data/catalog";
import { ProductCard } from "./ProductCard";

// NOTE: this file used to also export a full <HomeContent/> homepage body shared
// by the old /design* previews. Those previews were removed, so only the moving
// product rail remains here — it's reused by the real homepage (MainHome).

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Auto-drifting product rail that you can also steer with the side arrows.
// Drifts on its own; pauses while the pointer is over it; the arrows nudge it.
export const FeaturedRail = ({ items }: { items: Product[] }) => {
  const ref = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const pos = useRef(0); // float drift position (scrollLeft rounds to int)

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;
    pos.current = el.scrollLeft;
    let raf = 0;
    const tick = () => {
      if (!paused.current) {
        pos.current += 0.5; // gentle continuous drift
        // content is tripled; one segment = the exact offset to the 2nd copy's
        // first card (precise period → seamless reset; scrollWidth/3 would be
        // off by the container padding + the missing inter-copy gap)
        const kids = el.children;
        const n = items.length;
        const seg =
          kids.length > n
            ? (kids[n] as HTMLElement).offsetLeft - (kids[0] as HTMLElement).offsetLeft
            : el.scrollWidth / 3;
        if (seg > 0 && pos.current >= seg) pos.current -= seg;
        el.scrollLeft = pos.current;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // Touch drag must win over the auto-drift. On phones there's no hover, so
    // the mouse pause below never fires and the per-frame scrollLeft write
    // fights the swipe (it snaps back). On a finger/pen press, stop the drift
    // at once; resume a beat after the finger lifts, resyncing pos so the
    // hand-off is seamless. Mouse is left to the hover pause (desktop).
    let resumeT = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      window.clearTimeout(resumeT);
      paused.current = true;
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      window.clearTimeout(resumeT);
      resumeT = window.setTimeout(() => {
        if (ref.current) pos.current = ref.current.scrollLeft;
        paused.current = false;
      }, 1400);
    };
    el.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resumeT);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const nudge = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  // triple the list so the drift can loop without a visible seam
  const loop = items.length ? [...items, ...items, ...items] : items;

  return (
    <div
      className="featured-rail-wrap"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => {
        paused.current = false;
        // resync the float position after any manual arrow scroll
        if (ref.current) pos.current = ref.current.scrollLeft;
      }}
    >
      <button
        className="rail-arrow prev"
        type="button"
        onClick={() => nudge(-1)}
        aria-label="המוצרים הקודמים"
      >
        ‹
      </button>
      <div className="featured-rail" ref={ref}>
        {loop.map((p, i) => (
          <ProductCard key={`${i}-${p.id}`} product={p} />
        ))}
      </div>
      <button
        className="rail-arrow next"
        type="button"
        onClick={() => nudge(1)}
        aria-label="המוצרים הבאים"
      >
        ›
      </button>
    </div>
  );
};
