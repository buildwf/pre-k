import { color } from "./theme";

/**
 * How far along a task is, as a bar. `value` runs from 0 to `max` (1 by default); leave it out while the amount is
 * unknown, and the bar animates to show that something is happening without a number. It is the platform's own
 * `<progress>`, tinted with the accent color.
 *
 * @import import { ProgressBar } from '../../ui/ProgressBar'
 */
export function ProgressBar({
  value,
  max = 1,
  label,
}: {
  value?: number | undefined;
  max?: number;
  label?: string;
}) {
  return (
    <progress
      value={value}
      max={max}
      aria-label={label}
      style={{ display: "block", width: "100%", accentColor: color.accent }}
    />
  );
}
