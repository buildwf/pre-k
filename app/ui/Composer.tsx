import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button as SevenButton } from "sevenyears/components/Button";
import { colors, font, motion, radius, shadow, space, text } from "sevenyears/tokens.stylex";
import { Icon } from "./Icon";

const s = stylex.create({
  box: {
    display: "flex",
    flexDirection: "column",
    gap: space[1],
    padding: space[2],
    paddingInlineStart: space[3],
    borderWidth: 1,
    borderStyle: "solid",
    // A chat box is focused most of the time, so focus is a quiet border change, not the accent ring a field gets.
    borderColor: { default: colors.border, ":focus-within": colors.mutedForeground },
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    boxShadow: shadow.sm,
    transitionProperty: "border-color, box-shadow",
    transitionDuration: motion.fast,
  },
  input: {
    boxSizing: "border-box",
    width: "100%",
    minHeight: "1.5rem",
    maxHeight: "12rem",
    paddingBlock: space[1],
    paddingInline: 0,
    borderWidth: 0,
    outline: "none",
    resize: "none",
    backgroundColor: "transparent",
    color: colors.foreground,
    fontFamily: font.sans,
    fontSize: text.sm,
    lineHeight: 1.5,
    "::placeholder": { color: colors.mutedForeground },
  },
  row: { display: "flex", alignItems: "center", gap: space[2] },
  hint: { flex: 1, fontSize: text.xs, color: colors.mutedForeground },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    margin: 0,
    padding: space[1],
    marginInlineStart: `calc(-1 * ${space[1]})`,
    listStyle: "none",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
  },
  heading: { paddingInline: space[2], paddingBlock: space[1], fontSize: text.xs, color: colors.mutedForeground },
  option: {
    display: "flex",
    alignItems: "center",
    gap: space[2],
    paddingInline: space[2],
    paddingBlock: space[1],
    borderRadius: radius.md,
    cursor: "pointer",
    fontSize: text.sm,
    color: colors.foreground,
    backgroundColor: { default: "transparent", ":hover": colors.accent },
  },
  active: { backgroundColor: colors.accent },
  over: { borderColor: colors.ring, borderStyle: "dashed" },
  chips: { display: "flex", flexWrap: "wrap", gap: space[1], margin: 0, padding: 0, paddingBlockStart: space[1], listStyle: "none" },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: space[1],
    maxWidth: "16rem",
    paddingBlock: 2,
    paddingInlineStart: space[2],
    paddingInlineEnd: 2,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    fontSize: text.xs,
    color: colors.foreground,
  },
  chipName: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  chipX: {
    display: "inline-flex",
    padding: 2,
    borderWidth: 0,
    borderRadius: radius.sm,
    backgroundColor: { default: "transparent", ":hover": colors.border },
    color: colors.mutedForeground,
    cursor: "pointer",
  },
  optionHint: { marginInlineStart: "auto", fontSize: text.xs, color: colors.mutedForeground },
});

/** What the box offers while the person types a trigger like `@`: pick one with the arrows and Enter, or a click. */
export interface ComposerSuggestions {
  /** Says what the list is ("Send a follow-up to a thread"). */
  heading: string;
  items: { id: string; label: string; hint?: string | undefined }[];
  active: number;
  onActive: (index: number) => void;
  onPick: (id: string) => void;
  onDismiss: () => void;
}

/**
 * The message box at the bottom of a chat: it grows with the text, Enter sends and Shift+Enter adds a line. `hint`
 * sits beside the send button (who reads it, what Enter does); `actions` go before the send button (Steer, Queue).
 * The send button is an arrow labelled `sendLabel`. `suggestions` opens a list above the text (an @-mention picker):
 * Up and Down move, Enter or Tab picks, Escape closes it. With `onAttach`, files dropped on the box or chosen with the
 * paperclip ("Attach files") arrive as `File`s; `attachments` shows them as chips above the text, each with a remove.
 *
 * @import import { Composer } from '../../ui/Composer'
 */
