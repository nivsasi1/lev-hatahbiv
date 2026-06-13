import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  categories,
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

  // --- categories dropdown ---
  const [catOpen, setCatOpen] = useState(false);
  const catWrapRef = useRef<HTMLDivElement>(null);
  const catBtnRef = useRef<HTMLButtonElement>(null);
  const hoverTimer = useRef<number | null>(null);

  // close on outside click + Escape while open
  useEffect(() => {
    if (!catOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (catWrapRef.current && !catWrapRef.current.contains(e.target as Node)) {
        setCatOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCatOpen(false);
        catBtnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [catOpen]);

  // close on route change
  useEffect(() => {
    setCatOpen(false);
  }, [location.pathname]);

  // clean up any pending hover timer on unmount
  useEffect(
    () => () => {
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    },
    []
  );

  const openByHover = () => {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    setCatOpen(true);
  };
  const closeByHover = () => {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setCatOpen(false), 140);
  };

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

        <nav className="cat-nav" aria-label="קטגוריות">
          <div
            className="cat-dd"
            ref={catWrapRef}
            onMouseEnter={openByHover}
            onMouseLeave={closeByHover}
          >
            <button
              type="button"
              ref={catBtnRef}
              className={`cat-trigger ${catOpen ? "open" : ""}`}
              aria-haspopup="menu"
              aria-expanded={catOpen}
              onClick={() => setCatOpen((o) => !o)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setCatOpen(true);
                }
              }}
            >
              <span>המדפים</span>
              <span className="cat-caret" aria-hidden="true">
                ▾
              </span>
            </button>

            {catOpen && (
              <div className="cat-panel" role="menu" aria-label="קטגוריות">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    to={`/category/${c.slug}`}
                    role="menuitem"
                    className={`cat-item ${slug === c.slug ? "active" : ""}`}
                    style={{ "--chip": c.color } as any}
                    onClick={() => setCatOpen(false)}
                  >
                    <span className="cat-dot" aria-hidden="true" />
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};
