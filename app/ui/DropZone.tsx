import { useRef, useState, type ReactNode } from "react";
import { color, panelRadius, radius } from "./theme";

/**
 * A box to drop files on, or click to choose them, for uploads and imports. It hands over the files' contents as
 * `File`s (`await file.text()`, or upload them to the cloud). `accept` narrows the choice, like `image/*` or
 * `.csv,.tsv`. `compact` makes it button-sized, for a row in a list ("Attach file"). To work with files where they
 * are on disk instead, ask for their paths with `rpc.point.dialog.openFile` and read them in a procedure.
 *
 * @import import { DropZone } from '../../ui/DropZone'
 */
export function DropZone({
  onFiles,
  accept,
  multiple,
  disabled,
  compact,
  children,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  compact?: boolean;
  /** What to tell the person, like "Drop photos here or click to choose". */
  children?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (list: FileList | null) => {
    const files = [...(list ?? [])];

    if (files.length && !disabled) onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={(e) => {
        if ((e.key !== "Enter" && e.key !== " ") || disabled) return;
        e.preventDefault(); // Space would scroll the page
        input.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();

        if (!disabled) setOver(true);
      }}
      // Leaving for one of its own children is not leaving the box.
      onDragLeave={(e) =>
        !(e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) &&
        setOver(false)
      }
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      className="ui-dropzone"
      style={{
        padding: compact ? "4px 10px" : 24,
        display: compact ? "inline-block" : undefined,
        textAlign: "center",
        borderRadius: compact ? radius : panelRadius,
        borderWidth: compact ? 1 : undefined,
        borderColor: over ? color.accent : undefined,
        background: over ? `color-mix(in srgb, ${color.accent} 8%, transparent)` : "transparent",
        color: disabled || !over ? color.muted : color.text,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children ??
        (multiple ? "Drop files here or click to choose" : "Drop a file here or click to choose")}
      <input
        ref={input}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          take(e.target.files);
          e.target.value = ""; // so choosing the same file again still counts
        }}
      />
    </div>
  );
}
