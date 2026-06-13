import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  categories,
  subsOfCategory,
  searchProducts,
  finalPrice,
  shekel,
  asset,
} from "../data/catalog";
import { useCart } from "../context/cart-context";
import { ProductThumb } from "./ProductThumb";
import { AdminBell } from "./AdminBell";

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10.5" cy="10.5" r="6.5" stroke="#2b2440" stroke-width="2.5" />
    <path d="M15.5 15.5 L21 21" stroke="#2b2440" stroke-width="2.5" stroke-linecap="round" />
  </svg>
);

const BagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M5 8 H19 L18 20 a 2 2 0 0 1 -2 2 H8 a 2 2 0 0 1 -2 -2 Z"
      stroke="#2b2440"
      stroke-width="2.2"
      stroke-linejoin="round"
      fill="#fffdf7"
    />
    <path d="M9 11 V6 a 3 3 0 0 1 6 0 v5" stroke="#2b2440" stroke-width="2.2" stroke-linecap="round" />
  </svg>
);

export const Header = () => {
  const { count, openSheet } = useCart();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const { slug } = useParams();
  const location = useLocation();

  // --- category chip row with per-category sub-menus ---
  // which category slug's dropdown is open (only one at a time), or null
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null); // <nav> wrapper, for outside-click
  const scrollRef = useRef<HTMLDivElement>(null); // the scrolling chip track
  const chipRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const closeTimer = useRef<number | null>(null);
  // sub-categories computed once per category (memoised by hand)
  const subsRef = useRef<Record<string, ReturnType<typeof subsOfCategory>>>({});
  const getSubs = (slug: string) => {
    let s = subsRef.current[slug];
    if (!s) {
      s = subsOfCategory(slug);
      subsRef.current[slug] = s;
    }
    return s;
  };

  // scroll-affordance state: can the track scroll toward start / end?
  const [canStart, setCanStart] = useState(false); // toward inline-start (right in RTL)
  const [canEnd, setCanEnd] = useState(false); // toward inline-end (left in RTL)

  const clearCloseTimer = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const closeMenu = useCallback(() => {
    clearCloseTimer();
    setOpenSlug(null);
  }, []);
  const openMenu = (slug: string) => {
    clearCloseTimer();
    setOpenSlug(slug);
  };
  // short grace delay so moving the mouse from chip to panel doesn't close it
  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setOpenSlug(null), 160);
  };

  // recompute the ‹ › affordances from the track's current scroll position.
  // scrollLeft is negative in RTL on Chromium, so work off absolute distance.
  const refreshScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanStart(false);
      setCanEnd(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 1) {
      setCanStart(false);
      setCanEnd(false);
      return;
    }
    const dist = Math.abs(el.scrollLeft); // distance scrolled away from start
    setCanStart(dist > 1); // can go back toward the start edge
    setCanEnd(dist < max - 1); // can go further toward the end edge
  }, []);

  // wheel -> horizontal: map vertical wheel deltas onto the track so a normal
  // mouse can scroll the row. Non-passive because we preventDefault.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // let pinch-zoom through
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) return; // nothing to scroll
      const delta =
        Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (delta === 0) return;
      el.scrollLeft += delta;
      e.preventDefault();
      refreshScroll();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [refreshScroll]);

  // keep affordances in sync with track scroll + viewport resize
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    refreshScroll();
    el.addEventListener("scroll", refreshScroll, { passive: true });
    window.addEventListener("resize", refreshScroll);
    return () => {
      el.removeEventListener("scroll", refreshScroll);
      window.removeEventListener("resize", refreshScroll);
    };
  }, [refreshScroll]);

  // nudge the row by roughly one viewport's worth toward start/end.
  // dir = -1 nudges toward inline-start, +1 toward inline-end.
  const nudge = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(el.clientWidth * 0.7, 140);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  // drag-to-scroll (pointer) — a nice extra for trackpad-less desktops
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let down = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      down = true;
      moved = false;
      startX = e.clientX;
      startScroll = el.scrollLeft;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      if (moved) {
        el.scrollLeft = startScroll - dx;
        el.classList.add("dragging");
        refreshScroll();
      }
    };
    const onUp = () => {
      down = false;
      el.classList.remove("dragging");
    };
    // swallow the click that ends a real drag so it doesn't follow the link
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClick, true);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("click", onClick, true);
    };
  }, [refreshScroll]);

  // close the open sub-menu on outside click + Escape
  useEffect(() => {
    if (openSlug === null) return;
    const onDocClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const slug = openSlug;
        closeMenu();
        chipRefs.current[slug!]?.focus();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openSlug, closeMenu]);

  // close on route change
  useEffect(() => {
    closeMenu();
  }, [location.pathname, closeMenu]);

  // tidy timers on unmount
  useEffect(() => () => clearCloseTimer(), []);

  const results = query.trim() ? searchProducts(query).slice(0, 6) : [];
  const showPop = focused && query.trim().length > 0;

  return (
    <header className="header">
      <div className="shell">
        <div className="header-row">
          <Link to="/" className="header-logo" aria-label="לב התחביב — דף הבית">
            <img src={asset("/images/LevHatahbivLogo.png")} alt="לב התחביב" />
          </Link>

          <AdminBell />

          <div className="header-search">
            <input
              type="search"
              placeholder="מה יוצרים היום?"
              value={query}
              onInput={(e: any) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 200)}
              onKeyDown={(e: any) => {
                if (e.key === "Enter" && results.length > 0) {
                  navigate(`/product/${results[0].id}`);
                  setQuery("");
                }
              }}
            />
            <SearchIcon />
            {showPop && (
              <div className="search-pop">
                {results.length === 0 && (
                  <div className="search-empty">לא מצאנו... נסו מילה אחרת 🎨</div>
                )}
                {results.map((p) => (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    onClick={() => setQuery("")}
                  >
                    <span className="thumb">
                      <ProductThumb product={p} />
                    </span>
                    <span>{p.name}</span>
                    <span className="price">{shekel(finalPrice(p))}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <button className="header-cart" onClick={openSheet} aria-label="עגלת קניות">
            <span className="cart-icon">
              <BagIcon />
              {/* key={count} restarts the pop animation on every change */}
              {count > 0 && (
                <span key={count} className="cart-badge">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </span>
            <span className="lbl">עגלה</span>
          </button>
        </div>

        <nav className="cat-nav" aria-label="קטגוריות" ref={navRef}>
          <button
            type="button"
            className={`cat-scroll-btn start ${canStart ? "show" : ""}`}
            aria-label="גלילה ימינה"
            tabIndex={-1}
            aria-hidden={!canStart}
            onClick={() => nudge(-1)}
          >
            ›
          </button>

          <div className="cat-track" ref={scrollRef}>
            {categories.map((c) => {
              const subs = getSubs(c.slug);
              const hasMenu = subs.length > 1;
              const isOpen = openSlug === c.slug;
              const active = slug === c.slug;
              const menuId = `cat-menu-${c.slug}`;
              return (
                <div
                  key={c.slug}
                  className="cat-chip-wrap"
                  onMouseEnter={() => hasMenu && openMenu(c.slug)}
                  onMouseLeave={() => hasMenu && scheduleClose()}
                >
                  <Link
                    to={`/category/${c.slug}`}
                    ref={(el: any) => (chipRefs.current[c.slug] = el)}
                    className={`cat-chip ${active ? "active" : ""} ${
                      isOpen ? "open" : ""
                    }`}
                    style={{ "--cc": c.color } as any}
                    aria-haspopup={hasMenu ? "menu" : undefined}
                    aria-expanded={hasMenu ? isOpen : undefined}
                    aria-controls={hasMenu && isOpen ? menuId : undefined}
                    onClick={() => {
                      // tap also toggles the menu on touch; navigation still
                      // happens via the Link itself
                      if (hasMenu && !isOpen) {
                        openMenu(c.slug);
                      } else {
                        closeMenu();
                      }
                    }}
                    onKeyDown={(e: any) => {
                      if (!hasMenu) return;
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        openMenu(c.slug);
                        // focus the first item next tick
                        window.setTimeout(() => {
                          const first = document.querySelector<HTMLElement>(
                            `#${menuId} a`
                          );
                          first?.focus();
                        }, 0);
                      } else if (e.key === "Escape" && isOpen) {
                        e.preventDefault();
                        closeMenu();
                      }
                    }}
                  >
                    <span className="cat-name">{c.name}</span>
                    {hasMenu && (
                      <span className="cat-caret" aria-hidden="true">
                        ▾
                      </span>
                    )}
                  </Link>

                  {hasMenu && isOpen && (
                    <div
                      id={menuId}
                      className="cat-submenu"
                      role="menu"
                      aria-label={c.name}
                      style={{ "--cc": c.color } as any}
                      onMouseEnter={clearCloseTimer}
                      onMouseLeave={scheduleClose}
                    >
                      {subs.map((s) => (
                        <Link
                          key={s.sub}
                          to={`/category/${c.slug}/${encodeURIComponent(
                            s.sub
                          )}`}
                          role="menuitem"
                          className="cat-subitem"
                          onClick={closeMenu}
                          onKeyDown={(e: any) => {
                            if (e.key === "Escape") {
                              e.preventDefault();
                              closeMenu();
                              chipRefs.current[c.slug]?.focus();
                            }
                          }}
                        >
                          <span className="cat-sub-name">{s.sub}</span>
                          <span className="cat-sub-count">{s.count}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className={`cat-scroll-btn end ${canEnd ? "show" : ""}`}
            aria-label="גלילה שמאלה"
            tabIndex={-1}
            aria-hidden={!canEnd}
            onClick={() => nudge(1)}
          >
            ‹
          </button>
        </nav>
      </div>
    </header>
  );
};
