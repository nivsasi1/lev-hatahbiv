import { useEffect, useState } from "react";

// The cart/checkout switches from the phone layout (one column, pinned bar,
// slim header) to the wide one (site header, two columns) at this width.
export const CHECKOUT_WIDE = "(min-width: 1000px)";

// Phones get their own top bar, shelves menu and homepage opening. Wider
// screens (tablets, desktop) keep the full header and the split hero.
export const PHONE = "(max-width: 760px)";

// true while the media query matches; follows resizes and rotation
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
};
