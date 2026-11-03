import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { colors, radius, space, text } from "sevenyears/src/tokens.stylex";

// sevenyears' Badge (rounded pill, xs medium type), with tones for status. Its own styles come after a caller's, so the
// tones live here rather than on top of it.
const styles = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: space[1],
    flexShrink: 0,
    borderRadius: radius.full,
    paddingBlock: space.half,
    paddingInline: space[2],
    fontSize: text.xs,
    fontWeight: 500,
    lineHeight: "1rem",
    whiteSpace: "nowrap",
  },
  quiet: { backgroundColor: colors.secondary, color: colors.mutedForeground },
  success: { backgroundColor: `color-mix(in srgb, ${colors.success} 14%, transparent)`, color: colors.success },
  warning: { backgroundColor: `color-mix(in srgb, ${colors.warning} 16%, transparent)`, color: colors.warning },
  danger: { backgroundColor: `color-mix(in srgb, ${colors.destructive} 14%, transparent)`, color: colors.destructive },
  info: { backgroundColor: `color-mix(in srgb, ${colors.primary} 14%, transparent)`, color: colors.primary },
});

export type BadgeTone = "default" | "success" | "warning" | "danger" | "info";

/**
 * A short status word beside a title: a thread's state, a sign-in state, a count. `success` for landed or ready,
 * `warning` for something waiting on the person, `danger` for failed, `info` for work in progress, `default` for the
 * rest (idle, done). Keep the text to one or two words.
 *
 * @import import { Badge } from '../../ui/Badge'
 */
export function Badge({ tone = "default", children }: { tone?: BadgeTone; children?: ReactNode }) {
  return (
    <span {...stylex.props(styles.base, tone === "default" ? styles.quiet : styles[tone])}>{children}</span>
  );
}
