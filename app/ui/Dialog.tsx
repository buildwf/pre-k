import { useEffect, useId, useRef, type ReactNode } from "react";
import "./kit.css";
import { color, text } from "./theme";

/**
 * A modal dialog for a choice or a confirmation that needs custom content, like "Delete this thread?" with Cancel and
 * Delete. The rest of the window is inert while it is open. `title` is required: it names the dialog for screen
 * readers. Put the actions in the children as Buttons, the primary one first. Escape and the close fire `onClose`:
 * set `open` back to false there. Focus returns to whatever opened the dialog.
 *
 * @import import { Dialog } from '../../ui/Dialog'
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;

    if (!dialog) return;

    if (open && !dialog.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="ui-dialog"
      onClose={() => {
        opener.current?.focus();
        opener.current = null;
        onClose();
      }}
    >
      <h2
        id={titleId}
        style={{ margin: "0 0 12px", fontSize: text.xl, fontWeight: 600, color: color.text }}
      >
        {title}
      </h2>
      {children}
    </dialog>
  );
}
