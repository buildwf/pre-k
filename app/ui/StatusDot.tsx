import * as stylex from "@stylexjs/stylex";
import { colors, radius } from "sevenyears/src/tokens.stylex";

const pulse = stylex.keyframes({ "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.35 } });

const styles = stylex.create({
  wrap: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, flexShrink: 0 },
  dot: { width: 8, height: 8, borderRadius: radius.full },
  working: {
    backgroundColor: colors.primary,
    animationName: pulse,
    animationDuration: "1.6s",
    animationIterationCount: "infinite",
    "@media (prefers-reduced-motion: reduce)": { animationName: "none" },
  },
  waiting: { backgroundColor: colors.warning },
  success: { backgroundColor: colors.success },
  danger: { backgroundColor: colors.destructive },
  idle: { backgroundColor: "transparent", boxShadow: `inset 0 0 0 1.5px ${colors.mutedForeground}` },
});

export type StatusTone = "working" | "waiting" | "success" | "danger" | "idle";

/**
 * A thread's state as a dot: `working` pulses in the primary color, `waiting` (needs the person) is amber, `success`
 * (landed, done) green, `danger` (failed) red, `idle` a hollow ring. Always next to words that say the same, or with
 * a `label` for screen readers.
 *
 * @import import { StatusDot } from '../../ui/StatusDot'
 */
export function StatusDot({ tone, label }: { tone: StatusTone; label?: string }) {
  return (
    <span role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} {...stylex.props(styles.wrap)}>
      <span {...stylex.props(styles.dot, styles[tone])} />
    </span>
  );
}
