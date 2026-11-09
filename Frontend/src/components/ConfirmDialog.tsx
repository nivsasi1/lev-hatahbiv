import { useEffect, useRef } from "react";

type Props = {
  title: string;
  children?: any;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

let seq = 0;

// A small yes/no question over everything (the cart drawer included).
// Focus starts on the safe choice, Tab stays inside, Escape or a click outside
// cancels, and focus goes back to where it was when the question was asked.
export const ConfirmDialog = ({
  title,
  children,
  confirmLabel,
  cancelLabel = "ביטול",
  onConfirm,
  onCancel,
}: Props) => {
  const titleId = useRef(`confirm-${++seq}`).current;
  const cardRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => {
      // the trigger may be gone (the line was removed) — then leave focus be
      if (before && document.contains(before)) before.focus();
    };
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel();
      return;
    }
    if (e.key !== "Tab") return;
    const buttons = Array.from(cardRef.current?.querySelectorAll("button") ?? []);
    if (buttons.length === 0) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="confirm-overlay" onClick={onCancel} onKeyDown={onKeyDown}>
      <div
        ref={cardRef}
        className="confirm-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="display" id={titleId}>
          {title}
        </h3>
        {children}
        <div className="confirm-actions">
          <button type="button" ref={cancelRef} className="btn ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
