import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import {
  categories,
  productsByCategory,
  subsOfCategory,
  subPath,
} from "../data/catalog";
import "./shelves-menu.css";

/* ---------------------------------------------------------------------------
   The phone's menu: every shelf in one list, each opening to its sub-shelves,
   with the three "more in the shop" links pinned underneath. It replaces the
   scrolling chip row the phone header used to carry.

   A modal drawer on the start side (the right, in Hebrew). While closed it is
   hidden from keyboards and screen readers; open, focus stays inside, Escape
   or a tap outside closes it, and focus returns to the menu button.
   --------------------------------------------------------------------------- */

const num = (n: number) => n.toLocaleString("he-IL");

const Chev = ({ d }: { d: string }) => (
  <svg
    className="sm-chev"
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d={d} />
  </svg>
);
const DOWN = "M6 9l6 6 6-6";
const UP = "M6 15l6-6 6 6";
const ONWARD = "M15 5l-7 7 7 7"; // points the reading direction's "forward" (left)

type Props = { open: boolean; onClose: () => void };

export const ShelvesMenu = ({ open, onClose }: Props) => {
  const { slug } = useParams();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const rows = useMemo(
    () =>
      categories.map((c) => ({
        c,
        count: productsByCategory(c.slug).length,
        subs: subsOfCategory(c.slug),
      })),
    []
  );

  // which shelf is unfolded. Each time the menu opens it starts on the shelf
  // you are standing in, or on the first one so it is plain that rows unfold.
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const here = rows.find((r) => r.c.slug === slug && r.subs.length > 1);
    const firstFold = rows.find((r) => r.subs.length > 1);
    setExpanded((here ?? firstFold)?.c.slug ?? null);
  }, [open, slug, rows]);

  // open: take focus, stop the page behind from scrolling; close: give both back
  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      if (before && document.contains(before)) before.focus();
    };
  }, [open]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const stops = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>("a[href], button") ?? []
    );
    if (stops.length === 0) return;
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <>
      <div className={`sm-veil ${open ? "open" : ""}`} onClick={onClose} />
      <aside
        className={`sm ${open ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sm-title"
        ref={panelRef}
        onKeyDown={onKeyDown as any}
      >
        <div className="sm-head">
          <h2 id="sm-title" className="display">
            המדפים
          </h2>
          <button
            type="button"
            className="sm-close"
            aria-label="סגירה"
            onClick={onClose}
            ref={closeRef}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <ul className="sm-list">
          {rows.map(({ c, count, subs }) => {
            const folds = subs.length > 1;
            const isOpen = folds && expanded === c.slug;
            const here = slug === c.slug;
            const inner = (
              <>
                <span
                  className="sm-dot"
                  style={{ background: c.color }}
                  aria-hidden="true"
                />
                <span className="sm-name">{c.name}</span>
                <span className="sm-count">
                  {num(count)}
                  <span className="sm-vh"> מוצרים</span>
                </span>
              </>
            );
            return (
              <li
                key={c.slug}
                className={`${isOpen ? "is-open" : ""} ${here ? "is-here" : ""}`}
              >
                {folds ? (
                  <>
                    <button
                      type="button"
                      className="sm-row"
                      aria-expanded={isOpen}
                      aria-controls={isOpen ? `sm-sub-${c.slug}` : undefined}
                      onClick={() => setExpanded(isOpen ? null : c.slug)}
                    >
                      {inner}
                      <Chev d={isOpen ? UP : DOWN} />
                    </button>
                    {isOpen && (
                      <ul className="sm-subs" id={`sm-sub-${c.slug}`}>
                        {subs.map((s) => (
                          <li key={s.sub}>
                            <Link to={subPath(c.slug, s.sub)} onClick={onClose}>
                              <span>{s.sub}</span>
                              <span className="sm-count">{num(s.count)}</span>
                            </Link>
                          </li>
                        ))}
                        <li className="sm-all">
                          <Link to={`/category/${c.slug}`} onClick={onClose}>
                            לכל המדף
                          </Link>
                        </li>
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    to={`/category/${c.slug}`}
                    className="sm-row"
                    onClick={onClose}
                  >
                    {inner}
                    <Chev d={ONWARD} />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        <ul className="sm-foot" aria-label="עוד בחנות">
          <li>
            <Link to="/sale" onClick={onClose}>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 12l9-9 9 9-9 9z" />
                <circle cx="12" cy="8.5" r="1.2" />
              </svg>
              מבצעים
            </Link>
          </li>
          <li>
            <Link to="/workshops" onClick={onClose}>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4 20l4-1L19 8l-3-3L5 16z" />
                <path d="M14 7l3 3" />
              </svg>
              חוגים וסדנאות
            </Link>
          </li>
          <li>
            <Link to="/contact" onClick={onClose}>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              איך מגיעים
            </Link>
          </li>
        </ul>
      </aside>
    </>,
    document.body
  );
};
