import { useAdmin } from "../context";

// Promise-based confirm/prompt overlay. Rendered INSIDE the themed <main> so it
// inherits the active theme's CSS variables (esp. the "clean" theme overrides).
export function DialogOverlay() {
  const { dialog, dialogValue, setDialogValue, closeDialog } = useAdmin();
  if (!dialog) return null;

  return (
    <div className="ui-veil" onClick={() => closeDialog(dialog.mode === "confirm" ? false : null)}>
      <div
        className="ui-dialog"
        onClick={(e: any) => e.stopPropagation()}
        onKeyDown={(e: any) => {
          if (e.key === "Escape") closeDialog(dialog.mode === "confirm" ? false : null);
        }}
      >
        <h3 className="display">{dialog.title}</h3>
        <p className="ui-dialog-msg">{dialog.message}</p>
        {dialog.mode === "prompt" && (
          <input
            autoFocus
            dir="auto"
            value={dialogValue}
            onInput={(e: any) => setDialogValue(e.target.value)}
            onKeyDown={(e: any) => {
              if (e.key === "Enter") {
                e.preventDefault();
                closeDialog(dialogValue);
              }
            }}
          />
        )}
        <div className="ui-dialog-foot">
          <button
            className="btn small"
            onClick={() => closeDialog(dialog.mode === "confirm" ? true : dialogValue)}
          >
            אישור
          </button>
          <button
            className="btn small ghost"
            onClick={() => closeDialog(dialog.mode === "confirm" ? false : null)}
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
