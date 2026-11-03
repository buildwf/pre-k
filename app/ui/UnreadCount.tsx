import { color } from "./theme";

/**
 * A small count of what's new, beside a list row, tab or heading. Nothing shows at 0; past `max` it reads "9+". The
 * number is announced with its meaning ("3 unread"), so a screen reader never hears a bare digit.
 *
 * @import import { UnreadCount } from '../../ui/UnreadCount'
 */
export function UnreadCount({ count, max = 99, what = "unread" }: { count: number; max?: number; what?: string }) {
  if (count <= 0) return null;

  return (
    <span
      role="img"
      aria-label={`${count} ${what}`}
      style={{
        display: "inline-block",
        minWidth: 20,
        padding: "0 6px",
        borderRadius: 10,
        background: color.accent,
        color: color.onAccent,
        fontSize: 12,
        lineHeight: "20px",
        textAlign: "center",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
}
