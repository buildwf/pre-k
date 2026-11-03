import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Button as SevenButton } from "sevenyears/src/components/Button";
import { colors, font, motion, radius, shadow, space, text } from "sevenyears/src/tokens.stylex";
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
    borderColor: { default: colors.border, ":focus-within": colors.ring },
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    boxShadow: { default: shadow.sm, ":focus-within": shadow.focus },
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
});

/**
 * The message box at the bottom of a chat: it grows with the text, Enter sends and Shift+Enter adds a line. `hint`
 * sits beside the send button (who reads it, what Enter does); `actions` go before the send button (Steer, Queue).
 * The send button is an arrow labelled `sendLabel`.
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  hint?: ReactNode;
  actions?: ReactNode;
  sendLabel?: string;
}) {
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
      {...stylex.props(s.box)}
    >
      <textarea
        ref={ref}
        rows={1}
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onSubmit();
          }
        }}
        {...stylex.props(s.input)}
      />
      <div {...stylex.props(s.row)}>
        <span {...stylex.props(s.hint)}>{hint}</span>
        {actions}
        <SevenButton type="submit" size="icon" aria-label={sendLabel} disabled={!value.trim()} style={{ borderRadius: "9999px", width: "2rem", height: "2rem" }}>
          <Icon name="arrowUp" />
        </SevenButton>
      </div>
    </form>
  );
}
