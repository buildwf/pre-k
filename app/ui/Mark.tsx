import * as stylex from "@stylexjs/stylex";
import { colors, radius, text } from "sevenyears/tokens.stylex";

const s = stylex.create({
  mark: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    width: "1.5rem",
    height: "1.5rem",
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
    fontSize: text.xs,
    fontWeight: 600,
  },
});

/**
 * A project's tile: the first letter of its name on the primary color, beside the name in the project switcher.
 * Decorative; the name next to it is what screen readers read.
 *
 * @import import { Mark } from '../../ui/Mark'
 */
export function Mark({ name }: { name: string }) {
  return (
    <span aria-hidden="true" {...stylex.props(s.mark)}>
      {(Array.from(name.trim())[0] ?? "?").toUpperCase()}
    </span>
  );
}