export function Composer({
  label,
  value,
  onChange,
  onSubmit,
  placeholder,
  hint,
  actions,
  sendLabel = "Send",
  suggestions,
  attachments,
  onAttach,
  onRemoveAttachment,
  accept,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  hint?: ReactNode;
  actions?: ReactNode;
  sendLabel?: string;
  suggestions?: ComposerSuggestions | undefined;
  /** What is attached so far: a name each, and a note while it is being read ("reading…"). */
  attachments?: { id: string; name: string; note?: string | undefined }[] | undefined;
  onAttach?: ((files: File[]) => void) | undefined;
  onRemoveAttachment?: ((index: number) => void) | undefined;
  /** The file types the paperclip offers, like `image/*,.pdf,.txt`. */
  accept?: string | undefined;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const attached = attachments ?? [];
  const open = suggestions && suggestions.items.length > 0 ? suggestions : undefined;
  const pick = (e: KeyboardEvent<HTMLTextAreaElement>, list: ComposerSuggestions) => {
    const n = list.items.length;
    if (e.key === "ArrowDown") list.onActive((list.active + 1) % n);
    else if (e.key === "ArrowUp") list.onActive((list.active - 1 + n) % n);
    else if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
      const item = list.items[list.active] ?? list.items[0];
      if (item) list.onPick(item.id);
    } else if (e.key === "Escape") list.onDismiss();
    else return false;
    e.preventDefault();
    return true;
  };
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      onDragOver={(e) => {
        if (!onAttach) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => {
        if (!(e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget))) setOver(false);
      }}
      onDrop={(e) => {
        if (!onAttach) return;
        e.preventDefault();
        setOver(false);
        const files = [...e.dataTransfer.files];
        if (files.length) onAttach(files);
      }}
      {...stylex.props(s.box, over && s.over)}
    >
      {attached.length > 0 && (
        <ul aria-label="Attached files" {...stylex.props(s.chips)}>
          {attached.map((a, i) => (
            <li key={a.id} {...stylex.props(s.chip)}>
              <Icon name="file" size={14} />
              <span {...stylex.props(s.chipName)}>{a.name}</span>
              {a.note && <span {...stylex.props(s.optionHint)}>{a.note}</span>}
              {onRemoveAttachment && (
                <button
                  type="button"
                  aria-label={`Remove ${a.name}`}
                  onClick={() => onRemoveAttachment(i)}
                  {...stylex.props(s.chipX)}
                >
                  <Icon name="x" size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {open && (
        <ul role="listbox" aria-label={open.heading} {...stylex.props(s.list)}>
          <li role="presentation" {...stylex.props(s.heading)}>
            {open.heading}
          </li>
          {open.items.map((item, i) => (
            <li
              key={item.id}
              role="option"
              aria-selected={i === open.active}
              onMouseDown={(e) => {
                e.preventDefault();
                open.onPick(item.id);
              }}
              {...stylex.props(s.option, i === open.active && s.active)}
            >
              <span>{item.label}</span>
              {item.hint && <span {...stylex.props(s.optionHint)}>{item.hint}</span>}
            </li>
          ))}
        </ul>
      )}
      <textarea
        ref={ref}
        rows={1}
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-expanded={open ? true : undefined}
        onKeyDown={(e) => {
          if (open && pick(e, open)) return;
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onSubmit();
          }
        }}
        {...stylex.props(s.input)}
      />
      <div {...stylex.props(s.row)}>
        {onAttach && (
          <>
            <SevenButton
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Attach files"
              onClick={() => fileInput.current?.click()}
              style={{ width: "2rem", height: "2rem", marginInlineStart: "-0.5rem" }}
            >
              <Icon name="paperclip" />
            </SevenButton>
            <input
              ref={fileInput}
              type="file"
              multiple
              hidden
              {...(accept ? { accept } : {})}
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = "";
                if (files.length) onAttach(files);
              }}
            />
          </>
        )}
        <span {...stylex.props(s.hint)}>{hint}</span>
        {actions}
        <SevenButton
          type="submit"
          size="icon"
          aria-label={sendLabel}
          disabled={!value.trim()}
          // Gray until there is something to send, so an empty box doesn't show a faded accent blob.
          variant={value.trim() ? "default" : "secondary"} style={{ borderRadius: "9999px", width: "2rem", height: "2rem" }}
        >
          <Icon name="arrowUp" />
        </SevenButton>
      </div>
    </form>
  );
}
